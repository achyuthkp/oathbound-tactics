import { CLASSES } from './data/classes';
import { WEAPONS } from './data/weapons';
import { STAT_KEYS } from './types';
import type { ClassDef, EnemySpawn, Stats, Unit, WeaponDef, WeaponInstance } from './types';

export const MAX_WEAPONS = 4;
export const MAX_POTIONS = 3;
export const POTION_HEAL = 15;
export const POTION_PRICE = 300;
export const MAX_FORGE = 5;

export const uid = (): string => Math.random().toString(36).slice(2, 10);
export const clone = <T>(x: T): T => structuredClone(x);

export const classOf = (u: Pick<Unit, 'classId'>): ClassDef => CLASSES[u.classId];
export const wdef = (w: WeaponInstance): WeaponDef => WEAPONS[w.defId];
export const weaponLabel = (w: WeaponInstance): string => wdef(w).name + (w.forge > 0 ? ` +${w.forge}` : '');
export const canWield = (u: Pick<Unit, 'classId'>, w: WeaponInstance): boolean =>
  classOf(u).weapons.includes(wdef(w).type);
export const attackWeapons = (u: Unit): number[] =>
  u.weapons.map((w, i) => (canWield(u, w) && wdef(w).type !== 'staff' ? i : -1)).filter(i => i >= 0);
export const staffIndex = (u: Unit): number =>
  u.weapons.findIndex(w => canWield(u, w) && wdef(w).type === 'staff');
export const movOf = (u: Unit): number => classOf(u).mov;
export const isFlying = (u: Pick<Unit, 'classId'>): boolean => classOf(u).moveType === 'flying';
export const makeWeapon = (defId: string): WeaponInstance => ({ uid: uid(), defId, forge: 0 });

export const forgeCost = (w: WeaponInstance): number => 250 * (w.forge + 1);
export const sellPrice = (w: WeaponInstance): number => Math.floor(wdef(w).price / 2) + w.forge * 100;

export function goldValue(u: Unit): number {
  return u.level * 30 + (u.isBoss ? 800 : 0);
}

export function makeEnemy(sp: EnemySpawn, id: string): Unit {
  const c = CLASSES[sp.classId];
  const stats = {} as Stats;
  for (const k of STAT_KEYS) {
    stats[k] = c.base[k] + Math.floor((c.growth[k] * (sp.level - 1)) / 100) + (sp.statBonus?.[k] ?? 0);
  }
  return {
    id, name: sp.name ?? c.name, classId: sp.classId, team: 'enemy',
    level: sp.level, exp: 0, stats, growth: { ...c.growth }, hp: stats.hp,
    weapons: sp.weapons.map(makeWeapon), equipped: 0, potions: 0,
    isBoss: sp.isBoss, ai: sp.ai ?? 'aggressive', lookId: sp.lookId,
    x: sp.x, y: sp.y, done: false,
  };
}
