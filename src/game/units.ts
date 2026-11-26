import { CLASSES } from './data/classes';
import { WEAPONS } from './data/weapons';
import { STAT_KEYS } from './types';
import type { ClassDef, EnemySpawn, Stats, Unit, WeaponDef, WeaponInstance } from './types';

export const MAX_POTIONS = 3;
export const POTION_HEAL = 15;
export const POTION_PRICE = 300;
export const MAX_FORGE = 5;
export const MAX_STONES = 3;
export const STONE_PRICE = 1200;
/** Locks one lockpick opens before it snaps. */
export const PICK_USES = 5;
export const PICK_PRICE = 500;
export const MAX_KEYS = 5;
/**
 * A pack holds five items. Things with durability count one each: every weapon and every lockpick.
 * Consumables stack: all of a unit's vulneraries are one item, likewise its keys and its dragonstones.
 */
export const MAX_ITEMS = 5;
export type Stack = 'potions' | 'stones' | 'keys';
export const STACKS: Record<Stack, { name: string; max: number }> = {
  potions: { name: 'Vulnerary', max: MAX_POTIONS },
  stones: { name: 'Dragonstone', max: MAX_STONES },
  keys: { name: 'Key', max: MAX_KEYS },
};
export const STACK_IDS = Object.keys(STACKS) as Stack[];
/** A unit's lockpicks (tolerates saves from before lockpicks had durability). */
export const picksOf = (u: Unit): number[] => (Array.isArray(u.picks) ? u.picks : []);
export const itemCount = (u: Unit): number => u.weapons.length + picksOf(u).length + STACK_IDS.filter(k => (u[k] ?? 0) > 0).length;
/** Room for one more weapon or lockpick (no argument), or one more of a stacking consumable. */
export const canTake = (u: Unit, stack?: Stack): boolean =>
  stack ? (u[stack] ?? 0) < STACKS[stack].max && ((u[stack] ?? 0) > 0 || itemCount(u) < MAX_ITEMS) : itemCount(u) < MAX_ITEMS;
/** Own turns a dragon form lasts, counting the turn spent transforming. */
export const DRAGON_TURNS = 4;
/** Added to a unit's stats for as long as it is a dragon. */
export const DRAGON_BONUS: Partial<Stats> = { hp: 10, str: 8, skl: 3, spd: 2, def: 7 };

/** Take dragon form: the bonus goes straight into the stats, so every combat rule sees it. */
export function shiftToDragon(u: Unit): void {
  for (const k of STAT_KEYS) u.stats[k] += DRAGON_BONUS[k] ?? 0;
  u.hp += DRAGON_BONUS.hp ?? 0;
  u.dragon = DRAGON_TURNS;
  u.stones = (u.stones ?? 0) - 1;
  const breath = u.weapons.findIndex(w => WEAPONS[w.defId].type === 'breath');
  if (breath >= 0) u.equipped = breath;
}
/** Back to human form: the bonus comes off again. */
export function shiftToHuman(u: Unit): void {
  if (u.dragon === undefined) return; // 0 still means "in dragon form, time is up"
  for (const k of STAT_KEYS) u.stats[k] -= DRAGON_BONUS[k] ?? 0;
  u.hp = Math.max(1, Math.min(u.hp, u.stats.hp));
  u.dragon = undefined;
}

export const uid = (): string => Math.random().toString(36).slice(2, 10);
export const clone = <T>(x: T): T => structuredClone(x);

export const classOf = (u: Pick<Unit, 'classId'>): ClassDef => CLASSES[u.classId];
export const wdef = (w: WeaponInstance): WeaponDef => WEAPONS[w.defId];
/** Durability: the stronger the weapon, the sooner it breaks. Personal weapons (tier 99) wear too; only a dragon's own breath does not. */
const USES_BY_TIER: Record<number, number> = { 1: 40, 2: 30, 3: 20, 4: 15, 99: 30 };
export const maxUses = (w: WeaponInstance): number => (wdef(w).type === 'breath' ? Number.POSITIVE_INFINITY : USES_BY_TIER[wdef(w).tier] ?? 30);
const MOVE_NAME: Record<string, string> = { armor: 'armoured', horse: 'mounted', flying: 'flying', foot: 'foot' };
/** "Strong vs armoured units", or '' for an ordinary weapon. */
export const effectNote = (d: WeaponDef): string => (d.effective?.length ? `Strong vs ${d.effective.map(m => MOVE_NAME[m]).join(' and ')} units` : '');
export const usesLeft = (w: WeaponInstance): number => w.uses ?? maxUses(w);
export const weaponLabel = (w: WeaponInstance): string =>
  wdef(w).name + (w.forge > 0 ? ` +${w.forge}` : '') + (Number.isFinite(maxUses(w)) ? ` ${usesLeft(w)}/${maxUses(w)}` : '');
/** The smith restores a worn weapon for half its price, in proportion to the wear. A priceless heirloom is costed as 1,600 gold. */
export const repairCost = (w: WeaponInstance): number =>
  Number.isFinite(maxUses(w)) ? Math.ceil(((wdef(w).price || 1600) / 2) * (1 - usesLeft(w) / maxUses(w))) : 0;

/** Wear a weapon by n uses. At zero it breaks and leaves the pack; returns its name then. */
export function wear(u: Unit, index: number, n: number): string | null {
  const w = u.weapons[index];
  if (!w || n <= 0 || !Number.isFinite(maxUses(w))) return null;
  w.uses = usesLeft(w) - n;
  if (w.uses > 0) return null;
  u.weapons.splice(index, 1);
  u.equipped = index < u.equipped ? u.equipped - 1 : index === u.equipped ? attackWeapons(u)[0] ?? 0 : u.equipped;
  return wdef(w).name;
}

export type TradeItem = { kind: 'weapon' | 'pick'; index: number } | { kind: Stack };
/** Move one item from a's pack to b's (mutates both). Returns what was given, or null if it cannot be. */
export function giveItem(a: Unit, b: Unit, item: TradeItem): string | null {
  if (item.kind === 'weapon') {
    const w = a.weapons[item.index];
    if (!w || wdef(w).tier >= 99 || !canTake(b)) return null; // personal weapons stay with their owner
    a.weapons.splice(item.index, 1);
    b.weapons.push(w);
    a.equipped = item.index < a.equipped ? a.equipped - 1 : item.index === a.equipped ? 0 : a.equipped;
    return wdef(w).name;
  }
  if (item.kind === 'pick') {
    const p = picksOf(a)[item.index];
    if (p === undefined || !canTake(b)) return null;
    a.picks = picksOf(a).filter((_, i) => i !== item.index);
    b.picks = [...picksOf(b), p];
    return 'lockpick';
  }
  if (!(a[item.kind] ?? 0) || !canTake(b, item.kind)) return null;
  a[item.kind] = (a[item.kind] ?? 0) - 1;
  b[item.kind] = (b[item.kind] ?? 0) + 1;
  return STACKS[item.kind].name.toLowerCase();
}
export const canWield = (u: Pick<Unit, 'classId'>, w: WeaponInstance): boolean =>
  classOf(u).weapons.includes(wdef(w).type);
export const attackWeapons = (u: Unit): number[] =>
  u.weapons.map((w, i) => (canWield(u, w) && wdef(w).type !== 'staff' && (wdef(w).type !== 'breath' || !!u.dragon) ? i : -1)).filter(i => i >= 0);
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
    weapons: sp.weapons.map(makeWeapon), equipped: 0, potions: sp.potions ?? 0, stones: c.shifts ? 1 : undefined, picks: c.steals ? [2] : undefined, keys: sp.key ? 1 : undefined,
    isBoss: sp.isBoss, ai: sp.ai ?? 'aggressive', lookId: sp.lookId,
    x: sp.x, y: sp.y, done: false,
  };
}
