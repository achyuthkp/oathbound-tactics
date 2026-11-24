import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTERS } from './game/data/chapters';
import type { BattleResult } from './game/battle';
import { addRecruits, enterCamp, mergeBattle, newCampaign } from './game/campaign';
import { latestSave, readSave, slotLabel, writeSave, type SaveData, type SlotId } from './game/saves';
import type { BattleState, Campaign, GameMode } from './game/types';
import { BattleScreen, type SaveSource } from './components/battle/BattleScreen';
import { CampScreen } from './components/camp/CampScreen';
import { SaveMenu } from './components/SaveMenu';
import { EndingScreen, GameOverScreen, TitleScreen } from './components/Screens';
import { StoryScene } from './components/StoryScene';
import { WorldMap } from './components/WorldMap';

type Screen =
  | { kind: 'title' }
  | { kind: 'travel'; chapterIndex: number }
  | { kind: 'story'; chapterIndex: number; part: 'pre' | 'post' }
  | { kind: 'battle'; chapterIndex: number; attempt: number; resume?: BattleState }
  | { kind: 'camp' }
  | { kind: 'gameover'; chapterIndex: number }
  | { kind: 'ending' };

type CanSave = { ok: true } | { ok: false; reason: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'title' });
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [menu, setMenu] = useState<'save' | 'load' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const snapshot = useRef<Campaign | null>(null);
  const attempts = useRef(0);
  const saveSource = useRef<SaveSource | null>(null);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(t => (t === msg ? null : t)), 2600);
  }, []);

  const startChapter = (c: Campaign, chapterIndex: number) => {
    setCampaign(addRecruits(c, chapterIndex));
    setScreen({ kind: 'travel', chapterIndex });
  };

  const newGame = (mode: GameMode) => startChapter(newCampaign(mode), 0);

  const beginBattle = (chapterIndex: number) => {
    snapshot.current = campaign;
    attempts.current += 1;
    setScreen({ kind: 'battle', chapterIndex, attempt: attempts.current });
  };

  const onVictory = (chapterIndex: number, r: BattleResult) => {
    if (!campaign) return;
    setCampaign(mergeBattle(campaign, r, chapterIndex));
    setScreen({ kind: 'story', chapterIndex, part: 'post' });
  };

  const afterPost = (chapterIndex: number) => {
    if (!campaign) return;
    if (chapterIndex >= CHAPTERS.length - 1) { setScreen({ kind: 'ending' }); return; }
    const c = enterCamp(campaign, chapterIndex + 1);
    setCampaign(c);
    writeSave('auto', 'camp', c);
    setScreen({ kind: 'camp' });
  };

  const retry = (chapterIndex: number) => {
    if (snapshot.current) setCampaign(snapshot.current);
    attempts.current += 1;
    setScreen({ kind: 'battle', chapterIndex, attempt: attempts.current });
  };

  /* ---------- saving & loading ---------- */

  const canSave = (): CanSave => {
    if (screen.kind === 'camp' && campaign) return { ok: true };
    if (screen.kind === 'battle') {
      const r = saveSource.current?.();
      return r ? (r.ok ? { ok: true } : { ok: false, reason: r.reason }) : { ok: false, reason: 'The battle is still loading.' };
    }
    return { ok: false, reason: 'You can save at the rest area, or during a battle on your turn.' };
  };

  const doSave = (slot: SlotId) => {
    if (screen.kind === 'camp' && campaign) {
      say(writeSave(slot, 'camp', campaign) ? `Saved to ${slotLabel(slot)}.` : 'Could not save: browser storage is unavailable.');
      return;
    }
    if (screen.kind === 'battle') {
      const r = saveSource.current?.();
      if (!r || !r.ok) { say(r && !r.ok ? r.reason : 'Can\'t save right now.'); return; }
      const base = snapshot.current ?? campaign;
      if (!base) return;
      say(writeSave(slot, 'battle', base, r.battle) ? `Saved to ${slotLabel(slot)}.` : 'Could not save: browser storage is unavailable.');
      return;
    }
    say('You can save at the rest area, or during a battle on your turn.');
  };

  const applySave = (d: SaveData) => {
    setCampaign(d.campaign);
    snapshot.current = d.campaign;
    setMenu(null);
    if (d.where === 'battle' && d.battle) {
      attempts.current += 1;
      setScreen({ kind: 'battle', chapterIndex: d.battle.chapterIndex, attempt: attempts.current, resume: d.battle });
    } else {
      setScreen({ kind: 'camp' });
    }
    say(`Loaded ${slotLabel(d.slot)}: ${d.summary}.`);
  };

  const doLoad = (slot: SlotId) => {
    const d = readSave(slot);
    if (!d) { say(`${slotLabel(slot)} is empty.`); return; }
    applySave(d);
  };

  // Shortcuts: F5 quicksave, F9 quickload, Ctrl/Cmd+S save menu, Ctrl/Cmd+O load menu.
  const handlers = useRef({ doSave, doLoad, setMenu });
  handlers.current = { doSave, doLoad, setMenu };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'F5' && !mod) { e.preventDefault(); handlers.current.doSave('quick'); }
      else if (e.key === 'F9') { e.preventDefault(); handlers.current.doLoad('quick'); }
      else if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); handlers.current.setMenu('save'); }
      else if (mod && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); handlers.current.setMenu('load'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const registerSave = useCallback((fn: SaveSource | null) => { saveSource.current = fn; }, []);

  /* ---------- screens ---------- */

  let body: JSX.Element | null = null;
  switch (screen.kind) {
    case 'title':
      body = <TitleScreen canContinue={!!latestSave()} onNew={newGame} onContinue={() => { const d = latestSave(); if (d) applySave(d); }} onLoad={() => setMenu('load')} />;
      break;
    case 'travel':
      body = (
        <WorldMap
          key={`travel-${screen.chapterIndex}`}
          chapterIndex={screen.chapterIndex}
          roster={campaign?.roster ?? []}
          onDone={() => setScreen({ kind: 'story', chapterIndex: screen.chapterIndex, part: 'pre' })}
        />
      );
      break;
    case 'story': {
      const ch = CHAPTERS[screen.chapterIndex];
      const pre = screen.part === 'pre';
      body = (
        <StoryScene
          key={`${screen.chapterIndex}-${screen.part}`}
          lines={pre ? ch.pre : ch.post}
          heading={pre ? `Chapter ${ch.number}` : undefined}
          subheading={pre ? ch.title : undefined}
          backdrop={ch.backdrop}
          onDone={() => (pre ? beginBattle(screen.chapterIndex) : afterPost(screen.chapterIndex))}
        />
      );
      break;
    }
    case 'battle':
      body = campaign ? (
        <BattleScreen
          key={screen.attempt}
          chapterIndex={screen.chapterIndex}
          campaign={campaign}
          resume={screen.resume}
          registerSave={registerSave}
          onOpenSaveMenu={setMenu}
          onVictory={r => onVictory(screen.chapterIndex, r)}
          onDefeat={() => setScreen({ kind: 'gameover', chapterIndex: screen.chapterIndex })}
          onQuit={() => setScreen({ kind: 'title' })}
        />
      ) : null;
      break;
    case 'camp':
      body = campaign ? (
        <CampScreen
          campaign={campaign}
          blocked={menu !== null}
          onChange={setCampaign}
          onOpenSaveMenu={setMenu}
          onTitle={() => setScreen({ kind: 'title' })}
          onMarch={() => { writeSave('auto', 'camp', campaign); startChapter(campaign, campaign.chapterIndex); }}
        />
      ) : null;
      break;
    case 'gameover':
      body = <GameOverScreen onRetry={() => retry(screen.chapterIndex)} onLoad={() => setMenu('load')} onTitle={() => setScreen({ kind: 'title' })} />;
      break;
    case 'ending':
      body = campaign ? <EndingScreen campaign={campaign} onTitle={() => setScreen({ kind: 'title' })} /> : null;
      break;
  }

  return (
    <>
      {body}
      {menu && (
        <SaveMenu
          mode={menu}
          canSave={canSave()}
          onSave={doSave}
          onLoad={doLoad}
          onMode={setMenu}
          onClose={() => setMenu(null)}
        />
      )}
      {toast && <div className="toast global" role="status">{toast}</div>}
    </>
  );
}
