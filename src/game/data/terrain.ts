import type { MoveType, TerrainId } from '../types';

const INF = Number.POSITIVE_INFINITY;

export interface TerrainDef {
  id: TerrainId;
  name: string;
  def: number;
  avo: number;
  /** % of max HP restored at the start of the occupant's phase. */
  heal: number;
  cost: Record<MoveType, number>;
}

function t(
  id: TerrainId, name: string, def: number, avo: number, heal: number,
  foot: number, armor: number, horse: number, flying: number,
): TerrainDef {
  return { id, name, def, avo, heal, cost: { foot, armor, horse, flying } };
}

/*
 * Columns: defence, avoid, heal %, then movement cost on foot / in armour / on horseback / flying.
 * INF = cannot enter. Fliers pay 1 everywhere and get no terrain bonus (see terrainBonus).
 *
 *   plains    no bonus, no penalty
 *   forest    some cover, slows everyone on the ground
 *   hills     the best cover in the open, and the slowest ground to cross
 *   desert    as slow as hills with no cover at all
 *   mountain  fliers only
 *   water     fliers only for now. A seafaring class (pirates) would be a new MoveType, say
 *             'sea': add it to MoveType, give t() one more column, and set water to 1-2 there.
 */
export const TERRAIN: Record<TerrainId, TerrainDef> = {
  plains: t('plains', 'Plains', 0, 0, 0, 1, 1, 1, 1),
  road: t('road', 'Road', 0, 0, 0, 1, 1, 1, 1),
  forest: t('forest', 'Forest', 1, 20, 0, 2, 2, 3, 1),
  hills: t('hills', 'Hills', 2, 30, 0, 3, 4, 4, 1),
  desert: t('desert', 'Desert', 0, 0, 0, 3, 4, 4, 1),
  mountain: t('mountain', 'Mountain', 0, 0, 0, INF, INF, INF, 1),
  water: t('water', 'Water', 0, 0, 0, INF, INF, INF, 1),
  wall: t('wall', 'Wall', 0, 0, 0, INF, INF, INF, INF),
  fort: t('fort', 'Fort', 2, 20, 20, 2, 2, 2, 1),
  bridge: t('bridge', 'Bridge', 0, 0, 0, 1, 1, 1, 1),
  throne: t('throne', 'Throne', 3, 30, 20, 1, 1, 1, 1),
  house: t('house', 'House', 0, 10, 0, 1, 1, 1, 1),
  building: t('building', 'Building', 0, 0, 0, INF, INF, INF, 1),
  chest: t('chest', 'Chest', 0, 0, 0, 1, 1, 1, 1),
  // locked until opened with a key or a lockpick; then an ordinary passage
  door: t('door', 'Locked door', 0, 0, 0, INF, INF, INF, INF),
  gate: t('gate', 'Locked gate', 0, 0, 0, INF, INF, INF, INF),
  doorway: t('doorway', 'Open door', 0, 0, 0, 1, 1, 1, 1),
  gateway: t('gateway', 'Open gate', 0, 0, 0, 1, 1, 1, 1),
  ruins: t('ruins', 'Ruins', 1, 10, 0, 2, 2, 3, 1),
};

export const CHAR_TERRAIN: Record<string, TerrainId> = {
  '.': 'plains', r: 'road', F: 'forest', h: 'hills', D: 'desert', M: 'mountain', W: 'water',
  '#': 'wall', H: 'fort', B: 'bridge', T: 'throne', V: 'house', b: 'building', x: 'ruins', C: 'chest', d: 'door', G: 'gate',
};
