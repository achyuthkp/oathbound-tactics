import type { Stats, Unit } from '../types';
import { CLASSES } from './classes';
import { MAX_STONES, PICK_USES } from '../units';

/** A dragon's kind. It sets the dragon form's colours and features, and what it breathes. */
export type Element = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';
export interface ElementStyle {
  name: string;
  coat: string; mane: string; belly: string; eye: string; membrane: string;
  /** Breath colours: outer, middle, core. */
  breath: [string, string, string];
}
export const ELEMENTS: Record<Element, ElementStyle> = {
  fire: { name: 'Fire dragon', coat: '#b3261e', mane: '#3a0f0c', belly: '#f0b060', eye: '#ffd23a', membrane: '#5a1408', breath: ['#e0662a', '#ffb84a', '#fff3b0'] },
  water: { name: 'Water dragon', coat: '#2a6fb0', mane: '#16406e', belly: '#c8f0f0', eye: '#e8ffff', membrane: '#4fb4d0', breath: ['#2f8fd0', '#7fd0f0', '#e8fbff'] },
  earth: { name: 'Earth dragon', coat: '#7a6238', mane: '#3d3020', belly: '#c9b27a', eye: '#b8ff6a', membrane: '#4a3a22', breath: ['#6f5a36', '#a8916a', '#e0d2b0'] },
  wind: { name: 'Wind dragon', coat: '#6fc0a0', mane: '#f2fff8', belly: '#eafff4', eye: '#ffffff', membrane: '#c8f0e0', breath: ['#a8e8d0', '#e0fff4', '#ffffff'] },
  light: { name: 'Light dragon', coat: '#f1ead2', mane: '#e2b23c', belly: '#ffe9a0', eye: '#3f9ae8', membrane: '#fff6d8', breath: ['#ffe07a', '#fff3b0', '#ffffff'] },
  dark: { name: 'Dark dragon', coat: '#2a2233', mane: '#0e0a14', belly: '#5a3a6a', eye: '#e23cff', membrane: '#3a1a4a', breath: ['#3a1050', '#a03cff', '#f0c8ff'] },
};
/** The element of a breath weapon id: 'water_breath' is water. */
export const elementOf = (weapons: { defId: string }[] = []): Element | undefined => {
  const id = weapons.map(w => w.defId).find(d => d.endsWith('_breath'))?.split('_')[0];
  return id && id in ELEMENTS ? (id as Element) : undefined;
};

export type HairStyle = 'short' | 'long' | 'tied' | 'spiky' | 'hood' | 'helm' | 'rugged' | 'slick' | 'bun' | 'bandana';

export interface Look {
  skin: string;
  hair: string;
  style: HairStyle;
  cloth: string;
  accent: string;
  crown?: boolean;
  /** Adult details for characters in their 30s. */
  stubble?: boolean;
  scar?: boolean;
  /** A cloth mask over the lower face (thieves). */
  mask?: boolean;
  /** Small horns (dragonkin). */
  horns?: boolean;
  /* Illustration details */
  eyes?: string;
  lashes?: boolean;
  freckles?: boolean;
  outfit?: Outfit;
  cape?: string;
}

/* ---------- Full-body build (for the 2D animated models) ---------- */

export type Outfit = 'cape' | 'armor' | 'robe' | 'leather' | 'hunter' | 'gi' | 'light' | 'raider' | 'cloak';
export interface Build {
  outfit: Outfit;
  mount?: 'horse' | 'pegasus' | 'wyvern';
  coat?: string;
  mane?: string;
  cape?: string;
  pants: string;
  boots: string;
  broad?: boolean;
  /** Carries a lit torch in the off hand. */
  torch?: boolean;
  /** The unit is drawn as a dragon (a dragonkin in dragon form), not as a person. */
  form?: 'dragon';
  /** A dragonkin's element (from its breath). In human form it colours the small wings and tail. */
  element?: Element;
}

const CLASS_BUILD: Record<string, Partial<Build>> = {
  lord: { outfit: 'cape' },
  cavalier: { outfit: 'light', mount: 'horse' },
  fighter: { outfit: 'leather', broad: true },
  brigand: { outfit: 'raider', broad: true, torch: true },
  soldier: { outfit: 'armor' },
  knight: { outfit: 'armor', broad: true },
  myrmidon: { outfit: 'gi' },
  archer: { outfit: 'hunter' },
  cleric: { outfit: 'robe' },
  skyknight: { outfit: 'light', mount: 'pegasus' },
  wyvern: { outfit: 'armor', mount: 'wyvern' },
  thief: { outfit: 'cloak' },
  manakete: { outfit: 'robe' },
  ashlord: { outfit: 'cape', broad: true },
};

const CHAR_BUILD: Record<string, Partial<Build>> = {
  kael: { cape: '#1d3570', pants: '#262c44' },
  lyra: { coat: '#8a5530', mane: '#3a2412', pants: '#4a2a2a' },
  brann: { pants: '#3a3026', boots: '#2a1e14' },
  seren: { pants: '#36452e' },
  rei: { pants: '#2a2040' },
  ilse: { coat: '#f4f1ea', mane: '#bcd3ea', pants: '#cfd7e3', boots: '#3d5a80' },
  morwen: { outfit: 'cape', cape: '#5a1f35' },
  malrec: { cape: '#4a1408', pants: '#1a1a20' },
  pip: { pants: '#2a2a32', boots: '#2a2018', cape: '#3a4a3a' },
  sable: { coat: '#5a3f9a', mane: '#241640' },
  nerys: { pants: '#1c3048', boots: '#16283a' },
  garrow: { outfit: 'leather', broad: true, pants: '#3d3020', boots: '#2a2014' },
  kestrel: { outfit: 'light', pants: '#2f5a4a', boots: '#24382e' },
  aurelie: { pants: '#e8dcc0', boots: '#c9a45a' },
};

export function buildFor(u: { id: string; classId: string; lookId?: string; dragon?: number; weapons?: { defId: string }[] }, opts: { dismount?: boolean; element?: Element } = {}): Build {
  const b: Build = {
    outfit: 'light', pants: '#3a3446', boots: '#3b2a1e',
    ...CLASS_BUILD[u.classId],
    ...CHAR_BUILD[u.lookId ?? u.id],
  };
  if (opts.dismount) delete b.mount;
  if (CLASSES[u.classId]?.shifts) b.element = opts.element ?? elementOf(u.weapons) ?? elementOf(PLAYER_TEMPLATES[u.lookId ?? u.id]?.weapons.map(defId => ({ defId }))) ?? 'fire';
  if (u.dragon) b.form = 'dragon'; // coloured by its element unless the character has their own colours
  return b;
}

export interface CharacterInfo { name: string; title: string; look: Look; }

export const CHARACTERS: Record<string, CharacterInfo> = {
  kael: { name: 'Kael', title: 'Heir of House Valen', look: { skin: '#eec39c', hair: '#3a281c', style: 'spiky', cloth: '#2c4f9c', accent: '#d9b44a', stubble: true, scar: true, eyes: '#3f6a9e', outfit: 'cape', cape: '#1d3570' } },
  lyra: { name: 'Lyra', title: 'Sworn Knight', look: { skin: '#f3d0b0', hair: '#c4462a', style: 'long', cloth: '#8a2d3b', accent: '#e8c46a', eyes: '#4f8a46', lashes: true, freckles: true, outfit: 'light' } },
  brann: { name: 'Brann', title: 'Sellsword', look: { skin: '#d9a47c', hair: '#5a3a22', style: 'rugged', cloth: '#5b4632', accent: '#a8763c', eyes: '#5a3a22', outfit: 'leather' } },
  seren: { name: 'Seren', title: 'Hunter of the Vale', look: { skin: '#e9c09a', hair: '#2f6b4a', style: 'tied', cloth: '#3f6b3f', accent: '#c9a45a', eyes: '#2f7a5a', lashes: true, outfit: 'hunter' } },
  mira: { name: 'Mira', title: 'Cleric of Saint Edda', look: { skin: '#f6d9c0', hair: '#e8d39a', style: 'hood', cloth: '#ece6da', accent: '#5f86c4', eyes: '#5f86c4', lashes: true, outfit: 'robe' } },
  tomas: { name: 'Tomas', title: 'Knight of Brenmoor', look: { skin: '#e2b591', hair: '#7a7a7a', style: 'helm', cloth: '#5e6a80', accent: '#2c4f9c', stubble: true, eyes: '#56606e', outfit: 'armor' } },
  rei: { name: 'Rei', title: 'Wandering Blade', look: { skin: '#f1d3b6', hair: '#1c1b2b', style: 'tied', cloth: '#3b2a5c', accent: '#c0c6d8', eyes: '#4a3a6a', lashes: true, outfit: 'gi' } },
  pip: { name: 'Pip', title: 'Lockpick of Dunmarch', look: { skin: '#e2b591', hair: '#6a4a2a', style: 'hood', cloth: '#3a4a3a', accent: '#c9a45a', mask: true, eyes: '#5a7a4a', outfit: 'cloak' } },
  sable: { name: 'Sable', title: 'Last of the Dragonkin', look: { skin: '#e9d6dc', hair: '#3a2a6a', style: 'long', cloth: '#2f2548', accent: '#b08ae8', horns: true, eyes: '#b08ae8', lashes: true, outfit: 'robe' } },
  osric: { name: 'Osric', title: 'Woodward of the Whispering Wood', look: { skin: '#c9966e', hair: '#9a9a96', style: 'short', cloth: '#4a5a3a', accent: '#b8943c', stubble: true, scar: true, eyes: '#5a6a4a', outfit: 'armor' } },
  ilse: { name: 'Ilse', title: 'Highmoor Sky Guard', look: { skin: '#f5dcc6', hair: '#a8cdea', style: 'bun', cloth: '#dfe7f0', accent: '#3d6fb0', eyes: '#3d84b8', lashes: true, freckles: true, outfit: 'light' } },
  nerys: { name: 'Nerys', title: 'Warden of Saltmere', look: { skin: '#e6cdb8', hair: '#2f6fa8', style: 'long', cloth: '#1f4a6a', accent: '#7fd0f0', horns: true, eyes: '#7fd0f0', lashes: true, outfit: 'robe' } },
  garrow: { name: 'Garrow', title: 'Stone-Keeper of Deepforge', look: { skin: '#b98a62', hair: '#4a3a22', style: 'rugged', cloth: '#5a4a30', accent: '#a8916a', horns: true, stubble: true, eyes: '#b8ff6a', outfit: 'leather' } },
  kestrel: { name: 'Kestrel', title: 'Sky-Born of Galewatch', look: { skin: '#efd6be', hair: '#cfeee0', style: 'spiky', cloth: '#3f7a64', accent: '#e0fff4', horns: true, eyes: '#5fb89a', outfit: 'light' } },
  aurelie: { name: 'Aurelie', title: 'Goddess of Solenne', look: { skin: '#f8e6d6', hair: '#f2d68a', style: 'long', cloth: '#f6f0e0', accent: '#e2b23c', horns: true, eyes: '#3f9ae8', lashes: true, outfit: 'robe' } },
  // NPCs and bosses
  gorran: { name: 'Gorran', title: 'Brigand Chief', look: { skin: '#cf9a74', hair: '#2a2420', style: 'rugged', cloth: '#5a3424', accent: '#8a2a20', eyes: '#3a2a1a', outfit: 'raider' } },
  varn: { name: 'Varn', title: 'Imperial Captain', look: { skin: '#dcae8a', hair: '#333', style: 'helm', cloth: '#4a2228', accent: '#c23b3b', stubble: true, eyes: '#4a3a2a', outfit: 'armor' } },
  morwen: { name: 'Morwen', title: 'Warden of Highmoor', look: { skin: '#eccbb5', hair: '#1f1a22', style: 'long', cloth: '#3a1f2f', accent: '#c43c5c', eyes: '#8a2a3a', lashes: true, outfit: 'cape', cape: '#5a1f35' } },
  malrec: { name: 'Malrec', title: 'The Usurper King', look: { skin: '#e0c0a8', hair: '#c4c4c4', style: 'slick', cloth: '#1f1f26', accent: '#c46a2a', crown: true, scar: true, eyes: '#b07a2a', outfit: 'cape', cape: '#4a1408' } },
};

/** Generic looks for nameless enemies, by class. */
export const ENEMY_LOOKS: Record<string, Look> = {
  brigand: { skin: '#cf9a74', hair: '#2a2420', style: 'bandana', cloth: '#4a3426', accent: '#b8373f', stubble: true, scar: true, outfit: 'raider' },
  fighter: { skin: '#d6a27c', hair: '#4a2a1a', style: 'rugged', cloth: '#7a4422', accent: '#8a2a20', outfit: 'leather' },
  soldier: { skin: '#dcae8a', hair: '#333', style: 'helm', cloth: '#7a2230', accent: '#c23b3b', outfit: 'armor' },
  knight: { skin: '#dcae8a', hair: '#333', style: 'helm', cloth: '#5a5f6e', accent: '#c23b3b', outfit: 'armor' },
  myrmidon: { skin: '#e8c4a4', hair: '#222', style: 'tied', cloth: '#6a1f3a', accent: '#c23b3b', outfit: 'gi' },
  archer: { skin: '#d8b08c', hair: '#3a2a1e', style: 'hood', cloth: '#5a3a28', accent: '#c23b3b', outfit: 'hunter' },
  cavalier: { skin: '#e0b896', hair: '#3a2a1e', style: 'short', cloth: '#7a2230', accent: '#c23b3b', outfit: 'light' },
  thief: { skin: '#d8b08c', hair: '#2a2420', style: 'hood', cloth: '#3a2a34', accent: '#c23b3b', mask: true, outfit: 'cloak' },
  manakete: { skin: '#cfc4c0', hair: '#5a5a62', style: 'long', cloth: '#3a3038', accent: '#c46a2a', horns: true, eyes: '#e0662a', outfit: 'robe' },
  wyvern: { skin: '#dcae8a', hair: '#333', style: 'helm', cloth: '#3a2228', accent: '#c23b3b', stubble: true, outfit: 'armor' },
  skyknight: { skin: '#eccbb5', hair: '#cfcfcf', style: 'bun', cloth: '#6a2a4a', accent: '#c23b3b', outfit: 'light', lashes: true },
};

export const GENERIC_LOOK: Look = { skin: '#d8b08c', hair: '#3a2e2a', style: 'helm', cloth: '#5a2a30', accent: '#a33' };

export function lookFor(u: Pick<Unit, 'id' | 'classId' | 'lookId'>): Look {
  return CHARACTERS[u.lookId ?? u.id]?.look ?? ENEMY_LOOKS[u.classId] ?? GENERIC_LOOK;
}
export function lookById(id: string): Look { return CHARACTERS[id]?.look ?? GENERIC_LOOK; }
export function nameById(id: string): string { return CHARACTERS[id]?.name ?? id; }

interface PlayerTemplate {
  classId: string;
  level: number;
  stats: Stats;
  growth: Stats;
  weapons: string[];
  isLord?: boolean;
}

const s = (hp: number, str: number, skl: number, spd: number, lck: number, def: number): Stats =>
  ({ hp, str, skl, spd, lck, def });

export const PLAYER_TEMPLATES: Record<string, PlayerTemplate> = {
  kael: { classId: 'lord', level: 1, stats: s(20, 6, 6, 7, 6, 5), growth: s(80, 50, 45, 50, 55, 30), weapons: ['valen_rapier', 'iron_sword'], isLord: true },
  lyra: { classId: 'cavalier', level: 2, stats: s(21, 6, 5, 6, 4, 6), growth: s(75, 40, 40, 40, 35, 30), weapons: ['iron_sword', 'iron_lance'] },
  brann: { classId: 'fighter', level: 3, stats: s(28, 9, 4, 4, 2, 4), growth: s(90, 60, 30, 30, 25, 25), weapons: ['iron_axe'] },
  seren: { classId: 'archer', level: 2, stats: s(18, 5, 8, 6, 5, 3), growth: s(60, 40, 55, 45, 40, 20), weapons: ['iron_bow'] },
  mira: { classId: 'cleric', level: 1, stats: s(16, 1, 5, 6, 8, 2), growth: s(55, 15, 50, 45, 60, 15), weapons: ['heal'] },
  tomas: { classId: 'knight', level: 4, stats: s(25, 8, 5, 2, 3, 11), growth: s(85, 45, 35, 15, 25, 55), weapons: ['iron_lance', 'steel_lance'] },
  rei: { classId: 'myrmidon', level: 5, stats: s(22, 7, 11, 12, 6, 4), growth: s(65, 35, 55, 60, 45, 20), weapons: ['iron_sword', 'killing_edge'] },
  pip: { classId: 'thief', level: 3, stats: s(19, 5, 8, 12, 7, 3), growth: s(60, 35, 50, 65, 50, 15), weapons: ['dagger', 'iron_sword'] },
  sable: { classId: 'manakete', level: 5, stats: s(22, 4, 5, 6, 6, 4), growth: s(80, 45, 35, 40, 40, 30), weapons: ['fire_breath'] },
  osric: { classId: 'soldier', level: 6, stats: s(26, 9, 8, 7, 5, 8), growth: s(75, 45, 40, 35, 30, 35), weapons: ['steel_lance'] },
  nerys: { classId: 'manakete', level: 7, stats: s(24, 5, 8, 8, 7, 5), growth: s(75, 40, 50, 45, 45, 30), weapons: ['water_breath'] },
  garrow: { classId: 'manakete', level: 8, stats: s(30, 7, 4, 3, 4, 8), growth: s(90, 50, 30, 20, 30, 50), weapons: ['earth_breath'] },
  kestrel: { classId: 'manakete', level: 8, stats: s(22, 6, 8, 11, 8, 4), growth: s(65, 40, 50, 60, 50, 20), weapons: ['wind_breath'] },
  aurelie: { classId: 'manakete', level: 6, stats: s(21, 5, 7, 7, 10, 5), growth: s(70, 45, 45, 45, 60, 30), weapons: ['light_breath'] },
  ilse: { classId: 'skyknight', level: 6, stats: s(23, 8, 8, 11, 7, 6), growth: s(65, 40, 45, 55, 50, 20), weapons: ['iron_lance', 'killer_lance'] },
};

export const CHARACTER_ENDINGS: Record<string, string> = {
  kael: 'Kael was crowned at Caer Valen and ruled long and fairly. His first decree pardoned every soldier who laid down Ashen arms.',
  lyra: 'Lyra became First Knight of Aldmere. No assassin ever got within ten paces of the king.',
  brann: 'Brann retired to Dunmarch with a pension and three nieces who never stopped asking for war stories.',
  seren: 'Seren returned to her village and rebuilt it with her own hands. Travelers say the road there is the safest in the north.',
  mira: 'Mira opened a hospice in the ruins of the capital. It never turned anyone away.',
  tomas: 'Tomas trained a new generation of Aldmere knights, and made every one of them swear to remember the bridge.',
  rei: 'Rei rebuilt her master\'s dojo stone by stone. Its doors stayed open to anyone who wished to learn.',
  pip: 'Pip was appointed Keeper of the King\'s Locks, a post invented so that someone would be watching Pip.',
  sable: 'Sable flew north when the war ended. On clear nights the people of Highmoor still look up.',
  osric: 'Osric went back to his wood and his axe. Every spring a cask of Caer Valen wine arrives at his door, unsigned.',
  nerys: 'Nerys returned to Saltmere and never again let a ship go down within sight of the harbour. The fishermen leave a cup of wine on the pier for her every autumn, and she drinks it, and pretends she doesn\'t.',
  garrow: 'Garrow filled in every tunnel beneath Deepforge, one stone at a time. It took him eleven years, and he called them the best years of his life.',
  kestrel: 'Kestrel joined the new Sky Guard as its first and only dragon. Recruits learned to fly by chasing the shape of the wind over Galewatch.',
  aurelie: 'Aurelie went home to Solenne, but not to its altar. She opened the temple\'s doors to anyone who wanted to talk, and she always answered to her name.',
  ilse: 'Ilse rode the skies of Highmoor until her hair turned grey, and the Sky Guard flew again.',
};

let weaponSeq = 0;
const wuid = () => `w${Date.now().toString(36)}${(weaponSeq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createPlayerUnit(id: string): Unit {
  const t = PLAYER_TEMPLATES[id];
  const info = CHARACTERS[id];
  if (!t || !info || !CLASSES[t.classId]) throw new Error(`Unknown character ${id}`);
  return {
    id, name: info.name, classId: t.classId, team: 'player',
    level: t.level, exp: 0, stats: { ...t.stats }, growth: { ...t.growth }, hp: t.stats.hp,
    weapons: t.weapons.map(defId => ({ uid: wuid(), defId, forge: 0 })), equipped: 0,
    potions: 1, stones: CLASSES[t.classId].shifts ? MAX_STONES : undefined, picks: CLASSES[t.classId].steals ? [PICK_USES] : undefined, isLord: t.isLord, x: 0, y: 0, done: false,
  };
}
