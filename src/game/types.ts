export type WeaponType = 'sword' | 'lance' | 'axe' | 'bow' | 'staff' | 'breath';
export type Team = 'player' | 'enemy';
export type MoveType = 'foot' | 'armor' | 'horse' | 'flying';
export type TerrainId =
  | 'plains' | 'road' | 'forest' | 'hills' | 'mountain' | 'water' | 'desert' | 'wall' | 'fort' | 'bridge' | 'throne' | 'house' | 'building' | 'ruins' | 'chest' | 'door' | 'gate' | 'doorway' | 'gateway';
export type AIMode = 'aggressive' | 'guard' | 'hold' | 'raid' | 'loot';
export type StatKey = 'hp' | 'str' | 'skl' | 'spd' | 'lck' | 'def';
export type Stats = Record<StatKey, number>;

export const STAT_KEYS: StatKey[] = ['hp', 'str', 'skl', 'spd', 'lck', 'def'];
export const STAT_LABEL: Record<StatKey, string> = {
  hp: 'HP', str: 'Str', skl: 'Skl', spd: 'Spd', lck: 'Lck', def: 'Def',
};

export interface Pos { x: number; y: number; }

export interface WeaponDef {
  id: string;
  name: string;
  type: WeaponType;
  might: number;
  hit: number;
  crit: number;
  weight: number;
  minRange: number;
  maxRange: number;
  price: number;
  /** Shop tier. 99 = personal / enemy-only, never sold. */
  tier: number;
  heal?: number;
  /** Triple might against units that move this way: 'armor' knights, 'horse' cavalry, 'flying' pegasi and wyverns. */
  effective?: MoveType[];
  desc?: string;
}

export interface WeaponInstance {
  uid: string; defId: string; forge: number;
  /** Uses left before it breaks. Unset means untouched (see maxUses); personal weapons never wear. */
  uses?: number;
}

export interface ClassDef {
  id: string;
  name: string;
  weapons: WeaponType[];
  moveType: MoveType;
  mov: number;
  /** This class can burn houses (see ai 'raid'). */
  raids?: boolean;
  /** This class can steal from adjacent enemies and open treasure chests. */
  steals?: boolean;
  /** This class takes dragon form by spending a dragonstone. */
  shifts?: boolean;
  base: Stats;
  growth: Stats;
  desc: string;
}

export interface Unit {
  id: string;
  name: string;
  classId: string;
  team: Team;
  level: number;
  exp: number;
  stats: Stats;
  growth: Stats;
  hp: number;
  weapons: WeaponInstance[];
  equipped: number;
  potions: number;
  /** Dragonstones carried (shifting classes only). */
  stones?: number;
  /** In dragon form: own turns remaining. The form's stat bonus is already added to `stats`. */
  dragon?: number;
  /** Gold's worth of treasure an enemy thief is carrying; dropped when it is defeated. */
  loot?: number;
  /** Lockpicks carried, as uses left on each. Every lockpick is its own item; only thieves can use them. */
  picks?: number[];
  /** Keys carried. Each opens one chest, door or gate. An enemy's key goes to whoever defeats (or robs) it. */
  keys?: number;
  /** Left at camp: not deployed in the next battle. */
  reserve?: boolean;
  isLord?: boolean;
  isBoss?: boolean;
  ai?: AIMode;
  /** Character id used for portrait art (bosses / named NPCs). */
  lookId?: string;
  x: number;
  y: number;
  done: boolean;
}

export type Objective =
  | { type: 'rout' }
  | { type: 'boss' }
  | { type: 'survive'; turns: number }
  | { type: 'seize'; x: number; y: number };

export interface EnemySpawn {
  classId: string;
  level: number;
  weapons: string[];
  x: number;
  y: number;
  ai?: AIMode;
  name?: string;
  isBoss?: boolean;
  lookId?: string;
  /** Carries a key. */
  key?: boolean;
  statBonus?: Partial<Stats>;
}

export interface Reinforcement { turn: number; units: EnemySpawn[]; }

export type Mood = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
export interface DialogueLine { speaker: string; text: string; mood?: Mood; }

/** A house a player unit can visit once, by ending a move on it. Exactly one reward. */
export interface House {
  x: number;
  y: number;
  /** What the occupant says. */
  text: string;
  gold?: number;
  /** Weapon id; goes to the visitor, or is sold for half price if their pack is full. */
  weapon?: string;
  /** A vulnerary. */
  potion?: boolean;
  /** Character id who joins the army after the battle (rare). */
  recruit?: string;
}

export interface Chapter {
  number: number;
  title: string;
  map: string[];
  objective: Objective;
  objectiveText: string;
  playerStarts: Pos[];
  enemies: EnemySpawn[];
  reinforcements?: Reinforcement[];
  recruits?: string[];
  houses?: House[];
  /** Treasure chests (on 'chest' tiles). Opened from the tile or beside it, by a thief's lockpick or anyone's key. */
  chests?: House[];
  pre: DialogueLine[];
  post: DialogueLine[];
  reward: number;
  backdrop: string;
}

export type RankLetter = 'C' | 'B' | 'A' | 'S';
export interface SupportConvo { rank: RankLetter; lines: DialogueLine[]; }
export interface SupportPair {
  a: string;
  b: string;
  romance: boolean;
  start: number;
  convos: SupportConvo[];
  ending?: string;
}

export type GameMode = 'classic' | 'casual';

export interface Campaign {
  mode: GameMode;
  /** Index of the next chapter to play. */
  chapterIndex: number;
  roster: Unit[];
  fallen: string[];
  gold: number;
  bonds: Record<string, number>;
  ranks: Record<string, number>;
  ap: number;
}

export interface BattleState {
  chapterIndex: number;
  map: TerrainId[][];
  width: number;
  height: number;
  units: Unit[];
  turn: number;
  phase: Team;
  ranks: Record<string, number>;
  bondGains: Record<string, number>;
  goldEarned: number;
  kills: number;
  fallenUnits: Unit[];
  log: string[];
  seized: boolean;
  enemyCounter: number;
  /** Houses already visited, as "x,y". */
  visited?: string[];
  /** Chests already opened, as "x,y". */
  opened?: string[];
  /** Houses burned down by raiders, as "x,y". Their rewards are lost. */
  burned?: string[];
  /** Characters who agreed to join after this battle. */
  recruited?: string[];
}
