/* Headless sanity test: validates map data and auto-plays the campaign with
   AI controlling both sides. Run: npx esbuild test/sim.ts --bundle --platform=node --outfile=/tmp/sim.cjs && node /tmp/sim.cjs */
import { CHAPTERS } from '../src/game/data/chapters';
import { TERRAIN } from '../src/game/data/terrain';
import { CLASSES } from '../src/game/data/classes';
import { WEAPONS } from '../src/game/data/weapons';
import { planEnemy } from '../src/game/ai';
import { forecast } from '../src/game/combat';
import { applyAttack, applyHeal, createBattle, endEnemyPhase, endPlayerPhase, healTargets, markDone, outcome, parseMap, toResult } from '../src/game/battle';
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
  if (ch.map.length !== 10) fail(`ch${ci} rows ${ch.map.length}`);
  ch.map.forEach((r, y) => r.length !== 14 && fail(`ch${ci} row ${y} len ${r.length}`));
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
  if (ch.objective.type === 'seize' && map[ch.objective.y][ch.objective.x] !== 'throne') fail('seize tile');
});

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

const results: string[] = [];
for (let i = 0; i < 40; i++) results.push(runCampaign());
const wins = results.filter(r => r.includes('ch5:v')).length;
results.slice(0, 8).forEach(r => console.log(r));
const furthest: Record<string, number> = {};
results.forEach(r => { const last = r.split(' | ')[0].split(' ').pop()!; furthest[last.slice(0, 5)] = (furthest[last.slice(0, 5)] ?? 0) + 1; });
console.log('AI-vs-AI full clears:', wins, '/ 40. Stopping points:', furthest);
console.log(errors ? `${errors} errors` : 'data OK');
