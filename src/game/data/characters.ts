import type { Stats, Unit } from '../types';
import { CLASSES } from './classes';

export type HairStyle = 'short' | 'long' | 'tied' | 'spiky' | 'hood' | 'helm' | 'rugged' | 'slick' | 'bun';

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
  /* Illustration details */
  eyes?: string;
  lashes?: boolean;
  freckles?: boolean;
  outfit?: Outfit;
  cape?: string;
}

/* ---------- Full-body build (for the 2D animated models) ---------- */

export type Outfit = 'cape' | 'armor' | 'robe' | 'leather' | 'hunter' | 'gi' | 'light';
export interface Build {
  outfit: Outfit;
  mount?: 'horse' | 'pegasus';
  coat?: string;
  mane?: string;
  cape?: string;
  pants: string;
  boots: string;
  broad?: boolean;
}

const CLASS_BUILD: Record<string, Partial<Build>> = {
  lord: { outfit: 'cape' },
  cavalier: { outfit: 'light', mount: 'horse' },
  fighter: { outfit: 'leather', broad: true },
  brigand: { outfit: 'leather', broad: true },
  soldier: { outfit: 'armor' },
  knight: { outfit: 'armor', broad: true },
  myrmidon: { outfit: 'gi' },
  archer: { outfit: 'hunter' },
  cleric: { outfit: 'robe' },
  skyknight: { outfit: 'light', mount: 'pegasus' },
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
};

export function buildFor(u: { id: string; classId: string; lookId?: string }, opts: { dismount?: boolean } = {}): Build {
  const b: Build = {
    outfit: 'light', pants: '#3a3446', boots: '#3b2a1e',
    ...CLASS_BUILD[u.classId],
    ...CHAR_BUILD[u.lookId ?? u.id],
  };
  if (opts.dismount) delete b.mount;
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
  ilse: { name: 'Ilse', title: 'Highmoor Sky Guard', look: { skin: '#f5dcc6', hair: '#a8cdea', style: 'bun', cloth: '#dfe7f0', accent: '#3d6fb0', eyes: '#3d84b8', lashes: true, freckles: true, outfit: 'light' } },
  // NPCs and bosses
  gorran: { name: 'Gorran', title: 'Brigand Chief', look: { skin: '#cf9a74', hair: '#2a2420', style: 'rugged', cloth: '#5a3424', accent: '#8a2a20', eyes: '#3a2a1a', outfit: 'leather' } },
  varn: { name: 'Varn', title: 'Imperial Captain', look: { skin: '#dcae8a', hair: '#333', style: 'helm', cloth: '#4a2228', accent: '#c23b3b', stubble: true, eyes: '#4a3a2a', outfit: 'armor' } },
  morwen: { name: 'Morwen', title: 'Warden of Highmoor', look: { skin: '#eccbb5', hair: '#1f1a22', style: 'long', cloth: '#3a1f2f', accent: '#c43c5c', eyes: '#8a2a3a', lashes: true, outfit: 'cape', cape: '#5a1f35' } },
  malrec: { name: 'Malrec', title: 'The Ash Regent', look: { skin: '#e0c0a8', hair: '#c4c4c4', style: 'slick', cloth: '#1f1f26', accent: '#c46a2a', crown: true, scar: true, eyes: '#b07a2a', outfit: 'cape', cape: '#4a1408' } },
};

/** Generic looks for nameless enemies, by class. */
export const ENEMY_LOOKS: Record<string, Look> = {
  brigand: { skin: '#cf9a74', hair: '#2a2420', style: 'rugged', cloth: '#6b3a2a', accent: '#8a2a20', outfit: 'leather' },
  fighter: { skin: '#d6a27c', hair: '#4a2a1a', style: 'rugged', cloth: '#7a4422', accent: '#8a2a20', outfit: 'leather' },
  soldier: { skin: '#dcae8a', hair: '#333', style: 'helm', cloth: '#7a2230', accent: '#c23b3b', outfit: 'armor' },
  knight: { skin: '#dcae8a', hair: '#333', style: 'helm', cloth: '#5a5f6e', accent: '#c23b3b', outfit: 'armor' },
  myrmidon: { skin: '#e8c4a4', hair: '#222', style: 'tied', cloth: '#6a1f3a', accent: '#c23b3b', outfit: 'gi' },
  archer: { skin: '#d8b08c', hair: '#3a2a1e', style: 'hood', cloth: '#5a3a28', accent: '#c23b3b', outfit: 'hunter' },
  cavalier: { skin: '#e0b896', hair: '#3a2a1e', style: 'short', cloth: '#7a2230', accent: '#c23b3b', outfit: 'light' },
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
    potions: 1, isLord: t.isLord, x: 0, y: 0, done: false,
  };
}
