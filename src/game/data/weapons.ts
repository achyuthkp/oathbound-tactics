import type { MoveType, WeaponDef } from '../types';

const melee = { minRange: 1, maxRange: 1 };
const bow = { minRange: 1, maxRange: 2, effective: ['flying'] as MoveType[] };
const vsArmor = { effective: ['armor'] as MoveType[] };
const vsRiders = { effective: ['horse', 'flying'] as MoveType[] };

const LIST: WeaponDef[] = [
  // Swords — beat axes
  { id: 'iron_sword', name: 'Iron Sword', type: 'sword', might: 5, hit: 90, crit: 0, weight: 5, ...melee, price: 400, tier: 1 },
  { id: 'steel_sword', name: 'Steel Sword', type: 'sword', might: 8, hit: 75, crit: 0, weight: 10, ...melee, price: 900, tier: 2 },
  { id: 'killing_edge', name: 'Killing Edge', type: 'sword', might: 9, hit: 80, crit: 30, weight: 7, ...melee, price: 1800, tier: 3 },
  { id: 'silver_sword', name: 'Silver Sword', type: 'sword', might: 13, hit: 80, crit: 0, weight: 8, ...melee, price: 2400, tier: 4 },
  { id: 'valen_rapier', name: 'Valen Rapier', type: 'sword', might: 7, hit: 95, crit: 10, weight: 4, ...melee, ...vsArmor, price: 0, tier: 99, desc: 'Heirloom of House Valen. Finds the gaps in armour. Cannot be sold.' },
  { id: 'rapier', name: 'Rapier', type: 'sword', might: 5, hit: 90, crit: 5, weight: 4, ...melee, ...vsArmor, price: 1200, tier: 2, desc: 'A thrusting sword that finds the gaps in armour.' },
  { id: 'ashen_blade', name: 'Ashen Blade', type: 'sword', might: 14, hit: 90, crit: 10, weight: 9, ...melee, price: 0, tier: 99 },
  { id: 'dagger', name: 'Dagger', type: 'sword', might: 3, hit: 95, crit: 5, weight: 2, ...melee, price: 300, tier: 1, desc: 'Light and quick. A thief\'s tool.' },
  // Dragon breath — only usable in dragon form; outside the triangle
  { id: 'fire_breath', name: 'Dragon Breath', type: 'breath', might: 9, hit: 85, crit: 0, weight: 0, minRange: 1, maxRange: 2, price: 0, tier: 99, desc: 'A dragon\'s fire. Only usable in dragon form.' },
  { id: 'water_breath', name: 'Tide Breath', type: 'breath', might: 8, hit: 95, crit: 0, weight: 0, minRange: 1, maxRange: 2, price: 0, tier: 99, desc: 'A water dragon\'s jet. Accurate. Only usable in dragon form.' },
  { id: 'earth_breath', name: 'Stone Breath', type: 'breath', might: 13, hit: 75, crit: 0, weight: 0, minRange: 1, maxRange: 1, ...vsArmor, price: 0, tier: 99, desc: 'An earth dragon\'s hail of rock. Short reach; breaks armour. Only usable in dragon form.' },
  { id: 'wind_breath', name: 'Gale Breath', type: 'breath', might: 7, hit: 90, crit: 10, weight: 0, minRange: 1, maxRange: 3, effective: ['flying'], price: 0, tier: 99, desc: 'A wind dragon\'s cutting gusts. Long reach; knocks fliers from the sky. Only usable in dragon form.' },
  { id: 'light_breath', name: 'Radiant Breath', type: 'breath', might: 11, hit: 90, crit: 5, weight: 0, minRange: 1, maxRange: 2, price: 0, tier: 99, desc: 'A light dragon\'s beam. Only usable in dragon form.' },
  { id: 'dark_breath', name: 'Umbral Flame', type: 'breath', might: 14, hit: 85, crit: 5, weight: 0, minRange: 1, maxRange: 2, price: 0, tier: 99, desc: 'The dark dragon\'s fire.' },
  // Lances — beat swords
  { id: 'iron_lance', name: 'Iron Lance', type: 'lance', might: 7, hit: 80, crit: 0, weight: 8, ...melee, price: 400, tier: 1 },
  { id: 'steel_lance', name: 'Steel Lance', type: 'lance', might: 10, hit: 70, crit: 0, weight: 13, ...melee, price: 900, tier: 2 },
  { id: 'killer_lance', name: 'Killer Lance', type: 'lance', might: 10, hit: 75, crit: 30, weight: 9, ...melee, price: 1800, tier: 3 },
  { id: 'silver_lance', name: 'Silver Lance', type: 'lance', might: 14, hit: 75, crit: 0, weight: 10, ...melee, price: 2400, tier: 4 },
  { id: 'ridersbane', name: 'Ridersbane', type: 'lance', might: 7, hit: 75, crit: 0, weight: 11, ...melee, ...vsRiders, price: 1300, tier: 2, desc: 'A hooked lance for dragging riders out of the saddle, on the ground or in the air.' },
  // Axes — beat lances
  { id: 'iron_axe', name: 'Iron Axe', type: 'axe', might: 8, hit: 75, crit: 0, weight: 10, ...melee, price: 400, tier: 1 },
  { id: 'steel_axe', name: 'Steel Axe', type: 'axe', might: 11, hit: 65, crit: 0, weight: 15, ...melee, price: 900, tier: 2 },
  { id: 'killer_axe', name: 'Killer Axe', type: 'axe', might: 11, hit: 65, crit: 30, weight: 11, ...melee, price: 1800, tier: 3 },
  { id: 'silver_axe', name: 'Silver Axe', type: 'axe', might: 15, hit: 70, crit: 0, weight: 12, ...melee, price: 2400, tier: 4 },
  { id: 'hammer', name: 'Hammer', type: 'axe', might: 8, hit: 60, crit: 0, weight: 14, ...melee, ...vsArmor, price: 1200, tier: 2, desc: 'Heavy and slow. Caves in plate.' },
  // Bows — outside the triangle, range 1–2, effective vs fliers
  { id: 'iron_bow', name: 'Iron Bow', type: 'bow', might: 6, hit: 85, crit: 0, weight: 5, ...bow, price: 500, tier: 1 },
  { id: 'steel_bow', name: 'Steel Bow', type: 'bow', might: 9, hit: 70, crit: 0, weight: 9, ...bow, price: 1000, tier: 2 },
  { id: 'killer_bow', name: 'Killer Bow', type: 'bow', might: 9, hit: 75, crit: 30, weight: 7, ...bow, price: 1900, tier: 3 },
  { id: 'silver_bow', name: 'Silver Bow', type: 'bow', might: 13, hit: 75, crit: 0, weight: 6, ...bow, price: 2500, tier: 4 },
  // Staves — heal an adjacent ally
  { id: 'heal', name: 'Heal Staff', type: 'staff', might: 0, hit: 100, crit: 0, weight: 2, ...melee, price: 500, tier: 1, heal: 10 },
  { id: 'mend', name: 'Mend Staff', type: 'staff', might: 0, hit: 100, crit: 0, weight: 3, ...melee, price: 1100, tier: 2, heal: 20 },
  { id: 'oak_staff', name: 'Oaken Staff', type: 'staff', might: 0, hit: 100, crit: 0, weight: 2, ...melee, price: 0, tier: 99, heal: 25, desc: 'Carved by Brann.' },
  // Tomes — magic, range 1–2, outside the triangle. Each spell is a step up in power and in skill to aim it.
  { id: 'fire_tome', name: 'Fire', type: 'tome', might: 5, hit: 90, crit: 0, weight: 4, minRange: 1, maxRange: 2, price: 600, tier: 1, desc: 'The first spell every mage learns. Reliable.' },
  { id: 'thunder_tome', name: 'Thunder', type: 'tome', might: 8, hit: 80, crit: 5, weight: 6, minRange: 1, maxRange: 2, price: 1100, tier: 2, desc: 'A crack of lightning. Harder to aim, harder hitting.' },
  { id: 'blizzard_tome', name: 'Blizzard', type: 'tome', might: 11, hit: 70, crit: 0, weight: 9, minRange: 1, maxRange: 2, price: 2000, tier: 3, desc: 'A storm of ice. The heaviest spell in the book.' },
];

export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(LIST.map(w => [w.id, w]));
export const SHOP_WEAPONS = LIST.filter(w => w.tier < 99);
