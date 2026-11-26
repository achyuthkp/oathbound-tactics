import { CHAPTERS } from './data/chapters';
import { CHAR_TERRAIN, TERRAIN } from './data/terrain';
import { BATTLE_BOND, SUPPORT_KEYS, pairKey } from './data/supports';
import { canAttackAt, counterWeapon, forecast, rollCombat, type Forecast, type RNG, type Strike } from './combat';
import { HEAL_EXP, combatExp, gainExp } from './progression';
import { computeReach, manhattan, moveCost, unitAt } from './pathfinding';
import type { BattleState, House, Pos, Stats, Team, TerrainId, Unit } from './types';
import { MAX_POTIONS, POTION_HEAL, canTake, giveItem, picksOf, type TradeItem, wear, attackWeapons, clone, goldValue, makeEnemy, makeWeapon, sellPrice, shiftToDragon, shiftToHuman, staffIndex, wdef } from './units';
import { WEAPONS } from './data/weapons';
import { CHARACTERS } from './data/characters';
import { CLASSES } from './data/classes';

export const MAX_UNITS_PER_SIDE = 10;

/** Attacking one guard wakes other guards this close to it. */
const GUARD_WAKE_RADIUS = 4;

export interface LevelUpEvent { unitId: string; name: string; level: number; gains: Partial<Stats>; }
export interface BattleEvents {
  levelUps: LevelUpEvent[];
  exp: { unitId: string; amount: number }[];
  defeated: { id: string; name: string; team: Team }[];
  gold: number;
  /** Weapons that broke from wear. */
  broken: { unitId: string; name: string }[];
}
const noEvents = (): BattleEvents => ({ levelUps: [], exp: [], defeated: [], gold: 0, broken: [] });

export interface BattleResult {
  units: Unit[];
  fallen: Unit[];
  bondGains: Record<string, number>;
  gold: number;
  kills: number;
  turns: number;
  /** Characters recruited from houses during the battle. */
  recruits: string[];
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
  const ordered = [...roster].filter(u => u.hp > 0 && (!u.reserve || u.isLord)).sort((a, b) => Number(!!b.isLord) - Number(!!a.isLord));
  const players: Unit[] = ordered.slice(0, Math.min(ch.playerStarts.length, MAX_UNITS_PER_SIDE)).map((u, i) => ({
    ...clone(u), team: 'player', x: ch.playerStarts[i].x, y: ch.playerStarts[i].y, done: false,
  }));
  let n = 0;
  const enemies = ch.enemies.slice(0, MAX_UNITS_PER_SIDE).map(sp => makeEnemy(sp, `e${++n}`));
  return {
    chapterIndex, map, width: map[0].length, height: map.length,
    units: [...players, ...enemies], turn: 1, phase: 'player', ranks: { ...ranks },
    bondGains: {}, goldEarned: 0, kills: 0, fallenUnits: [],
    log: [`Chapter ${ch.number}: ${ch.title}`], seized: false, enemyCounter: n, visited: [], burned: [], opened: [], recruited: [],
  };
}

export function toResult(s: BattleState): BattleResult {
  // nobody carries a dragon's stats home
  const human = (u: Unit) => { const c = clone(u); shiftToHuman(c); return c; };
  return {
    units: s.units.filter(u => u.team === 'player').map(human), fallen: s.fallenUnits.map(human),
    bondGains: s.bondGains, gold: s.goldEarned, kills: s.kills, turns: s.turn, recruits: s.recruited ?? [],
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
  // Attacking a guard, or dropping any enemy beside one, raises the alarm for the nearby post.
  if (def.team === 'enemy' && (def.ai === 'guard' || def.hp <= 0)) {
    for (const ally of s.units) {
      if (ally.team === 'enemy' && ally.ai === 'guard' && ally.hp > 0 && manhattan(ally, def) <= GUARD_WAKE_RADIUS) {
        ally.ai = 'aggressive';
      }
    }
  }
  // every blow that lands wears the weapon that dealt it
  // ponytail: a weapon on its last use still finishes the round it started; break it mid-round if that ever matters
  const counter = counterWeapon(def, manhattan(att, def));
  for (const [me, role, idx] of [[att, 'att', weaponIdx], [def, 'def', counter ?? -1]] as [Unit, 'att' | 'def', number][]) {
    const broke = wear(me, idx, strikes.filter(st => st.by === role && st.hit).length);
    if (broke) { events.broken.push({ unitId: me.id, name: broke }); log(s, `${me.name}'s ${broke} broke.`); }
  }

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
      const g = goldValue(u) + (u.loot ?? 0); // a thief drops what it stole
      events.gold += g;
      s.goldEarned += g;
      s.kills += 1;
      log(s, `${u.name} was defeated. +${g} gold.${recover(s, u, u === att ? def : att)}`);
    } else {
      s.fallenUnits.push(clone(u));
      log(s, `${u.name} has fallen.`);
    }
  }
  s.units = s.units.filter(u => u.hp > 0);
  return { state: s, strikes, forecast: fc, events };
}

/**
 * A defeated enemy's keys, vulneraries (enemies only carry stolen ones) and stolen weapons go into
 * the victor's pack. A key with no room is lost; anything else with no room is sold, as at houses.
 */
function recover(s: BattleState, foe: Unit, w: Unit): string {
  const got: string[] = [];
  let lostKeys = 0, sold = 0;
  for (let i = 0; i < (foe.keys ?? 0); i++) {
    if (canTake(w, 'keys')) { w.keys = (w.keys ?? 0) + 1; got.push('a key'); } else lostKeys++;
  }
  for (let i = 0; i < foe.potions; i++) {
    if (canTake(w, 'potions')) { w.potions += 1; got.push('a vulnerary'); } else sold += 150;
  }
  for (const it of foe.weapons.filter(x => x.stolen)) {
    if (canTake(w)) { w.weapons.push({ ...it, stolen: undefined }); got.push(`the ${wdef(it).name}`); } else sold += sellPrice(it);
  }
  s.goldEarned += sold;
  return (got.length ? ` ${w.name} took back ${got.join(', ')}.` : '')
    + (lostKeys ? ` ${w.name} has no room for ${lostKeys === 1 ? 'its key; it was' : 'its keys; they were'} left behind.` : '')
    + (sold ? ` No room for the rest; it was sold for ${sold} gold.` : '');
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
  const broke = wear(healer, healer.equipped, 1);
  if (broke) { events.broken.push({ unitId: healer.id, name: broke }); log(s, `${healer.name}'s ${broke} broke.`); }
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

/** Houses that still stand with their reward: not yet visited and not burned. */
export function openHouses(s: BattleState): House[] {
  const gone = new Set([...(s.visited ?? []), ...(s.burned ?? [])]);
  return (CHAPTERS[s.chapterIndex].houses ?? []).filter(h => !gone.has(`${h.x},${h.y}`));
}

/** The open house a player unit is standing on, if any. */
export function houseAt(s: BattleState, u: Unit): House | undefined {
  return u.team === 'player' ? openHouses(s).find(h => h.x === u.x && h.y === u.y) : undefined;
}

/** A raider standing on an open house burns it down; its reward is lost. Null if there is nothing to burn. */
export function applyBurn(state: BattleState, unitId: string): BattleState | null {
  const u = state.units.find(x => x.id === unitId);
  const h = u && u.team === 'enemy' && CLASSES[u.classId]?.raids && openHouses(state).find(x => x.x === u.x && x.y === u.y);
  if (!u || !h) return null;
  const s = clone(state);
  s.burned = [...(s.burned ?? []), `${h.x},${h.y}`];
  log(s, `${u.name} burned a house to the ground.`);
  return s;
}

/** Hand a house's or chest's reward to a unit. Returns a line for the player. */
function grant(s: BattleState, u: Unit, h: House): string {
  let reward = 'Nothing but good wishes.';
  if (h.gold) { s.goldEarned += h.gold; reward = `Received ${h.gold} gold.`; }
  if (h.potion) {
    if (canTake(u, 'potions')) { u.potions += 1; reward = 'Received a vulnerary.'; }
    else { s.goldEarned += 150; reward = `${u.name} has no room for a vulnerary; took 150 gold instead.`; }
  }
  if (h.weapon) {
    const w = WEAPONS[h.weapon];
    if (canTake(u)) { u.weapons.push(makeWeapon(h.weapon)); reward = `Received a ${w.name}.`; }
    else { const g = Math.floor(w.price / 2); s.goldEarned += g; reward = `${u.name}'s pack is full; the ${w.name} was sold for ${g} gold.`; }
  }
  if (h.recruit) {
    s.recruited = [...(s.recruited ?? []), h.recruit];
    reward = `${CHARACTERS[h.recruit]?.name ?? h.recruit} will join your army after the battle.`;
  }
  return reward;
}

/** Visit the house under a unit and take its reward. `reward` is a line for the player. */
export function applyVisit(state: BattleState, unitId: string): { state: BattleState; house: House; reward: string } | null {
  const s = clone(state);
  const u = s.units.find(x => x.id === unitId);
  const h = u && houseAt(s, u);
  if (!u || !h) return null;
  s.visited = [...(s.visited ?? []), `${h.x},${h.y}`];
  const reward = grant(s, u, h);
  log(s, `${u.name} visited a house. ${reward}`);
  return { state: s, house: h, reward };
}

/* ---------- locks: treasure chests, doors and gates ---------- */

export type Tool = 'key' | 'pick';
export interface Lock extends Pos { kind: 'chest' | 'door' | 'gate'; }

/** Chests nobody has opened yet. */
export function openChests(s: BattleState): House[] {
  const gone = new Set(s.opened ?? []);
  return (CHAPTERS[s.chapterIndex].chests ?? []).filter(h => !gone.has(`${h.x},${h.y}`));
}
/** Doors and gates still shut. */
export function shutDoors(s: BattleState): Pos[] {
  return s.map.flatMap((row, y) => row.flatMap((t, x) => (t === 'door' || t === 'gate' ? [{ x, y }] : [])));
}
/** What a unit can open a lock with: a key in a player unit's pack, a lockpick in a thief's (either side). */
export const openTools = (u: Unit): Tool[] => [
  ...(u.team === 'player' && (u.keys ?? 0) > 0 ? ['key' as const] : []),
  ...(CLASSES[u.classId]?.steals && picksOf(u).length ? ['pick' as const] : []),
];
/** Locks this unit could open now: an unopened chest under or beside it, a shut door or gate beside it. */
export function locksNear(s: BattleState, u: Unit): Lock[] {
  if (!openTools(u).length) return [];
  const out: Lock[] = openChests(s).filter(h => manhattan(h, u) <= 1).map(h => ({ x: h.x, y: h.y, kind: 'chest' }));
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const t = s.map[u.y + dy]?.[u.x + dx];
    if (t === 'door' || t === 'gate') out.push({ x: u.x + dx, y: u.y + dy, kind: t });
  }
  return out;
}
/** What a chest is worth to an enemy thief, who carries it off as plunder. */
const plunder = (h: House): number => (h.gold ?? 0) + (h.weapon ? Math.floor(WEAPONS[h.weapon].price / 2) : 0) + (h.potion ? 150 : 0);

/**
 * Open a lock within reach, spending one key or one lockpick. A chest gives a player its contents
 * (an enemy thief carries them until defeated); a door or gate becomes an open passage for everyone.
 */
export function applyOpen(state: BattleState, unitId: string, at: Pos, tool: Tool): { state: BattleState; lock: Lock; chest?: House; reward: string } | null {
  const s = clone(state);
  const u = s.units.find(x => x.id === unitId);
  const lock = u && openTools(u).includes(tool) ? locksNear(s, u).find(l => l.x === at.x && l.y === at.y) : undefined;
  if (!u || !lock) return null;
  if (tool === 'pick') u.picks = picksOf(u).map((p, i) => (i === 0 ? p - 1 : p)).filter(p => p > 0); // the first lockpick wears; at zero it snaps
  else u.keys = (u.keys ?? 0) - 1;
  let reward: string;
  let chest: House | undefined;
  if (lock.kind === 'chest') {
    chest = openChests(s).find(h => h.x === lock.x && h.y === lock.y)!;
    s.opened = [...(s.opened ?? []), `${lock.x},${lock.y}`];
    if (u.team === 'player') reward = grant(s, u, chest);
    else { u.loot = (u.loot ?? 0) + plunder(chest); reward = `${u.name} emptied the chest. Defeat them to take it back.`; }
  } else {
    s.map[lock.y][lock.x] = lock.kind === 'door' ? 'doorway' : 'gateway';
    reward = `The ${lock.kind} stands open.`;
  }
  log(s, `${u.name} opened a ${lock.kind} with a ${tool === 'pick' ? 'lockpick' : 'key'}. ${reward}`);
  return { state: s, lock, chest, reward };
}

/* ---------- trading ---------- */

export type { TradeItem };
/** Allies standing next to a unit. */
export const tradePartners = (s: BattleState, u: Unit): Unit[] => s.units.filter(t => t.team === u.team && t.id !== u.id && manhattan(t, u) === 1);

/** Hand one item to an adjacent ally with room for it. Personal weapons stay with their owner. */
export function applyTrade(state: BattleState, fromId: string, toId: string, item: TradeItem): BattleState | null {
  const s = clone(state);
  const a = s.units.find(x => x.id === fromId), b = s.units.find(x => x.id === toId);
  if (!a || !b || a.team !== b.team || manhattan(a, b) !== 1) return null;
  const what = giveItem(a, b, item);
  if (!what) return null;
  log(s, `${a.name} gave ${b.name} a ${what}.`);
  return s;
}

/* ---------- stealing ---------- */

export interface StealOption { targetId: string; kind: 'weapon' | 'potion' | 'key'; index: number; label: string; }

/**
 * What a thief can take right now, from adjacent enemies it is at least as fast as: vulneraries,
 * and any weapon that is not a personal one if the thief has room. Taking the weapon out of
 * their hand needs 4 more Spd than the victim. Bosses are not exempt.
 */
export function stealOptions(s: BattleState, u: Unit): StealOption[] {
  if (!CLASSES[u.classId]?.steals) return [];
  const out: StealOption[] = [];
  for (const t of s.units) {
    if (t.team === u.team || manhattan(t, u) !== 1 || t.stats.spd > u.stats.spd) continue;
    if (canTake(u)) {
      // the weapon in hand is harder: the thief must be 4 faster
      const disarm = u.stats.spd >= t.stats.spd + 4;
      t.weapons.forEach((w, i) => { if (wdef(w).tier < 99 && (i !== t.equipped || disarm)) out.push({ targetId: t.id, kind: 'weapon', index: i, label: `${wdef(w).name} from ${t.name}` }); });
    }
    if ((t.keys ?? 0) > 0 && canTake(u, 'keys')) out.push({ targetId: t.id, kind: 'key', index: 0, label: `Key from ${t.name}` });
    if (t.potions > 0 && canTake(u, 'potions')) out.push({ targetId: t.id, kind: 'potion', index: 0, label: `Vulnerary from ${t.name}` });
  }
  return out;
}

export function applySteal(state: BattleState, unitId: string, opt: StealOption): { state: BattleState; reward: string } | null {
  const s = clone(state);
  const u = s.units.find(x => x.id === unitId);
  const t = s.units.find(x => x.id === opt.targetId);
  if (!u || !t || !stealOptions(s, u).some(o => o.targetId === opt.targetId && o.kind === opt.kind && o.index === opt.index)) return null;
  let reward: string;
  if (opt.kind === 'key') { t.keys = (t.keys ?? 0) - 1; u.keys = (u.keys ?? 0) + 1; reward = `Stole a key from ${t.name}.`; }
  else if (opt.kind === 'potion') { t.potions -= 1; u.potions += 1; reward = `Stole a vulnerary from ${t.name}.`; }
  else {
    const [w] = t.weapons.splice(opt.index, 1);
    u.weapons.push(u.team === 'enemy' ? { ...w, stolen: true } : { ...w, stolen: undefined });
    // keep the victim holding the same weapon if they still have it, otherwise whatever is first
    t.equipped = opt.index < t.equipped ? t.equipped - 1 : opt.index === t.equipped ? 0 : t.equipped;
    reward = `Stole ${wdef(w).name} from ${t.name}.`;
  }
  log(s, `${u.name}: ${reward}`);
  return { state: s, reward };
}

/* ---------- dragon form ---------- */

export const canTransform = (u: Unit): boolean => !!CLASSES[u.classId]?.shifts && !u.dragon && (u.stones ?? 0) > 0;

/** Spend a dragonstone and take dragon form. Uses the unit's action. */
export function applyTransform(state: BattleState, unitId: string): BattleState | null {
  const s = clone(state);
  const u = s.units.find(x => x.id === unitId);
  if (!u || !canTransform(u)) return null;
  shiftToDragon(u);
  log(s, `${u.name} takes dragon form.`);
  return s;
}

/** Start of a side's phase: its dragons are one turn closer to changing back. */
function tickDragons(s: BattleState, team: Team) {
  for (const u of s.units) {
    if (u.team !== team || !u.dragon) continue;
    u.dragon -= 1;
    if (u.dragon <= 0) { shiftToHuman(u); log(s, `${u.name} returns to human form.`); }
  }
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
  tickDragons(s, 'enemy');
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
  tickDragons(s, 'player');
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
