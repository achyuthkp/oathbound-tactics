import { CHAPTERS } from './data/chapters';
import type { BattleState, Campaign } from './types';

/**
 * Save slots live in the browser's localStorage (one key per slot). A slot can be exported as a
 * JSON file and imported again. A save made at camp holds the campaign; a save made during a
 * battle also holds the full board, so loading it resumes that exact turn.
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

const chapterAt = (i: number) => CHAPTERS[Math.max(0, Math.min(Number.isFinite(i) ? Math.floor(i) : 0, CHAPTERS.length - 1))];

export function summarize(where: 'camp' | 'battle', c: Campaign, b?: BattleState): string {
  if (where === 'battle' && b) {
    const ch = chapterAt(b.chapterIndex);
    return `Chapter ${ch.number}, ${ch.title}: turn ${b.turn} of battle`;
  }
  const ch = chapterAt(c.chapterIndex);
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

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSlotId = (v: unknown): v is SlotId => typeof v === 'string' && SLOTS.some(s => s.id === v);

export type ParsedSave = { ok: true; save: SaveData } | { ok: false; error: string };
export type SaveWriteResult = { ok: true; slot: SlotId; save: SaveData } | { ok: false; error: string };

/** Pretty JSON for a filled slot, or null when the slot is empty. */
export function exportSave(slot: SlotId): string | null {
  const data = readSave(slot);
  return data ? JSON.stringify(data, null, 2) : null;
}

/**
 * Validate an imported file and rebuild the fields we do not trust. Unknown slots become slot1;
 * the summary is recomputed when absent, and the timestamp is the import time.
 */
export function parseSaveJson(text: string): ParsedSave {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'That file is not valid JSON.' }; }
  if (!isRecord(raw)) return { ok: false, error: 'That file is not an Oathbound save.' };
  if (raw.version !== 2) return { ok: false, error: 'That save was made by an unsupported version of Oathbound.' };
  if (!isRecord(raw.campaign)) return { ok: false, error: 'That save has no campaign data.' };
  if (raw.where !== 'camp' && raw.where !== 'battle') return { ok: false, error: 'That save does not say where it was made.' };
  const campaign = raw.campaign;
  if (!Array.isArray(campaign.roster) || typeof campaign.chapterIndex !== 'number' || typeof campaign.gold !== 'number'
    || (campaign.mode !== 'classic' && campaign.mode !== 'casual')) {
    return { ok: false, error: 'That save has incomplete campaign data.' };
  }
  const battle = raw.battle;
  if (raw.where === 'battle' && (!isRecord(battle) || !Array.isArray(battle.units) || !Array.isArray(battle.map)
    || typeof battle.chapterIndex !== 'number' || typeof battle.turn !== 'number')) {
    return { ok: false, error: 'That battle save has incomplete battle data.' };
  }
  const where: 'camp' | 'battle' = raw.where === 'battle' ? 'battle' : 'camp';
  const campaignData = campaign as unknown as Campaign;
  const battleData = where === 'battle' ? battle as unknown as BattleState : undefined;
  const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary : summarize(where, campaignData, battleData);
  const slot = isSlotId(raw.slot) ? raw.slot : 'slot1';
  return { ok: true, save: { version: 2, slot, savedAt: Date.now(), where, summary, campaign: campaignData, battle: battleData } };
}

export function storeSave(save: SaveData): SaveWriteResult {
  try {
    localStorage.setItem(PREFIX + save.slot, JSON.stringify(save));
    return { ok: true, slot: save.slot, save };
  } catch { return { ok: false, error: 'Could not write the save to browser storage.' }; }
}

export function importSave(text: string): SaveWriteResult {
  const parsed = parseSaveJson(text);
  return parsed.ok ? storeSave(parsed.save) : parsed;
}

export function listSaves(): Record<SlotId, SaveData | null> {
  return Object.fromEntries(SLOTS.map(s => [s.id, readSave(s.id)])) as Record<SlotId, SaveData | null>;
}

export function latestSave(): SaveData | null {
  return Object.values(listSaves()).filter((d): d is SaveData => !!d).sort((a, b) => b.savedAt - a.savedAt)[0] ?? null;
}
