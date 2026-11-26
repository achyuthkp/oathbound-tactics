import type { HairStyle, Look } from '../game/data/characters';
import type { WeaponType } from '../game/types';
import { Canvas, INK, Px, mix, shade, tint, type PxPath } from './pixel';

/* ---------- Weapon icons ---------- */

export const WEAPON_COLOR: Record<WeaponType, string> = {
  sword: '#7fb4ff', lance: '#ff8a7a', axe: '#8fdc7c', bow: '#e9c86a', staff: '#e7e2ff', breath: '#ff9a4a', tome: '#c79aff',
};

export function WeaponIcon({ type, size = 16 }: { type?: WeaponType | null; size?: number }) {
  if (!type) return null;
  const c = WEAPON_COLOR[type];
  const common = { stroke: c, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label={type} role="img">
      {type === 'sword' && (<g {...common}><line x1="5" y1="19" x2="19" y2="5" /><line x1="6.5" y1="12.5" x2="11.5" y2="17.5" /><line x1="3.5" y1="20.5" x2="5.5" y2="18.5" strokeWidth={3.2} /></g>)}
      {type === 'lance' && (<g {...common}><line x1="3" y1="21" x2="17" y2="7" /><polygon points="21,3 14.5,5.5 18.5,9.5" fill={c} stroke="none" /></g>)}
      {type === 'axe' && (<g {...common}><line x1="6" y1="21" x2="15" y2="5" /><path d="M12.5 4.5 Q21 3.5 21 12 Q17 9.5 12 10.5 Z" fill={c} stroke="none" /></g>)}
      {type === 'bow' && (<g {...common}><path d="M7 3 Q21 12 7 21" /><line x1="7" y1="3" x2="7" y2="21" strokeWidth={1.2} /><line x1="3" y1="12" x2="18" y2="12" strokeWidth={1.6} /></g>)}
      {type === 'breath' && (<g {...common}><path d="M12 3 Q19 10 16 17 Q14 21 12 21 Q7 20 7 15 Q7 11 10 9 Q10 13 12 13 Q14 9 12 3 Z" fill={c} stroke="none" /></g>)}
      {type === 'tome' && (<g {...common}><path d="M4 5 Q8 3 12 6 Q16 3 20 5 V19 Q16 17 12 20 Q8 17 4 19 Z" /><line x1="12" y1="6" x2="12" y2="20" strokeWidth={1.4} /></g>)}
      {type === 'staff' && (<g {...common}><line x1="6" y1="21" x2="15.5" y2="8" /><circle cx="17.5" cy="5.5" r="3" fill={c} stroke="none" /></g>)}
    </svg>
  );
}

/* ---------- Portraits: pixel busts on a 40×48 grid (5 artboard units per pixel) ---------- */

export type Mood = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';

const STEEL_P = '#a3acbb';
const STEEL_HI = '#c3cad6';
const STEEL_LO = '#6f7787';
const GOLD = '#d9b44a';
const hashOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Half-width of the head on rows 8..30 (the face is symmetric about the gap between columns 19 and 20). */
const HEAD = [5, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 7, 6, 5, 3];
/** Half-width of the shoulders on rows 36..47. */
const shoulder = (r: number) => (r === 36 ? 10 : r === 37 ? 14 : r === 38 ? 16 : 18);

/** Hairline: the last hair row over the forehead for columns 11..28, and how far the sides hang. */
const HAIRLINE: Record<HairStyle, { fringe: number[]; side: number; top?: number[] }> = {
  short: { fringe: [14, 13, 13, 12, 12, 13, 12, 12, 11, 11, 12, 12, 13, 12, 12, 13, 13, 14], side: 19 },
  spiky: { fringe: [14, 12, 14, 12, 13, 11, 13, 12, 10, 12, 11, 13, 12, 14, 12, 13, 12, 14], side: 18, top: [0, 2, 1, 3, 1, 0, 2, 4, 2, 0, 1, 3, 5, 2, 0, 2, 3, 1, 2, 0] },
  long: { fringe: [14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 10, 11, 11, 12, 12, 13, 13, 14], side: 19 },
  tied: { fringe: [13, 13, 12, 12, 11, 11, 11, 10, 10, 10, 10, 10, 11, 11, 12, 12, 13, 13], side: 17 },
  bun: { fringe: [13, 13, 12, 12, 11, 11, 11, 10, 10, 10, 10, 10, 11, 11, 12, 12, 13, 13], side: 24 },
  slick: { fringe: [11, 10, 10, 9, 9, 9, 9, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 11], side: 18 },
  rugged: { fringe: [14, 12, 13, 12, 11, 13, 12, 11, 12, 11, 12, 13, 11, 12, 13, 12, 13, 14], side: 23, top: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0] },
  hood: { fringe: [12, 12, 11, 11, 11, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 12, 12], side: 16 },
  helm: { fringe: new Array(18).fill(13), side: 13 },
  bandana: { fringe: [15, 13, 14, 13, 12, 14, 13, 12, 13, 12, 13, 14, 12, 13, 14, 13, 14, 15], side: 21 },
};

const BROWS: Record<Mood, { row: number; dy: number[] }> = {
  neutral: { row: 15, dy: [1, 0, 0, 0, 0] },
  happy: { row: 14, dy: [1, 0, 0, 0, 1] },
  angry: { row: 15, dy: [-1, -1, 0, 1, 2] },
  sad: { row: 15, dy: [2, 1, 0, -1, -1] },
  surprised: { row: 13, dy: [1, 0, 0, 0, 1] },
};

/** `v`: 0 = resting face, 1 = eyes shut, 2 = mouth half open, 3 = mouth open. */
function drawBust(look: Look, mood: Mood, v: number): Canvas {
  const { skin, hair, style, cloth, accent } = look;
  const outfit = look.outfit ?? 'light';
  const skinD = shade(skin, 0.18), hairD = shade(hair, 0.3), hairL = tint(hair, 0.28);
  const c = new Canvas();
  /** Draw a rect and its mirror image. */
  const sym = (l: Canvas, x: number, y: number, w: number, h: number, col: string) => { l.rect(x, y, w, h, col); l.rect(40 - x - w, y, w, h, col); };

  // behind the body: long hair, ponytail, bun, hood, quiver
  c.layer(l => {
    if (style === 'long') l.rect(8, 10, 24, 33, hairD);
    if (style === 'tied') { l.rect(28, 7, 4, 6, hair); l.rect(31, 12, 4, 15, hair); l.rect(32, 27, 3, 4, hair); l.rect(34, 12, 1, 17, hairD); }
    if (style === 'bun') { l.rect(16, 0, 8, 7, hair); l.rect(15, 1, 10, 5, hair); l.rect(17, 1, 3, 1, hairL); }
    if (style === 'hood') {
      l.rect(14, 3, 12, 1, cloth); l.rect(11, 4, 18, 1, cloth); l.rect(9, 5, 22, 1, cloth);
      l.rect(7, 6, 26, 31, cloth); l.rect(5, 37, 30, 8, cloth);
      l.rect(11, 10, 18, 28, shade(cloth, 0.45));
    }
    if (outfit === 'hunter') for (const x of [30, 32, 34]) { l.line(x, 29, x + 1, 38, '#e6e0d0'); l.rect(x, 27, 1, 3, accent); }
  });

  // shoulders, neck and costume
  const torso = outfit === 'armor' ? STEEL_P : outfit === 'leather' ? skin : cloth;
  c.layer(l => {
    for (let r = 36; r < 48; r++) l.rect(20 - shoulder(r), r, 2 * shoulder(r), 1, torso);
    l.rect(16, 29, 8, 8, skin);
    l.rect(16, 31, 8, 2, skinD);
    const gorget = () => { l.rect(13, 35, 14, 3, STEEL_P); for (let x = 14; x < 26; x += 2) l.set(x, 37, STEEL_LO); l.rect(14, 35, 12, 1, STEEL_HI); };
    if (outfit === 'cape') {
      const cape = look.cape ?? accent;
      for (let r = 38; r < 48; r++) sym(l, 20 - shoulder(r), r, 9, 1, cape);
      l.line(15, 36, 19, 41, accent, 2); l.line(23, 36, 19, 41, accent, 2);
      for (let x = 13; x < 27; x += 2) l.set(x, 39, accent);
      sym(l, 10, 38, 3, 3, accent);
    } else if (outfit === 'armor') {
      l.rect(15, 38, 10, 10, cloth);
      l.rect(19, 39, 2, 9, accent);
      for (let r = 37; r < 48; r++) sym(l, 20 - shoulder(r), r, 10, 1, STEEL_HI);
      sym(l, 5, 39, 7, 1, '#f1f4f8');
      sym(l, 3, 44, 9, 1, STEEL_LO);
      sym(l, 12, 41, 1, 1, STEEL_LO);
      gorget();
    } else if (outfit === 'light') {
      l.line(6, 40, 14, 37, accent, 2); l.line(32, 40, 24, 37, accent, 2);
      l.rect(19, 40, 2, 8, accent);
      gorget();
    } else if (outfit === 'gi') {
      l.line(25, 36, 19, 43, shade(accent, 0.2), 3);
      l.line(12, 36, 23, 47, accent, 3);
    } else if (outfit === 'hunter') {
      for (let r = 36; r < 41; r++) l.rect(20 - shoulder(r), r, 2 * shoulder(r), 1, shade(cloth, 0.22));
      l.line(8, 38, 29, 47, '#5a3a20', 3);
      l.rect(19, 40, 2, 2, accent);
    } else if (outfit === 'robe') {
      l.line(15, 36, 19, 42, accent, 2); l.line(23, 36, 19, 42, accent, 2);
      sym(l, 11, 40, 1, 8, accent);
      l.rect(19, 43, 2, 5, GOLD); l.rect(18, 44, 4, 1, GOLD);
    } else if (outfit === 'cloak') {
      // a hooded travelling cloak fastened at the throat
      for (let r = 37; r < 48; r++) l.rect(20 - shoulder(r), r, 2 * shoulder(r), 1, shade(cloth, 0.2));
      l.line(15, 36, 19, 42, shade(cloth, 0.45), 2); l.line(23, 36, 19, 42, shade(cloth, 0.45), 2);
      l.rect(18, 37, 4, 3, accent);
      l.line(8, 40, 14, 47, '#2a2018', 2);
    } else if (outfit === 'raider') {
      // bare shoulders under a rough fur mantle, a strap across the chest
      const fur = '#8a7a66', furD = '#5f5244';
      for (let r = 37; r < 48; r++) l.rect(20 - shoulder(r), r, 2 * shoulder(r), 1, r < 42 ? fur : cloth);
      for (let x = 3; x < 37; x += 2) { l.set(x, 42, fur); l.set(x + 1, 38 + (x % 3), furD); }
      l.line(9, 42, 28, 47, '#3a2416', 2);
      l.rect(21, 44, 3, 3, '#7a5a34');
    } else if (outfit === 'leather') {
      for (let r = 37; r < 48; r++) sym(l, 23 - shoulder(r), r, shoulder(r) - 7, 1, cloth);
      for (const y of [40, 43, 46]) for (let x = 17; x < 23; x += 2) l.set(x, y, '#d8c8a8');
    }
  });

  // head
  c.layer(l => {
    sym(l, 9, 18, 2, 4, skin);
    sym(l, 10, 19, 1, 2, skinD);
    HEAD.forEach((hw, i) => {
      l.rect(20 - hw, 8 + i, 2 * hw, 1, skin);
      if (i > 3) l.rect(18 + hw, 8 + i, 2, 1, skinD);
    });
  });
  const blush = mix(skin, '#e66e64', 0.28);
  c.rect(12, 23, 3, 1, blush); c.rect(25, 23, 3, 1, blush);
  c.rect(20, 22, 1, 3, skinD); c.rect(19, 25, 2, 1, shade(skin, 0.3));
  if (look.freckles) for (const [x, y] of [[13, 24], [15, 23], [16, 25], [24, 23], [26, 24], [23, 25]]) c.set(x, y, mix(skin, '#96462a', 0.5));
  if (look.stubble) {
    const st = mix(skin, hair, 0.4);
    for (let r = 22; r <= 30; r++) {
      for (let x = 20 - HEAD[r - 8]; x < 20 + HEAD[r - 8]; x++) {
        if ((x + r) % 2 === 0 && (r >= 27 || x <= 13 || x >= 26)) c.set(x, r, st);
      }
    }
  }
  if (look.scar) { c.line(26, 13, 27, 17, '#b0605a'); c.line(27, 22, 27, 24, '#b0605a'); }

  // eyes: `x0` is the left column of the 4 px eye, `out` the column just outside it
  const iris = look.eyes ?? '#4a3a2a';
  const eye = (x0: number, out: number) => {
    const inner = out < x0 ? x0 + 3 : x0, outer = out < x0 ? x0 : x0 + 3;
    if (mood === 'happy') { c.rect(x0 + 1, 19, 2, 1, INK); c.set(x0, 20, INK); c.set(x0 + 3, 20, INK); return; }
    if (v === 1) { c.rect(x0, 20, 4, 1, INK); return; }
    const top = mood === 'surprised' ? 18 : 19;
    c.rect(x0, top - 1, 4, 1, INK);
    c.set(out, top, INK);
    c.rect(x0, top, 4, 21 - top, '#fbf7f0');
    c.rect(x0 + 1, top, 2, 1, iris);
    c.rect(x0 + 1, top + 1, 2, 1, shade(iris, 0.5));
    c.set(x0 + 1, top, tint(iris, 0.6));
    if (mood === 'angry') c.set(inner, top, INK);
    if (mood === 'sad') c.set(outer, top, INK);
    if (look.lashes) { c.set(out, top - 1, INK); c.set(out + (out < x0 ? -1 : 1), top - 2, INK); }
  };
  eye(13, 12);
  eye(23, 27);

  // hair, helmets, hoods (drawn over the face so the hairline gets its own outline)
  c.layer(l => {
    const { fringe, side, top } = HAIRLINE[style];
    const fill = style === 'helm' ? STEEL_P : hair;
    for (let x = 10; x < 30; x++) {
      const y0 = (x < 12 || x > 27 ? 9 : x < 14 || x > 25 ? 7 : 6) - (top?.[x - 10] ?? 0);
      const y1 = x === 10 || x === 29 ? side : fringe[x - 11];
      l.rect(x, y0, 1, y1 - y0 + 1, x === 10 || x > 27 ? (style === 'helm' ? STEEL_LO : hairD) : fill);
    }
    if (style === 'helm') {
      l.rect(9, 14, 22, 2, STEEL_LO);
      l.rect(19, 16, 2, 6, STEEL_P);
      sym(l, 10, 16, 2, 9, STEEL_P);
      l.line(13, 9, 17, 7, '#e6ebf2');
      for (const x of [12, 17, 22, 27]) l.set(x, 14, STEEL_HI);
      l.rect(18, 2, 4, 4, accent); l.rect(20, 1, 6, 3, accent); l.rect(24, 2, 5, 2, accent); l.set(29, 4, accent);
    } else {
      l.rect(14, 8, 5, 1, hairL); l.rect(21, 8, 2, 1, hairL);
    }
    if (style === 'bandana') {
      // the wrap covers the crown; ragged hair shows below it and the knot hangs to one side
      const band = accent, bandD = shade(accent, 0.3);
      for (let x = 10; x < 30; x++) { const y0 = x < 12 || x > 27 ? 9 : x < 14 || x > 25 ? 7 : 6; l.rect(x, y0, 1, 12 - y0, band); }
      l.rect(10, 11, 20, 1, bandD);
      l.rect(13, 8, 4, 1, tint(accent, 0.3));
      l.rect(29, 9, 3, 3, band); l.rect(30, 12, 1, 5, band); l.rect(32, 11, 1, 4, bandD);
    }
    if (style === 'spiky') { sym(l, 9, 10, 1, 3, hair); sym(l, 8, 10, 1, 1, hair); sym(l, 9, 14, 1, 2, hair); }
    if (style === 'long') { sym(l, 9, 12, 3, 30, hair); sym(l, 9, 30, 1, 12, hairD); }
    if (style === 'tied') l.rect(10, 17, 1, 6, hair);
    if (style === 'bun') { l.rect(15, 6, 10, 1, accent); sym(l, 10, 20, 2, 5, hair); }
    if (style === 'slick') { l.line(13, 7, 12, 10, hairL); l.line(18, 6, 17, 8, hairL); l.line(24, 6, 25, 9, hairL); }
    if (style === 'rugged') {
      for (let r = 22; r <= 31; r++) {
        const hw = HEAD[r - 8] ?? 3;
        if (r < 25) sym(l, 20 - hw, r, 2, 1, hair);
        else if (r < 28) sym(l, 20 - hw, r, hw - 4, 1, hair);
        else l.rect(20 - hw, r, 2 * hw, 1, r > 29 ? hairD : hair);
      }
      l.rect(15, 25, 10, 1, hair);
    }
    if (style === 'hood') {
      l.rect(14, 3, 12, 1, cloth); l.rect(11, 4, 18, 1, cloth); l.rect(9, 5, 22, 4, cloth);
      sym(l, 7, 9, 4, 28, cloth);
      l.rect(11, 8, 18, 1, accent);
      sym(l, 10, 9, 1, 26, accent);
    }
    if (look.horns) { l.line(12, 7, 9, 2, '#e9e2d0', 2); l.line(26, 7, 29, 2, '#e9e2d0', 2); l.set(9, 2, '#cfc4a8'); l.set(30, 2, '#cfc4a8'); }
    if (look.crown) {
      l.rect(13, 5, 14, 2, GOLD);
      for (const x of [13, 19, 25]) l.rect(x, 2, 2, 3, GOLD);
      l.rect(16, 4, 2, 1, GOLD); l.rect(22, 4, 2, 1, GOLD);
      l.rect(19, 5, 2, 1, '#b8373f'); l.set(14, 6, '#3d6fd1'); l.set(25, 6, '#3d6fd1');
    }
  });

  // brows sit on top of the fringe so expressions always read
  const brow = style === 'helm' ? '#3a2a20' : shade(hair, 0.45);
  BROWS[mood].dy.forEach((dy, i) => {
    const y = style === 'helm' ? Math.min(17, Math.max(16, BROWS[mood].row + dy + 1)) : BROWS[mood].row + dy;
    c.set(12 + i, y, brow);
    c.set(27 - i, y, brow);
  });

  const lip = '#8a3a36', dark = '#5a2028';
  if (v === 2) { c.rect(17, 27, 6, 2, dark); c.rect(17, 26, 6, 1, lip); }
  else if (v === 3) { c.rect(17, 26, 6, 4, dark); c.rect(18, 26, 4, 1, '#f4eee4'); c.rect(18, 29, 4, 1, lip); }
  else if (mood === 'neutral') c.rect(17, 27, 6, 1, lip);
  else if (mood === 'happy') { c.rect(17, 27, 6, 1, lip); c.set(16, 26, lip); c.set(23, 26, lip); c.rect(18, 28, 4, 1, dark); }
  else if (mood === 'angry') { c.rect(17, 27, 6, 1, lip); c.set(16, 28, lip); c.set(23, 28, lip); }
  else if (mood === 'sad') { c.rect(18, 27, 4, 1, lip); c.set(17, 28, lip); c.set(22, 28, lip); }
  else { c.rect(18, 26, 4, 3, dark); c.rect(18, 26, 4, 1, lip); }
  if (look.mask) {
    // a cloth pulled up over the nose; the mouth moves behind it, so talking only ripples the cloth
    const m = shade(cloth, 0.35), fold = shade(cloth, 0.55);
    for (let r = 24; r <= 30; r++) c.rect(20 - HEAD[r - 8], r, 2 * HEAD[r - 8], 1, m);
    c.rect(12, 24, 16, 1, fold);
    c.rect(v === 3 ? 16 : 17, v >= 2 ? 28 : 27, v === 3 ? 8 : 6, 1, fold);
  }
  return c;
}

const bustCache = new Map<string, PxPath[][]>();
function bustFor(look: Look, mood: Mood): PxPath[][] {
  const key = JSON.stringify([look, mood]);
  let b = bustCache.get(key);
  if (!b) {
    const base = drawBust(look, mood, 0);
    b = [base.paths(5), ...[1, 2, 3].map(v => drawBust(look, mood, v).paths(5, base))];
    bustCache.set(key, b);
  }
  return b;
}

export function Portrait({ look, size = 120, className, mood = 'neutral', talking = false, still = false }: {
  look: Look; size?: number; className?: string; mood?: Mood; talking?: boolean; still?: boolean;
}) {
  const [base, shut, half, open] = bustFor(look, mood);
  const delay = -((hashOf(look.skin + look.hair + look.cloth) % 5000) / 1000);
  return (
    <svg
      className={`bust ${talking ? 'talking' : ''} ${still ? 'still' : ''} ${className ?? ''}`}
      viewBox="0 0 200 240" width={size} height={size * 1.2} shapeRendering="crispEdges" aria-hidden="true"
      style={{ ['--blink-delay' as string]: `${delay}s` }}
    >
      <Px paths={base} />
      <g className="ov blinkf"><Px paths={shut} /></g>
      <g className="ov m1"><Px paths={half} /></g>
      <g className="ov m2"><Px paths={open} /></g>
    </svg>
  );
}

/* ---------- Terrain art ---------- */

export { TileArt } from './tiles';
