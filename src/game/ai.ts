import { TERRAIN } from './data/terrain';
import { canAttackAt, forecast, type Forecast } from './combat';
import { computeReach, destinations, key, manhattan, pathTo, unitAt, type ReachNode } from './pathfinding';
import type { BattleState, Pos, Unit } from './types';
import { attackWeapons, classOf, isFlying, movOf, wdef } from './units';

export interface AIPlan {
  unitId: string;
  path: Pos[];
  attack?: { targetId: string; weaponIdx: number };
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
 */
export function planEnemy(s: BattleState, unit: Unit): AIPlan {
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
  if (unit.ai !== 'aggressive') return stay;

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
  const route = pathTo(full, goal.x, goal.y);
  const m = movOf(unit);
  let end = 0;
  for (let i = 0; i < route.length; i++) {
    const node = full.get(key(route[i].x, route[i].y))!;
    if (node.cost > m) break;
    if (!unitAt(s, route[i].x, route[i].y, unit.id)) end = i;
  }
  return { unitId: unit.id, path: route.slice(0, end + 1) };
}
