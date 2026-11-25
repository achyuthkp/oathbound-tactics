import { TERRAIN } from './data/terrain';
import { pairKey } from './data/supports';
import { manhattan } from './pathfinding';
import type { BattleState, Pos, Unit, WeaponDef, WeaponType } from './types';
import { classOf, canWield, isFlying, wdef } from './units';

export type RNG = () => number;

export const TRIANGLE_HIT = 15;
export const TRIANGLE_DMG = 1;
export const CRIT_MULT = 3;
export const DOUBLE_THRESHOLD = 4;

/** Sword beats Axe, Axe beats Lance, Lance beats Sword. Bows and staves sit outside the triangle. */
const BEATS: Partial<Record<WeaponType, WeaponType>> = { sword: 'axe', axe: 'lance', lance: 'sword' };

export function triangle(a?: WeaponType, d?: WeaponType): -1 | 0 | 1 {
  if (!a || !d) return 0;
  if (BEATS[a] === d) return 1;
  if (BEATS[d] === a) return -1;
  return 0;
}

export function terrainBonus(s: BattleState, u: Unit, p: Pos): { def: number; avo: number } {
  if (isFlying(u)) return { def: 0, avo: 0 };
  const t = TERRAIN[s.map[p.y][p.x]];
  return { def: t.def, avo: t.avo };
}

/** Allies with a bond rank within 2 tiles grant +5 hit / +5 avoid per rank (S also +5 crit). */
export function bondBonus(s: BattleState, u: Unit, p: Pos): { hit: number; avo: number; crit: number } {
  let hit = 0, avo = 0, crit = 0;
  if (u.team !== 'player') return { hit, avo, crit };
  for (const o of s.units) {
    if (o.team !== 'player' || o.id === u.id || o.hp <= 0) continue;
    if (manhattan(o, p) > 2) continue;
    const r = s.ranks[pairKey(u.id, o.id)] ?? 0;
    hit += r * 5;
    avo += r * 5;
    if (r >= 4) crit += 5;
  }
  return { hit, avo, crit };
}

export function attackSpeed(u: Unit, w?: WeaponDef): number {
  return u.stats.spd - Math.max(0, (w?.weight ?? 0) - u.stats.str);
}

export function canAttackAt(u: Unit, idx: number, dist: number): boolean {
  const w = u.weapons[idx];
  if (!w || !canWield(u, w)) return false;
  const d = wdef(w);
  return d.type !== 'staff' && dist >= d.minRange && dist <= d.maxRange;
}

/** The weapon a defender counters with: equipped if it reaches, otherwise any that does. */
export function counterWeapon(u: Unit, dist: number): number | null {
  if (canAttackAt(u, u.equipped, dist)) return u.equipped;
  for (let i = 0; i < u.weapons.length; i++) if (canAttackAt(u, i, dist)) return i;
  return null;
}

export function heldWeapon(u: Unit): WeaponDef | undefined {
  const w = u.weapons[u.equipped];
  return w ? wdef(w) : undefined;
}

export interface SideCalc {
  unitId: string;
  weaponIdx: number | null;
  weaponName: string;
  weaponType?: WeaponType;
  dmg: number;
  hit: number;
  crit: number;
  attacks: number;
  tri: -1 | 0 | 1;
  effective: boolean;
  bond: number;
}
export interface Forecast { att: SideCalc; def: SideCalc; dist: number; }

const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function side(s: BattleState, u: Unit, uPos: Pos, idx: number | null, foe: Unit, foePos: Pos, foeHeld?: WeaponDef): SideCalc {
  const bond = bondBonus(s, u, uPos);
  if (idx == null) {
    const held = heldWeapon(u);
    return { unitId: u.id, weaponIdx: null, weaponName: held?.name ?? 'Unarmed', weaponType: held?.type, dmg: 0, hit: 0, crit: 0, attacks: 0, tri: 0, effective: false, bond: bond.hit };
  }
  const inst = u.weapons[idx];
  const w = wdef(inst);
  const tri = triangle(w.type, foeHeld?.type);
  const effective = !!w.effective?.includes(classOf(foe).moveType);
  const might = (w.might + inst.forge) * (effective ? 3 : 1);
  const tb = terrainBonus(s, foe, foePos);
  const foeBond = bondBonus(s, foe, foePos);
  const dmg = Math.max(0, u.stats.str + might + tri * TRIANGLE_DMG - (foe.stats.def + tb.def));
  const hitRate = w.hit + inst.forge * 5 + u.stats.skl * 2 + Math.floor(u.stats.lck / 2) + tri * TRIANGLE_HIT + bond.hit;
  const avoid = attackSpeed(foe, foeHeld) * 2 + foe.stats.lck + tb.avo + foeBond.avo;
  const crit = pct(w.crit + Math.floor(u.stats.skl / 2) + bond.crit - foe.stats.lck);
  const attacks = attackSpeed(u, w) >= attackSpeed(foe, foeHeld) + DOUBLE_THRESHOLD ? 2 : 1;
  return {
    unitId: u.id, weaponIdx: idx, weaponName: w.name + (inst.forge ? ` +${inst.forge}` : ''), weaponType: w.type,
    dmg, hit: pct(hitRate - avoid), crit, attacks, tri, effective, bond: bond.hit,
  };
}

export function forecast(s: BattleState, attacker: Unit, defender: Unit, weaponIdx: number, attPos: Pos = attacker): Forecast {
  const dist = manhattan(attPos, defender);
  const defIdx = counterWeapon(defender, dist);
  const aw = wdef(attacker.weapons[weaponIdx]);
  const dHeld = defIdx != null ? wdef(defender.weapons[defIdx]) : heldWeapon(defender);
  const defPos = { x: defender.x, y: defender.y };
  return {
    att: side(s, attacker, attPos, weaponIdx, defender, defPos, dHeld),
    def: side(s, defender, defPos, defIdx, attacker, attPos, aw),
    dist,
  };
}

export interface Strike {
  by: 'att' | 'def';
  hit: boolean;
  crit: boolean;
  dmg: number;
  attHp: number;
  defHp: number;
}

/** Hit rolls use the average of two random numbers ("true hit"), like classic tactics RPGs. */
export function rollCombat(fc: Forecast, attHp: number, defHp: number, rng: RNG): Strike[] {
  const order: ('att' | 'def')[] = ['att', 'def'];
  if (fc.att.attacks === 2) order.push('att');
  if (fc.def.attacks === 2) order.push('def');
  const r = () => Math.floor(rng() * 100);
  const strikes: Strike[] = [];
  for (const by of order) {
    if (attHp <= 0 || defHp <= 0) break;
    const sc = fc[by];
    if (sc.attacks === 0) continue;
    const hit = (r() + r()) / 2 < sc.hit;
    const crit = hit && r() < sc.crit;
    const dmg = hit ? sc.dmg * (crit ? CRIT_MULT : 1) : 0;
    if (by === 'att') defHp = Math.max(0, defHp - dmg);
    else attHp = Math.max(0, attHp - dmg);
    strikes.push({ by, hit, crit, dmg, attHp, defHp });
  }
  return strikes;
}
