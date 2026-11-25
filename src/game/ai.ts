import { TERRAIN } from './data/terrain';
import { canAttackAt, forecast, type Forecast } from './combat';
import { computeReach, destinations, key, manhattan, pathTo, unitAt, type ReachNode } from './pathfinding';
import type { BattleState, Pos, Unit } from './types';
import { attackWeapons, classOf, isFlying, movOf, wdef } from './units';
import { canTransform, openChests, openHouses, openTools, shutDoors } from './battle';

export interface AIPlan {
  unitId: string;
  path: Pos[];
  attack?: { targetId: string; weaponIdx: number };
  /** The unit ends its move on this house and burns it. */
  raid?: Pos;
  /** A thief ends its move at this lock and picks it: a chest to empty, or a door in the way. */
  loot?: Pos;
  /** A dragonkin spends its action taking dragon form. */
  transform?: boolean;
}

/** Walk a route as far as this turn's movement allows, stopping on the last free tile. */
function advanceAlong(s: BattleState, unit: Unit, full: Map<number, ReachNode>, route: Pos[]): Pos[] {
  const m = movOf(unit);
  let end = 0;
  for (let i = 0; i < route.length; i++) {
    if (full.get(key(route[i].x, route[i].y))!.cost > m) break;
    if (!unitAt(s, route[i].x, route[i].y, unit.id)) end = i;
  }
  return route.slice(0, end + 1);
}

/** Head for the nearest of some tiles (houses to burn, chests to empty). Null when none can be reached. */
function planGoTo(s: BattleState, unit: Unit, places: Pos[]): { path: Pos[]; arrived?: Pos } | null {
  const full = computeReach(s, unit, Number.POSITIVE_INFINITY);
  let goal: ReachNode | null = null;
  for (const h of places) {
    const node = full.get(key(h.x, h.y));
    if (!node || unitAt(s, h.x, h.y, unit.id)) continue; // unreachable, or someone is standing in the doorway
    if (!goal || node.cost < goal.cost) goal = node;
  }
  if (!goal) return null;
  const path = advanceAlong(s, unit, full, pathTo(full, goal.x, goal.y));
  const last = path[path.length - 1];
  return { path, arrived: last.x === goal.x && last.y === goal.y ? { x: goal.x, y: goal.y } : undefined };
}

/** Chance that `hits` counterattacks at `hitP` each deal at least `hp` total damage. */
function killChance(dmg: number, hits: number, hitP: number, hp: number): number {
  if (dmg <= 0 || hits <= 0 || hp <= 0) return 0;
  const need = Math.ceil(hp / dmg);
  if (need > hits) return 0;
  if (need <= 1) return 1 - Math.pow(1 - hitP, hits);
  if (hits === 2 && need === 2) return hitP * hitP;
  return Math.pow(hitP, need); // attacks are at most two per side today
}

interface ThreatSource {
  id: string;
  /** Tiles this foe could attack next turn. */
  tiles: Set<number>;
  /** Raw damage from its best weapon, before the defender's Def and terrain. */
  dmg: number;
}

/** Where the player's army can strike next turn, used to avoid ending a move in the open. */
function buildThreats(s: BattleState, unit: Unit): ThreatSource[] {
  const moveType = classOf(unit).moveType;
  const out: ThreatSource[] = [];
  for (const foe of s.units) {
    if (foe.team === unit.team || foe.hp <= 0) continue;
    const reach = computeReach(s, foe);
    const tiles = new Set<number>();
    let dmg = 0;
    for (const node of reach.values()) {
      for (const wi of attackWeapons(foe)) {
        const inst = foe.weapons[wi];
        const w = wdef(inst);
        const might = (w.might + (inst.forge ?? 0)) * (w.effective?.includes(moveType) ? 3 : 1);
        dmg = Math.max(dmg, foe.stats.str + might);
        for (let y = Math.max(0, node.y - w.maxRange); y <= Math.min(s.height - 1, node.y + w.maxRange); y++) {
          for (let x = Math.max(0, node.x - w.maxRange); x <= Math.min(s.width - 1, node.x + w.maxRange); x++) {
            const dist = Math.abs(x - node.x) + Math.abs(y - node.y);
            if (dist >= w.minRange && dist <= w.maxRange) tiles.add(key(x, y));
          }
        }
      }
    }
    if (tiles.size) out.push({ id: foe.id, tiles, dmg });
  }
  return out;
}

function scoreAttack(s: BattleState, fc: Forecast, unit: Unit, target: Unit, at: Pos, threats: ThreatSource[]): number {
  const p = Math.max(0, Math.min(1, fc.att.hit / 100));
  const per = fc.att.dmg;
  const n = fc.att.attacks;
  const raw = p * per * n;
  const expected = Math.min(target.hp, raw);
  const overkill = Math.max(0, raw - target.hp);
  let killP = 0;
  if (per > 0 && per >= target.hp) killP = 1 - Math.pow(1 - p, n);
  else if (per > 0 && n === 2 && per * 2 >= target.hp) killP = p * p;
  const counter = (fc.def.hit / 100) * fc.def.dmg * fc.def.attacks * (1 - killP);
  const deathP = killChance(fc.def.dmg, fc.def.attacks, fc.def.hit / 100, unit.hp) * (1 - killP);
  const t = isFlying(unit) ? TERRAIN.plains : TERRAIN[s.map[at.y][at.x]];
  const cleric = classOf(target).id === 'cleric';
  // Killing the lord ends the battle; healers remove the player's sustain.
  const priority = (target.isLord ? 14 : 0) + (cleric ? 9 : 0);
  const finish = target.hp <= per * Math.max(1, n) ? 4 : 0;
  // Trading a common soldier for the lord or a healer is usually worth it.
  const trade = target.isLord ? 0.15 : cleric ? 0.5 : 1;
  let exposure = 0;
  for (const th of threats) {
    if (th.id === target.id || !th.tiles.has(key(at.x, at.y))) continue;
    exposure += Math.max(0, th.dmg - unit.stats.def - t.def);
  }
  const wounded = 1 + (1 - Math.min(1, unit.hp / Math.max(1, unit.stats.hp)));
  const safety = exposure * 0.35 * wounded + deathP * 24 * trade;
  const score = 10 + expected * 2 + killP * 40 + priority + finish
    - overkill * 0.3 - counter * 0.8 - safety
    + t.def * 2 + t.avo / 10 + (t.heal > 0 && unit.hp < unit.stats.hp * 0.6 ? 8 : 0)
    - (per <= 0 ? 15 : 0);
  // Do not charge into a near-certain counter-death for chip damage. Killing the lord or a
  // healer is still worth the trade, and a real kill roll is not treated as suicide.
  const doomed = deathP > 0.7 && killP < 0.35 && !target.isLord && !cleric;
  return doomed ? score - 1000 : score;
}

/**
 * Enemy behaviour:
 *  - aggressive: attack the best target in reach, otherwise march toward the nearest player.
 *  - guard: wait in place until a player wanders into reach (or it is attacked).
 *  - hold: never moves; attacks anyone in range of its current tile (bosses, gatekeepers).
 *  - raid (brigands only: the class must have `raids`): ignores the army and goes to burn houses; a unit standing on a house protects it.
 *    With nothing left to burn (or reach) it fights like an aggressive unit.
 *  - loot (thieves only: the class must have `steals`): goes for the nearest unopened chest and
 *    empties it, picking a door on the way if the chests are locked in, then fights like an aggressive unit. Defeating it returns what it took.
 */
export function planEnemy(s: BattleState, unit: Unit): AIPlan {
  if (unit.ai === 'raid' && classOf(unit).raids) {
    const go = planGoTo(s, unit, openHouses(s));
    if (go) return { unitId: unit.id, path: go.path, raid: go.arrived };
  }
  if (unit.ai === 'loot' && openTools(unit).includes('pick')) {
    const go = planGoTo(s, unit, openChests(s));
    if (go) return { unitId: unit.id, path: go.path, loot: go.arrived };
    // every chest left is behind a lock: go and pick the nearest door
    const doors = shutDoors(s);
    const by = planGoTo(s, unit, doors.flatMap(d => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: d.x + dx, y: d.y + dy }))));
    if (by) return { unitId: unit.id, path: by.path, loot: by.arrived && doors.find(d => manhattan(d, by.arrived!) === 1) };
  }
  // a dragonkin with a stone left changes shape as soon as a fight is close
  if (canTransform(unit) && s.units.some(t => t.team !== unit.team && manhattan(t, unit) <= movOf(unit))) {
    return { unitId: unit.id, path: [{ x: unit.x, y: unit.y }], transform: true };
  }
  const here = { x: unit.x, y: unit.y };
  const stay: AIPlan = { unitId: unit.id, path: [here] };
  const reach = computeReach(s, unit);
  const dests = unit.ai === 'hold' ? [here] : destinations(s, unit, reach);
  const weapons = attackWeapons(unit);
  const targets = s.units.filter(u => u.team !== unit.team && u.hp > 0);
  const threats = buildThreats(s, unit);

  let best: { score: number; to: Pos; targetId: string; widx: number } | null = null;
  for (const d of dests) {
    for (const t of targets) {
      const dist = manhattan(d, t);
      for (const wi of weapons) {
        if (!canAttackAt(unit, wi, dist)) continue;
        const fc = forecast(s, unit, t, wi, d);
        const score = scoreAttack(s, fc, unit, t, d, threats);
        if (!best || score > best.score) best = { score, to: d, targetId: t.id, widx: wi };
      }
    }
  }
  if (best && best.score > -500) {
    const path = unit.ai === 'hold' ? [here] : pathTo(reach, best.to.x, best.to.y);
    return { unitId: unit.id, path, attack: { targetId: best.targetId, weaponIdx: best.widx } };
  }
  if (unit.ai !== 'aggressive' && unit.ai !== 'raid' && unit.ai !== 'loot') return stay;

  const full = computeReach(s, unit, Number.POSITIVE_INFINITY);

  // A wounded attacker with nothing to hit falls back to a fort or throne rather than feeding.
  // Guards and holders returned above, so only aggressive, raid and loot units reach this point.
  if (unit.hp < unit.stats.hp * 0.5) {
    let heal: ReachNode | null = null;
    for (const node of full.values()) {
      if (TERRAIN[s.map[node.y][node.x]].heal <= 0 || unitAt(s, node.x, node.y, unit.id)) continue;
      if (!heal || node.cost < heal.cost) heal = node;
    }
    if (heal) return { unitId: unit.id, path: advanceAlong(s, unit, full, pathTo(full, heal.x, heal.y)) };
  }

  // Advance: find the cheapest tile from which some target would be in range, then walk toward it.
  const maxR = Math.max(1, ...weapons.map(i => wdef(unit.weapons[i]).maxRange));
  let goal: ReachNode | null = null;
  for (const node of full.values()) {
    if (unitAt(s, node.x, node.y, unit.id)) continue;
    if (!targets.some(t => manhattan(node, t) <= maxR)) continue;
    if (!goal || node.cost < goal.cost) goal = node;
  }
  if (!goal) return stay;
  return { unitId: unit.id, path: advanceAlong(s, unit, full, pathTo(full, goal.x, goal.y)) };
}
