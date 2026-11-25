import { memo, type CSSProperties } from 'react';
import type { Build, HairStyle, Look } from '../game/data/characters';
import type { WeaponType } from '../game/types';
import { Canvas, Px, mix, shade, tint, type PxPath } from './pixel';

/**
 * Pixel-art character sprites. Every sprite is composed on a 32×34 pixel grid (5 artboard
 * units per pixel, viewBox 0 0 160 170, feet on row 31) from parts recoloured by the
 * character's `Look` and `Build`: head + hair style, outfit, limbs, weapon, mount.
 * Poses are frame animations: each frame is a <g> shown in turn by the step keyframes in
 * src/figure.css. Sprites face right; `facing="left"` mirrors the whole SVG.
 */
export type Pose = 'idle' | 'walk' | 'talk' | 'slash' | 'thrust' | 'chop' | 'shoot' | 'cast' | 'hit' | 'dodge' | 'die'
  | 'victory' | 'wounded' | 'sit' | 'rest' | 'healed' | 'levelup';

/** Every pose that is not a class attack, in model-sheet order. */
export const SCENARIO_POSES: Pose[] = ['victory', 'wounded', 'sit', 'rest', 'healed', 'levelup'];
/** Standing pose for a unit's condition: badly hurt units (a third of their HP or less) stand wounded. */
export const standPose = (hp: number, max: number): Pose => (hp * 3 <= max ? 'wounded' : 'idle');

export function attackPose(w?: WeaponType): Pose {
  switch (w) {
    case 'lance': return 'thrust';
    case 'axe': return 'chop';
    case 'bow': return 'shoot';
    case 'staff': return 'cast';
    default: return 'slash';
  }
}

const STEEL = '#aab3c2';
const STEEL_D = '#6f7787';
const STEEL_L = '#dfe5ee';
const WOOD = '#7a5a34';
const BLADE = '#e4ebf3';
const BLOOD = '#b0121f';
const BLOOD_D = '#6e0a14';

type V = [number, number];

/* ---------- head: 3/4 view facing right, 11 px wide ---------- */

const FACE = [
  '...........',
  '...sssss...',
  '..sssssss..',
  '.sssssssss.',
  '.sssssssss.',
  '.ssssesses.',
  '.Ssssesses.',
  '.Sssssssss.',
  '..Sssssss..',
  '...SSsss...',
];
const STUBBLE = ['', '', '', '', '', '', '', '........bb.', '....bbbbb..', '....bbbb...'];

const HAIR: Record<HairStyle, { rows: string[]; dx?: number; dy?: number }> = {
  short: { rows: [
    '...hhhhh...',
    '..hhLLhhhh.',
    '.hhhhhhhhh.',
    '.hhhhhhhhh.',
    '.hhhh.hh.h.',
    '.Hhh.......',
    '.Hh........',
    '.H.........',
  ] },
  spiky: { dy: -1, rows: [
    '...h..h..h.',
    'h.hhhhhhhh.',
    'hhhhLLhhhhh',
    '.hhhhhhhhh.',
    'hhhhhhhhhh.',
    '.hhhh.h.hh.',
    'hHhh.......',
    '.Hh........',
    '.H.........',
  ] },
  long: { rows: [
    '...hhhhh...',
    '..hhLLhhhh.',
    '.hhhhhhhhh.',
    '.hhhhhhhhh.',
    '.hhhh..hhh.',
    '.hhh.....h.',
    'hhhh.....h.',
    'hHhh.......',
    'hHhh.......',
    'hHHh.......',
    'hHHh.......',
    '.HHh.......',
    '.HH........',
  ] },
  tied: { dx: -2, rows: [
    '.....hhhhh...',
    '....hhLLhhhh.',
    '.hhhhhhhhhhh.',
    'hhHhhhhhhhhh.',
    'hh.hhhh..hh..',
    'hh.Hhh.......',
    'Hh..Hh.......',
    'Hh..H........',
    '.H...........',
    '.H...........',
  ] },
  bun: { dy: -2, rows: [
    '.hh........',
    'hhhh.......',
    'hhhahhhh...',
    '.HhhLLhhhh.',
    '.hhhhhhhhh.',
    '.hhhhhhhhh.',
    '.hhhh..hh..',
    '.Hhh.......',
    '.Hh........',
    '.H.........',
  ] },
  slick: { rows: [
    '...hhhhh...',
    '..hLLhhhh..',
    '.hhhhhhhhh.',
    '.hhhhhhh...',
    '.hhh.......',
    '.Hh........',
    '.Hh........',
    '.H.........',
  ] },
  rugged: { rows: [
    '..hh.hhh...',
    '.hhhhhhhhh.',
    'hhhLLhhhhh.',
    '.hhhhhhhhh.',
    'hhhhh.hhh..',
    '.Hhh.......',
    '.Hh........',
    '.H.....hhh.',
    '..H.hhhhh..',
    '...hhhhh...',
    '....hhh....',
  ] },
  hood: { rows: [
    '...ccccc...',
    '.ccccccccc.',
    'ccccccccccc',
    'cccaaaaaacc',
    'ccahhhh.ha.',
    'cCa........',
    'cCa........',
    'cCa........',
    'cCCa.......',
    '.cCCa......',
    '.cccc......',
  ] },
  helm: { dy: -2, rows: [
    '.....aaa...',
    '...aaaa....',
    '...mmmmm...',
    '..mmWmmmmm.',
    '.mmmmmmmmm.',
    '.mmmmmmmmm.',
    '.MMMMMMMMMM',
    '.mm........',
    '.mm........',
    '.M.........',
  ] },
};
const CROWN = ['..g.g.g.g..', '..ggggggg..'];

/* Mount parts. c coat, l sheen, C belly shadow, m mane, k bridle, w blaze, e eye, n nostril. */
const HORSE_BODY = [
  '...cccccccccccccc...',
  '.ccllllllccccccccccc',
  'ccclllllcccccccccccc',
  'cccccccccccccccccccc',
  'cccccccccccccccccccc',
  'cccccccccccccccccccc',
  '.cCCCcccccccccCCCcc.',
  '..CCCCCCCCCCCCCCC...',
];
/** Faces right; the poll (where the neck joins) is the left edge of row 3. */
const HORSE_HEAD = [
  '.m.c....',
  'mccc....',
  'cccecc..',
  'cckwccc.',
  '.cckwccc',
  '..ckccnc',
  '...cccc.',
];
/** Wing beat: raised, level, lowered. W feather, L feather shadow. */
const WINGS = [
  [
    'W...........',
    'WW..........',
    'WWW.L.......',
    'LWWW.WL.....',
    '.WWWWLWL....',
    '.LWWWWLWW...',
    '..WWWWWLWW..',
    '..LWWWWWWWW.',
    '...WWWWWWWWW',
    '....LWWWWWWW',
    '......LLWWWW',
    '.........WWW',
  ],
  [
    '......LWWWWW..',
    '...LWWWWWWWWW.',
    '.WWWWWWWWWWWWW',
    'WWWLWWLWWWWWWW',
    '.LL.LW.LWWWWW.',
    '.....L..LLWW..',
  ],
  [
    '.....WWWWWW',
    '...WWWWWWWW',
    '..WWWWWWWW.',
    '.WWWLWWWW..',
    '.WWLWWWL...',
    'WWL.WWL....',
    'WL..WL.....',
    'W...W......',
  ],
];
const WING_AT: V[] = [[3, 9], [1, 17], [4, 20]];

/* ---------- weapons: drawn from the hand `h` along direction `d` ---------- */

const at = (h: V, d: V, k: number, p: V = [0, 0], j = 0): V => [h[0] + d[0] * k + p[0] * j, h[1] + d[1] * k + p[1] * j];

function drawWeapon(l: Canvas, type: WeaponType, h: V, d: V, accent: string, glow: boolean) {
  const p: V = [-d[1], d[0]]; // perpendicular, clockwise on screen
  const diag = d[0] !== 0 && d[1] !== 0;
  // diagonals use a 2 px brush so blades and shafts read as solid lines, not dotted ones
  const run = (a: number, b: number, c: string) => { for (let k = a; k <= b; k++) { const [x, y] = at(h, d, k); l.rect(x, y, diag ? 2 : 1, 1, c); } };
  if (type === 'sword') {
    run(2, diag ? 7 : 9, BLADE);
    l.set(...at(h, d, -1), accent);
    l.set(...at(h, d, 0), '#4a3320');
    for (const j of [-1, 0, 1]) l.set(...at(h, d, 1, p, j), accent);
  } else if (type === 'lance') {
    run(diag ? -4 : -8, 11, WOOD);
    run(12, 14, BLADE);
    l.set(...at(h, d, 12, p, 1), BLADE);
    l.set(...at(h, d, 12, p, -1), BLADE);
    l.set(...at(h, d, 10, p, -1), accent);
    l.set(...at(h, d, 9, p, -1), accent);
    l.set(...at(h, d, 9, p, -2), accent);
  } else if (type === 'axe') {
    run(-2, 8, WOOD);
    // 2 px brush so a diagonal axe head stays solid instead of dithering
    for (let k = 5; k <= 8; k++) for (const j of [1, 2]) { const [x, y] = at(h, d, k, p, j); l.rect(x, y, 2, 1, STEEL); }
    for (const k of [6, 7]) { const [x, y] = at(h, d, k, p, 3); l.rect(x, y, 2, 1, '#eef2f7'); }
  } else if (type === 'staff') {
    run(-5, 7, '#cdb98a');
    l.set(...at(h, d, 7, p, 1), accent);
    l.set(...at(h, d, 7, p, -1), accent);
    const [ox, oy] = at(h, d, 9);
    l.rect(ox - 1, oy - 1, 3, 3, glow ? '#ffffff' : '#bfe3ff');
    l.set(ox - 1, oy - 1, '#ffffff');
  }
}

/** A longbow, 17 px tip to tip (about three quarters of the archer's height), belly forward at the grip. */
const BOW_ARC: V[] = [
  [-3, -8], [-2, -7], [-2, -6], [-1, -5], [-1, -4], [0, -3], [0, -2],
  [0, 2], [0, 3], [-1, 4], [-1, 5], [-2, 6], [-2, 7], [-3, 8],
];

/* ---------- mount ---------- */

const WING_PAL = { W: '#f7f5f0', L: '#c9d2e0' };
const WING_FAR = { W: '#d3d8e2', L: '#aab4c6' };
const TACK = '#3a2416';
const HOOF = '#2a2420';
function mountColours(build: Build) {
  const pegasus = build.mount === 'pegasus';
  const coat = build.coat ?? (pegasus ? '#eeeae2' : '#4a3020');
  const mane = build.mane ?? (pegasus ? '#cfd8e6' : '#1e140c');
  const far = shade(coat, 0.28);
  const head = { c: coat, m: mane, k: TACK, w: pegasus ? coat : '#f1ede4', e: '#1a1a1a', n: shade(coat, 0.5) };
  return { pegasus, coat, mane, far, head, body: { c: coat, l: tint(coat, 0.16), C: far } };
}

/** A horse or pegasus collapsed on its side, head to the right, lying on the ground row. `ox` = rump. */
function drawDeadMount(c: Canvas, build: Build, ox: number) {
  const { pegasus, coat, mane, far, head } = mountColours(build);
  c.layer(l => {
    l.line(ox + 15, 30, ox + 22, 30, far, 2); l.rect(ox + 24, 30, 1, 2, HOOF);
    l.line(ox + 1, 30, ox - 4, 30, far, 2); l.rect(ox - 5, 30, 1, 2, HOOF);
  });
  if (pegasus) c.layer(l => l.stamp(WINGS[0], ox - 4, 11, WING_PAL)); // one limp wing still raised
  c.layer(l => {
    l.line(ox + 2, 25, ox - 2, 29, mane, 2);
    l.rect(ox + 5, 22, 9, 1, coat);
    l.rect(ox + 3, 23, 13, 9, coat);
    l.rect(ox + 2, 24, 15, 7, coat);
    l.rect(ox + 4, 23, 6, 1, tint(coat, 0.16));
    l.rect(ox + 3, 31, 13, 1, far);
    l.line(ox + 15, 24, ox + 20, 27, coat, 4);
    l.stamp(HORSE_HEAD, ox + 22, 25, { ...head, e: HOOF, w: coat });
    l.line(ox + 15, 23, ox + 21, 26, mane, 2);
    l.rect(ox + 6, 23, 6, 4, '#5a2a20');
    l.rect(ox + 8, 27, 1, 4, TACK);
  });
  c.layer(l => {
    l.line(ox + 12, 28, ox + 16, 30, coat, 2); l.rect(ox + 18, 30, 1, 2, HOOF);
    l.line(ox + 3, 28, ox + 7, 30, coat, 2); l.rect(ox + 9, 30, 1, 2, HOOF);
  });
  for (const [x, y] of [[13, 25], [14, 26], [12, 26], [15, 25], [13, 27], [14, 28]]) c.set(ox + x, y, BLOOD);
}

/** knee dx, knee row, hoof dx, hoof row (dx from the hip; row 31 is the ground) */
type LegPose = [number, number, number, number];
/** [hind, fore] for: 0 standing, 1-4 the gallop cycle, 5 tucked in flight, 6 rearing. */
const GAITS: [LegPose, LegPose][] = [
  [[0, 28, 0, 31], [0, 28, 0, 31]],
  [[-2, 28, -5, 30], [3, 27, 6, 29]],
  [[-1, 27, -3, 29], [2, 28, 2, 31]],
  [[2, 28, 3, 30], [1, 27, -2, 29]],
  [[1, 28, 1, 31], [2, 26, 0, 28]],
  [[2, 27, -1, 29], [2, 27, -1, 29]],
  [[0, 28, 0, 31], [3, 26, 5, 28]],
];

interface MountPose { gait: number; tail: number; head: number; wing: number; }

function drawMount(c: Canvas, build: Build, accent: string, m: MountPose, gy: number) {
  const { pegasus, coat, mane, far, head, body } = mountColours(build);
  const leg = (l: Canvas, hip: number, [kx, ky, hx, hy]: LegPose, col: string) => {
    const knee = Math.min(29, ky + gy), hoof = hy === 31 ? 31 : Math.min(31, hy + gy);
    l.line(hip, 24 + gy, hip + kx, knee, col, 3);
    l.line(hip + kx, knee + 1, hip + hx, hoof - 1, col, 2);
    l.rect(hip + hx, hoof, 2, 1, HOOF);
  };
  const near = GAITS[m.gait];
  const farLegs = GAITS[m.gait >= 1 && m.gait <= 4 ? (m.gait % 4) + 1 : m.gait]; // the far pair runs a beat ahead
  const poll: V = ([[24, 13], [25, 18], [25, 25]] as V[])[m.head];

  if (pegasus) c.layer(l => l.stamp(WINGS[m.wing], WING_AT[m.wing][0] + 3, WING_AT[m.wing][1] - 1 + gy, WING_FAR));
  c.layer(l => { leg(l, 9, farLegs[0], far); leg(l, 18, farLegs[1], far); });
  c.layer(l => {
    // tail: hanging, mid-swish, streaming behind
    const tail: V[] = ([[[1, 22], [1, 27]], [[0, 22], [-1, 27]], [[-2, 19], [-5, 21]]] as V[][])[m.tail];
    l.line(2, 19 + gy, tail[0][0], tail[0][1] + gy, mane, 2);
    l.line(tail[0][0], tail[0][1] + gy, tail[1][0], tail[1][1] + gy, mane, 2);
    l.line(tail[0][0], tail[0][1] + 1 + gy, tail[1][0], tail[1][1] + gy, shade(mane, 0.3));
    leg(l, 7, near[0], coat);
    leg(l, 20, near[1], coat);
    l.stamp(HORSE_BODY, 3, 18 + gy, body);
    l.line(18, 18 + gy, poll[0] - 3, poll[1] - 2 + gy, coat, 4);
    l.stamp(HORSE_HEAD, poll[0] - 1, poll[1] - 3 + gy, head);
    l.line(17, 17 + gy, poll[0] - 4, poll[1] - 3 + gy, mane, 2);
    l.line(18, 18 + gy, poll[0] - 4, poll[1] - 1 + gy, shade(mane, 0.3));
  });
  c.layer(l => {
    l.rect(9, 18 + gy, 9, 4, accent);
    l.rect(9, 21 + gy, 9, 1, shade(accent, 0.35));
    l.rect(10, 17 + gy, 7, 2, '#5a2a20');
    l.rect(9, 16 + gy, 2, 1, '#5a2a20');
    l.set(16, 16 + gy, '#5a2a20');
  });
  c.rect(13, 23 + gy, 1, 3, TACK);
  if (m.head < 2) c.line(17, 17 + gy, poll[0] + 2, poll[1] + 1 + gy, TACK);
  if (pegasus) c.layer(l => l.stamp(WINGS[m.wing], WING_AT[m.wing][0], WING_AT[m.wing][1] + gy, WING_PAL));
}

/* ---------- one frame ---------- */

interface Fr {
  /** Start time in seconds (one-shot animations only). */
  at?: number;
  bob?: number;
  lean?: number;
  /** back foot x, back foot lift, front foot x, front foot lift */
  feet?: [number, number, number, number];
  /** Front hand / weapon direction / back hand, as offsets from the shoulders. */
  hand?: V;
  dir?: V;
  back?: V;
  mouth?: boolean;
  hurt?: boolean;
  fx?: 'swoosh' | 'glow' | 'nock' | 'draw' | 'heal' | 'stars' | 'dash';
  /** Step of a multi-frame effect (motes rising, stars spreading). */
  phase?: number;
  /** Eyes squeezed into a smile. */
  smile?: boolean;
  /** Move the whole sprite by this many pixels (a hop or a leap back). */
  shift?: V;
  /** Mount: leg pose (see GAITS), tail (0 hang, 1 swish, 2 stream), head (0 up, 1 drooping, 2 grazing), wing beat (0..2). */
  gait?: number;
  tail?: number;
  head?: number;
  wing?: number;
  /** A flying mount stands on the ground with wings folded. */
  land?: boolean;
  /** The mount rears up on its hind legs. */
  rear?: boolean;
  /** Head hangs forward by this many pixels. */
  droop?: number;
  /** The back hand comes across the chest, over a bleeding wound. */
  clutch?: boolean;
  /** Seated on the ground, weapon set aside. */
  sit?: boolean;
  /** Blood sprays from the chest. */
  blood?: boolean;
  /** Knees (or the mount's legs) buckle by this many pixels. */
  sink?: number;
  /** Death: 1 = toppling backwards, 2..4 = down, in a small / wider / wide pool of blood. */
  fall?: number;
}

const REST: Record<WeaponType | 'none', { hand: V; dir: V; back: V }> = {
  sword: { hand: [3, 3], dir: [1, -1], back: [-1, 4] },
  lance: { hand: [4, 2], dir: [0, -1], back: [-1, 4] },
  axe: { hand: [3, 3], dir: [1, -1], back: [-1, 4] },
  bow: { hand: [7, 1], dir: [0, -1], back: [8, 2] },
  staff: { hand: [5, 3], dir: [0, -1], back: [-1, 4] },
  none: { hand: [1, 5], dir: [0, 0], back: [-1, 4] },
};

/** A rider and mount going down: toppling first, then both on the ground in a growing pool. */
function drawFallen(look: Look, build: Build, weapon: WeaponType | undefined, stage: number): Canvas {
  const mounted = !!build.mount;
  const out = new Canvas();
  const body = drawFrame(look, { ...build, mount: undefined }, weapon, { hurt: true });
  if (stage === 1) {
    if (mounted) out.over(drawFrame(look, build, weapon, { sink: 4 }, 'mount'));
    out.over(body.rotated(45, 15, 31, mounted ? -4 : -1, mounted ? -6 : 0));
    for (const [x, y] of [[14, 18], [17, 16], [19, 19], [12, 15], [20, 22]]) out.set(x - (mounted ? 4 : 0), y - (mounted ? 6 : 0), BLOOD);
    return out;
  }
  const w = (mounted ? 24 : 0) + [10, 18, 26][stage - 2];
  out.rect(15 - w / 2, 31, w, 1, BLOOD);
  out.rect(14 - w / 2, 32, w + 2, 1, BLOOD);
  out.rect(16 - w / 2, 33, w - 2, 1, BLOOD_D);
  if (mounted) drawDeadMount(out, build, 15);
  const dx = mounted ? -14 : 0; // the rider is thrown clear, behind the mount
  out.over(body.rotated(90, 15, 31, 12 + dx, -7)); // laid on their back
  for (const [x, y] of [[16, 22], [17, 23], [15, 24], [18, 21], [16, 25], [15, 26]]) out.set(x + dx, y, BLOOD);
  out.set(17 + dx, 22, BLOOD_D);
  if (stage > 2) for (const [x, y] of [[2, 32], [29, 32], [27, 30]]) out.set(x + dx, y, BLOOD);
  if (stage > 3) for (const [x, y] of [[-1, 32], [32, 32], [4, 30], [25, 33], [30, 30]]) out.set(x + dx, y, BLOOD);
  return out;
}

function drawFrame(look: Look, build: Build, weapon: WeaponType | undefined, f: Fr, part?: 'mount'): Canvas {
  if (f.fall) return drawFallen(look, build, weapon, f.fall);
  if (f.sit) { weapon = undefined; build = { ...build, mount: undefined }; }
  const c = new Canvas();
  const { skin, hair, cloth, accent } = look;
  const armored = build.outfit === 'armor';
  const robe = build.outfit === 'robe';
  const mounted = !!build.mount;
  const flying = build.mount === 'pegasus' && !f.land;
  const bob = f.bob ?? 0;
  const gait = f.gait ?? (flying ? 5 : 0);
  const sink = f.sink ?? 0;
  const gy = (flying ? -4 + bob : gait === 1 ? -1 : 0) + (mounted ? sink : 0);
  const ux = (mounted ? -1 : 0) + (f.lean ?? 0);
  const uy = mounted ? gy - 7 + (flying ? 0 : bob) : bob + sink;
  const sleeve = build.outfit === 'leather' ? skin : armored ? STEEL : cloth;
  const torso = armored ? STEEL : cloth;
  const legs = armored ? STEEL_D : build.pants;
  const pal = {
    s: skin, S: shade(skin, 0.22), e: '#1d1a26', h: hair, H: shade(hair, 0.35), L: tint(hair, 0.3),
    c: cloth, C: shade(cloth, 0.3), a: accent, m: STEEL, M: STEEL_D, W: STEEL_L, g: '#e2be55',
  };
  const b = build.broad ? 1 : 0;
  const tx = 12 - b + ux, tw = 7 + 2 * b, ty = 18 + uy;
  const sf: V = [17 + b + ux, 19 + uy];
  const sb: V = [12 - b + ux, 19 + uy];
  const rest = mounted && weapon === 'lance' ? { hand: [3, 3] as V, dir: [1, -1] as V, back: [-1, 4] as V } : REST[weapon ?? 'none'];
  const hd = f.hand ?? rest.hand, d = f.dir ?? rest.dir, bk = f.back ?? rest.back;
  const hand: V = [sf[0] + hd[0], sf[1] + hd[1]];
  const backHand: V = [sb[0] + bk[0], sb[1] + bk[1]];
  const feet = f.feet ?? [0, 0, 0, 0];

  const arm = (l: Canvas, s: V, h: V, upper: string, fore: string, palm: string) => {
    const mx = Math.round((s[0] + h[0]) / 2), my = Math.round((s[1] + h[1]) / 2);
    l.line(s[0] - 1, s[1], mx - 1, my, upper, 2);
    l.line(mx - 1, my, h[0] - 1, h[1], fore, 2);
    l.rect(h[0] - 1, h[1], 2, 2, palm);
  };
  const backArm = (l: Canvas) => arm(l, sb, backHand, shade(sleeve, 0.25), shade(armored ? STEEL_D : sleeve, 0.25), shade(skin, 0.15));
  const leg = (l: Canvas, hip: number, foot: number, lift: number, col: string) => {
    const end = 29 - lift;
    for (let r = 23; r <= end; r++) l.rect(Math.round(hip + ((foot - hip) * (r - 23)) / (end - 23)) - 1, r, 3, 1, col);
    l.rect(foot - 1, end + 1, 4, 2, build.boots);
  };

  if (mounted) drawMount(c, build, accent, { gait, tail: f.tail ?? 0, head: f.head ?? 0, wing: f.wing ?? (f.land ? 2 : 0) }, gy);
  if (part === 'mount') return c;

  if (build.outfit === 'cape') {
    const cape = build.cape ?? accent;
    const sway = bob || feet[0] ? 1 : 0;
    c.layer(l => {
      for (let r = ty; r <= 29; r++) {
        const x0 = 11 + ux - Math.floor((r - ty) / 3) - (r > 25 ? sway : 0);
        l.rect(x0, r, 15 + ux - x0, 1, cape);
        l.set(x0, r, shade(cape, 0.3));
      }
    });
  }
  if (build.outfit === 'hunter') {
    c.layer(l => {
      l.rect(9 + ux, ty, 2, 6, '#5a3a20');
      l.set(9 + ux, ty - 2, '#dddddd');
      l.set(10 + ux, ty - 1, '#dddddd');
    });
  }

  if (weapon !== 'bow' && !f.clutch) c.layer(backArm);

  if (f.sit && !robe) {
    // one knee up, the other leg stretched out along the ground
    c.layer(l => { l.line(14, 28, 17, 25, shade(legs, 0.25), 3); l.line(19, 27, 19, 29, shade(legs, 0.25), 2); l.rect(19, 30, 4, 2, build.boots); });
    c.layer(l => { l.rect(15, 29, 8, 3, legs); l.rect(23, 28, 3, 4, build.boots); });
  } else if (!mounted && !robe) {
    c.layer(l => leg(l, 13, 13 + feet[0], feet[1], shade(legs, 0.25)));
    c.layer(l => leg(l, 17, 17 + feet[2], feet[3], legs));
  }

  c.layer(l => {
    l.rect(tx, ty, tw, 7, torso);
    l.rect(tx, ty, 1, 7, shade(torso, 0.25));
    if (armored) { l.rect(14 + ux, ty + 1, 3, 5, cloth); l.rect(15 + ux, ty + 2, 1, 4, accent); }
    if (build.outfit === 'leather') { l.rect(tx + 1, ty, 1, 6, '#3a2416'); l.rect(tx + tw - 2, ty, 1, 6, '#3a2416'); }
    if (build.outfit === 'gi') for (let i = 0; i < 5; i++) l.rect(13 + i + ux, ty + 1 + i, 2, 1, accent);
    if (build.outfit === 'light') l.rect(tx, ty + 3, tw, 1, accent);
    l.set(14 + ux, ty, accent); l.set(15 + ux, ty + 1, accent); l.set(16 + ux, ty, accent);
    l.rect(tx, ty + 6, tw, 1, '#2a2018');
    l.set(15 + ux, ty + 6, accent);
    if (robe) {
      const sway = Math.sign(feet[2]);
      for (let r = ty + 7; r <= 31; r++) {
        const k = Math.floor((r - 24) / 3), x0 = 12 - k + (r > 27 ? sway : 0);
        l.rect(x0, r, 7 + 2 * k, 1, r === 30 ? accent : cloth);
        l.set(x0, r, shade(cloth, 0.25));
      }
    }
  });

  if (f.clutch) for (const [x, y] of [[14, 2], [15, 3], [14, 4], [16, 4], [15, 5]]) c.set(x + ux, ty + y, BLOOD);

  if (mounted) {
    // the rider's near leg hangs down the mount's flank into a stirrup
    c.layer(l => {
      l.line(13, 17 + gy, 15, 20 + gy, legs, 3);
      l.line(16, 22 + gy, 16, 23 + gy, legs, 2);
      l.rect(16, 24 + gy, 4, 2, build.boots);
      l.set(15, 25 + gy, STEEL_D); l.set(20, 25 + gy, STEEL_D);
    });
  }

  const hx = 10 + ux + (f.droop ?? 0), hy = 8 + uy + (f.droop ?? 0);
  c.layer(l => {
    l.stamp(FACE, hx, hy, pal);
    if (look.stubble) l.stamp(STUBBLE, hx, hy, { b: mix(skin, hair, 0.35) });
    if (look.scar) { l.set(hx + 7, hy + 6, '#b56a5a'); l.set(hx + 7, hy + 7, '#b56a5a'); }
    if (f.hurt) {
      l.set(hx + 5, hy + 5, skin); l.set(hx + 8, hy + 5, skin);
      l.set(hx + 4, hy + 6, pal.e); l.set(hx + 7, hy + 6, pal.e);
    }
    if (f.smile) { l.set(hx + 5, hy + 6, skin); l.set(hx + 8, hy + 6, skin); }
    const style = HAIR[look.style];
    l.stamp(style.rows, hx + (style.dx ?? 0), hy + (style.dy ?? 0), pal);
    if (look.crown) l.stamp(CROWN, hx, hy - 2, pal);
    if (f.mouth || f.hurt) l.rect(hx + 6, hy + 8, 2, 1, '#7a2c30');
  });

  if (weapon === 'bow' || f.clutch) c.layer(backArm);
  if (weapon === 'bow') {
    c.layer(l => {
      const [x, y] = hand;
      const string = '#efe6cc';
      if (f.fx === 'nock' || f.fx === 'draw') {
        l.line(x - 3, y - 8, backHand[0], backHand[1], string);
        l.line(x - 3, y + 8, backHand[0], backHand[1], string);
        l.rect(backHand[0], y, x + 3 - backHand[0], 1, '#d8c8a0');
        l.set(x + 3, y, BLADE);
      } else {
        l.rect(x - 3, y - 7, 1, 15, string);
      }
      for (const [dx, dy] of BOW_ARC) l.set(x + dx, y + dy, WOOD);
      l.rect(x, y - 1, 1, 3, '#4a3320'); // leather grip
    });
  } else if (weapon) {
    c.layer(l => drawWeapon(l, weapon, hand, d, accent, f.fx === 'glow'));
  }
  c.layer(l => {
    arm(l, sf, hand, sleeve, armored ? STEEL_D : sleeve, skin);
    if (armored) l.rect(sf[0] - 2, sf[1] - 1, 4, 2, STEEL_L);
    if (build.outfit === 'cape') l.set(sf[0], sf[1] - 1, accent);
  });

  if (f.fx === 'swoosh') {
    const arc: V[] = [[23, 11], [26, 12], [28, 15], [29, 19], [28, 23], [26, 25]];
    for (let i = 1; i < arc.length; i++) {
      c.line(arc[i - 1][0] + ux - 1, arc[i - 1][1] + uy, arc[i][0] + ux - 1, arc[i][1] + uy, '#bfe3ff');
      c.line(arc[i - 1][0] + ux, arc[i - 1][1] + uy, arc[i][0] + ux, arc[i][1] + uy, '#ffffff');
    }
  }
  if (f.fx === 'glow') {
    const [ox, oy] = at(hand, d, 9);
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) c.set(ox + dx, oy + dy, '#9fe0ff');
  }
  const phase = f.phase ?? 0;
  if (f.fx === 'heal') {
    // green motes drifting up around the body
    for (const [x, y] of [[8, 27], [23, 24], [11, 17], [24, 14], [18, 9], [7, 12]]) {
      const py = y + uy - phase * 2;
      c.rect(x - 1, py, 3, 1, '#7dffa0'); c.rect(x, py - 1, 1, 3, '#7dffa0'); c.set(x, py, '#eafff0');
    }
  }
  if (f.fx === 'stars') {
    // a ring of gold sparks spreading outward and an arrow climbing over the head
    const gold = '#ffd84a', r = 7 + phase * 2;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
      const x = Math.round(15 + ux + dx * r), y = Math.round(18 + uy + dy * r);
      c.rect(x - 1, y, 3, 1, gold); c.rect(x, y - 1, 1, 3, gold); c.set(x, y, '#fff6c8');
    }
    const ax = 15 + ux, ay = hy - 8 - phase;
    c.rect(ax, ay, 1, 6, gold); c.rect(ax - 1, ay + 1, 3, 1, gold); c.rect(ax - 2, ay + 2, 5, 1, gold);
  }
  if (f.rear) return c.rotated(24, 8, 31);
  if (f.blood) {
    for (const [x, y] of [[15, 21], [16, 22], [15, 23], [19, 20], [20, 20], [21, 19], [22, 21], [23, 21], [20, 23], [23, 18], [24, 17], [24, 22], [21, 24], [25, 20], [26, 23]]) c.set(x + ux, y + uy, BLOOD);
    c.set(16 + ux, 21 + uy, BLOOD_D);
  }
  const out = f.shift ? c.rotated(0, 0, 0, f.shift[0], f.shift[1]) : c;
  // speed lines left where the body was a moment ago
  if (f.fx === 'dash') for (const [x, y, n] of [[19, 13, 6], [21, 18, 7], [19, 23, 6], [22, 27, 4]]) out.rect(x + ux, y + uy, n, 1, '#dfe9ff');
  return out;
}

/* ---------- poses ---------- */

function framesFor(pose: Pose, mounted: boolean, flying: boolean): { frames: Fr[]; loop?: number } {
  const lunge: Fr['feet'] = [-1, 0, 2, 0];
  const beat = [0, 1, 2, 1]; // wing beat: up, level, down, level
  let frames: Fr[];
  switch (pose) {
    case 'idle':
      if (flying) return { frames: beat.map((wing, i) => ({ wing, bob: i % 2 })), loop: 0.7 };
      if (mounted) return { frames: [{}, { bob: 1 }, { tail: 1 }, { bob: 1, tail: 1 }], loop: 1.6 };
      return { frames: [{}, { bob: 1 }], loop: 1.2 };
    case 'talk': return { frames: [{}, { mouth: true }], loop: 0.38 };
    case 'walk':
      if (flying) return { frames: beat.map(wing => ({ wing, tail: 2 })), loop: 0.44 };
      if (mounted) return { frames: [1, 2, 3, 4].map(gait => ({ gait, tail: 2 })), loop: 0.44 };
      return { frames: [
        { feet: [-2, 0, 2, 0], back: [1, 4] },
        { feet: [0, 1, 0, 0], back: [-1, 4], bob: -1 },
        { feet: [2, 0, -2, 0], back: [-3, 4] },
        { feet: [0, 0, 0, 1], back: [-1, 4], bob: -1 },
      ], loop: 0.56 };
    case 'victory': {
      // weapon thrust skyward with a glint at its tip; a horse rears, a pegasus beats its wings
      const up: Fr = { hand: [3, -4], dir: [0, -1] };
      const cheer: Fr = { hand: [3, -5], dir: [0, -1], mouth: true, fx: 'glow' };
      if (flying) return { frames: [{ ...up, wing: 0 }, { ...cheer, wing: 2, bob: -1 }], loop: 0.5 };
      if (mounted) return { frames: [up, { ...cheer, gait: 6, rear: true }], loop: 0.9 };
      return { frames: [up, { ...cheer, bob: -1 }], loop: 0.5 };
    }
    case 'wounded': {
      // hunched over a bleeding wound, panting; the mount hangs its head
      const hold: Fr = { droop: 1, clutch: true, back: [5, 3], head: 1 };
      return { frames: [{ ...hold, bob: 1 }, { ...hold, bob: 2, hurt: true, wing: 1 }], loop: 1 };
    }
    case 'sit': return { frames: [{ sit: true, bob: 6 }, { sit: true, bob: 6, droop: 1 }], loop: 2.4 };
    case 'rest':
      // turn spent: on one knee; a mount grazes, a pegasus lands and folds its wings
      if (mounted) return { frames: [{ head: 2, land: true }, { head: 2, land: true, tail: 1 }], loop: 1.2 };
      return { frames: [{ bob: 3, droop: 1 }] };
    case 'slash':
      frames = [
        { at: 0, hand: [3, -4], dir: [-1, -1], lean: -1 },
        { at: 0.24, hand: [5, 1], dir: [1, 0], lean: 1, feet: lunge, fx: 'swoosh' },
        { at: 0.42, hand: [4, 3], dir: [1, 1], lean: 1, feet: lunge },
      ];
      break;
    case 'chop':
      frames = [
        { at: 0, hand: [3, -4], dir: [-1, -1], lean: -1 },
        { at: 0.3, hand: [5, 1], dir: [1, 1], lean: 1, feet: lunge, fx: 'swoosh' },
        { at: 0.5, hand: [4, 2], dir: [1, 1], lean: 1, feet: lunge },
      ];
      break;
    case 'thrust':
      frames = [
        { at: 0, hand: [-1, 2], dir: [1, 0], lean: -1 },
        { at: 0.22, hand: [6, 2], dir: [1, 0], lean: 1, feet: lunge },
        { at: 0.45 },
      ];
      break;
    case 'shoot':
      frames = [{ at: 0, fx: 'nock', back: [9, 1] }, { at: 0.12, fx: 'draw', back: [3, 1] }, { at: 0.39, back: [3, 1] }];
      break;
    case 'cast':
      frames = [{ at: 0, hand: [5, -1] }, { at: 0.3, hand: [5, -1], fx: 'glow' }, { at: 0.7 }];
      break;
    case 'hit': return { frames: [{ hurt: true, lean: -1 }] };
    case 'die':
      return { frames: [
        { at: 0, hurt: true, lean: -1, blood: true },
        { at: 0.16, hurt: true, lean: -1, blood: true, sink: mounted ? 2 : 3 },
        { at: 0.3, fall: 1 },
        { at: 0.44, fall: 2 },
        { at: 0.64, fall: 3 },
        { at: 0.86, fall: 4 },
      ] };
    case 'healed':
      // eyes closed in relief while green motes rise
      return { frames: [0, 1, 2, 3].map(phase => ({ fx: 'heal' as const, phase, smile: true, bob: phase % 2 })), loop: 0.8 };
    case 'levelup': {
      // a crouch, then a jump with the weapon thrust up, gold sparks and a rising arrow
      const up: Fr = { hand: [3, -5], dir: [0, -1], back: [-3, -3], smile: true, mouth: true, fx: 'stars' };
      return { frames: [{ bob: 1, smile: true }, { ...up, shift: [0, -2], phase: 0 }, { ...up, shift: [0, -3], phase: 1 }, { ...up, shift: [0, -1], phase: 2 }], loop: 0.8 };
    }
    default:
      // dodge: dip, spring back out of reach, land, step back in
      return { frames: [
        { at: 0, bob: 1, lean: -1 },
        { at: 0.08, shift: [-5, -2], lean: -1, fx: 'dash' },
        { at: 0.3, shift: [-5, 0], bob: 1 },
        { at: 0.55, shift: [-2, 0] },
        { at: 0.68 },
      ] };
  }
  // a mount keeps charging through its rider's attack
  if (flying) return { frames: frames.map((f, i) => ({ ...f, feet: undefined, wing: i % 3, tail: 2 })) };
  return { frames: mounted ? frames.map((f, i) => ({ ...f, feet: undefined, gait: i + 1, tail: 2 })) : frames };
}

interface Sprite { frames: { paths: PxPath[]; style: CSSProperties }[]; rest: number; }
const cache = new Map<string, Sprite>();

function spriteFor(look: Look, build: Build, weapon: WeaponType | undefined, pose: Pose): Sprite {
  const key = JSON.stringify([look, build, weapon, pose]);
  let s = cache.get(key);
  if (!s) {
    const { frames, loop } = framesFor(pose, !!build.mount, build.mount === 'pegasus');
    const n = frames.length;
    s = {
      rest: loop ? 0 : n - 1,
      frames: frames.map((f, i) => ({
        paths: drawFrame(look, build, weapon, f).paths(5),
        style: n === 1 ? { visibility: 'visible' }
          : loop ? { animation: `fl${n} ${loop}s step-end ${((i * loop) / n).toFixed(3)}s infinite` }
            : i === n - 1 ? { animation: `frShow .01s step-end ${f.at}s 1 forwards` }
              : { animation: `frShow ${((frames[i + 1].at ?? 0) - (f.at ?? 0)).toFixed(3)}s step-end ${f.at}s 1` },
      })),
    };
    cache.set(key, s);
  }
  return s;
}

interface FigureProps {
  look: Look;
  build: Build;
  weapon?: WeaponType;
  pose?: Pose;
  facing?: 'left' | 'right';
  size?: number;
  className?: string;
}

export const Figure = memo(function Figure({ look, build, weapon, pose = 'idle', facing = 'right', size = 160, className }: FigureProps) {
  const mounted = !!build.mount;
  const sprite = spriteFor(look, build, weapon, pose);
  return (
    <svg
      viewBox="0 0 160 170"
      width={size}
      height={(size * 170) / 160}
      shapeRendering="crispEdges"
      className={`figure pose-${pose} ${facing} ${className ?? ''}`}
      aria-hidden="true"
    >
      <rect className="fig-shadow" x={mounted ? 25 : 50} y="160" width={mounted ? 115 : 60} height="5" fill="rgba(0,0,0,.35)" />
      <g className="fig-root">
        {sprite.frames.map((f, i) => (
          <g key={i} className={i === sprite.rest ? 'fr rest' : 'fr'} style={f.style}><Px paths={f.paths} /></g>
        ))}
      </g>
    </svg>
  );
});
