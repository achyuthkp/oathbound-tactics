export type WeaponType = 'sword' | 'lance' | 'axe' | 'bow' | 'staff';
export type Team = 'player' | 'enemy';
export type MoveType = 'foot' | 'armor' | 'horse' | 'flying';
export type TerrainId =
  | 'plains' | 'road' | 'forest' | 'hills' | 'mountain' | 'water' | 'desert' | 'wall' | 'fort' | 'bridge' | 'throne';
export type AIMode = 'aggressive' | 'guard' | 'hold';
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
  effectiveVsFlying?: boolean;
  desc?: string;
}

export interface WeaponInstance { uid: string; defId: string; forge: number; }

export interface ClassDef {
  id: string;
  name: string;
  weapons: WeaponType[];
  moveType: MoveType;
  mov: number;
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
  statBonus?: Partial<Stats>;
}

export interface Reinforcement { turn: number; units: EnemySpawn[]; }

export type Mood = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
export interface DialogueLine { speaker: string; text: string; mood?: Mood; }

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
}
