import { CLASSES } from './data/classes';
import { CHARACTERS, PLAYER_TEMPLATES, createPlayerUnit } from './data/characters';
import { CHAR_TERRAIN, TERRAIN } from './data/terrain';
import { WEAPONS } from './data/weapons';
import { MAX_UNITS_PER_SIDE } from './battle';
import { STAT_KEYS } from './types';
import type { AIMode, Chapter, EnemySpawn, House, Objective, Reinforcement, Stats, TerrainId, Unit } from './types';
import { MAX_ITEMS, MAX_KEYS, MAX_POTIONS, MAX_STONES, PICK_USES, itemCount, makeEnemy, uid } from './units';

/*
 * Challenge mode: maps the player builds in the map builder and plays outside the story.
 * A map is plain JSON so it can be saved in the browser and exported to a file for others.
 * Every option has a default, so a new map is playable before anything is changed.
 */

export const CHALLENGE_VERSION = 1;
export const MIN_SIZE = 6;
export const MAX_W = 40;
export const MAX_H = 30;

/** A player unit the author placed: a story character (`charId`) or a generic one of `classId`. */
export interface PlayerSpawn {
  x: number;
  y: number;
  charId?: string;
  classId: string;
  level: number;
  weapons: string[];
  /** Losing this unit loses the map (when the map's lose rule is 'leader'). */
  leader?: boolean;
  potions: number;
  keys: number;
  /** Lockpicks carried (thieves only), each with full uses. */
  picks: number;
  /** Dragonstones (dragonkin only). */
  stones: number;
  statBonus?: Partial<Stats>;
}

/** An enemy the author placed. `turn` above 1 makes it a reinforcement arriving on that turn. */
export interface EnemyPlacement extends EnemySpawn { turn: number; }

export interface ChallengeMap {
  version: typeof CHALLENGE_VERSION;
  id: string;
  name: string;
  /** One string per row, using the terrain letters of the story maps ('.' plains, 'F' forest...). */
  tiles: string[];
  objective: 'rout' | 'boss' | 'survive' | 'seize';
  /** Turns to hold out, for 'survive'. */
  surviveTurns: number;
  loseRule: 'leader' | 'all';
  players: PlayerSpawn[];
  enemies: EnemyPlacement[];
  houses: House[];
  chests: House[];
  /** Fewest turns this map has been cleared in, on this browser. */
  best?: number;
}

/** Terrain the builder can paint, with the letter stored in `tiles`. Open doors only appear in play. */
export const TERRAIN_CHAR = Object.fromEntries(Object.entries(CHAR_TERRAIN).map(([c, t]) => [t, c])) as Partial<Record<TerrainId, string>>;
export const PAINTABLE = Object.keys(TERRAIN_CHAR) as TerrainId[];

export const tileAt = (m: ChallengeMap, x: number, y: number): TerrainId => CHAR_TERRAIN[m.tiles[y]?.[x] ?? '.'] ?? 'plains';
export function setTile(m: ChallengeMap, x: number, y: number, t: TerrainId): ChallengeMap {
  const c = TERRAIN_CHAR[t] ?? '.';
  if (m.tiles[y]?.[x] === c) return m;
  const tiles = m.tiles.map((r, yy) => (yy === y ? r.slice(0, x) + c + r.slice(x + 1) : r));
  const at = (h: House) => h.x === x && h.y === y;
  // a house or chest needs contents: painting one adds the default, painting over one removes it
  const houses = t === 'house' ? (m.houses.some(at) ? m.houses : [...m.houses, defaultHouse(x, y)]) : m.houses.filter(h => !at(h));
  const chests = t === 'chest' ? (m.chests.some(at) ? m.chests : [...m.chests, defaultChest(x, y)]) : m.chests.filter(h => !at(h));
  return { ...m, tiles, houses, chests };
}

export const defaultHouse = (x: number, y: number): House => ({ x, y, text: 'A villager presses a purse into your hand. "For the road."', gold: 500 });
export const defaultChest = (x: number, y: number): House => ({ x, y, text: 'The chest holds a heavy purse.', gold: 1000 });

/** Classes a generic unit can be. */
export const CLASS_IDS = Object.keys(CLASSES);
/** Story characters that can be placed. */
export const CHARACTER_IDS = Object.keys(PLAYER_TEMPLATES);

/** Weapons a class can carry, cheapest first; personal weapons only for their owner. */
export function weaponsFor(classId: string, charId?: string): string[] {
  const own = charId ? PLAYER_TEMPLATES[charId]?.weapons ?? [] : [];
  return Object.values(WEAPONS)
    .filter(w => CLASSES[classId]?.weapons.includes(w.type) && (w.tier < 99 || own.includes(w.id) || (w.type === 'breath' && w.id !== 'dark_breath')))
    .sort((a, b) => a.tier - b.tier || a.price - b.price)
    .map(w => w.id);
}

/** The usual starting weapon of a class. */
export const starterWeapon = (classId: string): string => weaponsFor(classId)[0] ?? 'iron_sword';

export function defaultPlayer(x: number, y: number, from?: PlayerSpawn): PlayerSpawn {
  if (from) return { ...structuredClone(from), x, y, leader: false };
  return playerOf('kael', x, y);
}

/** A story character as placed by default: their own class, level, weapons and kit. */
export function playerOf(charId: string, x: number, y: number): PlayerSpawn {
  const t = PLAYER_TEMPLATES[charId];
  const c = CLASSES[t.classId];
  return { x, y, charId, classId: t.classId, level: t.level, weapons: [...t.weapons], leader: !!t.isLord, potions: 1, keys: 0, picks: c.steals ? 1 : 0, stones: c.shifts ? MAX_STONES : 0 };
}

/** A generic unit of a class at a level, with its starter weapon and the class's usual kit. */
export function genericOf(classId: string, level: number, x: number, y: number): PlayerSpawn {
  const c = CLASSES[classId];
  return { x, y, classId, level, weapons: [starterWeapon(classId)], potions: 1, keys: 0, picks: c.steals ? 1 : 0, stones: c.shifts ? MAX_STONES : 0 };
}

export function defaultEnemy(x: number, y: number, from?: EnemyPlacement): EnemyPlacement {
  if (from) return { ...structuredClone(from), x, y, isBoss: false, name: undefined };
  return { x, y, classId: 'soldier', level: 1, weapons: ['iron_lance'], ai: 'aggressive', turn: 1 };
}

/** AI modes an enemy of this class may use. */
export function aiModesFor(classId: string): AIMode[] {
  const c = CLASSES[classId];
  return ['aggressive', 'guard', 'hold', ...(c?.raids ? ['raid' as const] : []), ...(c?.steals ? ['loot' as const] : [])];
}

export function newChallenge(): ChallengeMap {
  const w = 16, h = 10;
  const tiles = Array.from({ length: h }, () => '.'.repeat(w));
  return {
    version: CHALLENGE_VERSION, id: uid(), name: 'New challenge', tiles, objective: 'rout', surviveTurns: 8, loseRule: 'leader',
    players: [playerOf('kael', 2, 4), playerOf('lyra', 2, 5)],
    enemies: [defaultEnemy(12, 4), defaultEnemy(12, 6)],
    houses: [], chests: [],
  };
}

/** Grow or shrink the map, padding with plains and dropping anything left outside it. */
export function resize(m: ChallengeMap, w: number, h: number): ChallengeMap {
  w = Math.max(MIN_SIZE, Math.min(MAX_W, Math.round(w)));
  h = Math.max(MIN_SIZE, Math.min(MAX_H, Math.round(h)));
  const tiles = Array.from({ length: h }, (_, y) => (m.tiles[y] ?? '').slice(0, w).padEnd(w, '.'));
  const inside = (p: { x: number; y: number }) => p.x < w && p.y < h;
  return { ...m, tiles, players: m.players.filter(inside), enemies: m.enemies.filter(inside), houses: m.houses.filter(inside), chests: m.chests.filter(inside) };
}

const clampLevel = (n: number) => Math.max(1, Math.min(20, Math.round(n) || 1));

/** Build the battle unit for a placed player. Levels above the base add each growth's average. */
export function playerUnit(p: PlayerSpawn, i: number, loseRule: ChallengeMap['loseRule']): Unit {
  const level = clampLevel(p.level);
  let u: Unit;
  if (p.charId && PLAYER_TEMPLATES[p.charId]) {
    u = createPlayerUnit(p.charId);
    const base = u.level;
    for (const k of STAT_KEYS) u.stats[k] += Math.floor((u.growth[k] * Math.max(0, level - base)) / 100);
    u.level = Math.max(base, level);
  } else {
    u = { ...makeEnemy({ classId: p.classId, level, weapons: [], x: 0, y: 0 }, `p${i}`), team: 'player', ai: undefined };
  }
  for (const k of STAT_KEYS) u.stats[k] += p.statBonus?.[k] ?? 0;
  u.hp = u.stats.hp;
  u.weapons = p.weapons.filter(id => WEAPONS[id]).slice(0, MAX_ITEMS).map(defId => ({ uid: uid(), defId, forge: 0 }));
  u.equipped = 0;
  u.potions = Math.min(MAX_POTIONS, Math.max(0, p.potions));
  u.keys = Math.min(MAX_KEYS, Math.max(0, p.keys)) || undefined;
  u.picks = CLASSES[u.classId].steals ? Array.from({ length: Math.max(0, p.picks) }, () => PICK_USES) : undefined;
  u.stones = CLASSES[u.classId].shifts ? Math.min(MAX_STONES, Math.max(0, p.stones)) : undefined;
  u.isLord = loseRule === 'leader' && !!p.leader;
  return { ...u, x: p.x, y: p.y, done: false };
}

export const playerUnits = (m: ChallengeMap): Unit[] => m.players.map((p, i) => playerUnit(p, i, m.loseRule));

/** Preview of an enemy as it will appear in battle. */
export const enemyUnit = (e: EnemyPlacement, i: number): Unit => makeEnemy(e, `e${i + 1}`);

const OBJECTIVE_TEXT = {
  rout: 'Defeat all enemies.',
  boss: 'Defeat the enemy commander.',
  survive: (n: number) => `Survive ${n} turns.`,
  seize: 'Seize the throne.',
};

/** The battle chapter for a map. Enemies arriving after turn 1 become reinforcements. */
export function toChapter(m: ChallengeMap): Chapter {
  const throne = findTile(m, 'throne');
  const objective: Objective = m.objective === 'survive' ? { type: 'survive', turns: m.surviveTurns }
    : m.objective === 'seize' && throne ? { type: 'seize', x: throne.x, y: throne.y }
    : { type: m.objective === 'seize' ? 'rout' : m.objective };
  const spawn = (e: EnemyPlacement): EnemySpawn => { const { turn: _t, ...sp } = e; return sp; };
  const waves = new Map<number, EnemySpawn[]>();
  for (const e of m.enemies.filter(e => e.turn > 1)) waves.set(e.turn, [...(waves.get(e.turn) ?? []), spawn(e)]);
  const reinforcements: Reinforcement[] = [...waves].sort((a, b) => a[0] - b[0]).map(([turn, units]) => ({ turn, units }));
  const leaderText = m.loseRule === 'leader' ? ' Lose if your leader falls.' : ' Lose if your whole army falls.';
  return {
    number: 0, title: m.name || 'Challenge', map: m.tiles,
    objective,
    objectiveText: (m.objective === 'survive' ? OBJECTIVE_TEXT.survive(m.surviveTurns) : OBJECTIVE_TEXT[m.objective]) + leaderText,
    playerStarts: m.players.map(p => ({ x: p.x, y: p.y })),
    enemies: m.enemies.filter(e => e.turn <= 1).map(spawn),
    reinforcements, houses: m.houses, chests: m.chests,
    pre: [], post: [], reward: 0, backdrop: 'castle', loseRule: m.loseRule,
  };
}

const findTile = (m: ChallengeMap, t: TerrainId) => {
  for (let y = 0; y < m.tiles.length; y++) for (let x = 0; x < m.tiles[y].length; x++) if (tileAt(m, x, y) === t) return { x, y };
  return null;
};

/** Everything that stops a map from being played. Empty means it is ready. */
export function problems(m: ChallengeMap): string[] {
  const out: string[] = [];
  const w = m.tiles[0]?.length ?? 0;
  if (m.tiles.length < MIN_SIZE || w < MIN_SIZE || m.tiles.some(r => r.length !== w)) out.push('The map must be a rectangle at least 6 by 6.');
  if (!m.players.length) out.push('Place at least one of your units.');
  if (m.players.length > MAX_UNITS_PER_SIDE) out.push(`At most ${MAX_UNITS_PER_SIDE} of your units.`);
  const start = m.enemies.filter(e => e.turn <= 1);
  if (start.length > MAX_UNITS_PER_SIDE) out.push(`At most ${MAX_UNITS_PER_SIDE} enemies on turn 1; later arrivals can be reinforcements.`);
  if (!m.enemies.length && m.objective !== 'survive') out.push('Place at least one enemy.');
  if (m.loseRule === 'leader' && m.players.filter(p => p.leader).length !== 1) out.push('Mark exactly one of your units as leader, or switch the lose rule to "whole army".');
  if (m.objective === 'boss' && !m.enemies.some(e => e.isBoss)) out.push('The "defeat the commander" objective needs an enemy marked as boss.');
  if (m.objective === 'seize' && !findTile(m, 'throne')) out.push('The "seize" objective needs a throne tile.');
  const seen = new Set<string>();
  const chars = new Set<string>();
  const place = (x: number, y: number, classId: string, what: string) => {
    const t = tileAt(m, x, y);
    const cls = CLASSES[classId];
    if (!cls) { out.push(`${what} has an unknown class.`); return; }
    if (!Number.isFinite(TERRAIN[t].cost[cls.moveType])) out.push(`${what} at ${x + 1},${y + 1} stands on ${TERRAIN[t].name.toLowerCase()}, which a ${cls.name} cannot enter.`);
  };
  m.players.forEach((p, i) => {
    const what = p.charId ? CHARACTERS[p.charId]?.name ?? p.charId : `Your ${CLASSES[p.classId]?.name ?? 'unit'} #${i + 1}`;
    place(p.x, p.y, p.classId, what);
    if (p.charId) { if (chars.has(p.charId)) out.push(`${what} is placed twice.`); chars.add(p.charId); }
    if (!p.weapons.length) out.push(`${what} has no weapon.`);
    if (itemCount(playerUnit(p, i, m.loseRule)) > MAX_ITEMS) out.push(`${what} carries more than ${MAX_ITEMS} items.`);
    const k = `${p.x},${p.y}`; if (seen.has(k)) out.push(`Two units share tile ${p.x + 1},${p.y + 1}.`); seen.add(k);
  });
  m.enemies.forEach((e, i) => {
    const what = e.name || `Enemy ${CLASSES[e.classId]?.name ?? ''} #${i + 1}`;
    place(e.x, e.y, e.classId, what);
    if (!e.weapons.length) out.push(`${what} has no weapon.`);
    // reinforcements arrive on a free tile near their spot, so only turn-1 enemies must not overlap
    if (e.turn <= 1) { const k = `${e.x},${e.y}`; if (seen.has(k)) out.push(`Two units share tile ${e.x + 1},${e.y + 1}.`); seen.add(k); }
  });
  return [...new Set(out)];
}

/* ---------- storage and files ---------- */

const KEY = 'oathbound-challenges';

export function listChallenges(): ChallengeMap[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.map(parseChallenge).filter((r): r is { ok: true; map: ChallengeMap } => r.ok).map(r => r.map) : [];
  } catch { return []; }
}

function writeAll(maps: ChallengeMap[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(maps)); return true; } catch { return false; }
}

export function storeChallenge(m: ChallengeMap): boolean {
  const all = listChallenges();
  const i = all.findIndex(x => x.id === m.id);
  return writeAll(i >= 0 ? all.map(x => (x.id === m.id ? m : x)) : [...all, m]);
}

export const deleteChallenge = (id: string): boolean => writeAll(listChallenges().filter(m => m.id !== id));

/** Record a clear; keeps the fewest turns. */
export function recordClear(id: string, turns: number) {
  const m = listChallenges().find(x => x.id === id);
  if (m && (!m.best || turns < m.best)) storeChallenge({ ...m, best: turns });
}

/** JSON for a map file. The personal best stays on this browser. */
export const exportChallenge = (m: ChallengeMap): string => JSON.stringify({ ...m, best: undefined }, null, 2);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Validate a map read from a file or storage, filling defaults for anything missing. */
export function parseChallenge(raw: unknown): { ok: true; map: ChallengeMap } | { ok: false; error: string } {
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { return { ok: false, error: 'That file is not valid JSON.' }; } }
  if (!isObj(raw) || raw.version !== CHALLENGE_VERSION || !Array.isArray(raw.tiles)) return { ok: false, error: 'That file is not an Oathbound challenge map.' };
  if (!raw.tiles.every(r => typeof r === 'string' && [...r].every(c => c in CHAR_TERRAIN))) return { ok: false, error: 'That map has tiles this version does not know.' };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isObj) : []);
  const pos = (o: Record<string, unknown>) => ({ x: Math.floor(num(o.x, -1)), y: Math.floor(num(o.y, -1)) });
  const players = list(raw.players).filter(p => CLASSES[String(p.classId)]).map((p): PlayerSpawn => ({
    ...pos(p), charId: typeof p.charId === 'string' && PLAYER_TEMPLATES[p.charId] ? p.charId : undefined, classId: String(p.classId),
    level: clampLevel(num(p.level, 1)), weapons: (Array.isArray(p.weapons) ? p.weapons : []).map(String).filter(id => WEAPONS[id]),
    leader: !!p.leader, potions: num(p.potions, 1), keys: num(p.keys, 0), picks: num(p.picks, 0), stones: num(p.stones, 0),
    statBonus: isObj(p.statBonus) ? (p.statBonus as Partial<Stats>) : undefined,
  }));
  const ai = (v: unknown, classId: string): AIMode => (aiModesFor(classId).includes(v as AIMode) ? (v as AIMode) : 'aggressive');
  const enemies = list(raw.enemies).filter(e => CLASSES[String(e.classId)]).map((e): EnemyPlacement => ({
    ...pos(e), classId: String(e.classId), level: clampLevel(num(e.level, 1)),
    weapons: (Array.isArray(e.weapons) ? e.weapons : []).map(String).filter(id => WEAPONS[id]),
    ai: ai(e.ai, String(e.classId)), name: typeof e.name === 'string' && e.name ? e.name.slice(0, 24) : undefined,
    isBoss: !!e.isBoss || undefined, key: !!e.key || undefined, potions: num(e.potions, 0) || undefined, turn: Math.max(1, Math.floor(num(e.turn, 1))),
    statBonus: isObj(e.statBonus) ? (e.statBonus as Partial<Stats>) : undefined,
  }));
  const house = (h: Record<string, unknown>): House => ({
    ...pos(h), text: typeof h.text === 'string' ? h.text.slice(0, 200) : '',
    gold: num(h.gold, 0) || undefined, weapon: typeof h.weapon === 'string' && WEAPONS[h.weapon] ? h.weapon : undefined, potion: !!h.potion || undefined,
  });
  const objective = (['rout', 'boss', 'survive', 'seize'] as const).find(o => o === raw.objective) ?? 'rout';
  const map: ChallengeMap = {
    version: CHALLENGE_VERSION, id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 40) : 'Imported challenge',
    tiles: raw.tiles as string[], objective, surviveTurns: Math.max(1, Math.floor(num(raw.surviveTurns, 8))),
    loseRule: raw.loseRule === 'all' ? 'all' : 'leader',
    players, enemies, houses: list(raw.houses).map(house), chests: list(raw.chests).map(house),
    best: num(raw.best, 0) || undefined,
  };
  return { ok: true, map };
}

/** Import a map file into storage. An id already in use gets a fresh one, so nothing is overwritten. */
export function importChallenge(text: string): { ok: true; map: ChallengeMap } | { ok: false; error: string } {
  const r = parseChallenge(text);
  if (!r.ok) return r;
  const map = listChallenges().some(m => m.id === r.map.id) ? { ...r.map, id: uid() } : r.map;
  return storeChallenge(map) ? { ok: true, map } : { ok: false, error: 'Could not write the map to browser storage.' };
}
