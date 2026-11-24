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
export type Pose = 'idle' | 'walk' | 'talk' | 'slash' | 'thrust' | 'chop' | 'shoot' | 'cast' | 'hit' | 'dodge' | 'die';

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

const HORSE_HEAD = ['.c....', 'ccc...', 'ccecc.', 'cccccc', '..cccc'];
const WING_UP = [
  'W.........',
  'WW........',
  'WWWL......',
  '.WWWL.....',
  '.WWWWL....',
  '..WWWWL...',
  '..WWWWWL..',
  '...WWWWWL.',
  '....WWWWW.',
  '......WWW.',
];
const WING_DOWN = ['WWW.......', 'LWWWWW....', '.LWWWWWWW.', '..LLWWWWWW', '....LLWWW.'];

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

const BOW_ARC: V[] = [[-2, -5], [-1, -4], [-1, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [-1, 3], [-1, 4], [-2, 5]];

/* ---------- mount ---------- */

const WING_PAL = { W: '#f7f5f0', L: '#c9d2e0' };
function mountColours(build: Build) {
  const pegasus = build.mount === 'pegasus';
  const coat = build.coat ?? (pegasus ? '#eeeae2' : '#4a3020');
  return { pegasus, coat, mane: build.mane ?? (pegasus ? '#cfd8e6' : '#1e140c'), far: shade(coat, 0.28) };
}

/** A horse or pegasus collapsed on its side, head to the right, lying on the ground row. `ox` = rump. */
function drawDeadMount(c: Canvas, build: Build, ox: number) {
  const { pegasus, coat, mane, far } = mountColours(build);
  const hoof = '#2a2420';
  c.layer(l => {
    l.line(ox + 15, 30, ox + 22, 30, far, 2); l.rect(ox + 24, 30, 1, 2, hoof);
    l.line(ox + 1, 30, ox - 4, 30, far, 2); l.rect(ox - 5, 30, 1, 2, hoof);
  });
  if (pegasus) c.layer(l => l.stamp(WING_UP, ox - 2, 13, WING_PAL)); // one limp wing still raised
  c.layer(l => {
    l.line(ox + 2, 25, ox - 2, 29, mane, 2);
    l.rect(ox + 5, 22, 9, 1, coat);
    l.rect(ox + 3, 23, 13, 9, coat);
    l.rect(ox + 2, 24, 15, 7, coat);
    l.rect(ox + 3, 31, 13, 1, far);
    l.line(ox + 15, 24, ox + 21, 28, coat, 3);
    l.stamp(HORSE_HEAD, ox + 23, 27, { c: coat, e: coat });
    l.rect(ox + 25, 29, 2, 1, hoof); // closed eye
    l.line(ox + 15, 23, ox + 22, 27, mane);
    l.rect(ox + 6, 23, 6, 4, '#5a2a20');
  });
  c.layer(l => {
    l.line(ox + 12, 28, ox + 16, 30, coat, 2); l.rect(ox + 18, 30, 1, 2, hoof);
    l.line(ox + 3, 28, ox + 7, 30, coat, 2); l.rect(ox + 9, 30, 1, 2, hoof);
  });
  for (const [x, y] of [[13, 25], [14, 26], [12, 26], [15, 25], [13, 27], [14, 28]]) c.set(ox + x, y, BLOOD);
}

function drawMount(c: Canvas, build: Build, gait: number, gy: number) {
  const { pegasus, coat, mane, far } = mountColours(build);
  // foot offsets for hind / fore legs: standing, stretched, gathered
  const [hind, fore] = gait === 1 ? [-3, 3] : gait === 2 ? [2, -2] : [0, 0];
  const leg = (l: Canvas, hip: number, foot: number, col: string, lift: number) => {
    const end = 31 - lift;
    for (let r = 24 + gy; r < end; r++) l.rect(Math.round(hip + ((foot - hip) * (r - 24 - gy)) / (end - 24 - gy)), r, 2, 1, col);
    l.rect(foot, end, 2, 1, '#2a2420');
  };
  c.layer(l => { leg(l, 10, 10 + hind + 1, far, gait === 2 ? 1 : 0); leg(l, 17, 17 + fore + 1, far, gait === 1 ? 1 : 0); });
  c.layer(l => {
    l.line(5, 21 + gy, 3, 27 + gy, mane, 2);
    leg(l, 8, 8 + hind, coat, gait === 1 ? 1 : 0);
    leg(l, 19, 19 + fore, coat, gait === 2 ? 1 : 0);
    l.rect(7, 20 + gy, 14, 6, coat);
    l.rect(6, 21 + gy, 16, 4, coat);
    l.rect(8, 25 + gy, 12, 1, far);
    l.line(20, 21 + gy, 23, 16 + gy, coat, 3);
    l.stamp(HORSE_HEAD, 23, 11 + gy, { c: coat, e: '#1a1a1a' });
    l.line(19, 20 + gy, 23, 13 + gy, mane);
    l.line(20, 20 + gy, 23, 14 + gy, mane);
    l.rect(11, 19 + gy, 6, 3, '#5a2a20');
  });
  if (pegasus) c.layer(l => (gait === 2 ? l.stamp(WING_DOWN, 2, 18 + gy, WING_PAL) : l.stamp(WING_UP, 3, 10 + gy, WING_PAL)));
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
  fx?: 'swoosh' | 'glow' | 'nock' | 'draw';
  gait?: number;
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
  bow: { hand: [6, 1], dir: [0, -1], back: [7, 2] },
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
  const c = new Canvas();
  const { skin, hair, cloth, accent } = look;
  const armored = build.outfit === 'armor';
  const robe = build.outfit === 'robe';
  const mounted = !!build.mount;
  const flying = build.mount === 'pegasus';
  const bob = f.bob ?? 0;
  const gait = f.gait ?? (flying && bob ? 2 : 0);
  const sink = f.sink ?? 0;
  const gy = (flying ? -2 + bob : gait === 2 ? -1 : 0) + (mounted ? sink : 0);
  const ux = (mounted ? -1 : 0) + (f.lean ?? 0);
  const uy = mounted ? gy - 6 + (flying ? 0 : bob) : bob + sink;
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

  if (mounted) drawMount(c, build, gait, gy);
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

  if (weapon !== 'bow') c.layer(backArm);

  if (!mounted && !robe) {
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

  if (mounted) {
    c.layer(l => {
      l.line(14 + ux, 19 + uy, 16 + ux, 22 + uy, legs, 3);
      l.rect(16 + ux, 25 + uy, 4, 2, build.boots);
    });
  }

  const hx = 10 + ux, hy = 8 + uy;
  c.layer(l => {
    l.stamp(FACE, hx, hy, pal);
    if (look.stubble) l.stamp(STUBBLE, hx, hy, { b: mix(skin, hair, 0.35) });
    if (look.scar) { l.set(hx + 7, hy + 6, '#b56a5a'); l.set(hx + 7, hy + 7, '#b56a5a'); }
    if (f.hurt) {
      l.set(hx + 5, hy + 5, skin); l.set(hx + 8, hy + 5, skin);
      l.set(hx + 4, hy + 6, pal.e); l.set(hx + 7, hy + 6, pal.e);
    }
    const style = HAIR[look.style];
    l.stamp(style.rows, hx + (style.dx ?? 0), hy + (style.dy ?? 0), pal);
    if (look.crown) l.stamp(CROWN, hx, hy - 2, pal);
    if (f.mouth || f.hurt) l.rect(hx + 6, hy + 8, 2, 1, '#7a2c30');
  });

  if (weapon === 'bow') {
    c.layer(backArm);
    c.layer(l => {
      const [x, y] = hand;
      const string = '#efe6cc';
      if (f.fx === 'nock' || f.fx === 'draw') {
        l.line(x - 2, y - 5, backHand[0], backHand[1], string);
        l.line(x - 2, y + 5, backHand[0], backHand[1], string);
        l.rect(backHand[0], y, x + 3 - backHand[0], 1, '#d8c8a0');
        l.set(x + 3, y, BLADE);
      } else {
        l.rect(x - 2, y - 4, 1, 9, string);
      }
      for (const [dx, dy] of BOW_ARC) l.set(x + dx, y + dy, WOOD);
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
  if (f.blood) {
    for (const [x, y] of [[15, 21], [16, 22], [15, 23], [19, 20], [20, 20], [21, 19], [22, 21], [23, 21], [20, 23], [23, 18], [24, 17], [24, 22], [21, 24], [25, 20], [26, 23]]) c.set(x + ux, y + uy, BLOOD);
    c.set(16 + ux, 21 + uy, BLOOD_D);
  }
  return c;
}

/* ---------- poses ---------- */

function framesFor(pose: Pose, mounted: boolean, flying: boolean): { frames: Fr[]; loop?: number } {
  const lunge: Fr['feet'] = [-1, 0, 2, 0];
  let frames: Fr[];
  switch (pose) {
    case 'idle': return { frames: [{}, { bob: 1 }], loop: flying ? 0.6 : 1.2 };
    case 'talk': return { frames: [{}, { mouth: true }], loop: 0.38 };
    case 'walk':
      return mounted
        ? { frames: [{ gait: 1 }, { gait: 2 }], loop: 0.32 }
        : { frames: [
          { feet: [-2, 0, 2, 0], back: [1, 4] },
          { feet: [0, 1, 0, 0], back: [-1, 4], bob: -1 },
          { feet: [2, 0, -2, 0], back: [-3, 4] },
          { feet: [0, 0, 0, 1], back: [-1, 4], bob: -1 },
        ], loop: 0.56 };
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
      frames = [{ at: 0, fx: 'nock', back: [8, 1] }, { at: 0.12, fx: 'draw', back: [3, 1] }, { at: 0.39, back: [3, 1] }];
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
    default: return { frames: [{ lean: -1 }] };
  }
  // a mount keeps galloping through its rider's attack
  return { frames: mounted ? frames.map((f, i) => ({ ...f, feet: undefined, gait: (i % 2) + 1 })) : frames };
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
