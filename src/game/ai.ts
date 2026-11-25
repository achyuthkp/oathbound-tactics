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

function scoreAttack(s: BattleState, fc: Forecast, unit: Unit, target: Unit, at: Pos): number {
  const p = fc.att.hit / 100;
  const per = fc.att.dmg;
  const n = fc.att.attacks;
  const expected = p * per * n;
  let killP = 0;
  if (per >= target.hp) killP = 1 - Math.pow(1 - p, n);
  else if (n === 2 && per * 2 >= target.hp) killP = p * p;
  const taken = (fc.def.hit / 100) * fc.def.dmg * fc.def.attacks * (1 - killP);
  const t = isFlying(unit) ? TERRAIN.plains : TERRAIN[s.map[at.y][at.x]];
  return 10 + expected * 2 + killP * 40 - taken * 0.8 + t.def * 2 + t.avo / 10
    + (target.isLord ? 4 : 0) + (classOf(target).id === 'cleric' ? 5 : 0) - (per === 0 ? 15 : 0);
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

  let best: { score: number; to: Pos; targetId: string; widx: number } | null = null;
  for (const d of dests) {
    for (const t of targets) {
      const dist = manhattan(d, t);
      for (const wi of weapons) {
        if (!canAttackAt(unit, wi, dist)) continue;
        const fc = forecast(s, unit, t, wi, d);
        const score = scoreAttack(s, fc, unit, t, d);
        if (!best || score > best.score) best = { score, to: d, targetId: t.id, widx: wi };
      }
    }
  }
  if (best) {
    const path = unit.ai === 'hold' ? [here] : pathTo(reach, best.to.x, best.to.y);
    return { unitId: unit.id, path, attack: { targetId: best.targetId, weaponIdx: best.widx } };
  }
  if (unit.ai !== 'aggressive' && unit.ai !== 'raid' && unit.ai !== 'loot') return stay;

  // Advance: find the cheapest tile from which some target would be in range, then walk toward it.
  const full = computeReach(s, unit, Number.POSITIVE_INFINITY);
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
