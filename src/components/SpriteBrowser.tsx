import { useMemo, useState } from 'react';
import { CHARACTERS, buildFor, lookById, lookFor } from '../game/data/characters';
import { CLASSES } from '../game/data/classes';
import { ALLY_IDS, ARCHETYPES, NPC_IDS, PROFILES } from '../game/data/profiles';
import type { WeaponType } from '../game/types';
import { Portrait, type Mood } from './art';
import { Figure, SCENARIO_POSES, attackPose, type Pose } from './figure';

/** Sprite browser: open the game with #sprites to see every sprite the game can draw, with filters. */

type Group = 'Companions' | 'Villains' | 'Enemy types';
interface Entry {
  key: string;
  kind: 'Sprites' | 'Portraits';
  id: string;
  name: string;
  group: Group;
  classId: string;
  /** Pose for sprites, expression for portraits. */
  pose: string;
  weapon?: WeaponType;
  mount: 'On foot' | 'Horse' | 'Pegasus';
  dismounted?: boolean;
}

const MOODS: (Mood | 'talking')[] = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'talking'];

function allEntries(): Entry[] {
  const out: Entry[] = [];
  const ids: [string, Group][] = [
    ...ALLY_IDS.map(id => [id, 'Companions'] as [string, Group]),
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
            mount: dismounted || !mount ? 'On foot' : mount === 'horse' ? 'Horse' : 'Pegasus',
            key: `s-${id}-${weapon}-${pose}-${dismounted}`,
          });
        }
      }
    }
    if (CHARACTERS[id]) for (const mood of MOODS) out.push({ ...base, kind: 'Portraits', pose: mood, mount: 'On foot', key: `p-${id}-${mood}` });
  }
  return out;
}

const ENTRIES = allEntries();
const uniq = (xs: string[]) => [...new Set(xs)];
const OPTIONS = {
  kind: ['Sprites', 'Portraits'],
  group: ['Companions', 'Villains', 'Enemy types'],
  name: uniq(ENTRIES.map(e => e.name)),
  classId: uniq(ENTRIES.map(e => e.classId)),
  pose: uniq(ENTRIES.map(e => e.pose)),
  weapon: uniq(ENTRIES.flatMap(e => (e.weapon ? [e.weapon] : []))),
  mount: ['On foot', 'Horse', 'Pegasus'],
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
      && (!q || `${e.name} ${CLASSES[e.classId].name} ${e.pose} ${e.weapon ?? ''} ${e.group} ${e.mount}`.toLowerCase().includes(q)));
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
              {e.kind === 'Portraits'
                ? <Portrait look={lookById(e.id)} mood={e.pose === 'talking' ? 'neutral' : e.pose as Mood} talking={e.pose === 'talking'} size={size * 0.8} className={left ? 'sb-flip' : ''} />
                : <Figure look={lookFor(u)} build={buildFor(u, { dismount: e.dismounted })} weapon={e.weapon} pose={e.pose as Pose} facing={left ? 'left' : 'right'} size={size} />}
              <figcaption><b>{e.name}</b>{e.pose}{e.weapon ? ` · ${e.weapon}` : ''}{e.dismounted ? ' · dismounted' : ''}</figcaption>
            </figure>
          );
        })}
      </div>
      {shown.length === 0 && <p className="sb-count">No sprite matches these filters.</p>}
    </div>
  );
}
