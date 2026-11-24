import { CHAPTERS } from './data/chapters';
import { CHAR_TERRAIN, TERRAIN } from './data/terrain';
import { BATTLE_BOND, SUPPORT_KEYS, pairKey } from './data/supports';
import { canAttackAt, forecast, rollCombat, type Forecast, type RNG, type Strike } from './combat';
import { HEAL_EXP, combatExp, gainExp } from './progression';
import { computeReach, manhattan, moveCost, unitAt } from './pathfinding';
import type { BattleState, Stats, Team, TerrainId, Unit } from './types';
import { MAX_POTIONS, POTION_HEAL, attackWeapons, clone, goldValue, makeEnemy, staffIndex, wdef } from './units';

export const MAX_UNITS_PER_SIDE = 10;

export interface LevelUpEvent { unitId: string; name: string; level: number; gains: Partial<Stats>; }
export interface BattleEvents {
  levelUps: LevelUpEvent[];
  exp: { unitId: string; amount: number }[];
  defeated: { id: string; name: string; team: Team }[];
  gold: number;
}
const noEvents = (): BattleEvents => ({ levelUps: [], exp: [], defeated: [], gold: 0 });

export interface BattleResult {
  units: Unit[];
  fallen: Unit[];
  bondGains: Record<string, number>;
  gold: number;
  kills: number;
  turns: number;
}

export function parseMap(rows: string[]): TerrainId[][] {
  return rows.map(r => r.split('').map(ch => CHAR_TERRAIN[ch] ?? 'plains'));
}

function log(s: BattleState, line: string) {
  s.log = [...s.log.slice(-40), line];
}

export function createBattle(chapterIndex: number, roster: Unit[], ranks: Record<string, number>): BattleState {
  const ch = CHAPTERS[chapterIndex];
  const map = parseMap(ch.map);
  const ordered = [...roster].filter(u => u.hp > 0).sort((a, b) => Number(!!b.isLord) - Number(!!a.isLord));
  const players: Unit[] = ordered.slice(0, Math.min(ch.playerStarts.length, MAX_UNITS_PER_SIDE)).map((u, i) => ({
    ...clone(u), team: 'player', x: ch.playerStarts[i].x, y: ch.playerStarts[i].y, done: false,
  }));
  let n = 0;
  const enemies = ch.enemies.slice(0, MAX_UNITS_PER_SIDE).map(sp => makeEnemy(sp, `e${++n}`));
  return {
    chapterIndex, map, width: map[0].length, height: map.length,
    units: [...players, ...enemies], turn: 1, phase: 'player', ranks: { ...ranks },
    bondGains: {}, goldEarned: 0, kills: 0, fallenUnits: [],
    log: [`Chapter ${ch.number}: ${ch.title}`], seized: false, enemyCounter: n,
  };
}

export function toResult(s: BattleState): BattleResult {
  return {
    units: s.units.filter(u => u.team === 'player'), fallen: s.fallenUnits,
    bondGains: s.bondGains, gold: s.goldEarned, kills: s.kills, turns: s.turn,
  };
}

export type Outcome = 'ongoing' | 'victory' | 'defeat';

export function outcome(s: BattleState): Outcome {
  const players = s.units.filter(u => u.team === 'player');
  if (!players.some(u => u.isLord)) return 'defeat';
  const ch = CHAPTERS[s.chapterIndex];
  const enemies = s.units.filter(u => u.team === 'enemy');
  const pending = (ch.reinforcements ?? []).some(r => r.turn > s.turn);
  switch (ch.objective.type) {
    case 'rout': return enemies.length === 0 ? 'victory' : 'ongoing';
    case 'boss': return enemies.some(u => u.isBoss) ? 'ongoing' : 'victory';
    case 'survive': return s.turn > ch.objective.turns || (enemies.length === 0 && !pending) ? 'victory' : 'ongoing';
    case 'seize': return s.seized ? 'victory' : 'ongoing';
  }
}

export function attackableTargets(s: BattleState, u: Unit): Unit[] {
  const ws = attackWeapons(u);
  return s.units.filter(t => t.team !== u.team && t.hp > 0 && ws.some(i => canAttackAt(u, i, manhattan(u, t))));
}

export function healTargets(s: BattleState, u: Unit): Unit[] {
  const si = staffIndex(u);
  if (si < 0) return [];
  const w = wdef(u.weapons[si]);
  return s.units.filter(t => t.team === u.team && t.id !== u.id && t.hp < t.stats.hp &&
    manhattan(u, t) >= w.minRange && manhattan(u, t) <= w.maxRange);
}

export function healAmount(u: Unit): number {
  const si = staffIndex(u);
  if (si < 0) return 0;
  return (wdef(u.weapons[si]).heal ?? 0) + Math.floor(u.stats.skl / 2);
}

/** Choose the weapon with the best expected damage against a target from the unit's current tile. */
export function bestWeaponFor(s: BattleState, u: Unit, target: Unit): number {
  const dist = manhattan(u, target);
  let best = -1, bestScore = -Infinity;
  for (const i of attackWeapons(u)) {
    if (!canAttackAt(u, i, dist)) continue;
    const fc = forecast(s, u, target, i);
    const score = fc.att.hit * fc.att.dmg * fc.att.attacks - fc.def.hit * fc.def.dmg * fc.def.attacks * 0.5;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best >= 0 ? best : u.equipped;
}

export function applyAttack(state: BattleState, attId: string, defId: string, weaponIdx: number, rng: RNG):
  { state: BattleState; strikes: Strike[]; forecast: Forecast; events: BattleEvents } {
  const s = clone(state);
  const att = s.units.find(u => u.id === attId)!;
  const def = s.units.find(u => u.id === defId)!;
  att.equipped = weaponIdx;
  const fc = forecast(s, att, def, weaponIdx);
  const strikes = rollCombat(fc, att.hp, def.hp, rng);
  const last = strikes[strikes.length - 1];
  if (last) { att.hp = last.attHp; def.hp = last.defHp; }
  const events = noEvents();
  if (def.team === 'enemy' && def.ai === 'guard') def.ai = 'aggressive';

  const dealt = (role: 'att' | 'def') => strikes.filter(st => st.by === role && st.hit).reduce((a, st) => a + st.dmg, 0);
  log(s, `${att.name} attacked ${def.name}, dealing ${dealt('att')} and taking ${dealt('def')}.`);

  const pairs: [Unit, Unit, 'att' | 'def'][] = [[att, def, 'att'], [def, att, 'def']];
  for (const [me, foe, role] of pairs) {
    if (me.team !== 'player' || me.hp <= 0) continue;
    const landed = strikes.some(st => st.by === role && st.hit);
    const amount = combatExp(me, foe, landed, foe.hp <= 0);
    const res = gainExp(me, amount, rng);
    Object.assign(me, res.unit);
    events.exp.push({ unitId: me.id, amount });
    res.levelUps.forEach((g, i) => events.levelUps.push({ unitId: me.id, name: me.name, level: me.level - res.levelUps.length + i + 1, gains: g }));
  }

  for (const u of [att, def]) {
    if (u.hp > 0) continue;
    events.defeated.push({ id: u.id, name: u.name, team: u.team });
    if (u.team === 'enemy') {
      const g = goldValue(u);
      events.gold += g;
      s.goldEarned += g;
      s.kills += 1;
      log(s, `${u.name} was defeated. +${g} gold.`);
    } else {
      s.fallenUnits.push(clone(u));
      log(s, `${u.name} has fallen.`);
    }
  }
  s.units = s.units.filter(u => u.hp > 0);
  return { state: s, strikes, forecast: fc, events };
}

export function applyHeal(state: BattleState, healerId: string, targetId: string, rng: RNG):
  { state: BattleState; amount: number; events: BattleEvents } {
  const s = clone(state);
  const healer = s.units.find(u => u.id === healerId)!;
  const target = s.units.find(u => u.id === targetId)!;
  const amount = Math.min(healAmount(healer), target.stats.hp - target.hp);
  target.hp += amount;
  healer.equipped = staffIndex(healer);
  const events = noEvents();
  if (healer.team === 'player') {
    const res = gainExp(healer, HEAL_EXP, rng);
    Object.assign(healer, res.unit);
    events.exp.push({ unitId: healer.id, amount: HEAL_EXP });
    res.levelUps.forEach((g, i) => events.levelUps.push({ unitId: healer.id, name: healer.name, level: healer.level - res.levelUps.length + i + 1, gains: g }));
  }
  log(s, `${healer.name} heals ${target.name} for ${amount}.`);
  return { state: s, amount, events };
}

export function applyPotion(state: BattleState, unitId: string): { state: BattleState; amount: number } {
  const s = clone(state);
  const u = s.units.find(x => x.id === unitId)!;
  const amount = Math.min(POTION_HEAL, u.stats.hp - u.hp);
  u.hp += amount;
  u.potions = Math.max(0, Math.min(MAX_POTIONS, u.potions - 1));
  log(s, `${u.name} drinks a vulnerary (+${amount}).`);
  return { state: s, amount };
}

export function applySeize(state: BattleState): BattleState {
  const s = clone(state);
  s.seized = true;
  log(s, 'The throne has been seized!');
  return s;
}

/** Ends a unit's action and awards bond points to partners standing next to it. */
export function markDone(state: BattleState, unitId: string): BattleState {
  const s: BattleState = { ...state, units: state.units.map(u => (u.id === unitId ? { ...u, done: true } : u)), bondGains: { ...state.bondGains } };
  const u = s.units.find(x => x.id === unitId);
  if (u && u.team === 'player') {
    for (const o of s.units) {
      if (o.team !== 'player' || o.id === u.id || manhattan(o, u) !== 1) continue;
      const k = pairKey(u.id, o.id);
      if (SUPPORT_KEYS.has(k)) s.bondGains[k] = (s.bondGains[k] ?? 0) + BATTLE_BOND;
    }
  }
  return s;
}

function terrainHeal(s: BattleState, team: Team): { unitId: string; amount: number }[] {
  const out: { unitId: string; amount: number }[] = [];
  for (const u of s.units) {
    if (u.team !== team) continue;
    const t = TERRAIN[s.map[u.y][u.x]];
    if (!t.heal || u.hp >= u.stats.hp) continue;
    const amount = Math.min(u.stats.hp - u.hp, Math.max(1, Math.floor((u.stats.hp * t.heal) / 100)));
    u.hp += amount;
    out.push({ unitId: u.id, amount });
  }
  return out;
}

export function endPlayerPhase(state: BattleState): { state: BattleState; heals: { unitId: string; amount: number }[] } {
  const s = clone(state);
  s.phase = 'enemy';
  for (const u of s.units) if (u.team === 'enemy') u.done = false;
  const heals = terrainHeal(s, 'enemy');
  return { state: s, heals };
}

/** Find the nearest free, passable tile for a reinforcement. */
function spawnTile(s: BattleState, u: Unit): { x: number; y: number } | null {
  const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < s.width && y < s.height &&
    Number.isFinite(moveCost(s, u, x, y)) && !unitAt(s, x, y);
  for (let r = 0; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== r) continue;
      if (ok(u.x + dx, u.y + dy)) return { x: u.x + dx, y: u.y + dy };
    }
  }
  return null;
}

export function endEnemyPhase(state: BattleState): { state: BattleState; heals: { unitId: string; amount: number }[]; spawned: string[] } {
  const s = clone(state);
  s.turn += 1;
  s.phase = 'player';
  for (const u of s.units) u.done = false;
  const heals = terrainHeal(s, 'player');
  const spawned: string[] = [];
  const ch = CHAPTERS[s.chapterIndex];
  for (const r of ch.reinforcements ?? []) {
    if (r.turn !== s.turn) continue;
    for (const sp of r.units) {
      if (s.units.filter(u => u.team === 'enemy').length >= MAX_UNITS_PER_SIDE) break;
      const u = makeEnemy(sp, `e${++s.enemyCounter}`);
      const tile = spawnTile(s, u);
      if (!tile) continue;
      u.x = tile.x; u.y = tile.y;
      s.units.push(u);
      spawned.push(u.id);
    }
  }
  if (spawned.length) log(s, `Enemy reinforcements have arrived! (${spawned.length})`);
  return { state: s, heals, spawned };
}

/** Handy for previews: can this unit reach a tile from which it can attack the target? */
export function canReachToAttack(s: BattleState, u: Unit, target: Unit): boolean {
  const reach = computeReach(s, u);
  for (const n of reach.values()) {
    if (unitAt(s, n.x, n.y, u.id)) continue;
    if (attackWeapons(u).some(i => canAttackAt(u, i, manhattan(n, target)))) return true;
  }
  return false;
}
