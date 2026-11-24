import type { WeaponDef } from '../types';

const melee = { minRange: 1, maxRange: 1 };
const bow = { minRange: 1, maxRange: 2, effectiveVsFlying: true };

const LIST: WeaponDef[] = [
  // Swords — beat axes
  { id: 'iron_sword', name: 'Iron Sword', type: 'sword', might: 5, hit: 90, crit: 0, weight: 5, ...melee, price: 400, tier: 1 },
  { id: 'steel_sword', name: 'Steel Sword', type: 'sword', might: 8, hit: 75, crit: 0, weight: 10, ...melee, price: 900, tier: 2 },
  { id: 'killing_edge', name: 'Killing Edge', type: 'sword', might: 9, hit: 80, crit: 30, weight: 7, ...melee, price: 1800, tier: 3 },
  { id: 'silver_sword', name: 'Silver Sword', type: 'sword', might: 13, hit: 80, crit: 0, weight: 8, ...melee, price: 2400, tier: 4 },
  { id: 'valen_rapier', name: 'Valen Rapier', type: 'sword', might: 7, hit: 95, crit: 10, weight: 4, ...melee, price: 0, tier: 99, desc: 'Heirloom of House Valen. Cannot be sold.' },
  { id: 'ashen_blade', name: 'Ashen Blade', type: 'sword', might: 14, hit: 90, crit: 10, weight: 9, ...melee, price: 0, tier: 99 },
  // Lances — beat swords
  { id: 'iron_lance', name: 'Iron Lance', type: 'lance', might: 7, hit: 80, crit: 0, weight: 8, ...melee, price: 400, tier: 1 },
  { id: 'steel_lance', name: 'Steel Lance', type: 'lance', might: 10, hit: 70, crit: 0, weight: 13, ...melee, price: 900, tier: 2 },
  { id: 'killer_lance', name: 'Killer Lance', type: 'lance', might: 10, hit: 75, crit: 30, weight: 9, ...melee, price: 1800, tier: 3 },
  { id: 'silver_lance', name: 'Silver Lance', type: 'lance', might: 14, hit: 75, crit: 0, weight: 10, ...melee, price: 2400, tier: 4 },
  // Axes — beat lances
  { id: 'iron_axe', name: 'Iron Axe', type: 'axe', might: 8, hit: 75, crit: 0, weight: 10, ...melee, price: 400, tier: 1 },
  { id: 'steel_axe', name: 'Steel Axe', type: 'axe', might: 11, hit: 65, crit: 0, weight: 15, ...melee, price: 900, tier: 2 },
  { id: 'killer_axe', name: 'Killer Axe', type: 'axe', might: 11, hit: 65, crit: 30, weight: 11, ...melee, price: 1800, tier: 3 },
  { id: 'silver_axe', name: 'Silver Axe', type: 'axe', might: 15, hit: 70, crit: 0, weight: 12, ...melee, price: 2400, tier: 4 },
  // Bows — outside the triangle, range 1–2, effective vs fliers
  { id: 'iron_bow', name: 'Iron Bow', type: 'bow', might: 6, hit: 85, crit: 0, weight: 5, ...bow, price: 500, tier: 1 },
  { id: 'steel_bow', name: 'Steel Bow', type: 'bow', might: 9, hit: 70, crit: 0, weight: 9, ...bow, price: 1000, tier: 2 },
  { id: 'killer_bow', name: 'Killer Bow', type: 'bow', might: 9, hit: 75, crit: 30, weight: 7, ...bow, price: 1900, tier: 3 },
  { id: 'silver_bow', name: 'Silver Bow', type: 'bow', might: 13, hit: 75, crit: 0, weight: 6, ...bow, price: 2500, tier: 4 },
  // Staves — heal an adjacent ally
  { id: 'heal', name: 'Heal Staff', type: 'staff', might: 0, hit: 100, crit: 0, weight: 2, ...melee, price: 500, tier: 1, heal: 10 },
  { id: 'mend', name: 'Mend Staff', type: 'staff', might: 0, hit: 100, crit: 0, weight: 3, ...melee, price: 1100, tier: 2, heal: 20 },
  { id: 'oak_staff', name: 'Oaken Staff', type: 'staff', might: 0, hit: 100, crit: 0, weight: 2, ...melee, price: 0, tier: 99, heal: 25, desc: 'Carved by Brann.' },
];

export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(LIST.map(w => [w.id, w]));
export const SHOP_WEAPONS = LIST.filter(w => w.tier < 99);
