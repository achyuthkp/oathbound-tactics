import { CHAPTERS } from './data/chapters';
import { createPlayerUnit } from './data/characters';
import { CLASSES } from './data/classes';
import { MAX_STONES } from './units';
import { SUPPORTS, initialBonds, pairKey } from './data/supports';
import type { BattleResult } from './battle';
import type { Campaign, GameMode, SupportPair, Unit } from './types';

export const AP_PER_CAMP = 3;
export const START_GOLD = 800;

export function newCampaign(mode: GameMode): Campaign {
  return { mode, chapterIndex: 0, roster: [], fallen: [], gold: START_GOLD, bonds: initialBonds(), ranks: {}, ap: 0 };
}

/** Adds the chapter's recruits to the roster (once), and awakens whoever the chapter awakens. */
export function addRecruits(c: Campaign, chapterIndex: number): Campaign {
  const ch = CHAPTERS[chapterIndex];
  const ids = ch.recruits ?? [];
  const add = ids.filter(id => !c.roster.some(u => u.id === id) && !c.fallen.includes(id)).map(createPlayerUnit);
  let roster = add.length ? [...c.roster, ...add] : c.roster;
  const aw = ch.awaken;
  if (aw && roster.some(u => u.id === aw.id && u.classId !== aw.classId)) {
    roster = roster.map(u => (u.id === aw.id ? { ...u, classId: aw.classId, stones: Math.min(MAX_STONES, (u.stones ?? 0) + aw.stones) } : u));
  }
  return roster === c.roster ? c : { ...c, roster };
}

/** Whether a campaign has a story flag. */
export const hasFlag = (c: Pick<Campaign, 'flags'>, flag: string): boolean => (c.flags ?? []).includes(flag);

/** The chapter after this one, skipping side chapters the campaign has not unlocked. CHAPTERS.length means the story is over. */
export function nextChapter(c: Pick<Campaign, 'flags'>, chapterIndex: number): number {
  let n = chapterIndex + 1;
  while (n < CHAPTERS.length && CHAPTERS[n].requires && !hasFlag(c, CHAPTERS[n].requires!)) n++;
  return n;
}

/** Dialogue lines this campaign should see: a line with `when` needs that character in the army, or that flag. */
export const linesFor = <T extends { when?: string }>(c: Pick<Campaign, 'flags' | 'roster'>, lines: T[]): T[] =>
  lines.filter(l => !l.when || hasFlag(c, l.when) || c.roster.some(u => u.id === l.when));

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
  const bonus = r.alliesSaved ? CHAPTERS[chapterIndex].allyReward : undefined;
  return {
    ...c, roster, bonds,
    fallen: c.mode === 'classic' ? [...c.fallen, ...[...fallenIds]] : c.fallen,
    gold: c.gold + r.gold + CHAPTERS[chapterIndex].reward + (bonus?.gold ?? 0),
    flags: bonus && !hasFlag(c, bonus.flag) ? [...(c.flags ?? []), bonus.flag] : c.flags,
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

/**
 * How many S-rank (romance) bonds a unit may hold; everyone else holds one.
 * HIDDEN EASTER EGG (docs/story.md): Kael can hold two. Never explain this in game text or the manual.
 */
export const ROMANCE_LIMIT: Record<string, number> = { kael: 2 };

/** A unit's S-rank partners, in bond order. */
export const sPartners = (c: Pick<Campaign, 'ranks'>, id: string): string[] =>
  SUPPORTS.filter(p => (p.a === id || p.b === id) && (c.ranks[pairKey(p.a, p.b)] ?? 0) >= 4).map(p => (p.a === id ? p.b : p.a));

/** First S-rank partner of a unit, if any. */
export const sPartner = (c: Pick<Campaign, 'ranks'>, id: string): string | null => sPartners(c, id)[0] ?? null;

/** No more S bonds for this unit. */
export const romanceFull = (c: Pick<Campaign, 'ranks'>, id: string): boolean => sPartners(c, id).length >= (ROMANCE_LIMIT[id] ?? 1);
