/**
 * Tiny pixel-art rasterizer. Sprites are drawn onto a grid of colour cells, outlined per
 * layer, then emitted as one SVG <path> per colour (so the game stays a single file with
 * no image assets and sprites recolour from each character's `Look`).
 */
export const INK = '#1b1424';

const OX = 16, OY = 14, W = 72, H = 66; // slack around the artboard for weapons and plumes

const rgb = (hex: string) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mix colour `a` toward `b` by `t` (0..1). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export const shade = (c: string, t = 0.3) => mix(c, '#140a1e', t);
export const tint = (c: string, t = 0.3) => mix(c, '#ffffff', t);

export interface PxPath { fill: string; d: string; }

export class Canvas {
  px: (string | undefined)[] = new Array(W * H);

  set(x: number, y: number, c: string) {
    x = Math.round(x) + OX; y = Math.round(y) + OY;
    if (x >= 0 && x < W && y >= 0 && y < H) this.px[y * W + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** Line drawn with a t×t brush anchored at its top-left. */
  line(x0: number, y0: number, x1: number, y1: number, c: string, t = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) this.rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), t, t, c);
  }
  /** Stamp ASCII art; each character looks up a colour in `pal`, unknown characters are clear. */
  stamp(rows: string[], x: number, y: number, pal: Record<string, string>) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) this.set(x + i, y + j, pal[ch]); }));
  }
  outline(c = INK) {
    const src = this.px.slice();
    for (let i = 0; i < src.length; i++) {
      if (src[i]) continue;
      const x = i % W;
      if ((x > 0 && src[i - 1]) || (x < W - 1 && src[i + 1]) || src[i - W] || src[i + W]) this.px[i] = c;
    }
  }
  /** Draw a part on its own layer, outline it, and composite it over what is already here. */
  layer(fn: (l: Canvas) => void, ink: string | false = INK) {
    const l = new Canvas();
    fn(l);
    if (ink) l.outline(ink);
    this.over(l);
  }
  over(o: Canvas) { o.px.forEach((c, i) => { if (c) this.px[i] = c; }); }
  /** A copy turned `deg` counter-clockwise about (cx, cy), then shifted by (dx, dy). Nearest-pixel, so 90° is lossless. */
  rotated(deg: number, cx: number, cy: number, dx = 0, dy = 0): Canvas {
    const o = new Canvas();
    const cos = Math.cos((deg * Math.PI) / 180), sin = Math.sin((deg * Math.PI) / 180);
    for (let y = -OY; y < H - OY; y++) {
      for (let x = -OX; x < W - OX; x++) {
        const rx = x - dx - cx, ry = y - dy - cy;
        const sx = Math.round(cx + rx * cos - ry * sin) + OX, sy = Math.round(cy + rx * sin + ry * cos) + OY;
        const c = sx >= 0 && sx < W && sy >= 0 && sy < H ? this.px[sy * W + sx] : undefined;
        if (c) o.set(x, y, c);
      }
    }
    return o;
  }
  /** One path per colour, `s` artboard units per pixel. With `base`, only the pixels that differ. */
  paths(s: number, base?: Canvas): PxPath[] {
    const out = new Map<string, string>();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W;) {
        const c = this.px[y * W + x];
        if (!c || (base && base.px[y * W + x] === c)) { x++; continue; }
        let n = 1;
        while (x + n < W && this.px[y * W + x + n] === c && !(base && base.px[y * W + x + n] === c)) n++;
        out.set(c, `${out.get(c) ?? ''}M${(x - OX) * s} ${(y - OY) * s}h${n * s}v${s}h${-n * s}z`);
        x += n;
      }
    }
    return [...out].map(([fill, d]) => ({ fill, d }));
  }
}

export function Px({ paths }: { paths: PxPath[] }) {
  return <>{paths.map(p => <path key={p.fill} fill={p.fill} d={p.d} />)}</>;
}
