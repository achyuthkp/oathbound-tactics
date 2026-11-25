/**
 * Tiny pixel-art rasterizer. Sprites are drawn onto a grid of colour cells, outlined per
 * layer, then emitted as one SVG <path> per colour (so the game stays a single file with
 * no image assets and sprites recolour from each character's `Look`).
 */
export const INK = '#1b1424';

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
type P = [number, number];

export class Canvas {
  px: (string | undefined)[];

  /**
   * W×H cells with the artboard's origin at (OX, OY): the slack around it is for weapons and plumes.
   * The defaults fit a one-tile unit; a multi-tile sprite passes its own size.
   */
  constructor(readonly W = 72, readonly H = 66, readonly OX = 16, readonly OY = 14) {
    this.px = new Array(W * H);
  }
  /** An empty canvas of the same size. */
  fresh(): Canvas { return new Canvas(this.W, this.H, this.OX, this.OY); }

  get(x: number, y: number): string | undefined {
    x = Math.round(x) + this.OX; y = Math.round(y) + this.OY;
    return x >= 0 && x < this.W && y >= 0 && y < this.H ? this.px[y * this.W + x] : undefined;
  }
  set(x: number, y: number, c: string) {
    x = Math.round(x) + this.OX; y = Math.round(y) + this.OY;
    if (x >= 0 && x < this.W && y >= 0 && y < this.H) this.px[y * this.W + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** Line drawn with a t×t brush anchored at its top-left. */
  line(x0: number, y0: number, x1: number, y1: number, c: string, t = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) this.rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), t, t, c);
  }
  /** Filled ellipse. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const k = 1 - (y * y) / (ry * ry || 1);
      if (k < 0) continue;
      const w = Math.round(rx * Math.sqrt(k));
      this.rect(Math.round(cx) - w, Math.round(cy) + y, w * 2 + 1, 1, c);
    }
  }
  /** Filled polygon, one pixel row at a time. */
  poly(pts: P[], c: string) {
    const ys = pts.map(q => q[1]);
    for (let y = Math.round(Math.min(...ys)); y <= Math.round(Math.max(...ys)); y++) {
      const xs: number[] = [];
      pts.forEach(([x1, y1], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      });
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) this.rect(Math.round(xs[i]), y, Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i]) + 1), 1, c);
    }
  }
  /** A tapering tube along a quadratic curve: a neck, a tail. */
  tube(p0: P, p1: P, p2: P, r0: number, r1: number, c: string) {
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, u = 1 - t, r = r0 + (r1 - r0) * t;
      this.ellipse(u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1], r, r, c);
    }
  }
  /** Stamp ASCII art; each character looks up a colour in `pal`, unknown characters are clear. */
  stamp(rows: string[], x: number, y: number, pal: Record<string, string>) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) this.set(x + i, y + j, pal[ch]); }));
  }
  outline(c = INK) {
    const W = this.W, src = this.px.slice();
    for (let i = 0; i < src.length; i++) {
      if (src[i]) continue;
      const x = i % W;
      if ((x > 0 && src[i - 1]) || (x < W - 1 && src[i + 1]) || src[i - W] || src[i + W]) this.px[i] = c;
    }
  }
  /** Draw a part on its own layer, outline it, and composite it over what is already here. */
  layer(fn: (l: Canvas) => void, ink: string | false = INK) {
    const l = this.fresh();
    fn(l);
    if (ink) l.outline(ink);
    this.over(l);
  }
  over(o: Canvas) { o.px.forEach((c, i) => { if (c) this.px[i] = c; }); }
  /** A copy turned `deg` counter-clockwise about (cx, cy), then shifted by (dx, dy). Nearest-pixel, so 90° is lossless. */
  rotated(deg: number, cx: number, cy: number, dx = 0, dy = 0): Canvas {
    const { W, H, OX, OY } = this, o = this.fresh();
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
    const { W, H, OX, OY } = this, out = new Map<string, string>();
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
