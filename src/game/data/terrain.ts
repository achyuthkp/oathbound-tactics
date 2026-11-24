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

export const TERRAIN: Record<TerrainId, TerrainDef> = {
  plains: t('plains', 'Plains', 0, 0, 0, 1, 1, 1, 1),
  road: t('road', 'Road', 0, 0, 0, 1, 1, 1, 1),
  forest: t('forest', 'Forest', 1, 20, 0, 2, 2, 3, 1),
  mountain: t('mountain', 'Mountain', 2, 30, 0, 3, INF, INF, 1),
  water: t('water', 'River', 0, 10, 0, INF, INF, INF, 1),
  wall: t('wall', 'Wall', 0, 0, 0, INF, INF, INF, INF),
  fort: t('fort', 'Fort', 2, 20, 20, 2, 2, 2, 1),
  bridge: t('bridge', 'Bridge', 0, 0, 0, 1, 1, 1, 1),
  throne: t('throne', 'Throne', 3, 30, 20, 1, 1, 1, 1),
};

export const CHAR_TERRAIN: Record<string, TerrainId> = {
  '.': 'plains', r: 'road', F: 'forest', M: 'mountain', W: 'water',
  '#': 'wall', H: 'fort', B: 'bridge', T: 'throne',
};
