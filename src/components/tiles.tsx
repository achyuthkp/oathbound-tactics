import { memo } from 'react';
import type { TerrainId } from '../game/types';
import { Canvas, Px, type PxPath } from './pixel';

/**
 * Pixel-art terrain tiles: 16×16 pixels on the 48-unit tile (3 units per pixel). Each terrain has
 * four variants picked from the tile's position so a field never repeats in a visible grid.
 * Water also takes a `mask` of which sides touch land (1 north, 2 east, 4 south, 8 west) and
 * draws a sandy bank with foam there, and it animates between two wave frames.
 */

/** Small deterministic generator so a variant always draws the same tile. */
function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return (n: number) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
}

const TREE = ['...d...', '..dmd..', '..mmld.', '.dmmmd.', '.mmlmmd', 'dmmmmmd', '.ddddd.', '...t...', '...t...'];
const TREE_PAL = { d: '#1f4a26', m: '#2f6b34', l: '#57a04c', t: '#5a3a20' };

/* Hills: dry, earthy slopes lit from the left. h ridge light, l lit face, m mid, e erosion gully, d shaded face, k foot, s stone. */
const HILL_BIG = [
  '.....hl......',
  '....hllm.....',
  '...hlelmd....',
  '..hllmlmdd...',
  '.hllemmmddd..',
  '.llmlmemdddd.',
  'hllmmmsmddedd',
  'lmmemmmmmdddd',
  'kkkkkkkkkkkkk',
];
const HILL_SMALL = [
  '...hl....',
  '..hlmd...',
  '.hlemdd..',
  '.llmmddd.',
  'hlmmeddkd',
  'kkkkkkkkk',
];
const HILL_PAL = { h: '#ecd9a0', l: '#d0b36c', m: '#b3904c', e: '#96753a', d: '#806030', k: '#4d3a1c', s: '#9a958a' };

const PEAK = [
  '.......ww.......',
  '......wwsw......',
  '.....wwwssd.....',
  '....rwwrssdd....',
  '....rrwrrsddd...',
  '...rrrrrrsdddd..',
  '..rrrlrrrrsdddd.',
  '..rrllrrrrrsddd.',
  '.rrrlrrrrrrsdddd',
  '.rrrrrrrrrrrdddd',
  'rrrrlrrrrrrrrddd',
  'rrrllrrrrrrrrrdd',
  'rrrrrrrrrrrrrrrd',
  'kkkkkkkkkkkkkkkk',
];
const CRAG = ['...ww...', '..rwsd..', '.rrrsdd.', 'rrlrrddd', 'rrrrrrdd', 'kkkkkkkk'];
const PEAK_PAL = { w: '#f4f2ec', s: '#c5cfdc', r: '#9c8c74', l: '#b9a98c', d: '#5f5345', k: '#3c342d' };

const KEEP = [
  '.....p......',
  '.....pbb....',
  '.....pbb....',
  's.ss.p.ss.s.',
  'ssssssssssd.',
  'shsssssssdd.',
  'ssswsswssdd.',
  'shswsswssdd.',
  'ssssssssddd.',
  'ssssoossddd.',
  'sssoooosddd.',
  'sssoooosddd.',
  'kkkkkkkkkkk.',
];
const KEEP_PAL = { s: '#b3a388', h: '#cfc2a8', d: '#7d6e58', k: '#4a3f33', o: '#33281f', w: '#2b2420', p: '#5a4630', b: '#3463c4' };

const SEAT = [
  '..gggggg..',
  '.gyrrrryg.',
  '.grrrrrrg.',
  '.grrrrrrg.',
  '.grrrrrrg.',
  'ggyyyyyygg',
  'gyyyyyyyyg',
  'gddddddddg',
  '.g......g.',
  '.g......g.',
];
const SEAT_PAL = { g: '#b58a24', y: '#e2be55', r: '#9a2c40', d: '#7a5a14' };

/* A cottage with an open, lit doorway; once visited (mask 1) the door is shut and the windows dark. */
const COTTAGE = [
  '....rrrrrr....',
  '...rRrrrrrr...',
  '..rrrrRrrrrr..',
  '.rrrrrrrrrrrr.',
  'rrrrRrrrrrrrrd',
  '.wwwwwwwwwwww.',
  '.wwyywwwwyyww.',
  '.wwyywoooyyww.',
  '.wwwwwogowwww.',
  '.wwwwwogowwww.',
  '.kkkkkkkkkkkk.',
];
/* A town house: slate roof, timber frame. Scenery; nobody can enter it. */
const TOWNHOUSE = [
  '...ssssssssss...',
  '..sSsssssSssss..',
  '.sssssssssssssd.',
  'ssssSssssssSsssd',
  'sssssssssssssssd',
  'tttttttttttttttt',
  'twwtwwwwwwtwwwwt',
  'twwtwbbwwwtwbbwt',
  'twwtwbbwwwtwbbwt',
  'tttttttttttttttt',
  'twwtwwwwwwtwwwwt',
  'twwtwbbwwwtwwwwt',
  'twwtwbbwwwtwwwwt',
  'kkkkkkkkkkkkkkkk',
];

/* What is left of a burned house: charred wall stubs (k) around scorched plaster (w). */
const RUIN = [
  '..k.......k...',
  '.kk..k...kkk..',
  '.kwk.kk..kwk..',
  '.kwkkwk.kkwkk.',
  '.kwwwwkkkwwwk.',
  '.kwwkwwwwwkwk.',
  '.kkkkkkkkkkkk.',
];
const RUIN_PAL = { k: '#2e2622', w: '#6b5c50' };

/* A banded treasure chest (mask 0) and the same chest thrown open and empty (mask 1). */
const CHEST = [
  '.gggggggggg.',
  'gwwwwggwwwwg',
  'gwwwwggwwwwg',
  'gggggyyggggg',
  'gwwwwyywwwwg',
  'gwwwwggwwwwg',
  'gwwwwggwwwwg',
  'kkkkkkkkkkkk',
];
const CHEST_OPEN = [
  '.gggggggggg.',
  'gWWWWWWWWWWg',
  'gWWWWWWWWWWg',
  '.gggggggggg.',
  'gddddddddddg',
  'gwwwwggwwwwg',
  'gwwwwggwwwwg',
  'kkkkkkkkkkkk',
];
const CHEST_PAL = { g: '#c9a23c', y: '#fff3b0', w: '#8a5a2a', W: '#6b4420', d: '#1e1410', k: '#3a2416' };

const CACTUS = ['..g..', 'g.g..', 'g.g.g', 'gggdg', '..gd.', '..gd.', '..gd.'];
const CACTUS_PAL = { g: '#4f9a4a', d: '#2f6b34' };

function grass(c: Canvas, r: (n: number) => number, base: string, dark: string, light: string, flowers: boolean) {
  c.rect(0, 0, 16, 16, base);
  for (let i = 0; i < 5; i++) { const x = r(14), y = 1 + r(14); c.set(x, y, dark); c.set(x + 1, y - 1, dark); }
  for (let i = 0; i < 4; i++) c.set(r(16), r(16), light);
  if (flowers && r(3) === 0) { const x = 2 + r(12), y = 2 + r(12); c.set(x, y, r(2) ? '#fff6c8' : '#f4d0e0'); c.set(x, y + 1, dark); }
}

function drawTile(t: TerrainId, v: number, mask: number, odd: boolean): Canvas[] {
  const c = new Canvas();
  const r = rng(v * 31 + t.length * 7 + t.charCodeAt(0));
  switch (t) {
    case 'forest': {
      grass(c, r, '#5f8e43', '#467535', '#74a652', false);
      const spots = [[[1, 0], [8, 6]], [[8, 0], [1, 6]], [[0, 0], [9, 1], [4, 7]], [[8, 0], [0, 2], [5, 7]]][v];
      for (const [x, y] of spots) { c.rect(x + 1, y + 8, 5, 1, '#3f6a2c'); c.stamp(TREE, x, y, TREE_PAL); }
      break;
    }
    case 'hills': {
      grass(c, r, '#79a352', '#5a8a3e', '#93bf62', false);
      // a far ridge behind a larger near slope, with scrub and loose stones at the foot
      const [[sx, sy], [bx, by]] = [[[7, 1], [0, 6]], [[0, 1], [3, 6]], [[6, 0], [1, 6]], [[1, 2], [3, 7]]][v];
      c.stamp(HILL_SMALL, sx, sy, HILL_PAL);
      c.stamp(HILL_BIG, bx, by, HILL_PAL);
      c.rect(bx + 1, by + 9, 11, 1, '#5a8a3e');
      for (const dx of [1, 5, 10]) { c.set(bx + dx, by + 8, '#3f6a2c'); c.set(bx + dx, by + 7, '#55863c'); }
      c.set(bx + 7, by + 6, '#c4c0b4');
      c.set(sx + 8, sy + 5, '#9a958a');
      break;
    }
    case 'mountain': {
      c.rect(0, 0, 16, 16, '#5d6e45');
      for (let i = 0; i < 6; i++) c.set(r(16), r(16), '#4b5a38');
      c.stamp(v % 2 ? PEAK.map(row => [...row].reverse().join('')) : PEAK, 0, 0, PEAK_PAL);
      c.stamp(CRAG, v % 2 ? 0 : 8, 10, PEAK_PAL);
      break;
    }
    case 'water': {
      c.rect(0, 0, 16, 16, '#2f78b0');
      for (let i = 0; i < 5; i++) c.rect(r(12), r(16), 3 + r(3), 1, '#2a6aa0');
      // banks where the water meets land
      const sand = '#c9b074', wet = '#a8905c', foam = '#e4f3ff';
      if (mask & 1) { c.rect(0, 0, 16, 1, sand); c.rect(0, 1, 16, 1, wet); for (let x = r(2); x < 16; x += 3) c.rect(x, 2, 2, 1, foam); }
      if (mask & 4) { c.rect(0, 15, 16, 1, sand); c.rect(0, 14, 16, 1, wet); for (let x = r(2); x < 16; x += 3) c.rect(x, 13, 2, 1, foam); }
      if (mask & 8) { c.rect(0, 0, 1, 16, sand); c.rect(1, 0, 1, 16, wet); for (let y = r(2); y < 16; y += 3) c.rect(2, y, 1, 2, foam); }
      if (mask & 2) { c.rect(15, 0, 1, 16, sand); c.rect(14, 0, 1, 16, wet); for (let y = r(2); y < 16; y += 3) c.rect(13, y, 1, 2, foam); }
      // two wave frames, drawn only where there is open water
      const waves = [0, 2].map(shift => {
        const w = new Canvas();
        for (const [x, y] of [[3, 4], [10, 6], [5, 10], [11, 12], [7, 7]]) {
          const wx = (x + shift) % 13, wy = y;
          if (c.px.length && wy > 2 && wy < 13 && wx > 2) { w.rect(wx, wy, 3, 1, '#8fc4e8'); w.set(wx + 1, wy - 1, '#c8e6f8'); }
        }
        return w;
      });
      return [c, ...waves];
    }
    case 'desert': {
      c.rect(0, 0, 16, 16, odd ? '#e0c682' : '#e4cb8a');
      // wind ripples: a pale crest with its shadow underneath
      for (const y0 of [3 + r(2), 8 + r(2), 13]) {
        const x0 = r(5);
        for (let i = 0; i < 9; i++) { const y = y0 + (i > 2 && i < 7 ? -1 : 0); c.set(x0 + i, y, '#f3e2ae'); c.set(x0 + i, y + 1, '#cdb16e'); }
      }
      for (let i = 0; i < 4; i++) c.set(r(16), r(16), '#c4a660');
      if (v === 1) c.stamp(CACTUS, 9, 3, CACTUS_PAL);
      if (v === 3) { c.rect(3, 9, 3, 2, '#a89674'); c.rect(4, 8, 2, 1, '#c2b08c'); c.set(10, 5, '#a89674'); }
      break;
    }
    case 'road': {
      c.rect(0, 0, 16, 16, odd ? '#b99c6b' : '#bfa271');
      for (let i = 0; i < 6; i++) c.set(r(16), r(16), '#9c8154');
      for (let i = 0; i < 4; i++) c.set(r(16), r(16), '#d3ba8c');
      { const x = 2 + r(11), y = 2 + r(11); c.rect(x, y, 2, 1, '#8a7658'); c.set(x, y - 1, '#a8977a'); }
      break;
    }
    case 'wall': case 'door': case 'gate': case 'doorway': case 'gateway': {
      c.rect(0, 0, 16, 16, '#6e6a78');
      for (let row = 0; row < 4; row++) {
        c.rect(0, row * 4, 16, 1, '#8a8696');
        c.rect(0, row * 4 + 3, 16, 1, '#45414d');
        for (let x = row % 2 ? 3 : 7; x < 16; x += 8) c.rect(x, row * 4, 1, 3, '#45414d');
      }
      for (let i = 0; i < 3; i++) c.set(r(16), r(4) * 4 + 1, '#5a5664');
      if (t === 'wall') break;
      // an arched opening in the wall, x 3..12, with dressed-stone jambs
      const open = t === 'doorway' || t === 'gateway', gate = t === 'gate' || t === 'gateway';
      c.rect(2, 3, 12, 13, '#3a3642');
      c.rect(3, 1, 10, 1, '#3a3642'); c.rect(2, 2, 12, 1, '#3a3642');
      c.rect(2, 3, 1, 13, '#a7a3b3'); c.rect(13, 3, 1, 13, '#55515e');
      c.rect(4, 1, 8, 1, '#a7a3b3'); c.set(3, 2, '#a7a3b3'); c.set(12, 2, '#55515e');
      const fill = (col: string) => { c.rect(3, 3, 10, 13, col); c.rect(4, 2, 8, 1, col); };
      if (open) {
        // the passage: flagstones running through, dark under the arch
        fill('#77727f');
        c.rect(3, 9, 10, 1, '#5d5966'); c.rect(7, 2, 1, 7, '#5d5966'); c.rect(10, 10, 1, 6, '#5d5966'); c.rect(5, 10, 1, 6, '#5d5966');
        c.rect(3, 3, 10, 2, '#4a4654'); c.rect(4, 2, 8, 1, '#4a4654');
        if (gate) {
          // portcullis hauled up: only its spiked foot shows under the arch
          c.rect(3, 4, 10, 1, '#6b707c');
          for (let x = 4; x < 12; x += 2) { c.rect(x, 2, 1, 5, '#8a8f9a'); c.set(x, 7, '#d5dae4'); }
        } else {
          // the leaf swung back against the left jamb, seen edge-on
          c.rect(3, 3, 2, 13, '#6b4424'); c.rect(3, 3, 1, 13, '#8f6336'); c.rect(3, 6, 2, 1, '#3d3a44'); c.rect(3, 12, 2, 1, '#3d3a44');
        }
      } else if (gate) {
        // iron portcullis: dark behind, a lattice of bars, a padlocked chain
        fill('#1d1b22');
        for (let x = 4; x < 12; x += 2) { c.rect(x, 2, 1, 14, '#8a8f9a'); c.set(x, 15, '#d5dae4'); }
        for (const y of [5, 9, 13]) { c.rect(3, y, 10, 1, '#6b707c'); for (let x = 4; x < 12; x += 2) c.set(x, y, '#b9bec9'); }
        c.rect(7, 8, 3, 3, '#e2b23c'); c.rect(7, 8, 3, 1, '#f6dc8a'); c.set(8, 9, '#3a2a10'); c.set(8, 7, '#b9bec9'); c.set(7, 7, '#6b707c'); c.set(9, 7, '#6b707c');
      } else {
        // oak planks, iron bands and studs, a brass lock plate
        fill('#8f6336');
        for (const x of [5, 8, 11]) c.rect(x, 2, 1, 14, '#6b4424');
        c.rect(3, 3, 10, 1, '#a97a48');
        for (const y of [5, 12]) { c.rect(3, y, 10, 1, '#3d3a44'); for (const x of [4, 7, 10]) c.set(x, y, '#9a96a6'); }
        c.rect(10, 8, 2, 3, '#e2b23c'); c.rect(10, 8, 2, 1, '#f6dc8a'); c.set(10, 9, '#3a2a10');
      }
      break;
    }
    case 'fort': {
      grass(c, r, '#79a352', '#5a8a3e', '#93bf62', false);
      c.rect(3, 14, 11, 1, '#4f7c3a');
      c.stamp(KEEP, 2, 1, KEEP_PAL);
      break;
    }
    case 'bridge': {
      c.rect(0, 0, 16, 16, '#a8834e');
      for (let x = 3; x < 16; x += 4) c.rect(x, 2, 1, 12, '#7a5a32');
      for (let x = 1; x < 16; x += 4) { c.set(x, 3, '#c9a56c'); c.set(x, 12, '#6b4d28'); }
      for (const y of [0, 14]) { c.rect(0, y, 16, 2, '#5a3a1e'); c.rect(0, y, 16, 1, '#7c5630'); for (let x = 1; x < 16; x += 5) c.rect(x, y, 1, 2, '#3f2812'); }
      break;
    }
    case 'throne': {
      c.rect(0, 0, 16, 16, '#7a2232');
      for (let i = 0; i < 16; i += 2) { c.set(i, 0, '#b58a24'); c.set(i + 1, 15, '#b58a24'); c.set(0, i + 1, '#b58a24'); c.set(15, i, '#b58a24'); }
      c.rect(4, 13, 8, 1, '#571623');
      c.stamp(SEAT, 3, 3, SEAT_PAL);
      break;
    }
    case 'chest': {
      // strongroom flagstones
      c.rect(0, 0, 16, 16, '#77727f');
      for (let y = 0; y < 16; y += 8) { c.rect(0, y, 16, 1, '#5d5966'); for (let x = y % 16 ? 4 : 12; x < 16; x += 16) c.rect(x, y, 1, 8, '#5d5966'); }
      c.rect(8, 0, 1, 8, '#5d5966');
      for (let i = 0; i < 5; i++) c.set(r(16), r(16), '#8c8794');
      c.rect(3, 13, 11, 1, '#4f4b58');
      c.stamp(mask === 1 ? CHEST_OPEN : CHEST, 2, 5, CHEST_PAL);
      if (mask !== 1) { c.set(4, 6, '#f3dd9a'); c.set(5, 6, '#f3dd9a'); }
      break;
    }
    case 'ruins': {
      // long-dead rubble: scorched earth, no fire left
      grass(c, r, '#6f7f55', '#55633f', '#869468', false);
      c.rect(2, 12, 12, 2, '#4a4038');
      c.stamp(RUIN, 1, 6 - (v % 2), RUIN_PAL);
      for (let i = 0; i < 4; i++) c.set(2 + r(12), 13 + r(2), '#8a7a6a');
      break;
    }
    case 'house': {
      grass(c, r, '#79a352', '#5a8a3e', '#93bf62', false);
      if (mask === 2) {
        // freshly burned: blackened ground, embers still glowing, smoke rising
        c.rect(1, 12, 14, 3, '#3a322c');
        c.stamp(RUIN, 1, 6, RUIN_PAL);
        for (const [x, y] of [[4, 11], [8, 12], [11, 11], [6, 9]]) { c.set(x, y, '#e0662a'); c.set(x, y - 1, '#ffb84a'); }
        for (const [x, y] of [[7, 4], [8, 2], [6, 1], [9, 5]]) c.set(x, y, '#8a8480');
        break;
      }
      c.rect(2, 14, 12, 1, '#4f7c3a');
      const shut = mask === 1;
      c.stamp(COTTAGE, 1, 3, {
        r: '#b5553c', R: '#d27a58', d: '#7c3526', w: '#e9dcbc', k: '#6b5c48',
        y: shut ? '#6f7787' : '#ffd96a', o: shut ? '#7a5a34' : '#3a2416', g: shut ? '#5f4426' : '#ffb84a',
      });
      c.rect(10, 0, 2, 3, '#8a7a6a'); // chimney
      if (!shut) { c.set(10 + (v % 2), 0, '#d9d4cc'); c.rect(7, 14, 3, 1, '#c9b074'); }
      break;
    }
    case 'building': {
      c.rect(0, 0, 16, 16, '#8a8272');
      c.stamp(TOWNHOUSE, 0, 1, { s: '#5a6478', S: '#7684a0', d: '#3f4656', t: '#5a4630', w: '#e2d5b4', b: v % 2 ? '#5f86c4' : '#ffd96a', k: '#3f372f' });
      break;
    }
    default:
      grass(c, r, odd ? '#74a04e' : '#79a352', '#55863c', '#93bf62', true);
  }
  return [c];
}

const cache = new Map<string, PxPath[][]>();

export const TileArt = memo(function TileArt({ t, x, y, mask = 0 }: { t: TerrainId; x: number; y: number; mask?: number }) {
  const v = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 4;
  const odd = (x + y) % 2 === 1;
  const key = `${t}-${v}-${mask}-${odd}`;
  let layers = cache.get(key);
  if (!layers) { layers = drawTile(t, v, mask, odd).map(c => c.paths(3)); cache.set(key, layers); }
  const [base, ...frames] = layers;
  return (
    <svg viewBox="0 0 48 48" shapeRendering="crispEdges">
      <Px paths={base} />
      {frames.map((f, i) => (
        <g key={i} style={{ visibility: 'hidden', animation: `fl2 1.8s step-end ${i * 0.9}s infinite` }}><Px paths={f} /></g>
      ))}
    </svg>
  );
});
