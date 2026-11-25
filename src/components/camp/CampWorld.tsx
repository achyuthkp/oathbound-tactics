import { memo, useEffect, useRef, useState } from 'react';
import { buildFor, lookFor } from '../../game/data/characters';
import { CLASSES } from '../../game/data/classes';
import type { Unit } from '../../game/types';
import { Figure } from '../figure';
import { CAMP_CHATTER } from '../../game/data/camp';

/** World is laid out in a fixed 1280×720 space and scaled to fit the screen. */
const W = 1280;
const H = 720;
const BOUNDS = { x0: 40, x1: 1240, y0: 300, y1: 700 };
const SPEED = 240;
const BODY_R = 16;

interface Station { id: string; x: number; y: number; r: number; label: string; verb: string; }
export const STATIONS: Station[] = [
  { id: 'fire', x: 640, y: 470, r: 92, label: 'Campfire', verb: 'rest by the fire' },
  { id: 'train', x: 215, y: 548, r: 92, label: 'Training ground', verb: 'train someone' },
  { id: 'merchant', x: 1085, y: 432, r: 104, label: 'Merchant', verb: 'visit the armory' },
  { id: 'pot', x: 795, y: 590, r: 74, label: 'Cooking pot', verb: 'share a meal' },
  { id: 'table', x: 640, y: 318, r: 88, label: 'War table', verb: 'plan the march' },
];

const SPOTS: Record<string, { x: number; y: number; face: 'left' | 'right' }> = {
  lyra: { x: 505, y: 425, face: 'right' },
  brann: { x: 318, y: 600, face: 'left' },
  seren: { x: 905, y: 395, face: 'left' },
  mira: { x: 700, y: 640, face: 'left' },
  tomas: { x: 470, y: 590, face: 'right' },
  rei: { x: 360, y: 405, face: 'right' },
  ilse: { x: 960, y: 575, face: 'left' },
  osric: { x: 800, y: 440, face: 'left' },
  pip: { x: 1010, y: 520, face: 'left' },
  sable: { x: 560, y: 610, face: 'right' },
};

const OBSTACLES = [
  { x: 640, y: 470, r: 44 },   // fire
  { x: 640, y: 300, r: 62 },   // war table
  { x: 1085, y: 414, r: 74 },  // wagon
  { x: 795, y: 578, r: 24 },   // pot
  { x: 180, y: 532, r: 18 },   // dummy
  { x: 252, y: 562, r: 18 },   // dummy
];

interface View { x: number; y: number; facing: 'left' | 'right'; moving: boolean; near: string | null; }

/* ---------- props (scenery) ---------- */

function Prop({ x, y, w, h, children, onClick, label }: { x: number; y: number; w: number; h: number; children: React.ReactNode; onClick?: () => void; label?: string }) {
  return (
    <div
      className={`cw-prop ${onClick ? 'interactive' : ''}`}
      style={{ left: x - w / 2, top: y - h, width: w, height: h, zIndex: Math.round(y) }}
      onClick={onClick ? e => { e.stopPropagation(); onClick(); } : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}

const Scenery = memo(function Scenery({ go }: { go: (id: string) => void }) {
  return (
    <>
      <div className="cw-sky" />
      <svg className="cw-treeline" viewBox="0 0 1280 320" preserveAspectRatio="none">
        <path d="M0 210 Q160 150 320 196 Q500 120 680 186 Q860 132 1040 190 Q1170 150 1280 176 L1280 320 L0 320 Z" fill="#141c2c" />
        {Array.from({ length: 26 }).map((_, i) => {
          const x = i * 51 + ((i * 37) % 23);
          const h = 70 + ((i * 53) % 50);
          return <path key={i} d={`M${x} 300 L${x + 22} ${300 - h} L${x + 44} 300 Z`} fill={i % 2 ? '#0f1a1c' : '#132224'} />;
        })}
      </svg>
      <div className="cw-ground" />
      <div className="cw-glow" style={{ left: 640, top: 470 }} />

      <Prop x={330} y={300} w={210} h={150}>
        <svg viewBox="0 0 210 150"><path d="M10 148 L105 12 L200 148 Z" fill="#7a6a4e" /><path d="M105 12 L200 148 L160 148 Z" fill="#5f523c" /><path d="M86 148 L105 70 L124 148 Z" fill="#2a2018" /><line x1="105" y1="4" x2="105" y2="14" stroke="#4a3a28" strokeWidth="4" /></svg>
      </Prop>
      <Prop x={952} y={292} w={190} h={140}>
        <svg viewBox="0 0 190 140"><path d="M8 138 L95 14 L182 138 Z" fill="#6e5e48" /><path d="M95 14 L182 138 L146 138 Z" fill="#544836" /><path d="M78 138 L95 70 L112 138 Z" fill="#241a12" /><path d="M95 14 V2 l18 6 l-18 6" fill="#2c4f9c" /></svg>
      </Prop>

      <Prop x={640} y={318} w={150} h={90} onClick={() => go('table')} label="War table">
        <svg viewBox="0 0 150 90"><rect x="10" y="30" width="130" height="18" rx="3" fill="#6b4a2a" /><path d="M18 32 L132 32 L126 22 L24 22 Z" fill="#d8c79a" /><path d="M40 26 Q60 22 72 28 T104 26" stroke="#8a5a3a" strokeWidth="1.5" fill="none" /><circle cx="90" cy="25" r="2.5" fill="#b8373f" /><rect x="20" y="48" width="8" height="40" fill="#4a3220" /><rect x="122" y="48" width="8" height="40" fill="#4a3220" /><rect x="132" y="10" width="5" height="14" fill="#eee" /><path className="cw-flame-small" d="M134.5 2 Q138 7 134.5 11 Q131 7 134.5 2 Z" fill="#ffcf6a" /></svg>
      </Prop>

      <Prop x={640} y={480} w={110} h={110} onClick={() => go('fire')} label="Campfire">
        <svg viewBox="0 0 110 110" className="cw-fire">
          <ellipse cx="55" cy="98" rx="40" ry="9" fill="#3a2a20" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <circle key={i} cx={55 + Math.cos(i * 0.785) * 34} cy={98 + Math.sin(i * 0.785) * 8} r="6" fill="#6a6a70" />)}
          <rect x="22" y="88" width="66" height="9" rx="4" fill="#5a3a1e" transform="rotate(-12 55 92)" />
          <rect x="22" y="88" width="66" height="9" rx="4" fill="#4a2e16" transform="rotate(14 55 92)" />
          <path className="fl f1" d="M55 20 Q78 58 64 92 L46 92 Q32 58 55 20 Z" fill="#ff8a1a" />
          <path className="fl f2" d="M55 40 Q70 66 61 92 L49 92 Q40 66 55 40 Z" fill="#ffc04a" />
          <path className="fl f3" d="M55 58 Q63 74 58 92 L52 92 Q47 74 55 58 Z" fill="#fff0b0" />
        </svg>
      </Prop>

      <Prop x={215} y={566} w={150} h={110} onClick={() => go('train')} label="Training ground">
        <svg viewBox="0 0 150 110">
          {[[38, 0], [104, 18]].map(([x, dy], i) => (
            <g key={i} transform={`translate(${x} ${dy})`}>
              <rect x="-3" y="20" width="6" height="70" fill="#5a3a1e" />
              <rect x="-22" y="34" width="44" height="6" fill="#5a3a1e" />
              <ellipse cx="0" cy="44" rx="14" ry="20" fill="#c9a85a" />
              <circle cx="0" cy="16" r="10" fill="#d6b86a" />
              <path d="M-14 44 H14 M-12 54 H12" stroke="#8a6a2a" strokeWidth="2" />
            </g>
          ))}
        </svg>
      </Prop>

      <Prop x={1085} y={470} w={220} h={170} onClick={() => go('merchant')} label="Merchant wagon">
        <svg viewBox="0 0 220 170">
          <path d="M20 70 Q110 0 200 70 Z" fill="#a8463a" /><path d="M20 70 Q110 18 200 70" fill="none" stroke="#e8c46a" strokeWidth="3" strokeDasharray="10 8" />
          <rect x="16" y="70" width="188" height="56" rx="4" fill="#6b4a2a" /><rect x="28" y="80" width="70" height="36" fill="#3a2414" />
          <rect x="112" y="84" width="22" height="20" fill="#8a6a3a" /><rect x="138" y="88" width="18" height="16" fill="#7a5a32" />
          <path d="M120 84 L124 64 M128 84 L136 62" stroke="#c9ced8" strokeWidth="3" />
          <circle cx="54" cy="136" r="22" fill="#3a2414" stroke="#8a6a3a" strokeWidth="4" /><circle cx="166" cy="136" r="22" fill="#3a2414" stroke="#8a6a3a" strokeWidth="4" />
          <rect x="176" y="116" width="34" height="26" fill="#5a3a1e" /><rect x="180" y="110" width="26" height="8" fill="#7a5a32" />
          <circle cx="196" cy="84" r="7" fill="#ffcf6a" className="cw-lantern" />
        </svg>
      </Prop>

      <Prop x={795} y={596} w={80} h={90} onClick={() => go('pot')} label="Cooking pot">
        <svg viewBox="0 0 80 90">
          <path d="M10 88 L40 8 L70 88" fill="none" stroke="#4a3220" strokeWidth="4" />
          <path className="cw-steam" d="M32 36 Q26 26 34 18 Q42 10 36 2 M46 38 Q40 28 48 20" stroke="rgba(255,255,255,.35)" strokeWidth="3" fill="none" />
          <path d="M16 48 H64 Q64 76 40 78 Q16 76 16 48 Z" fill="#2e2e34" /><ellipse cx="40" cy="48" rx="24" ry="6" fill="#8a5a2a" />
          <path d="M20 84 Q40 92 60 84" stroke="#ff8a1a" strokeWidth="4" fill="none" />
        </svg>
      </Prop>
    </>
  );
});

/* ---------- world ---------- */

interface Props {
  roster: Unit[];
  chapterIndex: number;
  disabled: boolean;
  onInteract: (id: string) => void;
}

interface Actor { x: number; y: number; facing: 'left' | 'right'; moving: boolean; }
interface Talk { id: string; lines: [string, string][]; i: number; choice: boolean; }

const FOLLOW_GAP = 12;     // trail points between party members
const MAX_FOLLOWERS = 3;

export function CampWorld({ roster, chapterIndex, disabled, onInteract }: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const companions = roster.filter(u => u.id !== 'kael' && SPOTS[u.id]);
  const lord = roster.find(u => u.isLord) ?? roster[0];

  const pos = useRef({ x: 640, y: 640, facing: 'right' as 'left' | 'right' });
  const actors = useRef<Record<string, Actor>>(
    Object.fromEntries(companions.map(u => [u.id, { x: SPOTS[u.id].x, y: SPOTS[u.id].y, facing: SPOTS[u.id].face, moving: false }])),
  );
  const trail = useRef<{ x: number; y: number }[]>([{ x: 640, y: 640 }]);
  const [view, setView] = useState<View & { actors: Record<string, Actor> }>({ x: 640, y: 640, facing: 'right', moving: false, near: null, actors: { ...actors.current } });
  const [talk, setTalk] = useState<Talk | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const keys = useRef(new Set<string>());
  const target = useRef<{ x: number; y: number; interact?: string; r?: number } | null>(null);
  const talkCount = useRef<Record<string, number>>({});

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const talkRef = useRef(talk);
  talkRef.current = talk;
  const followersRef = useRef(followers);
  followersRef.current = followers;
  const nearRef = useRef<string | null>(null);

  const startTalk = (id: string) => {
    const set = CAMP_CHATTER[id];
    if (!set) { onInteract(`unit:${id}`); return; }
    const n = talkCount.current[id] ?? 0;
    talkCount.current[id] = n + 1;
    keys.current.clear();
    target.current = null;
    setTalk({ id, lines: set[(chapterIndex + n) % set.length], i: 0, choice: false });
  };
  const advanceTalk = () => setTalk(t => (!t ? t : t.choice ? t : t.i < t.lines.length - 1 ? { ...t, i: t.i + 1 } : { ...t, choice: true }));
  const endTalk = () => setTalk(null);

  const handleInteract = (id: string) => (id.startsWith('unit:') ? startTalk(id.slice(5)) : onInteract(id));
  const interactRef = useRef(handleInteract);
  interactRef.current = handleInteract;
  const advanceRef = useRef(advanceTalk);
  advanceRef.current = advanceTalk;

  const interactables = [
    ...STATIONS.map(s => ({ id: s.id, x: s.x, y: s.y, r: s.r, verb: s.verb })),
    ...companions.map(u => ({ id: `unit:${u.id}`, x: view.actors[u.id]?.x ?? SPOTS[u.id].x, y: view.actors[u.id]?.y ?? SPOTS[u.id].y, r: 70, verb: `talk to ${u.name}` })),
  ];

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / W, el.clientHeight / H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const MOVE = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
    const down = (e: KeyboardEvent) => {
      if (disabledRef.current || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (talkRef.current) {
        if (k === 'e' || k === 'enter' || k === ' ') { e.preventDefault(); advanceRef.current(); }
        if (k === 'escape' || k === 'backspace') setTalk(null);
        return;
      }
      if (MOVE.includes(k)) { keys.current.add(k); target.current = null; e.preventDefault(); }
      if ((k === 'e' || k === 'enter' || k === ' ') && nearRef.current) { e.preventDefault(); interactRef.current(nearRef.current); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const p = pos.current;
      const frozen = disabledRef.current || !!talkRef.current;
      if (frozen) { keys.current.clear(); target.current = null; }
      const restingIds = Object.keys(actors.current).filter(id => !followersRef.current.includes(id));
      const obstacles = [...OBSTACLES, ...restingIds.map(id => ({ x: actors.current[id].x, y: actors.current[id].y, r: 18 }))];

      let dx = 0, dy = 0;
      const k = keys.current;
      if (k.has('arrowleft') || k.has('a')) dx -= 1;
      if (k.has('arrowright') || k.has('d')) dx += 1;
      if (k.has('arrowup') || k.has('w')) dy -= 1;
      if (k.has('arrowdown') || k.has('s')) dy += 1;
      const tg = target.current;
      if (!dx && !dy && tg) {
        const vx = tg.x - p.x, vy = tg.y - p.y;
        const dist = Math.hypot(vx, vy);
        const stopAt = tg.interact ? (tg.r ?? 60) * 0.75 : 4;
        if (dist <= stopAt) {
          target.current = null;
          if (tg.interact) interactRef.current(tg.interact);
        } else { dx = vx / dist; dy = vy / dist; }
      }
      const len = Math.hypot(dx, dy);
      let moving = false;
      if (len > 0) {
        dx /= len; dy /= len;
        const step = SPEED * dt;
        const attempt = (ux: number, uy: number) => {
          let nx = p.x + ux * step, ny = p.y + uy * step * 0.8;
          for (const o of obstacles) {
            const vx = nx - o.x, vy = ny - o.y;
            const d = Math.hypot(vx, vy) || 0.001;
            const min = o.r + BODY_R;
            if (d < min) { nx = o.x + (vx / d) * min; ny = o.y + (vy / d) * min; }
          }
          nx = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, nx));
          ny = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, ny));
          return { nx, ny, moved: Math.hypot(nx - p.x, ny - p.y) };
        };
        let best = attempt(dx, dy);
        if (best.moved < step * 0.45) {
          for (const deg of [45, -45, 80, -80, 120, -120]) {
            const r = (deg * Math.PI) / 180;
            const tt = attempt(dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r));
            if (tt.moved >= step * 0.45) { best = tt; break; }
          }
        }
        const mvx = best.nx - p.x;
        p.x = best.nx; p.y = best.ny;
        if (mvx < -0.2) p.facing = 'left';
        if (mvx > 0.2) p.facing = 'right';
        moving = best.moved > 0.3;
        if (!moving && tg) target.current = null;
      }

      // Party trail: followers walk the path Kael took.
      const tr = trail.current;
      const lastPt = tr[tr.length - 1];
      if (Math.hypot(p.x - lastPt.x, p.y - lastPt.y) > 5) { tr.push({ x: p.x, y: p.y }); if (tr.length > 240) tr.shift(); }
      followersRef.current.forEach((id, i) => {
        const a = actors.current[id];
        if (!a) return;
        const idx = tr.length - 1 - (i + 1) * FOLLOW_GAP;
        const goal = idx >= 0 ? tr[idx] : null;
        a.moving = false;
        if (!goal) return;
        const vx = goal.x - a.x, vy = goal.y - a.y;
        const d = Math.hypot(vx, vy);
        if (d > 3) {
          const sp = Math.min(d, SPEED * 1.15 * dt);
          a.x += (vx / d) * sp; a.y += (vy / d) * sp;
          if (vx < -0.5) a.facing = 'left';
          if (vx > 0.5) a.facing = 'right';
          a.moving = true;
        }
      });

      // Conversation: face each other.
      const tk = talkRef.current;
      if (tk && actors.current[tk.id]) {
        const a = actors.current[tk.id];
        p.facing = a.x < p.x ? 'left' : 'right';
        a.facing = a.x < p.x ? 'right' : 'left';
        a.moving = false;
      }

      let near: string | null = null, bestD = Infinity;
      if (!frozen) {
        for (const s of STATIONS) {
          const d = Math.hypot(s.x - p.x, s.y - p.y);
          if (d < s.r && d < bestD) { bestD = d; near = s.id; }
        }
        for (const [id, a] of Object.entries(actors.current)) {
          const d = Math.hypot(a.x - p.x, a.y - p.y);
          if (d < 70 && d < bestD) { bestD = d; near = `unit:${id}`; }
        }
      }
      nearRef.current = near;
      setView({
        x: Math.round(p.x), y: Math.round(p.y), facing: p.facing, moving, near,
        actors: Object.fromEntries(Object.entries(actors.current).map(([id, a]) => [id, { ...a, x: Math.round(a.x), y: Math.round(a.y) }])),
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const walkTo = (id: string) => {
    if (disabledRef.current || talkRef.current) return;
    const it = interactables.find(i => i.id === id);
    if (!it) return;
    if (nearRef.current === id) { handleInteract(id); return; }
    target.current = { x: it.x, y: it.y + 20, interact: id, r: it.r };
  };

  const onGroundClick = (e: React.MouseEvent) => {
    if (disabled || talk || !worldRef.current) return;
    const rect = worldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    target.current = { x, y: Math.max(BOUNDS.y0, y) };
  };

  const toggleFollow = (id: string) => {
    setFollowers(f => {
      if (f.includes(id)) return f.filter(x => x !== id);
      if (f.length >= MAX_FOLLOWERS) return f;
      // Seed the trail so the new follower falls in line behind the others.
      return [...f, id];
    });
    setTalk(null);
  };

  const nearIt = interactables.find(i => i.id === view.near);
  const FIG = 104;
  const footY = (158 / 170) * (FIG * 170 / 160);
  const speaker = talk && !talk.choice ? talk.lines[talk.i][0] : null;
  const posOf = (id: string) => (id === 'kael' ? { x: view.x, y: view.y } : view.actors[id]);
  const talkUnit = talk ? companions.find(u => u.id === talk.id) : undefined;
  // Nudge the bubble away from the listener so it never covers them.
  const bubbleX = (() => {
    if (!talk || !speaker) return 0;
    const me = posOf(speaker), other = posOf(speaker === 'kael' ? talk.id : 'kael');
    if (!me || !other) return 0;
    return me.x + (me.x >= other.x ? 64 : -64);
  })();

  return (
    <div className="cw-area" ref={areaRef}>
      <div className="cw-frame" style={{ width: W * scale, height: H * scale }}>
        <div className="cw-world" ref={worldRef} style={{ width: W, height: H, transform: `scale(${scale})` }} onClick={onGroundClick}>
          <Scenery go={walkTo} />
          {companions.map(u => {
            const a = view.actors[u.id];
            if (!a) return null;
            const following = followers.includes(u.id);
            // companions resting close to the campfire sit down by it
            const byFire = !following && Math.hypot(a.x - STATIONS[0].x, a.y - STATIONS[0].y) < 215;
            const pose = speaker === u.id ? 'talk' : a.moving ? 'walk' : byFire ? 'sit' : 'idle';
            return (
              <div
                key={u.id}
                className={`cw-actor interactive ${view.near === `unit:${u.id}` ? 'near' : ''} ${following ? 'following' : ''}`}
                style={{ left: a.x - FIG / 2, top: a.y - footY, zIndex: a.y }}
                onClick={e => { e.stopPropagation(); walkTo(`unit:${u.id}`); }}
                role="button"
                aria-label={`Talk to ${u.name}`}
              >
                <span className="cw-name">{u.name}</span>
                <Figure look={lookFor(u)} build={buildFor(u, { dismount: true })} weapon={CLASSES[u.classId].weapons[0]} weaponId={u.weapons[u.equipped]?.defId} pose={pose} facing={a.facing} size={FIG} />
              </div>
            );
          })}
          {lord && (
            <div className="cw-actor player" style={{ left: view.x - FIG / 2, top: view.y - footY, zIndex: view.y }}>
              <Figure look={lookFor(lord)} build={buildFor(lord)} weapon="sword" weaponId={lord.weapons[lord.equipped]?.defId} pose={speaker === 'kael' ? 'talk' : view.moving ? 'walk' : 'idle'} facing={view.facing} size={FIG} />
            </div>
          )}
          {nearIt && !disabled && !talk && (
            <div className="cw-prompt" style={{ left: nearIt.x, top: nearIt.y - (nearIt.id.startsWith('unit:') ? 128 : nearIt.r + 40), zIndex: 2000 }}>
              <kbd>E</kbd> {nearIt.verb.charAt(0).toUpperCase() + nearIt.verb.slice(1)}
            </div>
          )}
          {talk && speaker && posOf(speaker) && (
            <div
              className={`cw-bubble ${speaker === 'kael' ? 'lord' : ''}`}
              style={{ left: bubbleX, top: posOf(speaker)!.y - 132, zIndex: 2100 }}
              onClick={e => { e.stopPropagation(); advanceTalk(); }}
            >
              <b>{speaker === 'kael' ? 'Kael' : talkUnit?.name}</b>
              <span>{talk.lines[talk.i][1]}</span>
              <small>{talk.i < talk.lines.length - 1 ? 'E or click to continue' : 'E or click'}</small>
            </div>
          )}
          {talk && talk.choice && talkUnit && view.actors[talk.id] && (
            <div className="cw-choice" style={{ left: view.actors[talk.id].x, top: view.actors[talk.id].y - 150, zIndex: 2100 }} onClick={e => e.stopPropagation()}>
              {followers.includes(talk.id)
                ? <button onClick={() => toggleFollow(talk.id)}>Wait here</button>
                : <button disabled={followers.length >= MAX_FOLLOWERS} onClick={() => toggleFollow(talk.id)}>{followers.length >= MAX_FOLLOWERS ? 'Party is full (3)' : 'Walk with me'}</button>}
              <button onClick={() => { setTalk(null); onInteract(`unit:${talk.id}`); }}>Profile and bonds</button>
              <button className="ghost" onClick={endTalk}>Goodbye</button>
            </div>
          )}
        </div>
      </div>
      <p className="cw-help">
        Walk with WASD or the arrow keys, or click the ground. Press E (or click) to use what's nearby or talk.
        {followers.length > 0 && <> Walking with {followers.map(id => companions.find(u => u.id === id)?.name).join(', ')}.</>}
      </p>
    </div>
  );
}
