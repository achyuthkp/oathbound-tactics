import { useRef, useState, type ChangeEvent } from 'react';
import { SLOTS, deleteSave, exportSave, listSaves, parseSaveJson, slotLabel, storeSave, type SaveData, type SlotId } from '../game/saves';
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
  const [pendingImport, setPendingImport] = useState<SaveData | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const slots = mode === 'save' ? SLOTS.filter(s => s.manual) : SLOTS;

  const act = (slot: SlotId, data: SaveData | null) => {
    if (mode === 'load') { if (data) onLoad(slot); return; }
    if (data && !(confirm?.slot === slot && confirm.action === 'overwrite')) { setConfirm({ slot, action: 'overwrite' }); return; }
    onSave(slot);
    setSaves(listSaves());
    setConfirm(null);
  };

  const download = (slot: SlotId) => {
    const json = exportSave(slot);
    if (!json) { setNotice({ ok: false, text: `${slotLabel(slot)} is empty.` }); return; }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `oathbound-${slot}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on a later task so browsers that start the download asynchronously still get the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ ok: true, text: `Exported ${slotLabel(slot)}.` });
  };

  const commitImport = (save: SaveData) => {
    const r = storeSave(save);
    if (!r.ok) { setNotice({ ok: false, text: r.error }); return; }
    setSaves(listSaves());
    setPendingImport(null);
    setConfirm(null);
    setNotice({ ok: true, text: `Imported into ${slotLabel(r.slot)}. It is ready to load, not loaded automatically.` });
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNotice(null);
    setPendingImport(null);
    setConfirm(null);
    try {
      const parsed = parseSaveJson(await file.text());
      if (!parsed.ok) { setNotice({ ok: false, text: parsed.error }); return; }
      const current = listSaves();
      setSaves(current);
      if (current[parsed.save.slot]) {
        setPendingImport(parsed.save);
        setNotice({ ok: false, text: `${slotLabel(parsed.save.slot)} already has a save. Confirm below to overwrite it.` });
        return;
      }
      commitImport(parsed.save);
    } catch {
      setNotice({ ok: false, text: 'Could not read that file.' });
    }
  };

  return (
    <Sheet title={mode === 'save' ? 'Save game' : 'Load game'} onClose={onClose}>
      <div className="save-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'save'} className={mode === 'save' ? 'on' : ''} onClick={() => { onMode('save'); setConfirm(null); setPendingImport(null); setNotice(null); }}>Save</button>
        <button role="tab" aria-selected={mode === 'load'} className={mode === 'load' ? 'on' : ''} onClick={() => { onMode('load'); setConfirm(null); setPendingImport(null); setNotice(null); }}>Load</button>
      </div>
      {mode === 'save' && !canSave.ok && <p className="save-note">{canSave.reason}</p>}
      <ul className="save-list">
        {slots.map(s => {
          const d = saves[s.id];
          const confirming = confirm?.slot === s.id;
          const gold = d && Number.isFinite(d.campaign.gold) ? d.campaign.gold : 0;
          return (
            <li key={s.id} className={d ? '' : 'empty'}>
              <div className="sl-info">
                <strong>{s.label}{s.id === 'quick' && <kbd>F5</kbd>}</strong>
                {d ? (<><span>{d.summary}</span><small>{when(d.savedAt)}, {d.campaign.mode === 'classic' ? 'Classic' : 'Casual'}, {gold.toLocaleString()} gold</small></>) : <span>Empty</span>}
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
                    {d && <button className="ghost" onClick={() => download(s.id)} aria-label={`Export ${s.label}`}>Export</button>}
                    {d && <button className="ghost" onClick={() => setConfirm({ slot: s.id, action: 'delete' })} aria-label={`Delete ${s.label}`}>Delete</button>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {pendingImport && (
        <div className="save-import" role="group" aria-label="Confirm imported save overwrite">
          <span>{slotLabel(pendingImport.slot)} already has a save. Overwrite it with the imported file?</span>
          <button className="danger" onClick={() => commitImport(pendingImport)}>Overwrite</button>
          <button className="ghost" onClick={() => { setPendingImport(null); setNotice(null); }}>Cancel</button>
        </div>
      )}
      {notice && <p className={`save-note ${notice.ok ? 'ok' : ''}`} role="status">{notice.text}</p>}
      <div className="sheet-actions">
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
        <button className="ghost" onClick={() => fileRef.current?.click()}>Import save file</button>
      </div>
      <p className="hint">Shortcuts: F5 quicksave, F9 quickload, Ctrl+S save menu, Ctrl+O load menu. You can save at camp, or in battle during your turn when no unit is mid-action. Saves stay in this browser unless you export them; import a file to restore one to its slot.</p>
    </Sheet>
  );
}
