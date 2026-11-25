import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS, lookById } from '../game/data/characters';
import type { DialogueLine, Mood } from '../game/types';
import { Portrait } from './art';

interface Props {
  lines: DialogueLine[];
  heading?: string;
  subheading?: string;
  backdrop?: string;
  onDone: () => void;
  doneLabel?: string;
}

const CHAR_MS = 16;

export function StoryScene({ lines, heading, subheading, backdrop = 'dusk', onDone }: Props) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const finished = useRef(false);
  const line = lines[i];
  const text = line?.text ?? '';

  // Speakers alternate between the left and right slots, like a visual novel.
  const layout = useMemo(() => {
    let left: string | null = null, right: string | null = null;
    let last: 'left' | 'right' = 'right';
    let active: 'left' | 'right' | null = null;
    const moods: Record<string, Mood> = {};
    for (let j = 0; j <= i && j < lines.length; j++) {
      const sp = lines[j].speaker;
      if (sp !== 'narrator') moods[sp] = lines[j].mood ?? 'neutral';
      if (sp === 'narrator') { active = null; continue; }
      if (sp === left) { active = 'left'; last = 'left'; continue; }
      if (sp === right) { active = 'right'; last = 'right'; continue; }
      const sideNext: 'left' | 'right' = last === 'left' ? 'right' : 'left';
      if (sideNext === 'left') left = sp; else right = sp;
      last = sideNext;
      active = sideNext;
    }
    return { left, right, active, moods };
  }, [i, lines]);

  useEffect(() => {
    setShown(0);
    if (!text) return;
    const id = window.setInterval(() => {
      setShown(n => { if (n >= text.length) { window.clearInterval(id); return n; } return n + 2; });
    }, CHAR_MS);
    return () => window.clearInterval(id);
  }, [i, text]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const advance = useCallback(() => {
    if (shown < text.length) { setShown(text.length); return; }
    if (i < lines.length - 1) setI(i + 1);
    else finish();
  }, [shown, text.length, i, lines.length, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, finish]);

  if (!line) return null;
  const narr = line.speaker === 'narrator';
  const name = CHARACTERS[line.speaker]?.name ?? line.speaker;

  return (
    <div className={`story backdrop-${backdrop}`} onClick={advance}>
      {heading && (
        <header className="story-head">
          <h1>{heading}</h1>
          {subheading && <p>{subheading}</p>}
        </header>
      )}
      <div className="story-stage">
        {(['left', 'right'] as const).map(side => {
          const id = layout[side];
          if (!id) return <div key={side} className={`story-portrait ${side}`} />;
          return (
            <div key={side} className={`story-portrait ${side} ${layout.active === side ? 'active' : 'idle'}`}>
              <Portrait
                look={lookById(id)}
                size={250}
                mood={layout.moods[id] ?? 'neutral'}
                talking={layout.active === side && shown < text.length}
              />
            </div>
          );
        })}
      </div>
      <div className={`dialogue ${narr ? 'narration' : ''} ${layout.active ?? ''}`}>
        {!narr && <div className="nameplate">{name}</div>}
        <p>{text.slice(0, shown)}<span className="caret" aria-hidden="true">{shown >= text.length ? '▾' : ''}</span></p>
      </div>
      <div className="story-controls" onClick={e => e.stopPropagation()}>
        <span>{i + 1} / {lines.length}</span>
        <button className="ghost" data-pad="start" onClick={finish}>Skip scene</button>
      </div>
    </div>
  );
}
