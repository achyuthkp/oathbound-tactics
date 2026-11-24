import { useState } from 'react';
import { SLOTS, deleteSave, listSaves, type SaveData, type SlotId } from '../game/saves';
import { Sheet } from './Profile';

interface Props {
  mode: 'save' | 'load';
  canSave: { ok: true } | { ok: false; reason: string };
  onSave: (slot: SlotId) => void;
  onLoad: (slot: SlotId) => void;
  onMode: (m: 'save' | 'load') => void;
  onClose: () => void;
}

const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function SaveMenu({ mode, canSave, onSave, onLoad, onMode, onClose }: Props) {
  const [saves, setSaves] = useState(listSaves);
  const [confirm, setConfirm] = useState<{ slot: SlotId; action: 'overwrite' | 'delete' } | null>(null);
  const slots = mode === 'save' ? SLOTS.filter(s => s.manual) : SLOTS;

  const act = (slot: SlotId, data: SaveData | null) => {
    if (mode === 'load') { if (data) onLoad(slot); return; }
    if (data && !(confirm?.slot === slot && confirm.action === 'overwrite')) { setConfirm({ slot, action: 'overwrite' }); return; }
    onSave(slot);
    setSaves(listSaves());
    setConfirm(null);
  };

  return (
    <Sheet title={mode === 'save' ? 'Save game' : 'Load game'} onClose={onClose}>
      <div className="save-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'save'} className={mode === 'save' ? 'on' : ''} onClick={() => { onMode('save'); setConfirm(null); }}>Save</button>
        <button role="tab" aria-selected={mode === 'load'} className={mode === 'load' ? 'on' : ''} onClick={() => { onMode('load'); setConfirm(null); }}>Load</button>
      </div>
      {mode === 'save' && !canSave.ok && <p className="save-note">{canSave.reason}</p>}
      <ul className="save-list">
        {slots.map(s => {
          const d = saves[s.id];
          const confirming = confirm?.slot === s.id;
          return (
            <li key={s.id} className={d ? '' : 'empty'}>
              <div className="sl-info">
                <strong>{s.label}{s.id === 'quick' && <kbd>F5</kbd>}</strong>
                {d ? (<><span>{d.summary}</span><small>{when(d.savedAt)}, {d.campaign.mode === 'classic' ? 'Classic' : 'Casual'}, {d.campaign.gold.toLocaleString()} gold</small></>) : <span>Empty</span>}
              </div>
              <div className="sl-acts">
                {confirming && confirm.action === 'delete' ? (
                  <>
                    <button className="danger" onClick={() => { deleteSave(s.id); setSaves(listSaves()); setConfirm(null); }}>Delete</button>
                    <button className="ghost" onClick={() => setConfirm(null)}>Keep</button>
                  </>
                ) : (
                  <>
                    <button
                      className={confirming ? 'danger' : 'primary'}
                      disabled={mode === 'save' ? !canSave.ok : !d}
                      onClick={() => act(s.id, d)}
                    >
                      {mode === 'load' ? 'Load' : confirming ? 'Overwrite' : d ? 'Save here' : 'Save'}
                    </button>
                    {d && <button className="ghost" onClick={() => setConfirm({ slot: s.id, action: 'delete' })} aria-label={`Delete ${s.label}`}>Delete</button>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="hint">Shortcuts: F5 quicksave, F9 quickload, Ctrl+S save menu, Ctrl+O load menu. You can save at camp, or in battle during your turn when no unit is mid-action. Saves stay in this browser.</p>
    </Sheet>
  );
}
