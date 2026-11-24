import { CHAPTERS } from './data/chapters';
import type { BattleState, Campaign } from './types';

/**
 * Save slots live in the browser's localStorage (one key per slot); nothing is downloaded.
 * A save made at camp holds the campaign; a save made during a battle also holds the full
 * board, so loading it resumes that exact turn.
 */
export type SlotId = 'quick' | 'auto' | 'slot1' | 'slot2' | 'slot3';
export const SLOTS: { id: SlotId; label: string; manual: boolean }[] = [
  { id: 'quick', label: 'Quicksave', manual: true },
  { id: 'auto', label: 'Autosave', manual: false },
  { id: 'slot1', label: 'Slot 1', manual: true },
  { id: 'slot2', label: 'Slot 2', manual: true },
  { id: 'slot3', label: 'Slot 3', manual: true },
];

export interface SaveData {
  version: 2;
  slot: SlotId;
  savedAt: number;
  where: 'camp' | 'battle';
  summary: string;
  campaign: Campaign;
  battle?: BattleState;
}

const PREFIX = 'oathbound-slot-';
const LEGACY_KEY = 'oathbound-save-v1';

export const slotLabel = (id: SlotId) => SLOTS.find(s => s.id === id)?.label ?? id;

export function summarize(where: 'camp' | 'battle', c: Campaign, b?: BattleState): string {
  if (where === 'battle' && b) {
    const ch = CHAPTERS[b.chapterIndex];
    return `Chapter ${ch.number}, ${ch.title}: turn ${b.turn} of battle`;
  }
  const ch = CHAPTERS[Math.min(c.chapterIndex, CHAPTERS.length - 1)];
  return `Rest area before chapter ${ch.number}, ${ch.title}`;
}

function migrateLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    if (!localStorage.getItem(PREFIX + 'auto')) {
      const campaign = JSON.parse(raw) as Campaign;
      const data: SaveData = { version: 2, slot: 'auto', savedAt: Date.now(), where: 'camp', summary: summarize('camp', campaign), campaign };
      localStorage.setItem(PREFIX + 'auto', JSON.stringify(data));
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* storage unavailable */ }
}

export function writeSave(slot: SlotId, where: 'camp' | 'battle', campaign: Campaign, battle?: BattleState): boolean {
  const data: SaveData = { version: 2, slot, savedAt: Date.now(), where, summary: summarize(where, campaign, battle), campaign, battle };
  try { localStorage.setItem(PREFIX + slot, JSON.stringify(data)); return true; } catch { return false; }
}

export function readSave(slot: SlotId): SaveData | null {
  migrateLegacy();
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    return d && d.version === 2 && d.campaign ? d : null;
  } catch { return null; }
}

export function deleteSave(slot: SlotId) {
  try { localStorage.removeItem(PREFIX + slot); } catch { /* storage unavailable */ }
}

export function listSaves(): Record<SlotId, SaveData | null> {
  return Object.fromEntries(SLOTS.map(s => [s.id, readSave(s.id)])) as Record<SlotId, SaveData | null>;
}

export function latestSave(): SaveData | null {
  return Object.values(listSaves()).filter((d): d is SaveData => !!d).sort((a, b) => b.savedAt - a.savedAt)[0] ?? null;
}
