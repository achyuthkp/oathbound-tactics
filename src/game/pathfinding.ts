import { TERRAIN } from './data/terrain';
import type { BattleState, Pos, Unit } from './types';
import { attackWeapons, classOf, movOf, wdef } from './units';

export const key = (x: number, y: number): number => y * 64 + x;
export const manhattan = (a: Pos, b: Pos): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export interface ReachNode { x: number; y: number; cost: number; prev: number | null; }
export type Reach = Map<number, ReachNode>;

export const inBounds = (s: BattleState, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < s.width && y < s.height;

export function unitAt(s: BattleState, x: number, y: number, exceptId?: string): Unit | undefined {
  return s.units.find(u => u.hp > 0 && u.x === x && u.y === y && u.id !== exceptId);
}

export function moveCost(s: BattleState, u: Unit, x: number, y: number): number {
  return TERRAIN[s.map[y][x]].cost[classOf(u).moveType];
}

/**
 * Dijkstra over the grid. Units may pass through allies but never enemies.
 * Returned nodes include tiles occupied by allies (pass-through only) —
 * use `destinations` for tiles a unit may actually stop on.
 */
export function computeReach(s: BattleState, u: Unit, maxCost: number = movOf(u), from: Pos = u): Reach {
  const nodes: Reach = new Map();
  const start: ReachNode = { x: from.x, y: from.y, cost: 0, prev: null };
  nodes.set(key(from.x, from.y), start);
  const open: ReachNode[] = [start];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].cost < open[bi].cost) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (nodes.get(key(cur.x, cur.y)) !== cur) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!inBounds(s, nx, ny)) continue;
      const c = moveCost(s, u, nx, ny);
      if (!Number.isFinite(c)) continue;
      const occ = unitAt(s, nx, ny);
      if (occ && occ.team !== u.team) continue;
      const nc = cur.cost + c;
      if (nc > maxCost) continue;
      const k = key(nx, ny);
      const ex = nodes.get(k);
      if (ex && ex.cost <= nc) continue;
      const node: ReachNode = { x: nx, y: ny, cost: nc, prev: key(cur.x, cur.y) };
      nodes.set(k, node);
      open.push(node);
    }
  }
  return nodes;
}

export function destinations(s: BattleState, u: Unit, reach: Reach): Pos[] {
  const out: Pos[] = [];
  for (const n of reach.values()) if (!unitAt(s, n.x, n.y, u.id)) out.push({ x: n.x, y: n.y });
  return out;
}

export function pathTo(reach: Reach, x: number, y: number): Pos[] {
  const out: Pos[] = [];
  let k: number | null = key(x, y);
  while (k !== null) {
    const n = reach.get(k);
    if (!n) break;
    out.push({ x: n.x, y: n.y });
    k = n.prev;
  }
  return out.reverse();
}

export function tilesInRange(s: BattleState, p: Pos, min: number, max: number): Pos[] {
  const out: Pos[] = [];
  for (let dy = -max; dy <= max; dy++) {
    for (let dx = -max; dx <= max; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < min || d > max) continue;
      const x = p.x + dx, y = p.y + dy;
      if (inBounds(s, x, y)) out.push({ x, y });
    }
  }
  return out;
}

/** Every tile a unit could attack this turn (used for enemy range & danger zone). */
export function threatTiles(s: BattleState, u: Unit): Set<number> {
  const set = new Set<number>();
  const ws = attackWeapons(u).map(i => wdef(u.weapons[i]));
  if (!ws.length) return set;
  const origins = u.ai === 'hold' ? [{ x: u.x, y: u.y }] : destinations(s, u, computeReach(s, u));
  for (const o of origins) {
    for (const w of ws) for (const p of tilesInRange(s, o, w.minRange, w.maxRange)) set.add(key(p.x, p.y));
  }
  return set;
}
