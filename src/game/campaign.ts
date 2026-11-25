import { CHAPTERS } from './data/chapters';
import { createPlayerUnit } from './data/characters';
import { SUPPORTS, initialBonds, pairKey } from './data/supports';
import type { BattleResult } from './battle';
import type { Campaign, GameMode, SupportPair, Unit } from './types';

export const AP_PER_CAMP = 3;
export const START_GOLD = 800;

export function newCampaign(mode: GameMode): Campaign {
  return { mode, chapterIndex: 0, roster: [], fallen: [], gold: START_GOLD, bonds: initialBonds(), ranks: {}, ap: 0 };
}

/** Adds the chapter's recruits to the roster (once). */
export function addRecruits(c: Campaign, chapterIndex: number): Campaign {
  const ids = CHAPTERS[chapterIndex].recruits ?? [];
  const add = ids.filter(id => !c.roster.some(u => u.id === id) && !c.fallen.includes(id)).map(createPlayerUnit);
  return add.length ? { ...c, roster: [...c.roster, ...add] } : c;
}

export function mergeBattle(c: Campaign, r: BattleResult, chapterIndex: number): Campaign {
  const fallenIds = new Set(r.fallen.map(u => u.id));
  const roster: Unit[] = [];
  for (const old of c.roster) {
    const live = r.units.find(u => u.id === old.id);
    const dead = r.fallen.find(u => u.id === old.id);
    const src = live ?? dead;
    if (dead && c.mode === 'classic') continue;
    if (!src) { roster.push(old); continue; }
    roster.push({ ...old, level: src.level, exp: src.exp, stats: { ...src.stats }, hp: live ? src.hp : 1,
      weapons: src.weapons.map(w => ({ ...w })), equipped: src.equipped, potions: src.potions, stones: src.stones, picks: src.picks, keys: src.keys, done: false });
  }
  for (const id of r.recruits ?? []) {
    if (!roster.some(u => u.id === id) && !c.fallen.includes(id)) roster.push(createPlayerUnit(id));
  }
  const bonds = { ...c.bonds };
  for (const [k, v] of Object.entries(r.bondGains)) bonds[k] = (bonds[k] ?? 0) + v;
  return {
    ...c, roster, bonds,
    fallen: c.mode === 'classic' ? [...c.fallen, ...[...fallenIds]] : c.fallen,
    gold: c.gold + r.gold + CHAPTERS[chapterIndex].reward,
  };
}

/** Arriving at the rest area: everyone recovers half their missing HP and gets fresh activity points. */
export function enterCamp(c: Campaign, nextChapter: number): Campaign {
  return {
    ...c, chapterIndex: nextChapter, ap: AP_PER_CAMP,
    roster: c.roster.map(u => ({ ...u, hp: u.hp + Math.ceil((u.stats.hp - u.hp) / 2) })),
  };
}

export function activePairs(c: Campaign): SupportPair[] {
  return SUPPORTS.filter(p => c.roster.some(u => u.id === p.a) && c.roster.some(u => u.id === p.b));
}

/** S-rank partner of a unit, if any. */
export function sPartner(c: Campaign, id: string): string | null {
  for (const p of SUPPORTS) {
    if ((p.a === id || p.b === id) && (c.ranks[pairKey(p.a, p.b)] ?? 0) >= 4) return p.a === id ? p.b : p.a;
  }
  return null;
}
