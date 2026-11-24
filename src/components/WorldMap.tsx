import { memo, useEffect, useRef, useState } from 'react';
import { CHAPTERS } from '../game/data/chapters';
import { buildFor, lookFor } from '../game/data/characters';
import { CLASSES } from '../game/data/classes';
import type { Unit } from '../game/types';
import { Figure } from './figure';

const W = 1280;
const H = 720;
const INK = '#3a2a1c';

export const PLACES = {
  caer: { x: 1040, y: 338, name: 'Caer Valen' },
  ashfield: { x: 238, y: 560, name: 'Ashfield' },
  ironvale: { x: 506, y: 452, name: 'Ironvale Bridge' },
  wood: { x: 700, y: 318, name: 'Whispering Wood' },
  highmoor: { x: 868, y: 168, name: 'Highmoor' },
} as const;
type PlaceId = keyof typeof PLACES;

/** Where each chapter's march starts and ends, and the road between them. */
export const ROUTES: { from: PlaceId; to: PlaceId; d: string }[] = [
  { from: 'caer', to: 'ashfield', d: 'M1040 338 C 960 420, 820 520, 660 540 S 360 600, 238 560' },
  { from: 'ashfield', to: 'ironvale', d: 'M238 560 C 300 520, 380 500, 440 470 S 490 456, 506 452' },
  { from: 'ironvale', to: 'wood', d: 'M506 452 C 560 430, 600 360, 640 340 S 690 320, 700 318' },
  { from: 'wood', to: 'highmoor', d: 'M700 318 C 740 280, 780 250, 810 220 S 850 180, 868 168' },
  { from: 'highmoor', to: 'caer', d: 'M868 168 C 920 200, 960 230, 990 270 S 1030 320, 1040 338' },
];

function Mountain({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-34 0 L0 -46 L34 0 Z" fill="#cdb98e" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M0 -46 L34 0 L10 0 Z" fill="#a8946a" />
      <path d="M0 -46 L-9 -33 L-3 -35 L2 -29 L8 -35 Z" fill="#f6f1e4" stroke={INK} strokeWidth="1" />
      <path d="M-20 -6 l6 -8 M-12 -4 l5 -7 M14 -6 l-4 -6" stroke={INK} strokeWidth=".8" opacity=".5" />
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -22 L10 -2 L4 -2 L12 10 L-12 10 L-4 -2 L-10 -2 Z" fill="#6f8f5a" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M0 -22 L10 -2 L4 -2 L12 10 L2 10 Z" fill="#587a48" />
      <rect x="-1.5" y="10" width="3" height="5" fill={INK} />
    </g>
  );
}

export const MapArt = memo(function MapArt({ cleared, routeD, routeRef }: { cleared: PlaceId[]; routeD: string; routeRef: React.RefObject<SVGPathElement> }) {
  const trees: [number, number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const a = (i * 137.5 * Math.PI) / 180, r = 14 + (i % 9) * 9;
    trees.push([700 + Math.cos(a) * r * 1.5, 318 + Math.sin(a) * r * 0.75 + 8, 0.8 + (i % 3) * 0.12]);
  }
  for (let i = 0; i < 14; i++) trees.push([140 + (i % 7) * 30, 470 + Math.floor(i / 7) * 34 + (i % 2) * 8, 0.85]);
  for (let i = 0; i < 10; i++) trees.push([380 + (i % 5) * 26, 600 + Math.floor(i / 5) * 28, 0.8]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="wm-svg" aria-hidden="true">
      <defs>
        <radialGradient id="wm-vig" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#4a3014" stopOpacity=".45" />
        </radialGradient>
        <pattern id="wm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={INK} strokeWidth="1" opacity=".35" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="#e8d9b4" />
      {/* sea */}
      <path d="M1130 0 Q1100 120 1160 220 Q1200 300 1150 400 Q1110 470 1180 560 Q1220 640 1170 720 L1280 720 L1280 0 Z" fill="#a9c3c8" stroke={INK} strokeWidth="2" />
      {[120, 260, 420, 600].map(y => <path key={y} d={`M${1200} ${y} q10 -6 20 0 t20 0`} stroke="#5a7a84" strokeWidth="1.4" fill="none" />)}
      <path d="M0 640 Q120 690 260 720 L0 720 Z" fill="#a9c3c8" stroke={INK} strokeWidth="2" />
      {/* northern empire */}
      <path d="M0 0 L1130 0 Q1120 50 1060 70 Q900 40 760 70 Q560 40 360 70 Q180 50 0 80 Z" fill="url(#wm-hatch)" stroke={INK} strokeWidth="1.6" />
      <text x="560" y="40" className="wm-label empire">The Ashen Empire</text>
      {/* mountains */}
      {Array.from({ length: 16 }).map((_, i) => <Mountain key={i} x={60 + i * 68 + (i % 2) * 18} y={128 + (i % 3) * 12} s={0.9 + (i % 4) * 0.08} />)}
      <Mountain x={820} y={200} s={1.1} /><Mountain x={920} y={196} s={1} /><Mountain x={780} y={160} s={.9} />
      {/* river Ironvale */}
      <path d="M470 120 C 500 220, 460 300, 500 380 S 520 470, 498 540 S 520 650, 540 720" stroke="#7fa3b0" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M470 120 C 500 220, 460 300, 500 380 S 520 470, 498 540 S 520 650, 540 720" stroke={INK} strokeWidth="1" fill="none" opacity=".5" />
      {trees.map(([x, y, s], i) => <Tree key={i} x={x} y={y} s={s} />)}
      {/* roads */}
      {ROUTES.map((r, i) => <path key={i} d={r.d} stroke="#9a7a4a" strokeWidth="3" strokeDasharray="8 7" fill="none" opacity=".55" />)}
      <path ref={routeRef} d={routeD} stroke="#b8373f" strokeWidth="4" strokeDasharray="10 8" fill="none" className="wm-route" />
      {/* places */}
      <g transform={`translate(${PLACES.ashfield.x} ${PLACES.ashfield.y})`}>
        {[[-18, 4], [2, -6], [18, 6]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}><rect x="-8" y="-6" width="16" height="12" fill="#d8c4a0" stroke={INK} strokeWidth="1.2" /><path d="M-10 -6 L0 -15 L10 -6 Z" fill="#a8463a" stroke={INK} strokeWidth="1.2" /></g>
        ))}
      </g>
      <g transform={`translate(${PLACES.ironvale.x} ${PLACES.ironvale.y})`}>
        <path d="M-26 4 Q0 -14 26 4" stroke={INK} strokeWidth="9" fill="none" /><path d="M-26 4 Q0 -14 26 4" stroke="#c9b48a" strokeWidth="6" fill="none" />
        <path d="M-14 -2 v8 M0 -5 v9 M14 -2 v8" stroke={INK} strokeWidth="1.5" />
      </g>
      <g transform={`translate(${PLACES.highmoor.x} ${PLACES.highmoor.y})`}>
        <rect x="-20" y="-16" width="40" height="22" fill="#c9b99a" stroke={INK} strokeWidth="1.5" />
        <rect x="-26" y="-30" width="12" height="36" fill="#c9b99a" stroke={INK} strokeWidth="1.5" /><rect x="14" y="-30" width="12" height="36" fill="#c9b99a" stroke={INK} strokeWidth="1.5" />
        <path d="M-26 -30 h3 v-4 h3 v4 h3 v-4 h3 v4 M14 -30 h3 v-4 h3 v4 h3 v-4 h3 v4" stroke={INK} fill="none" />
        <path d="M-6 6 v-10 q6 -6 12 0 v10" fill={INK} />
      </g>
      <g transform={`translate(${PLACES.caer.x} ${PLACES.caer.y})`}>
        <path d="M-40 10 L-40 -14 L40 -14 L40 10 Z" fill="#d4c6a6" stroke={INK} strokeWidth="1.6" />
        {[-34, -12, 10, 30].map((x, i) => <g key={i}><rect x={x - 5} y={-34 - (i % 2) * 10} width="10" height={22 + (i % 2) * 10} fill="#e2d6ba" stroke={INK} strokeWidth="1.3" /><path d={`M${x - 6} ${-34 - (i % 2) * 10} L${x} ${-44 - (i % 2) * 10} L${x + 6} ${-34 - (i % 2) * 10} Z`} fill="#3d5a9a" stroke={INK} strokeWidth="1.2" /></g>)}
        <g className="wm-smoke"><circle cx="-8" cy="-58" r="10" fill="#6a6260" opacity=".45" /><circle cx="6" cy="-74" r="14" fill="#6a6260" opacity=".35" /><circle cx="-4" cy="-94" r="18" fill="#6a6260" opacity=".25" /></g>
        <path className="wm-flame" d="M-20 -14 Q-14 -32 -8 -14 Z M14 -14 Q20 -30 26 -14 Z" fill="#e0662a" />
      </g>
      {(Object.keys(PLACES) as PlaceId[]).map(id => (
        <g key={id}>
          {cleared.includes(id) && <path d={`M${PLACES[id].x + 18} ${PLACES[id].y - 30} v-24 l14 5 l-14 5`} fill="#3d6fd1" stroke={INK} strokeWidth="1.2" />}
          <text x={PLACES[id].x} y={PLACES[id].y + 36} className="wm-label">{PLACES[id].name}</text>
        </g>
      ))}
      {/* cartouche & compass */}
      <g transform="translate(36 34)">
        <rect width="300" height="68" rx="6" fill="#efe3c4" stroke={INK} strokeWidth="2" />
        <rect x="6" y="6" width="288" height="56" rx="4" fill="none" stroke={INK} strokeWidth=".8" />
        <text x="150" y="32" className="wm-title">The Kingdom of Aldmere</text>
        <text x="150" y="52" className="wm-sub">as it stood in the year of ash</text>
      </g>
      <g transform="translate(110 640)">
        <circle r="34" fill="#efe3c4" stroke={INK} strokeWidth="1.6" />
        <path d="M0 -30 L6 0 L0 30 L-6 0 Z" fill={INK} /><path d="M-30 0 L0 -6 L30 0 L0 6 Z" fill="#8a7a5a" stroke={INK} strokeWidth=".8" />
        <text y="-38" className="wm-compass">N</text>
      </g>
      <rect width={W} height={H} fill="url(#wm-vig)" pointerEvents="none" />
    </svg>
  );
});

interface Props {
  chapterIndex: number;
  roster: Unit[];
  onDone: () => void;
}

const TRAVEL_MS = 4200;
const GAP = 40;

export function WorldMap({ chapterIndex, roster, onDone }: Props) {
  const route = ROUTES[Math.min(chapterIndex, ROUTES.length - 1)];
  const chapter = CHAPTERS[chapterIndex];
  const areaRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const [scale, setScale] = useState(1);
  const [party, setParty] = useState<{ x: number; y: number; facing: 'left' | 'right' }[]>([]);
  const [arrived, setArrived] = useState(false);
  const done = useRef(false);
  const lord = roster.find(u => u.isLord) ?? roster[0];
  // Chapter 1 opens with only Kael and Lyra fleeing the capital.
  const others = chapterIndex === 0 ? roster.filter(u => u.id === 'lyra') : roster.filter(u => u !== lord).slice(0, 3);
  const walkers = [lord, ...others].filter(Boolean) as Unit[];
  const cleared = ROUTES.slice(0, chapterIndex).map(r => r.to).filter(p => p !== 'caer') as PlaceId[];

  const finish = () => { if (!done.current) { done.current = true; onDone(); } };

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
    const path = routeRef.current;
    if (!path) return;
    const L = path.getTotalLength();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0;
    const place = (t: number) => {
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const head = eased * L;
      setParty(walkers.map((_, i) => {
        const d = Math.max(0, head - i * GAP);
        const p = path.getPointAtLength(d);
        const ahead = path.getPointAtLength(Math.min(L, d + 4));
        return { x: p.x, y: p.y, facing: ahead.x < p.x - 0.1 ? 'left' : 'right' };
      }));
    };
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / TRAVEL_MS);
      place(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setArrived(true);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); } };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FIG = 62;
  const footY = (158 / 170) * (FIG * 170 / 160);

  return (
    <div className="worldmap">
      <div className="wm-area" ref={areaRef}>
        <div className="wm-frame" style={{ width: W * scale, height: H * scale }}>
          <div className="wm-world" style={{ width: W, height: H, transform: `scale(${scale})` }}>
            <MapArt cleared={cleared} routeD={route.d} routeRef={routeRef} />
            <div className={`wm-dest ${arrived ? 'on' : ''}`} style={{ left: PLACES[route.to].x, top: PLACES[route.to].y }} />
            {party.map((p, i) => {
              const u = walkers[i];
              return (
                <div key={u.id} className="wm-walker" style={{ left: p.x - FIG / 2, top: p.y - footY, zIndex: Math.round(p.y) + (walkers.length - i) }}>
                  <Figure look={lookFor(u)} build={buildFor(u, { dismount: true })} weapon={CLASSES[u.classId].weapons[0]} pose={arrived ? 'idle' : 'walk'} facing={p.facing} size={FIG} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <footer className="wm-bar">
        <div>
          <span className="wm-from">{PLACES[route.from].name} to {PLACES[route.to].name}</span>
          <strong>Chapter {chapter.number}: {chapter.title}</strong>
          <span>{chapter.objectiveText}</span>
        </div>
        <button className={arrived ? 'primary' : 'ghost'} onClick={finish}>{arrived ? 'Continue' : 'Skip'}</button>
      </footer>
    </div>
  );
}
