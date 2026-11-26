/* Headless sanity test: validates map and documentation data, then auto-plays
   the campaign with AI controlling both sides.
   Run: npm test (or npm run sim) from the repository root. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { CHAPTERS } from '../src/game/data/chapters';
import { TERRAIN, type TerrainDef } from '../src/game/data/terrain';
import { CLASSES } from '../src/game/data/classes';
import { WEAPONS } from '../src/game/data/weapons';
import { PLAYER_TEMPLATES, elementOf } from '../src/game/data/characters';
import { planEnemy } from '../src/game/ai';
import { forecast } from '../src/game/combat';
import { manhattan } from '../src/game/pathfinding';
import { applyAttack, applyBurn, applyHeal, applyOpen, applyTransform, createBattle, endEnemyPhase, endPlayerPhase, applySteal, healTargets, markDone, outcome, parseMap, shutDoors, stealOptions, toResult } from '../src/game/battle';
import { makeEnemy } from '../src/game/units';
import { defaultEnemy, exportChallenge, newChallenge, parseChallenge, playerUnits, problems, resize, setTile, toChapter, type ChallengeMap } from '../src/game/challenge';
import { addRecruits, enterCamp, mergeBattle, newCampaign } from '../src/game/campaign';
import { gainExp } from '../src/game/progression';
import type { BattleState, Campaign } from '../src/game/types';

let errors = 0;
const fail = (m: string) => { errors++; console.log('ERROR', m); };

// movement rule: armour moves least, fliers most, everyone else strictly in between
{
  const all = Object.values(CLASSES);
  const slowest = Math.max(...all.filter(c => c.moveType === 'armor').map(c => c.mov));
  const fastest = Math.min(...all.filter(c => c.moveType === 'flying').map(c => c.mov));
  for (const c of all) {
    if (c.moveType !== 'armor' && c.moveType !== 'flying' && !(c.mov > slowest && c.mov < fastest)) {
      fail(`${c.name} moves ${c.mov}; must be between armour (${slowest}) and fliers (${fastest})`);
    }
  }
}

// ---- data validation
CHAPTERS.forEach((ch, ci) => {
  ch.map.forEach((r, y) => r.length !== ch.map[0].length && fail(`ch${ci} row ${y} len ${r.length}`));
  if (ch.map[0].length > 64) fail(`ch${ci} wider than 64 tiles`);
  for (const h of ch.houses ?? []) {
    if (parseMap(ch.map)[h.y]?.[h.x] !== 'house') fail(`ch${ci} house at ${h.x},${h.y} is not on a house tile`);
    if (h.weapon && !WEAPONS[h.weapon]) fail(`ch${ci} house weapon ${h.weapon}`);
    if (h.recruit && !PLAYER_TEMPLATES[h.recruit]) fail(`ch${ci} house recruit ${h.recruit}`);
  }
  for (const h of ch.chests ?? []) {
    if (parseMap(ch.map)[h.y]?.[h.x] !== 'chest') fail(`ch${ci} chest at ${h.x},${h.y} is not on a chest tile`);
    if (h.weapon && !WEAPONS[h.weapon]) fail(`ch${ci} chest weapon ${h.weapon}`);
  }
  for (const sp of [...ch.enemies, ...(ch.reinforcements ?? []).flatMap(r => r.units)]) {
    if (sp.ai === 'loot' && !CLASSES[sp.classId].steals) fail(`ch${ci} ${sp.classId} cannot loot; only thieves open chests`);
  }
  if (ch.playerStarts.length > 10) fail(`ch${ci} more than 10 player starts`);
  parseMap(ch.map).forEach((row, y) => row.forEach((t, x) => {
    if (t === 'chest' && !(ch.chests ?? []).some(h => h.x === x && h.y === y)) fail(`ch${ci} chest tile at ${x},${y} has no contents`);
    if (t === 'house' && !(ch.houses ?? []).some(h => h.x === x && h.y === y)) fail(`ch${ci} house tile at ${x},${y} has no reward`);
  }));
  const map = parseMap(ch.map);
  const seen = new Set<string>();
  const check = (x: number, y: number, cls: string, what: string) => {
    const t = map[y]?.[x];
    if (!t) return fail(`ch${ci} ${what} out of bounds ${x},${y}`);
    const mt = CLASSES[cls].moveType;
    if (!Number.isFinite(TERRAIN[t].cost[mt])) fail(`ch${ci} ${what} on impassable ${t} at ${x},${y}`);
    const k = `${x},${y}`; if (seen.has(k)) fail(`ch${ci} overlap at ${k}`); seen.add(k);
  };
  ch.playerStarts.forEach((p, i) => check(p.x, p.y, 'cavalier', `start${i}`));
  ch.enemies.forEach((e, i) => { check(e.x, e.y, e.classId, `enemy${i}`); e.weapons.forEach(w => !WEAPONS[w] && fail(`weapon ${w}`)); });
  if (ch.enemies.length > 10) fail(`ch${ci} too many enemies`);
  for (const sp of [...ch.enemies, ...(ch.reinforcements ?? []).flatMap(r => r.units)]) {
    if (sp.ai === 'raid' && !CLASSES[sp.classId].raids) fail(`ch${ci} ${sp.classId} cannot raid; only brigands burn houses`);
  }
  if (ch.objective.type === 'seize' && map[ch.objective.y][ch.objective.x] !== 'throne') fail('seize tile');
});

// ---- AI behaviour: attacking a guard wakes the nearby post
{
  let c = newCampaign('casual');
  c = addRecruits(c, 0);
  const s = createBattle(0, c.roster, c.ranks);
  const map = parseMap(CHAPTERS[0].map);
  const lord = s.units.find(u => u.isLord);
  const guards = s.units.filter(u => u.team === 'enemy' && u.ai === 'guard');
  if (!lord || guards.length < 2) {
    fail('ai: chapter 1 needs a lord and two guards for the wake check');
  } else {
    const target = guards[0];
    const spot = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy }))
      .find(p => {
        const t = map[p.y]?.[p.x];
        return !!t && Number.isFinite(TERRAIN[t].cost.foot) && !s.units.some(u => u.x === p.x && u.y === p.y);
      });
    const nearby = guards.filter(g => g.id !== target.id && manhattan(g, target) <= 4);
    if (!spot) fail('ai: no free tile beside the first guard for the wake check');
    else if (!nearby.length) fail('ai: expected a second guard within the wake radius');
    else {
      lord.x = spot.x; lord.y = spot.y;
      const after = applyAttack(s, lord.id, target.id, lord.equipped, Math.random).state;
      if (!nearby.every(g => after.units.find(u => u.id === g.id)?.ai === 'aggressive')) {
        fail('ai: attacking a guard did not wake the nearby post');
      }
    }
  }
}

// ---- rules: effective weapons double might; a thief can disarm a boss
{
  const s = createBattle(0, newCampaign('casual').roster, {});
  const knight = makeEnemy({ classId: 'knight', level: 1, weapons: ['iron_lance'], x: 1, y: 0, isBoss: true }, 'k');
  const thief = { ...makeEnemy({ classId: 'thief', level: 1, weapons: ['rapier', 'iron_sword'], x: 0, y: 0 }, 't'), team: 'player' as const };
  thief.stats = { ...thief.stats, str: 30, spd: knight.stats.spd + 4 };
  s.units = [thief, knight];
  const rapier = forecast(s, thief, knight, 0).att.dmg, plain = forecast(s, thief, knight, 1).att.dmg;
  if (rapier - plain !== WEAPONS.rapier.might) fail(`rules: effective Rapier deals ${rapier} vs Iron Sword ${plain}; expected +${WEAPONS.rapier.might} (double might)`);
  if (!stealOptions(s, thief).some(o => o.targetId === 'k' && o.kind === 'weapon' && o.index === knight.equipped)) fail('rules: a thief 4 faster could not take the weapon from a boss');
}

// ---- rules: an enemy thief steals the best thing in reach; defeating it gets everything back
{
  let s = createBattle(0, newCampaign('casual').roster, {});
  const crook = makeEnemy({ classId: 'thief', level: 1, weapons: ['dagger'], x: 2, y: 0 }, 'c');
  const mark = { ...makeEnemy({ classId: 'fighter', level: 1, weapons: ['iron_axe', 'silver_sword'], x: 0, y: 0 }, 'm'), team: 'player' as const, potions: 1 };
  mark.stats = { ...mark.stats, spd: 0, str: 40, skl: 40 };
  for (const y of [0, 1]) for (const x of [0, 1, 2, 3]) s.map[y][x] = 'plains';
  s.units = [mark, crook];
  const plan = planEnemy(s, crook);
  if (plan.steal?.kind !== 'weapon' || mark.weapons[plan.steal.index].defId !== 'silver_sword') fail(`rules: enemy thief should go for the Silver Sword, planned ${JSON.stringify(plan.steal)}`);
  else {
    const to = plan.path[plan.path.length - 1];
    s.units = s.units.map(u => u.id === 'c' ? { ...u, x: to.x, y: to.y } : u);
    s = applySteal(s, 'c', plan.steal)!.state;
    s = applySteal(s, 'c', stealOptions(s, s.units.find(u => u.id === 'c')!).find(o => o.kind === 'potion')!)!.state;
    if (s.units.find(u => u.id === 'm')!.weapons.some(w => w.defId === 'silver_sword')) fail('rules: the Silver Sword was not taken');
    s.units.find(u => u.id === 'c')!.hp = 1;
    s = applyAttack(s, 'm', 'c', 0, () => 0).state;
    const back = s.units.find(u => u.id === 'm')!;
    if (s.units.some(u => u.id === 'c')) fail('rules: the thief survived the retrieval check');
    else if (!back.weapons.some(w => w.defId === 'silver_sword' && !w.stolen) || back.potions !== 1) fail('rules: defeating the thief did not return the stolen sword and vulnerary');
  }
}

// ---- data: every dragon breath names an element, so the dragon is drawn in its colours
for (const w of Object.values(WEAPONS)) if (w.type === 'breath' && !elementOf([{ defId: w.id }])) fail(`data: breath ${w.id} has no element in ELEMENTS`);

// ---- rules: a key opens a door into an open doorway and is spent
{
  const ci = CHAPTERS.findIndex(ch => parseMap(ch.map).some(r => r.includes('door')));
  const s = createBattle(ci, newCampaign('casual').roster, {});
  const door = shutDoors(s)[0];
  const lord = { ...makeEnemy({ classId: 'fighter', level: 1, weapons: ['iron_axe'], x: 0, y: 0 }, 'p'), team: 'player' as const };
  const spot = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: door.x + dx, y: door.y + dy })).find(p => !!s.map[p.y]?.[p.x] && Number.isFinite(TERRAIN[s.map[p.y][p.x]].cost.foot))!;
  s.units = [lord]; lord.x = spot.x; lord.y = spot.y; lord.keys = 1;
  const r = applyOpen(s, lord.id, door, 'key');
  if (!r || r.state.map[door.y][door.x] !== 'doorway' || (r.state.units[0].keys ?? 0) !== 0) fail('rules: a key did not open the door, or was not spent');
}

// ---- documentation drift: canonical tables live in docs/manual.md
type DocTable = { header: string[]; rows: string[][] };
const docCells = (line: string): string[] => {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
};
// first markdown table whose header has every named column
const docTable = (lines: string[], columns: string[]): DocTable | null => {
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('|')) continue;
    const header = docCells(lines[i]);
    if (!columns.every(w => header.some(h => h.toLowerCase() === w.toLowerCase()))) continue;
    const rows: string[][] = [];
    for (let j = i + 1; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      if (/^\|[\s:|-]+\|?$/.test(lines[j].trim())) continue; // separator
      rows.push(docCells(lines[j]));
    }
    return { header, rows };
  }
  return null;
};
// '+1' / '0' / '-' mean numbers, 'blocked' means Infinity; anything else is NaN
const docNumber = (cell: string): number => {
  const v = cell.trim();
  if (/^blocked$/i.test(v)) return Number.POSITIVE_INFINITY;
  if (/^[–—−-]$/.test(v)) return 0;
  return /^[+-]?\d+$/.test(v) ? Number(v) : NaN;
};
const docNumberText = (n: number) => Number.isFinite(n) ? String(n) : 'blocked';
// the npm scripts run at the repo root; walk up so a bundle under node_modules/.cache still works
const findRoot = (from: string): string => {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, 'src', 'game', 'data', 'terrain.ts'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(from);
    dir = up;
  }
};
{
  const root = findRoot(process.cwd());
  const docPath = join(root, 'docs', 'manual.md');
  const docName = 'docs/manual.md';
  if (!existsSync(docPath)) {
    fail(`docs: ${docName} not found under ${root}; it holds the canonical rules tables`);
  } else {
    const text = readFileSync(docPath, 'utf8');
    const lines = text.split(/\r?\n/);

    const terrain = docTable(lines, ['Terrain', 'Def', 'Avoid', 'Foot', 'Armour', 'Horse', 'Flying']);
    if (!terrain) {
      fail(`docs: ${docName} has no terrain table (| Terrain | Def | Avoid | Foot | Armour | Horse | Flying |)`);
    } else {
      const labels = ['Def', 'Avoid', 'Foot', 'Armour', 'Horse', 'Flying'];
      const cols = labels.map(label => terrain.header.findIndex(h => h.toLowerCase() === label.toLowerCase()));
      for (const row of terrain.rows) {
        if (cols.some(i => i >= row.length)) {
          fail(`docs: ${docName} terrain row has ${row.length} columns: ${row.join(' | ')}`);
          continue;
        }
        const names = row[0].replace(/\([^)]*\)/g, '').split(',').map(s => s.trim()).filter(Boolean);
        if (!names.length) { fail(`docs: ${docName} terrain row has no name: ${row.join(' | ')}`); continue; }
        const values = cols.map(i => docNumber(row[i]));
        const bad = values.findIndex(v => Number.isNaN(v));
        if (bad >= 0) {
          fail(`docs: ${docName} terrain "${row[0]}" has unreadable ${labels[bad]} value "${row[cols[bad]]}"`);
          continue;
        }
        for (const name of names) {
          const key = name.toLowerCase() as keyof typeof TERRAIN;
          const t: TerrainDef | undefined = TERRAIN[key];
          if (!t) { fail(`docs: ${docName} terrain "${name}" is not in TERRAIN`); continue; }
          if (t.id !== key || t.name.toLowerCase() !== name.toLowerCase()) {
            fail(`docs: ${docName} terrain "${name}" does not match TERRAIN id "${t.id}" (name "${t.name}")`);
          }
          const actual = [t.def, t.avo, t.cost.foot, t.cost.armor, t.cost.horse, t.cost.flying];
          labels.forEach((label, i) => {
            if (values[i] !== actual[i]) fail(`docs: terrain ${t.id} ${label} is ${docNumberText(values[i])}, data is ${docNumberText(actual[i])}`);
          });
        }
      }
    }

    for (const ch of CHAPTERS) {
      if (!text.includes(ch.title)) fail(`docs: ${docName} never names chapter ${ch.number} "${ch.title}"`);
    }
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const count = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:story\s+)?chapters\b/i.exec(text);
    if (count) {
      const n = words[count[1].toLowerCase()] ?? Number(count[1]);
      if (n !== CHAPTERS.length) fail(`docs: ${docName} says "${count[0]}", CHAPTERS has ${CHAPTERS.length}`);
    }

    const table = docTable(lines, ['Chapter', 'Houses']);
    if (!table) {
      fail(`docs: ${docName} has no chapter table (| Chapter | Setting | Houses |)`);
    } else {
      const housesCol = table.header.findIndex(h => h.toLowerCase() === 'houses');
      const listed = new Set<number>();
      for (const row of table.rows) {
        if (row.length <= housesCol) { fail(`docs: ${docName} chapter row has ${row.length} columns: ${row.join(' | ')}`); continue; }
        const m = /^(\d+)\b/.exec(row[0].trim());
        if (!m) { fail(`docs: ${docName} chapter row "${row[0]}" does not start with a number`); continue; }
        const n = Number(m[1]);
        if (listed.has(n)) fail(`docs: ${docName} lists chapter ${n} twice`);
        listed.add(n);
        const ch = CHAPTERS.find(c => c.number === n);
        if (!ch) { fail(`docs: ${docName} chapter ${n} is not in CHAPTERS`); continue; }
        const cell = row[housesCol].trim();
        const lead = /^(\d+)/.exec(cell);
        let houses: number;
        if (/^none$/i.test(cell)) houses = 0;
        else if (lead) houses = Number(lead[1]);
        else if (cell) houses = 1; // descriptive cell such as "a woodward's lone cabin"
        else { fail(`docs: ${docName} chapter ${n} has an empty Houses cell`); continue; }
        const actual = ch.houses?.length ?? 0;
        if (houses !== actual) fail(`docs: chapter ${n} documents ${houses} house(s), data has ${actual}`);
      }
      for (const ch of CHAPTERS) {
        if (!listed.has(ch.number)) fail(`docs: ${docName} chapter table omits chapter ${ch.number} (${ch.title})`);
      }
    }
  }
}

// ---- auto-play
function playerTurn(s: BattleState): BattleState {
  for (const id of s.units.filter(u => u.team === 'player').map(u => u.id)) {
    const u = s.units.find(x => x.id === id); if (!u) continue;
    const ht = healTargets(s, u);
    if (ht.length) { s = applyHeal(s, u.id, ht[0].id, Math.random).state; s = markDone(s, u.id); continue; }
    // Cautious lord: only fights from where he stands, and only if the counter can't kill him.
    let plan = planEnemy(s, { ...u, ai: u.isLord ? 'hold' : 'aggressive' });
    if (u.isLord && plan.attack) {
      const t = s.units.find(x => x.id === plan.attack!.targetId)!;
      const fc = forecast(s, u, t, plan.attack.weaponIdx);
      if (fc.def.dmg * fc.def.attacks >= u.hp) plan = { unitId: id, path: [{ x: u.x, y: u.y }] };
    }
    if (u.isLord && !plan.attack && s.turn > 3) { const p2 = planEnemy(s, { ...u, ai: 'aggressive' }); if (p2.attack) { const t = s.units.find(x => x.id === p2.attack!.targetId)!; const fc = forecast(s, u, t, p2.attack.weaponIdx, p2.path[p2.path.length-1]); if (fc.def.dmg * fc.def.attacks < u.hp * 0.6) plan = p2; } }
    const to = plan.path[plan.path.length - 1];
    s = { ...s, units: s.units.map(x => x.id === id ? { ...x, x: to.x, y: to.y } : x) };
    if (plan.attack) s = applyAttack(s, id, plan.attack.targetId, plan.attack.weaponIdx, Math.random).state;
    if (plan.steal) s = applySteal(s, id, plan.steal)?.state ?? s;
    if (s.units.some(x => x.id === id)) s = markDone(s, id);
    if (outcome(s) !== 'ongoing') return s;
  }
  return s;
}
function enemyTurn(s: BattleState): BattleState {
  s = endPlayerPhase(s).state;
  for (const id of s.units.filter(u => u.team === 'enemy').map(u => u.id)) {
    const u = s.units.find(x => x.id === id); if (!u) continue;
    const plan = planEnemy(s, u);
    const to = plan.path[plan.path.length - 1];
    if (plan.path.length > 1 && s.units.some(o => o.id !== id && o.x === to.x && o.y === to.y)) fail('AI moved onto occupied tile');
    s = { ...s, units: s.units.map(x => x.id === id ? { ...x, x: to.x, y: to.y } : x) };
    if (plan.raid) { const b = applyBurn(s, id); if (!b) fail('raid plan with nothing to burn'); else s = b; }
    if (plan.loot) { const o = applyOpen(s, id, plan.loot, 'pick'); if (!o) fail('loot plan with nothing to open'); else s = o.state; }
    if (plan.steal) { const r = applySteal(s, id, plan.steal); if (!r) fail('steal plan that cannot steal'); else s = r.state; }
    if (plan.transform) { const t = applyTransform(s, id); if (!t) fail('transform plan that cannot transform'); else s = t; }
    if (plan.attack) s = applyAttack(s, id, plan.attack.targetId, plan.attack.weaponIdx, Math.random).state;
    if (s.units.some(x => x.id === id)) s = markDone(s, id);
    if (outcome(s) !== 'ongoing') return s;
  }
  return endEnemyPhase(s).state;
}

function runCampaign(): string {
  let c: Campaign = newCampaign('casual');
  const notes: string[] = [];
  for (let ci = 0; ci < CHAPTERS.length; ci++) {
    c = addRecruits(c, ci);
    let s = createBattle(ci, c.roster, c.ranks);
    let o = outcome(s);
    while (o === 'ongoing' && s.turn <= 40) { s = playerTurn(s); o = outcome(s); if (o !== 'ongoing') break; s = enemyTurn(s); o = outcome(s); }
    notes.push(`ch${ci + 1}:${o[0]}${s.turn}`); if (o === "ongoing") notes.push(s.units.map(u => `${u.name}@${u.x},${u.y}:${u.hp}`).join(" "));
    if (o !== 'victory') return notes.join(' ');
    c = mergeBattle(c, toResult(s), ci);
    c = enterCamp(c, ci + 1);
    // emulate camp: full rest + train two units
    c.roster = c.roster.map(u => ({ ...u, hp: u.stats.hp }));
    for (let k = 0; k < 2; k++) { const i = Math.floor(Math.random() * c.roster.length); c.roster[i] = gainExp(c.roster[i], 50, Math.random).unit; }
  }
  return notes.join(' ') + ' | lv ' + c.roster.map(u => `${u.id}${u.level}`).join(',');
}

// ---- challenge mode: a default map is playable, rules hold, files round-trip
{
  let m = newChallenge();
  if (problems(m).length) fail(`challenge: the default map is not playable: ${problems(m).join('; ')}`);
  const ch = toChapter(m);
  let s = createBattle(0, playerUnits(m), {}, ch);
  if (s.units.filter(u => u.team === 'player').length !== m.players.length) fail('challenge: not every placed unit was deployed');
  if (s.units.find(u => u.isLord)?.name !== 'Kael') fail('challenge: the leader should be the lord');
  if (outcome(s) !== 'ongoing') fail('challenge: a fresh battle is not ongoing');
  if (outcome({ ...s, units: s.units.filter(u => !u.isLord) }) !== 'defeat') fail('challenge: losing the leader should lose the map');
  const all = createBattle(0, playerUnits({ ...m, loseRule: 'all' }), {}, toChapter({ ...m, loseRule: 'all' }));
  if (all.units.some(u => u.isLord)) fail('challenge: no unit should be a leader under the whole-army rule');
  if (outcome(all) !== 'ongoing' || outcome({ ...all, units: all.units.filter(u => u.team === 'enemy') }) !== 'defeat') fail('challenge: whole-army rule should lose only when everyone falls');

  // a reinforcement arrives on its turn, not before
  m = { ...m, enemies: [...m.enemies, { ...defaultEnemy(13, 8), turn: 3 }] };
  s = createBattle(0, playerUnits(m), {}, toChapter(m));
  const foes = () => s.units.filter(u => u.team === 'enemy').length;
  if (foes() !== 2) fail(`challenge: ${foes()} enemies on turn 1, expected 2`);
  s = endEnemyPhase(endPlayerPhase(s).state).state; s = endEnemyPhase(endPlayerPhase(s).state).state;
  if (s.turn !== 3 || foes() !== 3) fail(`challenge: the turn-3 reinforcement did not arrive (turn ${s.turn}, ${foes()} enemies)`);

  // problems are caught
  const bad = (mm: ChallengeMap, needle: string) => { if (!problems(mm).some(p => p.includes(needle))) fail(`challenge: expected a problem mentioning "${needle}"`); };
  bad({ ...m, players: m.players.map(p => ({ ...p, leader: false })) }, 'leader');
  bad({ ...m, objective: 'seize' }, 'throne');
  bad({ ...m, objective: 'boss' }, 'boss');
  bad(setTile(m, m.players[0].x, m.players[0].y, 'water'), 'cannot enter');
  bad({ ...m, players: [...m.players, { ...m.players[0], y: 0 }] }, 'twice');
  if (problems({ ...setTile(m, 15, 0, 'throne'), objective: 'seize' }).length) fail('challenge: a seize map with a throne should be playable');
  const withHouse = setTile(m, 5, 5, 'house');
  if (withHouse.houses.length !== 1 || setTile(withHouse, 5, 5, 'plains').houses.length) fail('challenge: painting a house should add its contents, painting over it remove them');
  if (resize(m, 8, 8).enemies.some(e => e.x >= 8 || e.y >= 8)) fail('challenge: shrinking the map should drop units outside it');

  // export and import give back the same map
  const back = parseChallenge(exportChallenge({ ...m, best: 4 }));
  if (!back.ok || JSON.stringify({ ...back.map }) !== JSON.stringify({ ...m, best: undefined })) fail('challenge: exported map did not import back unchanged');
  if (parseChallenge('{"version":1,"tiles":["..Z"]}').ok) fail('challenge: a map with unknown tiles should be refused');
  if (parseChallenge('not json').ok) fail('challenge: a non-JSON file should be refused');

  // the AI can play a challenge to the end without breaking anything
  s = createBattle(0, playerUnits(m), {}, toChapter(m));
  let o = outcome(s);
  while (o === 'ongoing' && s.turn <= 30) { s = playerTurn(s); o = outcome(s); if (o !== 'ongoing') break; s = enemyTurn(s); o = outcome(s); }
  console.log(`challenge auto-play: ${o} on turn ${s.turn}`);
}

const results: string[] = [];
for (let i = 0; i < 40; i++) results.push(runCampaign());
const wins = results.filter(r => r.includes('ch5:v')).length;
results.slice(0, 8).forEach(r => console.log(r));
const furthest: Record<string, number> = {};
results.forEach(r => { const last = r.split(' | ')[0].split(' ').pop()!; furthest[last.slice(0, 5)] = (furthest[last.slice(0, 5)] ?? 0) + 1; });
console.log('AI-vs-AI full clears:', wins, '/ 40. Stopping points:', furthest);
console.log(errors ? `${errors} errors` : 'data OK');
