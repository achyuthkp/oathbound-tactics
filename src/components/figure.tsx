import { memo, type CSSProperties } from 'react';
import type { Build, HairStyle, Look } from '../game/data/characters';
import { ELEMENTS, type Element } from '../game/data/characters';
import { WEAPONS } from '../game/data/weapons';
import type { WeaponType } from '../game/types';
import { Canvas, Px, mix, shade, tint, type PxPath } from './pixel';

/**
 * Pixel-art character sprites. Every sprite is composed on a 32×34 pixel grid (5 artboard
 * units per pixel, viewBox 0 0 160 170, feet on row 31) from parts recoloured by the
 * character's `Look` and `Build`: head + hair style, outfit, limbs, weapon, mount.
 * Poses are frame animations: each frame is a <g> shown in turn by the step keyframes in
 * src/figure.css. Sprites face right; `facing="left"` mirrors the whole SVG.
 */
export type Pose = 'idle' | 'walk' | 'talk' | 'slash' | 'thrust' | 'chop' | 'shoot' | 'cast' | 'breath' | 'hit' | 'dodge' | 'die'
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
    case 'breath': return 'breath';
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
  // a knotted head-wrap in the accent colour (A = its shadow), hair escaping underneath
  bandana: { dx: -1, rows: [
    '....aaaaa...',
    '...aaAaaaaa.',
    '..aaaaaaaaa.',
    'aaaaaaaaaaa.',
    'aaAhhh.h.h..',
    'a.Hhh.......',
    'A.Hh........',
    '..H.........',
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
/*
 * Wyvern: a predator, not a pony. r scales, R sheen, d shadow, b bone-coloured belly, B belly plates,
 * k horn and spikes, y burning eye, n nostril, w fangs, m the dark of the open mouth.
 */
const WYVERN_BODY = [
  '...k..k..k..k.........',
  '..rrrrrrrrrrrrrrr.....',
  '.rrRRRRrrrrrrrrrrrrr..',
  'rrrRRRrrrrrrrrrrrrrrr.',
  'rrrrrrrrrrrrrrrrrrrrrr',
  'drrrrrrrrrrrrrrrrrrrrr',
  '.ddrbbbbbbbbbbbbbbrrr.',
  '..ddbbBbbBbbBbbBbbb...',
  '....bbbbbbbbbbbbb.....',
];
/** Long-snouted, jaws open, horns swept back. The poll is the left edge of row 4. */
const WYVERN_HEAD = [
  'kk..........',
  '.kkk..k.....',
  '..kkrrrk....',
  '..rrrrrrrr..',
  '.rrdyrrrrrrr',
  'rrrrdrrrrrrn',
  '.rrrwrwrwrw.',
  '..rrmmmmmm..',
  '...bbwbwbb..',
  '....bbbbb...',
];
/**
 * A wyvern's wing is drawn from its skeleton, like a bat's or a dragon's: an arm from the shoulder
 * to the elbow to the wrist, three long fingers fanning from the wrist, and one sheet of dark
 * membrane stretched between them and back to the flank, cut into deep scallops between the
 * finger tips. Points are relative to the shoulder. Poses: raised, spread, swept down.
 */
export interface BatWing { elbow: V; wrist: V; tips: [V, V, V]; webs: [V, V, V]; flank: V; }
export const BAT_WINGS: BatWing[] = [
  { elbow: [-6, -7], wrist: [-3, -16], tips: [[-12, -20], [-17, -11], [-14, -3]], webs: [[-11, -14], [-12, -7], [-9, -1]], flank: [-5, 2] },
  { elbow: [-5, -5], wrist: [-9, -8], tips: [[-19, -11], [-20, -4], [-16, 2]], webs: [[-15, -7], [-15, -2], [-10, 2]], flank: [-5, 3] },
  { elbow: [-5, 4], wrist: [-10, 6], tips: [[-18, 4], [-17, 11], [-11, 13]], webs: [[-14, 7], [-13, 10], [-8, 9]], flank: [-4, 4] },
];

/** Fill a polygon, one pixel row at a time. */
function fillPoly(l: Canvas, pts: V[], c: string) {
  const ys = pts.map(q => q[1]);
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    const xs: number[] = [];
    pts.forEach(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) l.rect(Math.round(xs[i]), y, Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i]) + 1), 1, c);
  }
}

function drawBatWing(l: Canvas, w: BatWing, sx: number, sy: number, bone: string, membrane: string) {
  const at = ([x, y]: V): V => [sx + x, sy + y];
  const [t1, t2, t3] = w.tips.map(at), [m1, m2, m3] = w.webs.map(at);
  const elbow = at(w.elbow), wrist = at(w.wrist), flank = at(w.flank), shoulder: V = [sx, sy];
  fillPoly(l, [shoulder, elbow, wrist, t1, m1, t2, m2, t3, m3, flank], membrane);
  for (const tip of [t1, t2, t3]) l.line(wrist[0], wrist[1], tip[0], tip[1], bone); // fingers: thin
  l.line(shoulder[0], shoulder[1], elbow[0], elbow[1], bone, 2); // arm: thick
  l.line(elbow[0], elbow[1], wrist[0], wrist[1], bone, 2);
  l.rect(wrist[0], wrist[1] - 2, 1, 2, '#e9e2d0'); // the wing claw at the wrist
}

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

/**
 * How each specific weapon looks in the hand: its own silhouette, not just a colour. Anything not
 * listed draws as the plain iron version of its type.
 */
interface WeaponStyle {
  blade?: string; edge?: string; guard?: string; gem?: string; shaft?: string; pennant?: string;
  /** Extra length in pixels. */
  len?: number;
  /** Swords: broad blade / curved sabre / basket hilt / serrated edge with embers / a glint at the tip. */
  wide?: boolean; curve?: boolean; basket?: boolean; jagged?: boolean; spark?: boolean;
  /** Lances: longer head / side wings / a hooked back-blade. */
  head?: number; wings?: boolean; hook?: boolean;
  /** Axes: bigger head / a second head on the back / a top spike. */
  big?: boolean; double?: boolean; spike?: boolean;
  /** Bows: limb colour, tip colour, heavier limbs, recurved tips. */
  limb?: string; tips?: string; thick?: boolean; recurve?: boolean;
  /** Staves: orb colour, a ring around the orb, leaves on the shaft. */
  orb?: string; halo?: boolean; leaves?: boolean;
}
const WEAPON_STYLE: Record<string, WeaponStyle> = {
  // swords
  steel_sword: { blade: '#c9d3e0', edge: '#7f8b9c', wide: true, len: 1, guard: '#5f6672' },
  killing_edge: { blade: '#f3dfe1', edge: '#b8373f', curve: true, guard: '#3a2a2a' },
  silver_sword: { blade: '#ffffff', edge: '#8fc4e8', wide: true, len: 2, guard: '#e2be55', spark: true },
  valen_rapier: { blade: '#f4f7fb', len: 4, guard: '#e2be55', gem: '#3d6fd1', basket: true },
  dagger: { blade: '#dfe5ee', len: -4, guard: '#3a2a2a' },
  rapier: { blade: '#dfe5ee', len: 3, guard: '#8a94a6', basket: true },
  ashen_blade: { blade: '#3a3038', edge: '#e0662a', wide: true, len: 3, guard: '#8a2a20', jagged: true },
  // lances
  steel_lance: { blade: '#c9d3e0', shaft: '#5f6672', head: 2 },
  killer_lance: { blade: '#f3dfe1', shaft: '#3a2a2a', pennant: '#b8373f', hook: true },
  silver_lance: { blade: '#ffffff', shaft: '#cfd8e6', pennant: '#3d6fb0', head: 2, wings: true },
  ridersbane: { blade: '#c9d3e0', shaft: '#5a3a20', pennant: '#2f6b34', head: 2, hook: true, wings: true },
  // axes
  hammer: { blade: '#6e6a78', edge: '#45414d', shaft: '#5a3a20', big: true, double: true },
  steel_axe: { blade: '#c9d3e0', big: true },
  killer_axe: { blade: '#d9c0c4', edge: '#b8373f', shaft: '#3a2a2a', double: true },
  silver_axe: { blade: '#ffffff', edge: '#8fc4e8', shaft: '#cfd8e6', big: true, spike: true },
  // bows
  steel_bow: { limb: '#8a94a6', thick: true },
  killer_bow: { limb: '#7a2230', tips: '#e2be55', recurve: true },
  silver_bow: { limb: '#e4ebf3', tips: '#8fc4e8', thick: true, recurve: true },
  // staves
  mend: { orb: '#8affb0', shaft: '#e6dcc0', halo: true },
  oak_staff: { orb: '#ffcf6a', shaft: '#7a5a34', leaves: true },
};

function drawWeapon(l: Canvas, type: WeaponType, h: V, d: V, accent: string, glow: boolean, st: WeaponStyle) {
  const p: V = [-d[1], d[0]]; // perpendicular, clockwise on screen
  const diag = d[0] !== 0 && d[1] !== 0;
  // diagonals use a 2 px brush so blades and shafts read as solid lines, not dotted ones
  const px = (k: number, side: number, c: string) => { const [x, y] = at(h, d, k, p, side); l.rect(x, y, diag ? 2 : 1, 1, c); };
  const run = (a: number, b: number, c: string, side = 0) => { for (let k = a; k <= b; k++) px(k, side, c); };
  const blade = st.blade ?? BLADE;
  if (type === 'sword') {
    const tip = (diag ? 7 : 9) + (st.len ?? 0);
    for (let k = 2; k <= tip; k++) {
      const bend = st.curve ? (k >= tip - 1 ? -2 : k >= tip - 4 ? -1 : 0) : 0; // a sabre sweeps back toward its point
      px(k, bend, blade);
      if (st.wide && k < tip) px(k, bend + 1, blade);
      if (st.edge && k < tip) px(k, bend + (st.wide ? 2 : 1), st.jagged && k % 2 ? blade : st.edge);
      if (st.jagged && k % 3 === 0) px(k, bend + 3, '#ffb84a'); // embers trailing off the edge
    }
    if (st.spark) { px(tip + 1, 0, '#ffffff'); px(tip, -1, '#ffffff'); px(tip, 1, '#ffffff'); px(tip + 2, 0, '#bfe3ff'); }
    const guard = st.guard ?? accent;
    l.set(...at(h, d, -1), st.gem ?? guard);
    l.set(...at(h, d, 0), '#4a3320');
    for (const side of st.wide || st.basket ? [-2, -1, 0, 1, 2] : [-1, 0, 1]) l.set(...at(h, d, 1, p, side), guard);
    if (st.basket) for (const k of [-1, 0]) for (const side of [-2, 2]) l.set(...at(h, d, k, p, side), guard); // cup around the hand
  } else if (type === 'lance') {
    const end = 14 + (st.head ?? 0);
    run(diag ? -4 : -8, 11, st.shaft ?? WOOD);
    run(12, end, blade);
    for (let k = 12; k < end - 1; k++) { px(k, 1, blade); px(k, -1, blade); }
    if (st.wings) for (const side of [-3, -2, 2, 3]) px(12, side, blade);
    if (st.hook) { for (const k of [9, 10, 11]) px(k, 2, blade); px(9, 3, blade); px(10, 3, st.edge ?? '#b8373f'); }
    const flag = st.pennant ?? accent;
    for (const [k, side] of [[10, -1], [9, -1], [9, -2], [8, -1], [8, -2], [8, -3]]) if (side > -3 || st.pennant) px(k, side, flag);
  } else if (type === 'axe') {
    run(-2, 8, st.shaft ?? WOOD);
    const from = st.big ? 4 : 5, out = st.big ? 3 : 2;
    for (const dir of st.double ? [1, -1] : [1]) {
      for (let k = from; k <= 8; k++) for (let side = 1; side <= out; side++) px(k, side * dir, st.blade ?? STEEL);
      for (let k = from + 1; k <= 7; k++) px(k, (out + 1) * dir, st.edge ?? '#eef2f7');
    }
    if (st.spike) run(9, 11, blade);
  } else if (type === 'breath') {
    // the dragonstone: a faceted gem that takes the character's accent colour
    const [ox, oy] = [h[0], h[1] - 2];
    l.rect(ox - 1, oy - 1, 3, 3, accent);
    l.set(ox, oy - 2, accent); l.set(ox, oy + 2, shade(accent, 0.35));
    l.set(ox - 1, oy - 1, '#ffffff'); l.set(ox + 1, oy + 1, shade(accent, 0.35));
  } else if (type === 'staff') {
    run(-5, 7, st.shaft ?? '#cdb98a');
    l.set(...at(h, d, 7, p, 1), accent);
    l.set(...at(h, d, 7, p, -1), accent);
    if (st.leaves) for (const [k, side] of [[4, 1], [5, 2], [3, -1], [6, -2], [6, 1]]) l.set(...at(h, d, k, p, side), '#57a04c');
    const [ox, oy] = at(h, d, 9);
    const orb = glow ? '#ffffff' : st.orb ?? '#bfe3ff';
    if (st.halo) for (const [dx, dy] of [[-2, -1], [-2, 0], [-2, 1], [2, -1], [2, 0], [2, 1], [-1, -2], [0, -2], [1, -2], [-1, 2], [1, 2]]) l.set(ox + dx, oy + dy, tint(orb, 0.45));
    l.rect(ox - 1, oy - 1, 3, 3, orb);
    l.set(ox - 1, oy - 1, '#ffffff');
  }
}

const BOW_ARC: V[] = [
  [-3, -8], [-2, -7], [-2, -6], [-1, -5], [-1, -4], [0, -3], [0, -2],
  [0, 2], [0, 3], [-1, 4], [-1, 5], [-2, 6], [-2, 7], [-3, 8],
];

/* ---------- mount ---------- */

const WING_PAL = { W: '#f7f5f0', L: '#c9d2e0' };
const WING_FAR = { W: '#d3d8e2', L: '#aab4c6' };
const TACK = '#3a2416';
const HOOF = '#2a2420';
const isWinged = (build: Build) => build.mount === 'pegasus' || build.mount === 'wyvern';
/** Everything that differs between a horse, a pegasus and a wyvern: colours and which templates to stamp. */
function mountColours(build: Build) {
  const pegasus = build.mount === 'pegasus', wyvern = build.mount === 'wyvern';
  /** Only a true dragon has an element; a wyvern mount is just a wyvern. */
  const element = build.form === 'dragon' ? build.element : undefined;
  const el = element && ELEMENTS[element];
  const coat = build.coat ?? el?.coat ?? (wyvern ? '#9c1f1c' : pegasus ? '#eeeae2' : '#4a3020');
  /** Mane on a horse; the dark spines and tail blade on a wyvern. */
  const mane = build.mane ?? el?.mane ?? (wyvern ? '#2a1414' : pegasus ? '#cfd8e6' : '#1e140c');
  const far = shade(coat, 0.28);
  const belly = el?.belly ?? '#c9a878';
  const head: Record<string, string> = wyvern
    ? { r: coat, d: shade(coat, 0.45), k: el ? mane : '#1e1414', y: el?.eye ?? '#ffb000', n: '#1a0606', w: '#f4eee4', m: '#2a0808', b: belly }
    : { c: coat, m: mane, k: TACK, w: pegasus ? coat : '#f1ede4', e: '#1a1a1a', n: shade(coat, 0.5) };
  const body: Record<string, string> = wyvern
    ? { r: coat, R: tint(coat, 0.22), d: shade(coat, 0.45), k: el ? mane : '#1e1414', b: belly, B: shade(belly, 0.3) }
    : { c: coat, l: tint(coat, 0.16), C: far };
  return {
    winged: pegasus || wyvern, wyvern, coat, mane, far, head, body, element,
    headArt: wyvern ? WYVERN_HEAD : HORSE_HEAD, bodyArt: wyvern ? WYVERN_BODY : HORSE_BODY,
    wingPal: element === 'light' ? { W: '#fffdf2', L: '#f0d488' } : WING_PAL, wingFar: element === 'light' ? { W: '#f0e6c4', L: '#d8b860' } : WING_FAR,
    /** Wyvern wing colours: [bone, membrane] for the near wing and the far one. */
    bat: (el ? [[tint(coat, 0.12), el.membrane], [shade(coat, 0.35), shade(el.membrane, 0.35)]] : [[tint(coat, 0.12), '#3d0d11'], [shade(coat, 0.35), '#27080b']]) as [string, string][],
  };
}

/** A mount collapsed on its side, head to the right, lying on the ground row. `ox` = rump. */
function drawDeadMount(c: Canvas, build: Build, ox: number) {
  const { winged, wyvern, coat, mane, far, head, headArt, wingPal, bat } = mountColours(build);
  c.layer(l => {
    l.line(ox + 15, 30, ox + 22, 30, far, 2); l.rect(ox + 24, 30, 1, 2, HOOF);
    l.line(ox + 1, 30, ox - 4, 30, far, 2); l.rect(ox - 5, 30, 1, 2, HOOF);
  });
  // one limp wing still raised
  if (winged) c.layer(l => (wyvern ? drawBatWing(l, BAT_WINGS[0], ox + 9, 25, bat[0][0], bat[0][1]) : l.stamp(WINGS[0], ox - 4, 11, wingPal)));
  c.layer(l => {
    l.line(ox + 2, 25, ox - 2, 29, mane, 2);
    l.rect(ox + 5, 22, 9, 1, coat);
    l.rect(ox + 3, 23, 13, 9, coat);
    l.rect(ox + 2, 24, 15, 7, coat);
    l.rect(ox + 4, 23, 6, 1, tint(coat, 0.16));
    l.rect(ox + 3, 31, 13, 1, far);
    l.line(ox + 15, 24, ox + 20, 27, coat, 4);
    l.stamp(headArt, ox + 21, wyvern ? 22 : 25, wyvern ? { ...head, y: HOOF } : { ...head, e: HOOF, w: coat });
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

/**
 * What makes a dragon more than a bare wyvern: scales across the hide, taller spines, and the marks of
 * its element. Drawn on the body's own layer so it shares the outline. `poll` is where neck meets head,
 * `tip` the end of the tail, `flick` alternates 0/1 between frames for things that flutter.
 */
function dragonDetail(l: Canvas, e: Element | undefined, coat: string, mane: string, gy: number, poll: V, tip: V, flick: number) {
  const [px, py] = [poll[0], poll[1] + gy], [ex, ey] = tip;
  const fleck = shade(coat, 0.22), sheen = tint(coat, 0.3);
  for (let y = 18 + gy; y <= 22 + gy; y++) for (let x = 3; x <= 23; x++) {
    if (l.get(x, y) !== coat) continue;
    if ((x + y * 2) % 4 === 0) l.set(x, y, fleck); else if (y === 18 + gy && x % 3 === 0) l.set(x, y, sheen);
  }
  if (e !== 'water' && e !== 'earth') for (const x of [5, 8, 11, 14]) l.set(x, 16 + gy, mane); // spines stand taller
  l.set(px + 3, py - 1, sheen); l.set(px + 4, py - 1, sheen); // brow ridge
  switch (e) {
    case 'fire': {
      // embers glowing through cracks in the hide, a burning tail, smoke from the nostrils
      for (const [x, y] of [[7, 19], [12, 20], [17, 19], [20, 21], [9, 21]]) if (l.get(x, y + gy)) l.set(x, y + gy, (x + flick) % 2 ? '#ffb84a' : '#ff7a2a');
      l.rect(ex - 2, ey - 1, 4, 3, '#e0662a'); l.rect(ex - 3 + flick, ey - 3, 2, 2, '#ffb84a'); l.set(ex - 1, ey, '#fff3b0'); l.set(ex - 2 + flick * 2, ey - 4, '#ffb84a');
      l.set(px + 11, py - 1 - flick, '#9a9490'); l.set(px + 12, py - 3 - flick, '#b8b2ac');
      break;
    }
    case 'water': {
      // a ribbed sail down the back, fins behind the jaw, a fluked tail
      const fin = '#7fe0e8', rib = '#2f8fb0';
      l.poly([[4, 17 + gy], [7, 12 + gy], [11, 11 + gy], [15, 13 + gy], [17, 17 + gy]], fin);
      for (const [x0, x1, y1] of [[6, 7, 12], [10, 11, 11], [13, 15, 13]]) l.line(x0, 17 + gy, x1, y1 + gy, rib);
      l.poly([[px, py], [px - 4, py - 4 - flick], [px - 5, py + 1]], fin); l.line(px, py, px - 4, py - 3 - flick, rib);
      l.poly([[ex + 1, ey], [ex - 4, ey - 4], [ex - 2, ey], [ex - 4, ey + 4]], fin); l.line(ex + 1, ey, ex - 3, ey - 3, rib); l.line(ex + 1, ey, ex - 3, ey + 3, rib);
      for (const [x, y] of [[8, 20], [14, 21], [19, 20]]) if (l.get(x, y + gy)) l.set(x, y + gy, '#9fe8f0');
      break;
    }
    case 'earth': {
      // slabs of rock along the back, crystals growing between them, a stone club for a tail
      const rock = '#8a7a66', lit = '#b8aa94', dim = '#5f5244';
      for (const x of [4, 8, 12, 16]) { l.rect(x, 15 + gy, 3, 3, rock); l.rect(x, 15 + gy, 2, 1, lit); l.rect(x, 17 + gy, 3, 1, dim); }
      for (const [x, y, h] of [[7, 14, 4], [15, 14, 5], [11, 14, 3]]) { l.line(x, y + gy, x + 1, y - h + gy, '#7dd87a'); l.set(x + 1, y - h + gy, '#e0ffd0'); }
      l.rect(ex - 3, ey - 2, 5, 5, rock); l.rect(ex - 3, ey - 2, 3, 1, lit); l.rect(ex - 3, ey + 2, 5, 1, dim); l.set(ex - 4, ey, lit); l.set(ex + 2, ey - 3, lit);
      for (const [x, y] of [[6, 20], [13, 19], [20, 20], [10, 21]]) if (l.get(x, y + gy)) l.set(x, y + gy, '#5a8a3e');
      break;
    }
    case 'wind': {
      // long streamers from the head and tail, and pale swirls along the flank
      l.line(px + 1, py - 3, px - 7, py - 6 - flick, mane); l.line(px, py - 1, px - 8, py - 2 + flick, mane);
      l.line(px + 10, py + 2, px + 13, py + 5 - flick, mane);
      l.line(ex, ey, ex - 7, ey - 2 - flick, mane); l.line(ex, ey + 1, ex - 7, ey + 3 + flick, mane); l.line(ex, ey, ex - 5, ey + flick, tint(coat, 0.5));
      for (const [x, y] of [[8, 20], [9, 19], [10, 20], [15, 20], [16, 19], [17, 20], [18, 21]]) if (l.get(x, y + gy)) l.set(x, y + gy, '#f2fff8');
      break;
    }
    case 'light': {
      // branching golden antlers, a halo, a tufted tail, and motes of light around it
      const gold = '#e2b23c', glow = '#fff3b0';
      l.line(px + 2, py - 4, px - 1, py - 8, gold); l.line(px, py - 6, px + 2, py - 9, gold); l.line(px + 4, py - 3, px + 5, py - 7, gold); l.set(px - 1, py - 9, glow); l.set(px + 5, py - 8, glow);
      l.rect(px + 1, py - 12, 7, 1, gold); l.rect(px + 1, py - 10, 7, 1, gold); l.set(px, py - 11, gold); l.set(px + 8, py - 11, gold);
      l.rect(ex - 3, ey - 2, 5, 4, gold); l.rect(ex - 4, ey - 1, 1, 2, glow); l.set(ex - 2, ey - 3, glow);
      for (const [x, y] of [[6, 20], [11, 19], [16, 20], [20, 19]]) if (l.get(x, y + gy)) l.set(x, y + gy, gold);
      break;
    }
    case 'dark': {
      for (const [x, y] of [[7, 20], [8, 19], [13, 21], [14, 20], [19, 20]]) if (l.get(x, y + gy)) l.set(x, y + gy, flick ? '#a03cff' : '#7a2ac8');
      break;
    }
    default:
  }
}

/** A dragon's breath, by element, pouring right from the jaws at (x0, y0). */
function drawBreath(d: Canvas, e: Element, x0: number, y0: number, phase: number) {
  const [a, b, c] = ELEMENTS[e].breath, n = 7 + phase * 5;
  if (e === 'water') {
    // a tight jet that bursts into spray at its end
    for (let i = 0; i < n + 4; i++) { d.rect(x0 + i, y0 - 1, 1, 3, i % 2 ? a : b); d.set(x0 + i, y0, c); }
    for (const [dx, dy] of [[1, -3], [3, -2], [2, 3], [4, 1], [5, -4], [5, 4], [6, 0]]) d.set(x0 + n + 3 + dx, y0 + dy, (dx + dy) % 2 ? b : c);
  } else if (e === 'earth') {
    // a hail of stones
    for (let i = 0; i < n + 2; i += 3) {
      const y = y0 - 3 + ((i * 7 + phase * 3) % 6);
      d.rect(x0 + i, y, 3, 2, a); d.rect(x0 + i, y, 2, 1, b); d.set(x0 + i + 2, y + 1, shade(a, 0.4)); d.set(x0 + i - 1, y + 2, c);
    }
  } else if (e === 'wind') {
    // crescent blades of air, one behind another
    for (let k = 0; k <= 1 + phase; k++) {
      const x = x0 + 1 + k * 6;
      for (let j = -4; j <= 4; j++) { d.set(x + 3 - Math.round((j * j) / 5), y0 + j, j % 2 ? b : c); d.set(x + 2 - Math.round((j * j) / 5), y0 + j, a); }
    }
  } else if (e === 'light') {
    // a straight beam with a flare at the mouth
    d.rect(x0, y0 - 2, n + 6, 5, a); d.rect(x0, y0 - 1, n + 6, 3, b); d.rect(x0, y0, n + 6, 1, c);
    d.rect(x0 + 1, y0 - 5, 1, 11, b); d.rect(x0 - 2, y0, 7, 1, c);
    for (const [dx, dy] of [[4, -4], [9, 4], [13, -4], [n + 4, 3]]) d.set(x0 + dx, y0 + dy, c);
  } else {
    // a widening cone of flame (fire), or of shadow shot through with violet (dark)
    for (let i = 0; i < n; i++) {
      const spread = 1 + Math.floor(i / 3);
      d.rect(x0 + i, y0 - spread, 1, spread * 2 + 1, i % 3 === 0 ? b : a);
      d.rect(x0 + i, y0 - Math.floor(spread / 2), 1, spread, c);
    }
  }
}

function drawMount(c: Canvas, build: Build, accent: string, m: MountPose, gy: number, bare = false) {
  const { winged, wyvern, coat, mane, far, head, body, headArt, bodyArt, wingPal, wingFar, bat, element } = mountColours(build);
  /** A wing: 0 = the far one, drawn first and darker, set a little forward and higher. */
  const wing = (l: Canvas, near: boolean) => {
    const dx = near ? 0 : 4, dy = near ? 0 : -2;
    if (element === 'earth') return; // an earth dragon is too heavy to fly and has no wings
    if (wyvern && element !== 'light') drawBatWing(l, BAT_WINGS[beat], 14 + dx, 19 + dy + gy, bat[near ? 0 : 1][0], bat[near ? 0 : 1][1]);
    else l.stamp(WINGS[beat], WING_AT[beat][0] + (near ? 0 : 3), WING_AT[beat][1] + (near ? 0 : -1) + gy, near ? wingPal : wingFar); // feathered: a pegasus, or a light dragon
  };
  // on the ground a wyvern holds its wings half-spread instead of sweeping them through the dirt
  const beat = wyvern && gy >= 0 && m.wing === 2 ? 1 : m.wing;
  const leg = (l: Canvas, hip: number, [kx, ky, hx, hy]: LegPose, col: string) => {
    const knee = Math.min(29, ky + gy), hoof = hy === 31 ? 31 : Math.min(31, hy + gy);
    l.line(hip, 24 + gy, hip + kx, knee, col, 3);
    l.line(hip + kx, knee + 1, hip + hx, hoof - 1, col, 2);
    l.rect(hip + hx, hoof, 2, 1, HOOF);
  };
  const near = GAITS[m.gait];
  const farLegs = GAITS[m.gait >= 1 && m.gait <= 4 ? (m.gait % 4) + 1 : m.gait]; // the far pair runs a beat ahead
  // where the neck meets the head: raised, drooping, down at the ground. A wyvern's neck is longer.
  const poll: V = ((wyvern ? [[26, 11], [27, 17], [27, 23]] : [[24, 13], [25, 18], [25, 25]]) as V[])[m.head];

  if (winged) c.layer(l => wing(l, false));
  // a wyvern walks on two legs under its body; its forelimbs are the wings
  c.layer(l => { if (wyvern) { leg(l, 14, farLegs[0], far); if (bare) leg(l, 20, farLegs[1], far); } else { leg(l, 9, farLegs[0], far); leg(l, 18, farLegs[1], far); } });
  c.layer(l => {
    // tail: hanging, mid-swish, streaming behind
    const tail: V[] = ([[[1, 22], [1, 27]], [[0, 22], [-1, 27]], [[-2, 19], [-5, 21]]] as V[][])[m.tail];
    if (wyvern) {
      // a thick scaled tail tapering to a dark blade
      const [ex, ey] = [tail[1][0] - 2, tail[1][1] + gy];
      l.line(2, 20 + gy, tail[0][0] - 1, tail[0][1] + gy, coat, 3);
      l.line(tail[0][0] - 1, tail[0][1] + gy, ex, ey, coat, 2);
      if (!element || element === 'dark') { l.rect(ex - 2, ey, 5, 2, mane); l.rect(ex - 1, ey - 2, 2, 6, mane); l.set(ex - 3, ey - 1, mane); } // barbed tail blade
      leg(l, 11, near[0], coat);
      if (bare) leg(l, 18, near[1], coat); // a true dragon stands on four legs
      const cy = near[0][3] === 31 ? 31 : Math.min(31, near[0][3] + gy);
      l.rect(11 + near[0][2] + 2, cy, 2, 1, HOOF); l.set(11 + near[0][2] - 1, cy, HOOF); // talons front and back
    } else {
      l.line(2, 19 + gy, tail[0][0], tail[0][1] + gy, mane, 2);
      l.line(tail[0][0], tail[0][1] + gy, tail[1][0], tail[1][1] + gy, mane, 2);
      l.line(tail[0][0], tail[0][1] + 1 + gy, tail[1][0], tail[1][1] + gy, shade(mane, 0.3));
      leg(l, 7, near[0], coat);
      leg(l, 20, near[1], coat);
    }
    l.stamp(bodyArt, wyvern ? 2 : 3, (wyvern ? 17 : 18) + gy, body);
    l.line(18, 18 + gy, poll[0] - 3, poll[1] - 2 + gy, coat, 4);
    l.stamp(headArt, poll[0] - 1, poll[1] - (wyvern ? 4 : 3) + gy, head);
    l.line(17, 17 + gy, poll[0] - 4, poll[1] - 3 + gy, mane, 2);
    l.line(18, 18 + gy, poll[0] - 4, poll[1] - 1 + gy, shade(mane, 0.3));
    if (bare) {
      const t: V[] = ([[[1, 22], [1, 27]], [[0, 22], [-1, 27]], [[-2, 19], [-5, 21]]] as V[][])[m.tail];
      dragonDetail(l, element, coat, mane, gy, poll, [t[1][0] - 2, t[1][1] + gy], (m.wing + m.tail) % 2);
    }
  });
  if (!bare) {
    c.layer(l => {
      l.rect(9, 18 + gy, 9, 4, accent);
      l.rect(9, 21 + gy, 9, 1, shade(accent, 0.35));
      l.rect(10, 17 + gy, 7, 2, '#5a2a20');
      l.rect(9, 16 + gy, 2, 1, '#5a2a20');
      l.set(16, 16 + gy, '#5a2a20');
    });
    c.rect(13, 23 + gy, 1, 3, TACK);
    if (m.head < 2) c.line(17, 17 + gy, poll[0] + 2, poll[1] + 1 + gy, TACK);
  }
  if (winged) c.layer(l => wing(l, true));
}

/* ---------- one frame ---------- */

interface Fr {
  /** Start time in seconds (one-shot animations only). */
  at?: number;
  /** Id of the specific weapon held, for its look (see WEAPON_STYLE). */
  wid?: string;
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
  fx?: 'swoosh' | 'glow' | 'nock' | 'draw' | 'heal' | 'stars' | 'dash' | 'fire';
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
  breath: { hand: [4, 1], dir: [0, -1], back: [-1, 4] },
  none: { hand: [1, 5], dir: [0, 0], back: [-1, 4] },
};

/** A rider and mount going down: toppling first, then both on the ground in a growing pool. */
function drawFallen(look: Look, build: Build, weapon: WeaponType | undefined, stage: number, wid?: string): Canvas {
  if (build.form === 'dragon') {
    // a dragon staggers, then crashes onto its side in its own blood
    if (stage === 1) return drawFrame(look, build, weapon, { sink: 3, head: 1 }).rotated(14, 8, 31);
    const d = new Canvas(), w = 22 + [10, 18, 26][stage - 2];
    d.rect(15 - w / 2, 31, w, 1, BLOOD); d.rect(14 - w / 2, 32, w + 2, 1, BLOOD); d.rect(16 - w / 2, 33, w - 2, 1, BLOOD_D);
    drawDeadMount(d, { ...build, mount: 'wyvern' }, 4);
    return d;
  }
  const mounted = !!build.mount;
  const out = new Canvas();
  const body = drawFrame(look, { ...build, mount: undefined }, weapon, { hurt: true, wid });
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
  if (f.fall) return drawFallen(look, build, weapon, f.fall, f.wid);
  if (build.form === 'dragon') {
    const d = new Canvas(), bob = f.bob ?? 0, gy = (f.sink ?? 0) + (f.gait === 1 ? -1 : 0);
    drawMount(d, { ...build, mount: 'wyvern' }, look.accent, { gait: f.gait ?? 0, tail: f.tail ?? 0, head: f.head ?? 0, wing: f.wing ?? (bob ? 0 : 1) }, gy, true);
    if (f.fx === 'fire') drawBreath(d, build.element ?? 'fire', 37, 14 + gy, f.phase ?? 0);
    if (f.blood) for (const [x, y] of [[15, 21], [19, 20], [21, 22], [23, 18], [18, 24]]) d.set(x, y + gy, BLOOD);
    const turned = f.rear ? d.rotated(20, 8, 31) : d;
    return f.shift ? turned.rotated(0, 0, 0, f.shift[0], f.shift[1]) : turned;
  }
  if (f.sit) { weapon = undefined; build = { ...build, mount: undefined }; }
  const c = new Canvas();
  const { skin, hair, cloth, accent } = look;
  const armored = build.outfit === 'armor';
  const robe = build.outfit === 'robe';
  const mounted = !!build.mount;
  const flying = isWinged(build) && !f.land;
  const bob = f.bob ?? 0;
  const gait = f.gait ?? (flying ? 5 : 0);
  const sink = f.sink ?? 0;
  const gy = (flying ? -4 + bob : gait === 1 ? -1 : 0) + (mounted ? sink : 0);
  const ux = (mounted ? -1 : 0) + (f.lean ?? 0);
  const uy = mounted ? gy - 7 + (flying ? 0 : bob) : bob + sink;
  const raider = build.outfit === 'raider';
  const sleeve = build.outfit === 'leather' || raider ? skin : armored ? STEEL : cloth;
  const torso = armored ? STEEL : cloth;
  const legs = armored ? STEEL_D : build.pants;
  const pal = {
    s: skin, S: shade(skin, 0.22), e: '#1d1a26', h: hair, H: shade(hair, 0.35), L: tint(hair, 0.3),
    c: cloth, C: shade(cloth, 0.3), a: accent, A: shade(accent, 0.3), m: STEEL, M: STEEL_D, W: STEEL_L, g: '#e2be55',
  };
  const b = build.broad ? 1 : 0;
  const tx = 12 - b + ux, tw = 7 + 2 * b, ty = 18 + uy;
  const sf: V = [17 + b + ux, 19 + uy];
  const sb: V = [12 - b + ux, 19 + uy];
  const rest = mounted && weapon === 'lance' ? { hand: [3, 3] as V, dir: [1, -1] as V, back: [-1, 4] as V } : REST[weapon ?? 'none'];
  const torch = !!build.torch && !f.sit && !f.clutch && weapon !== 'bow';
  const hd = f.hand ?? rest.hand, d = f.dir ?? rest.dir, bk = f.back ?? (torch ? [-3, 0] as V : rest.back);
  const hand: V = [sf[0] + hd[0], sf[1] + hd[1]];
  const backHand: V = [sb[0] + bk[0], sb[1] + bk[1]];
  const feet = f.feet ?? [0, 0, 0, 0];
  const style = (f.wid && WEAPON_STYLE[f.wid]) || {};

  const arm = (l: Canvas, s: V, h: V, upper: string, fore: string, palm: string) => {
    const mx = Math.round((s[0] + h[0]) / 2), my = Math.round((s[1] + h[1]) / 2);
    l.line(s[0] - 1, s[1], mx - 1, my, upper, 2);
    l.line(mx - 1, my, h[0] - 1, h[1], fore, 2);
    l.rect(h[0] - 1, h[1], 2, 2, palm);
  };
  const backArm = (l: Canvas) => {
    if (torch) {
      // a burning brand held up behind the shoulder; the flame leans a different way each frame
      const [x, y] = backHand, lick = (bob + feet[0] + (f.phase ?? 0) + (f.at ? 1 : 0)) % 2 === 0 ? 0 : 1;
      l.rect(x - 1, y - 4, 1, 5, '#5a3a20');
      l.rect(x - 2, y - 7, 3, 3, '#e0662a');
      l.rect(x - 1 - lick, y - 9, 2, 2, '#ffb84a');
      l.set(x - 1, y - 6, '#fff3b0');
      l.set(x - 2 + lick * 2, y - 10, '#ffb84a');
    }
    arm(l, sb, backHand, shade(sleeve, 0.25), shade(armored ? STEEL_D : sleeve, 0.25), shade(skin, 0.15));
  };
  const leg = (l: Canvas, hip: number, foot: number, lift: number, col: string) => {
    const end = 29 - lift;
    for (let r = 23; r <= end; r++) l.rect(Math.round(hip + ((foot - hip) * (r - 23)) / (end - 23)) - 1, r, 3, 1, col);
    l.rect(foot - 1, end + 1, 4, 2, build.boots);
  };

  if (mounted) drawMount(c, build, accent, { gait, tail: f.tail ?? 0, head: f.head ?? 0, wing: f.wing ?? (f.land ? 2 : 0) }, gy);
  if (part === 'mount') return c;

  if (build.outfit === 'cape' || build.outfit === 'cloak') {
    const cloak = build.outfit === 'cloak';
    const cape = build.cape ?? (cloak ? shade(cloth, 0.2) : accent);
    const sway = bob || feet[0] ? 1 : 0;
    c.layer(l => {
      for (let r = ty; r <= (cloak ? 26 : 29); r++) {
        const x0 = 11 + ux - Math.floor((r - ty) / 3) - (r > (cloak ? 23 : 25) ? sway : 0);
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

  if (look.horns && build.element) {
    const el = ELEMENTS[build.element], hide = build.coat ?? el.coat;
    c.layer(l => {
      if (build.element !== 'earth') {
        l.poly([[12 + ux, ty + 1], [6 + ux, ty - 3 - (bob ? 1 : 0)], [7 + ux, ty + 2], [5 + ux, ty + 5], [9 + ux, ty + 4], [11 + ux, ty + 6]], build.element === 'light' ? '#fffdf2' : el.membrane);
        l.line(12 + ux, ty + 1, 6 + ux, ty - 3 - (bob ? 1 : 0), hide); l.line(7 + ux, ty + 2, 5 + ux, ty + 5, hide);
      }
      l.line(11, 28, 7, 30, hide, 2); l.line(7, 30, 4, 29 - (bob ? 1 : 0), hide); l.set(3, 28 - (bob ? 1 : 0), el.mane);
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
    if (raider) {
      // a fur mantle over the shoulders and a strap of pouches across the chest
      const fur = '#8a7a66', furD = '#5f5244';
      l.rect(tx - 1, ty, tw + 2, 2, fur);
      for (let x = tx - 1; x <= tx + tw; x += 2) l.set(x, ty + 2, fur);
      for (let x = tx; x <= tx + tw; x += 3) l.set(x, ty + 1, furD);
      for (let i = 0; i < 4; i++) l.set(tx + 1 + i * 2, ty + 3 + i, '#3a2416');
      l.rect(tx + tw - 3, ty + 4, 2, 2, '#7a5a34');
    }
    if (build.outfit === 'cloak') {
      for (let i = 0; i < 5; i++) l.set(tx + 1 + i, ty + 1 + i, '#2a2018'); // a bandolier
      l.rect(tx + tw - 3, ty + 5, 2, 2, '#7a5a34'); l.rect(tx + 1, ty + 5, 2, 2, '#7a5a34'); // pouches
    }
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
    if (look.mask) { l.rect(hx + 4, hy + 7, 6, 1, pal.C); l.rect(hx + 3, hy + 8, 6, 1, pal.C); l.rect(hx + 4, hy + 9, 4, 1, pal.C); l.set(hx + 6, hy + 7, shade(pal.C, 0.3)); }
    const hairStyle = HAIR[look.style];
    l.stamp(hairStyle.rows, hx + (hairStyle.dx ?? 0), hy + (hairStyle.dy ?? 0), pal);
    if (look.crown) l.stamp(CROWN, hx, hy - 2, pal);
    if (look.horns && build.element) {
      const scale = mix(skin, build.coat ?? ELEMENTS[build.element].coat, 0.55);
      for (const [x, y] of [[8, 7], [9, 6], [9, 8], [3, 6]]) if (l.get(hx + x, hy + y) === skin) l.set(hx + x, hy + y, scale);
    }
    if (look.horns) for (const x of [3, 8]) { l.set(hx + x, hy, '#e9e2d0'); l.set(hx + x - 1, hy - 1, '#e9e2d0'); l.set(hx + x - 1, hy - 2, '#cfc4a8'); }
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
      for (const [dx, dy] of BOW_ARC) l.rect(x + dx, y + dy, style.thick ? 2 : 1, 1, style.limb ?? WOOD);
      if (style.recurve) for (const sy of [-1, 1]) { l.set(x - 2, y + 9 * sy, style.limb ?? WOOD); l.set(x - 1, y + 10 * sy, style.tips ?? style.limb ?? WOOD); }
      if (style.tips) { l.set(x - 3, y - 8, style.tips); l.set(x - 3, y + 8, style.tips); }
      l.rect(x, y - 1, 1, 3, '#4a3320'); // leather grip
    });
  } else if (weapon) {
    c.layer(l => drawWeapon(l, weapon, hand, d, accent, f.fx === 'glow', style));
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
    case 'breath':
      // a dragon rears its head back, then pours out fire; in human form the stone is simply held up
      return { frames: [{ at: 0, wing: 0, tail: 1 }, { at: 0.2, wing: 1, fx: 'fire', phase: 0 }, { at: 0.36, wing: 1, fx: 'fire', phase: 1 }, { at: 0.62, wing: 1 }] };
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

function spriteFor(look: Look, build: Build, weapon: WeaponType | undefined, pose: Pose, wid?: string): Sprite {
  const key = JSON.stringify([look, build, weapon, pose, wid]);
  let s = cache.get(key);
  if (!s) {
    const { frames, loop } = framesFor(pose, !!build.mount || build.form === 'dragon', build.form !== 'dragon' && isWinged(build));
    const n = frames.length;
    s = {
      rest: loop ? 0 : n - 1,
      frames: frames.map((f, i) => ({
        paths: drawFrame(look, build, weapon, { ...f, wid }).paths(5),
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
  /** The specific weapon held (e.g. 'silver_sword'). Sets its look, and its type if `weapon` is not given. */
  weaponId?: string;
  pose?: Pose;
  facing?: 'left' | 'right';
  size?: number;
  className?: string;
}

export const Figure = memo(function Figure({ look, build, weapon, weaponId, pose = 'idle', facing = 'right', size = 160, className }: FigureProps) {
  const mounted = !!build.mount || build.form === 'dragon';
  const sprite = spriteFor(look, build, WEAPONS[weaponId ?? '']?.type ?? weapon, pose, weaponId);
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
