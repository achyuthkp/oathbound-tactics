import { useMemo, useState } from 'react';
import { CHARACTERS, ELEMENTS, buildFor, lookById, lookFor, type Element } from '../game/data/characters';
import { CLASSES } from '../game/data/classes';
import { ALLY_IDS, ARCHETYPES, LATER_IDS, NPC_IDS, PROFILES } from '../game/data/profiles';
import { TERRAIN } from '../game/data/terrain';
import { WEAPONS } from '../game/data/weapons';
import type { TerrainId, WeaponType } from '../game/types';
import { Portrait, TileArt, type Mood } from './art';
import { Figure, SCENARIO_POSES, attackPose, type Pose } from './figure';
import { DRAGON_POSES, GREAT_DRAGON_ATTACKS, GreatDragon, type DragonPose } from './greatdragon';

/** Sprite browser: open the game with #sprites to see every sprite the game can draw, with filters. */

type Group = 'Companions' | 'Villains' | 'Enemy types' | 'Dragons' | 'Terrain';
interface Entry {
  key: string;
  kind: 'Sprites' | 'Portraits' | 'Tiles';
  id: string;
  name: string;
  group: Group;
  classId: string;
  /** Pose for sprites, expression for portraits. */
  pose: string;
  weapon?: WeaponType;
  /** A specific weapon, e.g. 'silver_sword'. */
  weaponId?: string;
  mount: 'On foot' | 'Horse' | 'Pegasus' | 'Wyvern';
  dismounted?: boolean;
  /** A dragonkin in dragon form. */
  dragon?: boolean;
  /** A dragonkin of this element (the "Dragons" group). */
  element?: Element;
  /** The multi-tile dark dragon, in this pose. */
  great?: DragonPose;
  /** Tiles: position (picks the variant) and which sides touch land (water only). */
  tile?: { x: number; y: number; mask: number };
  rules?: string;
}

const MOODS: (Mood | 'talking')[] = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'talking'];

function allEntries(): Entry[] {
  const out: Entry[] = [];
  const ids: [string, Group][] = [
    ...[...ALLY_IDS, ...LATER_IDS].map(id => [id, 'Companions'] as [string, Group]),
    ...NPC_IDS.map(id => [id, 'Villains'] as [string, Group]),
    ...Object.keys(ARCHETYPES).map(id => [id, 'Enemy types'] as [string, Group]),
  ];
  for (const [id, group] of ids) {
    const p = PROFILES[id] ?? ARCHETYPES[id];
    const base = { id, name: p.name, group, classId: p.classId };
    const mount = buildFor({ id, classId: p.classId }).mount;
    // mounted classes also appear on foot (camp and the world map dismount them)
    for (const dismounted of mount ? [false, true] : [false]) {
      for (const weapon of CLASSES[p.classId].weapons) {
        const poses: Pose[] = ['idle', 'walk', 'talk', attackPose(weapon), 'hit', 'dodge', 'die', ...SCENARIO_POSES];
        for (const pose of poses) {
          out.push({
            ...base, kind: 'Sprites', pose, weapon, dismounted,
            mount: dismounted || !mount ? 'On foot' : mount === 'horse' ? 'Horse' : mount === 'wyvern' ? 'Wyvern' : 'Pegasus',
            key: `s-${id}-${weapon}-${pose}-${dismounted}`,
          });
        }
      }
    }
    // a dragonkin's other shape
    if (CLASSES[p.classId].shifts) {
      for (const pose of ['idle', 'walk', 'breath', 'hit', 'dodge', 'die', 'victory', 'wounded', 'rest'] as Pose[]) {
        out.push({ ...base, kind: 'Sprites', pose, weapon: 'breath', dragon: true, mount: 'On foot', key: `d-${id}-${pose}` });
      }
    }
    // each specific weapon the class can wield, in hand
    for (const w of Object.values(WEAPONS)) {
      if (!CLASSES[p.classId].weapons.includes(w.type)) continue;
      out.push({ ...base, kind: 'Sprites', pose: 'idle', weapon: w.type, weaponId: w.id, mount: !mount ? 'On foot' : mount === 'horse' ? 'Horse' : mount === 'wyvern' ? 'Wyvern' : 'Pegasus', key: `w-${id}-${w.id}` });
    }
    if (CHARACTERS[id]) for (const mood of MOODS) out.push({ ...base, kind: 'Portraits', pose: mood, mount: 'On foot', key: `p-${id}-${mood}` });
  }
  // dragonkin of each element: the person, then the dragon
  for (const el of Object.keys(ELEMENTS) as Element[]) {
    const base = { id: 'manakete', name: ELEMENTS[el].name, group: 'Dragons' as Group, classId: 'manakete', element: el, mount: 'On foot' as const, weapon: 'breath' as WeaponType };
    for (const pose of ['idle', 'walk', 'breath'] as Pose[]) out.push({ ...base, kind: 'Sprites', pose, key: `eh-${el}-${pose}` });
    for (const pose of ['idle', 'walk', 'breath', 'hit', 'dodge', 'die', 'victory', 'wounded', 'rest'] as Pose[]) out.push({ ...base, kind: 'Sprites', pose, dragon: true, key: `ed-${el}-${pose}` });
  }
  // the dark dragon itself: three tiles by three
  for (const pose of DRAGON_POSES) {
    const atk = GREAT_DRAGON_ATTACKS.find(a => a.pose === pose);
    out.push({ kind: 'Sprites', id: 'great', name: 'The Dark Dragon', group: 'Dragons', classId: '', mount: 'On foot', pose: atk ? `${pose}: ${atk.name}` : pose, great: pose, rules: atk?.note ?? 'Occupies 3×3 tiles', key: `g-${pose}` });
  }
  // every terrain in its four variants; water also with banks on one side, two sides and all round
  for (const t of Object.keys(TERRAIN) as TerrainId[]) {
    const d = TERRAIN[t];
    const cost = (n: number) => (Number.isFinite(n) ? String(n) : 'blocked');
    const rules = `def +${d.def}, avo +${d.avo}, move: foot ${cost(d.cost.foot)}, horse ${cost(d.cost.horse)}, flying ${cost(d.cost.flying)}`;
    const tiles = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [3, 0, 0], ...(t === 'water' ? [[0, 0, 1], [1, 0, 10], [0, 1, 15]] : [])];
    tiles.forEach(([x, y, mask], i) => out.push({
      kind: 'Tiles', id: t, name: d.name, group: 'Terrain', classId: '', mount: 'On foot',
      pose: mask ? `shore ${mask}` : `variant ${i + 1}`, tile: { x, y, mask }, key: `t-${t}-${i}`, rules,
    }));
  }
  return out;
}

const ENTRIES = allEntries();
const uniq = (xs: string[]) => [...new Set(xs)];
const OPTIONS = {
  kind: ['Sprites', 'Portraits', 'Tiles'],
  group: ['Companions', 'Villains', 'Enemy types', 'Dragons', 'Terrain'],
  name: uniq(ENTRIES.map(e => e.name)),
  classId: uniq(ENTRIES.map(e => e.classId)).filter(Boolean),
  pose: uniq(ENTRIES.map(e => e.pose)),
  weapon: uniq(ENTRIES.flatMap(e => (e.weapon ? [e.weapon] : []))),
  mount: ['On foot', 'Horse', 'Pegasus', 'Wyvern'],
};
type FilterKey = keyof typeof OPTIONS;
const LABELS: Record<FilterKey, string> = {
  kind: 'Type', group: 'Group', name: 'Character', classId: 'Class', pose: 'Pose / expression', weapon: 'Weapon', mount: 'Mount',
};

export function SpriteBrowser() {
  const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [query, setQuery] = useState('');
  const [size, setSize] = useState(128);
  const [left, setLeft] = useState(false);
  const [replay, setReplay] = useState(0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ENTRIES.filter(e =>
      (Object.keys(filters) as FilterKey[]).every(k => !filters[k] || e[k] === filters[k])
      && (!q || `${e.name} ${CLASSES[e.classId]?.name ?? (e.great ? 'dragon boss' : 'terrain tile')} ${e.pose} ${e.weapon ?? ''} ${e.weaponId ? WEAPONS[e.weaponId].name : ''} ${e.group} ${e.mount} ${e.dragon ? 'dragon form' : ''}`.toLowerCase().includes(q)));
  }, [filters, query]);

  return (
    <div className="model-sheet sprite-browser">
      <h1>Sprite browser</h1>
      <div className="sb-filters">
        <label>Search<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="name, class, pose…" /></label>
        {(Object.keys(OPTIONS) as FilterKey[]).map(k => (
          <label key={k}>{LABELS[k]}
            <select value={filters[k] ?? ''} onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))}>
              <option value="">All</option>
              {OPTIONS[k].map(v => <option key={v} value={v}>{k === 'classId' ? CLASSES[v].name : v}</option>)}
            </select>
          </label>
        ))}
        <label>Size<input type="range" min={64} max={256} step={32} value={size} onChange={e => setSize(Number(e.target.value))} /></label>
        <label className="sb-check"><input type="checkbox" checked={left} onChange={e => setLeft(e.target.checked)} /> Face left</label>
        <button onClick={() => setReplay(n => n + 1)}>Replay animations</button>
        <button className="ghost" onClick={() => { setFilters({}); setQuery(''); }}>Clear filters</button>
        <a href="#">Back to the game</a>
      </div>
      <p className="sb-count">{shown.length} of {ENTRIES.length} sprites</p>
      <div className="sb-grid">
        {shown.map(e => {
          const u = { id: e.id, classId: e.classId, lookId: CHARACTERS[e.id] ? e.id : undefined };
          return (
            <figure key={`${e.key}-${replay}`}>
              {e.great
                ? <div style={{ padding: `${size * 0.3}px ${size}px 0 ${size * 0.7}px` }}><GreatDragon pose={e.great} facing={left ? 'left' : 'right'} size={size * 2} /></div>
                : e.tile
                ? <div className="sb-tile" style={{ width: size * 0.75, height: size * 0.75 }} title={e.rules}><TileArt t={e.id as TerrainId} x={e.tile.x} y={e.tile.y} mask={e.tile.mask} /></div>
                : e.kind === 'Portraits'
                ? <Portrait look={lookById(e.id)} mood={e.pose === 'talking' ? 'neutral' : e.pose as Mood} talking={e.pose === 'talking'} size={size * 0.8} className={left ? 'sb-flip' : ''} />
                : <Figure look={e.element ? { ...lookFor(u), accent: ELEMENTS[e.element].coat, eyes: ELEMENTS[e.element].eye, cloth: e.element === 'light' ? '#e8e2d0' : lookFor(u).cloth } : lookFor(u)} build={buildFor({ ...u, dragon: e.dragon ? 1 : undefined }, { dismount: e.dismounted, element: e.element })} weapon={e.weapon} weaponId={e.weaponId} pose={e.pose as Pose} facing={left ? 'left' : 'right'} size={size} />}
              <figcaption><b>{e.name}</b>{e.pose}{e.weaponId ? ` · ${WEAPONS[e.weaponId].name}` : e.weapon ? ` · ${e.weapon}` : ''}{e.dismounted ? ' · dismounted' : ''}{e.dragon ? ' · dragon form' : ''}{e.rules && <small>{e.rules}</small>}</figcaption>
            </figure>
          );
        })}
      </div>
      {shown.length === 0 && <p className="sb-count">No sprite matches these filters.</p>}
    </div>
  );
}
