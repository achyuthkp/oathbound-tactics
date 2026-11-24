import type { RNG } from './combat';
import { STAT_KEYS } from './types';
import type { Stats, StatKey, Unit } from './types';

export const LEVEL_CAP = 20;
export const TRAIN_EXP = 50;
export const HEAL_EXP = 12;

export function combatExp(u: Unit, foe: Unit, landed: boolean, killed: boolean): number {
  const diff = foe.level - u.level;
  if (!landed && !killed) return 1;
  let e = Math.max(1, Math.round(10 + diff * 3));
  if (killed) e += Math.max(5, 20 + diff * 3) + (foe.isBoss ? 30 : 0);
  return Math.min(100, e);
}

export function rollLevel(u: Unit, rng: RNG): Partial<Stats> {
  const gains: Partial<Stats> = {};
  for (const k of STAT_KEYS) if (rng() * 100 < u.growth[k]) gains[k] = 1;
  if (Object.keys(gains).length === 0) {
    // Never leave the player with an empty level-up.
    let best: StatKey = 'hp';
    for (const k of STAT_KEYS) if (u.growth[k] > u.growth[best]) best = k;
    gains[best] = 1;
  }
  return gains;
}

export function gainExp(u: Unit, amount: number, rng: RNG): { unit: Unit; levelUps: Partial<Stats>[] } {
  const n: Unit = { ...u, stats: { ...u.stats } };
  const ups: Partial<Stats>[] = [];
  if (n.level >= LEVEL_CAP) return { unit: n, levelUps: ups };
  n.exp += amount;
  while (n.exp >= 100 && n.level < LEVEL_CAP) {
    n.exp -= 100;
    n.level += 1;
    const g = rollLevel(n, rng);
    for (const k of STAT_KEYS) {
      const v = g[k] ?? 0;
      n.stats[k] += v;
      if (k === 'hp') n.hp += v;
    }
    ups.push(g);
  }
  if (n.level >= LEVEL_CAP) n.exp = 0;
  return { unit: n, levelUps: ups };
}
