import { memo, type CSSProperties } from 'react';
import { Canvas, Px, type PxPath } from './pixel';
import { BAT_WINGS, type BatWing } from './figure';

/**
 * The dark dragon: not a dragonkin but a full-size dragon, three tiles wide and three tall
 * (96×102 pixels where a one-tile unit is 32×34). Drawn from shapes rather than a template so
 * its neck, jaw, wings, tail and foreleg can all move: each pose is a list of frames that set them.
 * Sprite only for now; the multi-tile unit rules come with the story.
 */
type V = [number, number];
export type DragonPose = 'idle' | 'roar' | 'breath' | 'claw' | 'tail' | 'gale' | 'hit' | 'die';
/** Its attacks, for when it becomes a unit. `pose` is the animation to play. */
export const GREAT_DRAGON_ATTACKS: { pose: DragonPose; name: string; note: string }[] = [
  { pose: 'breath', name: 'Umbral Flame', note: 'A cone of dark fire: long reach, hits everything in front of it.' },
  { pose: 'claw', name: 'Rending Claw', note: 'One adjacent target, heavy damage.' },
  { pose: 'tail', name: 'Tail Sweep', note: 'Every unit standing next to it.' },
  { pose: 'gale', name: 'Wing Gale', note: 'Pushes units back and grounds fliers.' },
  { pose: 'roar', name: 'Dread Roar', note: 'No damage; shakes the whole field.' },
];

const C = {
  base: '#3b3149', hi: '#65587f', lo: '#221a2e', far: '#2a2236',
  belly: '#5e4474', bellyLo: '#3c2852',
  bone: '#8a8296', boneHi: '#e6deee',
  mem: '#40204f', rib: '#2a123a', memFar: '#200e2e',
  glow: '#b84cff', core: '#f3d2ff', eye: '#ff5cf0',
  mouth: '#5a1030', tooth: '#f4eee4', blood: '#b0121f', bloodD: '#6e0a14',
};
const GROUND = 99;

/* Faces right. k horns, r hide, R lit hide, d shadow, y eye, n nostril, w fangs. */
const SKULL = [
  '..kk....................',
  '...kkk......k...........',
  '....kkkk...kk...........',
  '.....kkrrrkk............',
  '....rrrRRRrrrrr.........',
  '...rrrRRRRrrrrrrrr......',
  '..rrrrrdyyrrrrRRrrrrr...',
  '..rrrrrrddrrrrrrrrrrrnr.',
  '..rrrrrrrrrrrrrrrrrrrrrr',
  '...rrrrrrrwrwrwrwrwrwrw.',
];
const JAW = [
  '...bbbbbwbwbwbwbwbwbb...',
  '....bbbbbbbbbbbbbbbb....',
  '..k...bbbbbbbbbbbb......',
];

interface Fr {
  /** Start time in seconds (one-shot poses). */
  at?: number;
  /** Top-left of the head. */
  head?: V;
  /** How far the jaw hangs open, in pixels. */
  jaw?: number;
  /** Wings: 0 raised, 1 spread, 2 swept down. */
  wing?: number;
  /** Tail: 0 trailing, 1 coiled up behind, 2 swept round to the front. */
  tail?: number;
  /** Near foreleg: 0 planted, 1 raised to strike, 2 struck. */
  claw?: number;
  dx?: number;
  dy?: number;
  fx?: 'breath' | 'roar' | 'claw' | 'tail' | 'gale' | 'blood';
  phase?: number;
  /** Dying: 1 buckling, 2 down, 3 still. */
  down?: number;
}

/** The downstroke, fanned out behind and below the body: the one-tile pose would hide under it. */
const SWEPT: BatWing = { elbow: [-8, -1], wrist: [-15, 5], tips: [[-29, 1], [-28, 12], [-19, 14]], webs: [[-23, 6], [-21, 11], [-13, 10]], flank: [-4, 5] };

function wing(l: Canvas, w: BatWing, sx: number, sy: number, k: number, bone: string, mem: string, rib: string) {
  const at = ([x, y]: V): V => [Math.round(sx + x * k), Math.round(sy + y * k)];
  const tips = w.tips.map(at), webs = w.webs.map(at);
  const elbow = at(w.elbow), wrist = at(w.wrist), flank = at(w.flank), shoulder: V = [sx, sy];
  l.poly([shoulder, elbow, wrist, tips[0], webs[0], tips[1], webs[1], tips[2], webs[2], flank], mem);
  for (const m of webs) l.line(wrist[0], wrist[1], m[0], m[1], rib); // folds in the membrane
  for (const t of tips) { l.line(wrist[0], wrist[1], t[0], t[1], bone, 2); l.rect(t[0], t[1], 2, 2, C.boneHi); }
  l.line(shoulder[0], shoulder[1], elbow[0], elbow[1], bone, 4);
  l.line(elbow[0], elbow[1], wrist[0], wrist[1], bone, 3);
  l.rect(wrist[0], wrist[1] - 4, 2, 5, C.boneHi); // the wing claw
}

/** Scales: flecks across the hide, lit along the top edge and above `mid`, shadowed below. */
function scales(l: Canvas, mid: number) {
  for (let y = -40; y < 110; y++) for (let x = -50; x < 180; x++) {
    if (l.get(x, y) !== C.base) continue;
    if (!l.get(x, y - 1)) l.set(x, y, C.hi);
    else if (y % 2 === 0 && (x + (y >> 1) * 3) % 6 === 0) l.set(x, y, y < mid ? C.hi : C.lo);
  }
}

function foot(l: Canvas, x: number, col: string) {
  l.rect(x, 95, 12, 4, col); l.rect(x + 2, 94, 8, 1, col);
  for (const k of [4, 8, 12]) l.rect(x + k - 1, 98, 2, 1, C.boneHi);
}

function drawFrame(f: Fr): Canvas {
  const c = new Canvas(260, 170, 60, 50);
  const down = f.down ?? 0, dx = f.dx ?? 0, dy = (f.dy ?? 0) + [0, 4, 11, 12][down], ph = f.phase ?? 0;
  const bx = 40 + dx, by = 72 + dy;
  const head: V = down >= 2 ? [68, 83] : f.head ?? [66, 28];
  const jaw = down >= 2 ? 1 : f.jaw ?? 0;
  const wp = down || f.wing === 2 ? SWEPT : BAT_WINGS[f.wing ?? 1];
  const tail = down ? 0 : f.tail ?? 0;
  const standing = down < 2;

  if (down >= 2) {
    const w = down === 2 ? 56 : 92;
    c.rect(bx - w / 2, GROUND, w, 1, C.blood); c.rect(bx - w / 2 - 2, GROUND + 1, w + 4, 1, C.blood); c.rect(bx - w / 2 + 3, GROUND + 2, w - 6, 1, C.bloodD);
  }

  c.layer(l => wing(l, wp, bx + 10, by - 13, 2.5, C.far, C.memFar, C.lo));

  const tailCurve: [V, V, V] = tail === 1 ? [[bx - 22, by], [-12, by - 26], [-24, by - 8]]
    : tail === 2 ? [[bx - 22, by + 6], [4, 100], [84, 94]]
      : down ? [[bx - 22, by + 6], [0, 94], [-20, 96]] : [[bx - 22, by], [-6, by - 6], [-14, 92]];
  const drawTail = (l: Canvas) => {
    const [p0, p1, p2] = tailCurve;
    l.tube(p0, p1, p2, 8, 1.5, C.lo);
    l.tube([p0[0], p0[1] - 1], [p1[0], p1[1] - 1], [p2[0], p2[1] - 1], 7, 1, C.base);
    scales(l, 200);
    // a bone blade at the tip, and spines along the first half
    const [ex, ey] = p2, s = tail === 2 ? 1 : -1;
    l.poly([[ex, ey - 4], [ex + 7 * s, ey], [ex, ey + 4], [ex - 2 * s, ey]], C.bone); l.set(ex + 6 * s, ey, C.boneHi); l.set(ex + 5 * s, ey, C.boneHi);
    for (const t of [0.15, 0.3, 0.45]) {
      const u = 1 - t, x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1], r = 7 - 5 * t;
      l.poly([[x - 2, y - r], [x, y - r - 4], [x + 2, y - r]], C.bone);
    }
  };
  if (tail !== 2) c.layer(drawTail);

  if (standing) {
    c.layer(l => {
      l.ellipse(bx - 8, by + 8, 8, 9, C.far); l.line(bx - 6, by + 14, bx - 17, 90, C.far, 5); l.line(bx - 17, 90, bx - 11, 94, C.far, 4); foot(l, bx - 15, C.far);
      l.line(bx + 20, by + 4, bx + 16, by + 14, C.far, 5); l.line(bx + 16, by + 14, bx + 24, 94, C.far, 4); foot(l, bx + 21, C.far);
    });
  }

  // body and neck
  const p0: V = [bx + 18, by - 8], p2: V = [head[0] + 4, head[1] + 9];
  const p1: V = [(p0[0] + p2[0]) / 2 + 12, (p0[1] + p2[1]) / 2 + 4];
  const curve = (t: number): V => { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; };
  c.layer(l => {
    l.ellipse(bx, by, 25, 15, C.lo);
    l.tube(p0, p1, p2, 10, 6, C.lo);
    l.ellipse(bx - 1, by - 1, 24, 14, C.base);
    l.tube([p0[0] - 1, p0[1] - 1], [p1[0] - 1, p1[1] - 1], [p2[0] - 1, p2[1] - 1], 9, 5, C.base);
    // plated underside: the belly, and the throat side of the neck
    l.tube([p0[0] + 4, p0[1] + 4], [p1[0] + 4, p1[1] + 3], [p2[0] + 2, p2[1] + 3], 5, 2.5, C.belly);
    for (let y = by + 6; y <= by + 15; y++) for (let x = bx - 25; x <= bx + 25; x++) if (l.get(x, y) === C.base) l.set(x, y, C.belly);
    for (let y = -40; y < 110; y++) for (let x = -20; x < 120; x++) if (l.get(x, y) === C.belly && (x + y) % 5 === 0) l.set(x, y, C.bellyLo);
    scales(l, by - 3);
    // spines down the neck and back
    for (let x = bx - 20; x <= bx + 12; x += 6) {
      const ty = by - 15 * Math.sqrt(Math.max(0, 1 - ((x - bx) / 25) ** 2));
      l.poly([[x - 2, ty + 1], [x + 1, ty - 6], [x + 3, ty + 1]], C.bone); l.set(x + 1, ty - 6, C.boneHi);
    }
    for (const t of [0.25, 0.45, 0.65, 0.85]) {
      const [x, y] = curve(t), r = 10 - 4 * t;
      l.poly([[x - r, y - 2], [x - r - 5, y - 4], [x - r, y + 2]], C.bone); l.set(x - r - 5, y - 4, C.boneHi);
    }
    // the fire inside it, showing through the chest
    const g = ph % 2 ? C.core : C.glow;
    l.ellipse(bx + 18, by + 4, 3, 3, C.glow); l.ellipse(bx + 18, by + 4, 1, 1, C.core);
    for (const [x, y] of [[12, 8], [9, 10], [5, 9], [14, 1], [22, 0], [-2, 10], [-8, 9]]) if (l.get(bx + x, by + y)) l.set(bx + x, by + y, g);
  });

  // head
  c.layer(l => {
    const pal = { k: C.bone, r: C.base, R: C.hi, d: C.lo, y: down === 3 ? C.lo : C.eye, n: C.lo, w: C.tooth, b: C.belly };
    if (jaw > 0) l.rect(head[0] + 6, head[1] + 9, 15, jaw + 1, C.mouth);
    l.stamp(JAW, head[0] - (jaw > 3 ? 1 : 0), head[1] + 10 + jaw, pal);
    l.stamp(SKULL, head[0], head[1], pal);
    l.set(head[0] + 3, head[1], C.boneHi); l.set(head[0] + 12, head[1] + 1, C.boneHi);
    if (down < 3) l.set(head[0] + 9, head[1] + 6, C.core);
  });

  // near legs
  c.layer(l => {
    if (!standing) { foot(l, bx - 26, C.base); foot(l, bx + 12, C.base); return; }
    l.ellipse(bx - 14, by + 8, 9, 10, C.lo); l.ellipse(bx - 15, by + 7, 8, 9, C.base);
    l.line(bx - 14, by + 14, bx - 28, 90, C.base, 6); l.line(bx - 28, 90, bx - 20, 94, C.base, 5); foot(l, bx - 25, C.base);
    const sh: V = [bx + 12, by + 3];
    if (!f.claw) { l.line(sh[0], sh[1], bx + 6, by + 14, C.base, 7); l.line(bx + 7, by + 15, bx + 17, 94, C.base, 5); foot(l, bx + 13, C.base); }
    else {
      const [el, paw]: V[] = f.claw === 1 ? [[bx + 24, by - 3], [bx + 34, by - 16]] : [[bx + 26, by + 8], [bx + 40, by + 18]];
      l.line(sh[0], sh[1], el[0], el[1], C.base, 7); l.line(el[0], el[1], paw[0], paw[1], C.base, 5);
      l.ellipse(paw[0] + 2, paw[1] + 2, 4, 4, C.base);
      for (const [x, y] of (f.claw === 1 ? [[7, -5], [9, -1], [8, 3]] : [[8, 1], [7, 5], [4, 8]])) l.line(paw[0] + 3, paw[1] + 2, paw[0] + x, paw[1] + y, C.boneHi, 2);
    }
    scales(l, by + 6);
  });

  c.layer(l => wing(l, wp, bx + 4, by - 12, 2.6, C.bone, C.mem, C.rib));
  if (tail === 2) c.layer(drawTail);

  // effects
  const mx = head[0] + 24, my = head[1] + 10 + Math.floor(jaw / 2);
  if (f.fx === 'breath') {
    const n = 20 + ph * 14;
    for (let i = 0; i < n; i++) {
      const s = 2 + Math.floor(i / 2.5);
      c.rect(mx + i, my - s, 1, s * 2 + 1, i % 3 ? '#3a1050' : '#1a0a24');
      c.rect(mx + i, my - Math.floor(s / 2), 1, s, (i + ph) % 4 ? C.glow : '#7a2ac8');
      if (i < n * 0.7) c.rect(mx + i, my - Math.floor(s / 5), 1, Math.max(1, Math.floor(s / 2.5)), C.core);
    }
    for (const [x, y] of [[n + 2, -6], [n + 4, 3], [n - 3, 9], [n, -11], [n + 6, -2]]) c.rect(mx + x, my + y, 2, 2, C.glow);
  }
  if (f.fx === 'roar') {
    for (let k = 0; k <= ph; k++) for (let j = -9 - k * 3; j <= 9 + k * 3; j++) {
      const x = mx + 8 + k * 9 - Math.round((j * j) / (10 + k * 6));
      c.set(x, my + j, j % 2 ? C.core : C.glow); c.set(x - 1, my + j, C.glow);
    }
  }
  if (f.fx === 'claw') {
    for (let s = 0; s < 3; s++) for (let j = 0; j <= 26; j++) {
      const x = 84 + s * 6 + Math.round(Math.sin((j / 26) * Math.PI) * 7), y = 70 + j;
      c.set(x, y, C.core); c.set(x + 1, y, C.core); c.set(x - 1, y, C.glow);
    }
  }
  if (f.fx === 'tail') {
    for (let x = 30; x <= 112; x++) { const y = 96 - Math.round(Math.sin(((x - 30) / 82) * Math.PI) * 7); c.set(x, y, C.core); c.set(x, y - 1, x % 2 ? C.glow : C.core); }
    for (const [x, y] of [[96, 84], [104, 88], [112, 92], [90, 80]]) c.rect(x, y, 2, 1, '#cfc4a8');
  }
  if (f.fx === 'gale') {
    for (const [row, y] of [[0, 46], [1, 64], [2, 82]] as V[]) for (let k = 0; k <= ph + 1; k++) for (let j = -6; j <= 6; j++) {
      const x = 96 + row * 4 + k * 10 - Math.round((j * j) / 6);
      c.set(x, y + j, '#e0d8ee'); c.set(x - 1, y + j, '#9a8fb0');
    }
  }
  if (f.fx === 'blood') for (const [x, y] of [[20, 2], [24, -2], [27, 4], [22, 7], [30, 0], [26, 9], [33, 5], [18, -4]]) c.rect(bx + x, by + y, 2, 2, C.blood);
  return c;
}

const POSES: Record<DragonPose, { frames: Fr[]; loop?: number }> = {
  // slow breathing: the body rises, the wings and tail shift
  idle: { frames: [{}, { dy: 1, phase: 1 }, { dy: 1, tail: 0, head: [66, 29], phase: 1 }, { head: [66, 29] }], loop: 2.4 },
  roar: { frames: [
    { at: 0, head: [64, 26], jaw: 2, wing: 1 },
    { at: 0.2, head: [62, 18], jaw: 6, wing: 0, fx: 'roar', phase: 0 },
    { at: 0.4, head: [62, 18], jaw: 6, wing: 0, fx: 'roar', phase: 1, dy: -1 },
    { at: 0.6, head: [62, 18], jaw: 6, wing: 0, fx: 'roar', phase: 2 },
    { at: 0.95 },
  ] },
  breath: { frames: [
    { at: 0, head: [58, 20], jaw: 1, wing: 0, tail: 1 },
    { at: 0.3, head: [70, 40], jaw: 6, wing: 1, fx: 'breath', phase: 0 },
    { at: 0.46, head: [70, 40], jaw: 6, wing: 1, fx: 'breath', phase: 1 },
    { at: 0.62, head: [70, 41], jaw: 6, wing: 1, fx: 'breath', phase: 2 },
    { at: 0.78, head: [70, 40], jaw: 6, wing: 1, fx: 'breath', phase: 1 },
    { at: 1.05 },
  ] },
  claw: { frames: [
    { at: 0, claw: 1, head: [62, 26], wing: 0, dx: -2 },
    { at: 0.26, claw: 2, head: [70, 34], jaw: 3, wing: 2, dx: 3, fx: 'claw' },
    { at: 0.46, claw: 2, head: [70, 34], jaw: 2, wing: 1, dx: 3 },
    { at: 0.7 },
  ] },
  tail: { frames: [
    { at: 0, tail: 1, head: [64, 30], wing: 0 },
    { at: 0.24, tail: 2, head: [62, 32], jaw: 2, fx: 'tail' },
    { at: 0.5, tail: 2, head: [62, 32] },
    { at: 0.75 },
  ] },
  gale: { frames: [
    { at: 0, wing: 0, dy: 1 },
    { at: 0.18, wing: 2, dy: -2, fx: 'gale', phase: 0 },
    { at: 0.36, wing: 0, dy: 0, fx: 'gale', phase: 1 },
    { at: 0.54, wing: 2, dy: -2, fx: 'gale', phase: 2 },
    { at: 0.74, wing: 1, jaw: 2 },
    { at: 0.95 },
  ] },
  hit: { frames: [{ head: [60, 26], jaw: 3, dx: -2, wing: 0, fx: 'blood' }] },
  die: { frames: [
    { at: 0, head: [60, 24], jaw: 5, dx: -2, wing: 0, fx: 'blood' },
    { at: 0.3, head: [66, 38], jaw: 4, wing: 1, down: 1, fx: 'blood' },
    { at: 0.6, down: 2 },
    { at: 1.1, down: 3 },
  ] },
};
export const DRAGON_POSES = Object.keys(POSES) as DragonPose[];

const cache = new Map<DragonPose, { paths: PxPath[]; style: CSSProperties }[]>();
function sprite(pose: DragonPose) {
  let s = cache.get(pose);
  if (!s) {
    const { frames, loop } = POSES[pose], n = frames.length;
    s = frames.map((f, i) => ({
      paths: drawFrame(f).paths(5),
      style: n === 1 ? { visibility: 'visible' as const }
        : loop ? { animation: `fl${n} ${loop}s step-end ${((i * loop) / n).toFixed(3)}s infinite` }
          : i === n - 1 ? { animation: `frShow .01s step-end ${f.at}s 1 forwards` }
            : { animation: `frShow ${((frames[i + 1].at ?? 0) - (f.at ?? 0)).toFixed(3)}s step-end ${f.at}s 1` },
    }));
    cache.set(pose, s);
  }
  return s;
}

/** `size` is the width in CSS pixels of the dragon's three-tile footprint. */
export const GreatDragon = memo(function GreatDragon({ pose = 'idle', facing = 'right', size = 288 }: { pose?: DragonPose; facing?: 'left' | 'right'; size?: number }) {
  const frames = sprite(pose), loop = POSES[pose].loop;
  return (
    <svg viewBox="0 0 480 510" width={size} height={(size * 510) / 480} shapeRendering="crispEdges" className={`figure great-dragon pose-${pose} ${facing}`} aria-hidden="true">
      <rect className="fig-shadow" x="40" y="495" width="420" height="10" fill="rgba(0,0,0,.35)" />
      <g className="fig-root">
        {frames.map((f, i) => (
          <g key={i} className={i === (loop ? 0 : frames.length - 1) ? 'fr rest' : 'fr'} style={f.style}><Px paths={f.paths} /></g>
        ))}
      </g>
    </svg>
  );
});
