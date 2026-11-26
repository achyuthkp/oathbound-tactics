import { useRef, useState, type ChangeEvent } from 'react';
import { deleteChallenge, exportChallenge, importChallenge, listChallenges, newChallenge, problems, type ChallengeMap } from '../game/challenge';

const OBJ: Record<ChallengeMap['objective'], string> = { rout: 'Rout', boss: 'Defeat boss', survive: 'Survive', seize: 'Seize' };

/** Challenge mode: the player's own maps, outside the story. */
export function ChallengeScreen({ onPlay, onEdit, onBack }: { onPlay: (m: ChallengeMap) => void; onEdit: (m: ChallengeMap) => void; onBack: () => void }) {
  const [maps, setMaps] = useState(listChallenges);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = (m: ChallengeMap) => {
    const url = URL.createObjectURL(new Blob([exportChallenge(m)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `oathbound-challenge-${(m.name || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'map'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ ok: true, text: `Exported "${m.name}". Send the file to anyone with Oathbound; they import it here.` });
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const r = importChallenge(await file.text());
      if (!r.ok) { setNotice({ ok: false, text: r.error }); return; }
      setMaps(listChallenges());
      setNotice({ ok: true, text: `Imported "${r.map.name}".` });
    } catch {
      setNotice({ ok: false, text: 'Could not read that file.' });
    }
  };

  return (
    <div className="challenge-screen">
      <header>
        <h1>Challenge mode</h1>
        <p className="hint">Maps of your own, outside the story. Build one, play it, and export it for others.</p>
      </header>
      <div className="challenge-actions">
        <button className="primary" onClick={() => onEdit(newChallenge())}>New map</button>
        <button onClick={() => fileRef.current?.click()}>Import map file</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        <div className="spacer" />
        <button className="ghost" onClick={onBack}>Title screen</button>
      </div>
      {notice && <p className={`notice ${notice.ok ? 'ok' : 'bad'}`} role="status">{notice.text}</p>}
      {!maps.length && <p className="hint">No maps yet. Start with New map, or import a file someone sent you.</p>}
      <ul className="challenge-list">
        {maps.map(m => {
          const ready = problems(m).length === 0;
          return (
            <li key={m.id}>
              <div className="challenge-info">
                <strong>{m.name}</strong>
                <span className="hint">
                  {m.tiles[0].length}×{m.tiles.length} · {OBJ[m.objective]}{m.objective === 'survive' ? ` ${m.surviveTurns} turns` : ''} · {m.players.length} vs {m.enemies.length}
                  {m.best ? ` · Best: ${m.best} turns` : ''}{ready ? '' : ' · Unfinished'}
                </span>
              </div>
              <button className="primary small" disabled={!ready} title={ready ? undefined : 'Open it in the builder to see what is missing'} onClick={() => onPlay(m)}>Play</button>
              <button className="small" onClick={() => onEdit(m)}>Edit</button>
              <button className="small" onClick={() => download(m)}>Export</button>
              {confirmDelete === m.id
                ? <button className="danger small" onClick={() => { deleteChallenge(m.id); setMaps(listChallenges()); setConfirmDelete(null); }}>Delete for good?</button>
                : <button className="ghost small" onClick={() => setConfirmDelete(m.id)}>Delete</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChallengeResult({ map, won, turns, best, onRetry, onEdit, onBack }: {
  map: ChallengeMap; won: boolean; turns: number; best?: number; onRetry: () => void; onEdit: () => void; onBack: () => void;
}) {
  return (
    <div className="challenge-screen result">
      <h1>{won ? 'Challenge cleared' : 'Challenge failed'}</h1>
      <p className="logo-sub">{map.name}</p>
      {won && <p>Cleared in {turns} turn{turns === 1 ? '' : 's'}.{best && best < turns ? ` Your best is ${best}.` : ' A new best.'}</p>}
      <div className="challenge-actions center">
        <button className="primary" onClick={onRetry}>{won ? 'Play again' : 'Try again'}</button>
        <button onClick={onEdit}>Edit map</button>
        <button className="ghost" onClick={onBack}>Challenge list</button>
      </div>
    </div>
  );
}
