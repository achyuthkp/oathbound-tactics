import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseMap } from '../game/battle';
import {
  CHARACTER_IDS, CLASS_IDS, MAX_H, MAX_W, MIN_SIZE, PAINTABLE, aiModesFor, defaultEnemy, defaultPlayer, enemyUnit, genericOf, playerOf,
  playerUnit, problems, resize, setTile, starterWeapon, storeChallenge, tileAt, weaponsFor,
  type ChallengeMap, type EnemyPlacement, type PlayerSpawn,
} from '../game/challenge';
import { CLASSES } from '../game/data/classes';
import { CHARACTERS } from '../game/data/characters';
import { TERRAIN } from '../game/data/terrain';
import { WEAPONS } from '../game/data/weapons';
import { STAT_KEYS, type AIMode, type House, type Stats, type TerrainId } from '../game/types';
import { MAX_ITEMS, MAX_KEYS, MAX_POTIONS, MAX_STONES } from '../game/units';
import { TileArt } from './tiles';
import { TILE, TerrainLayer, UnitToken } from './battle/parts';

type Tool = { kind: 'terrain'; t: TerrainId } | { kind: 'player' } | { kind: 'enemy' } | { kind: 'select' } | { kind: 'erase' };
type Sel = { kind: 'player'; i: number } | { kind: 'enemy'; i: number } | { kind: 'house' | 'chest'; x: number; y: number } | null;

const AI_LABEL: Record<AIMode, string> = {
  aggressive: 'Aggressive: hunts your units', guard: 'Guard: waits until you come close', hold: 'Hold: never moves',
  raid: 'Raid: burns houses', loot: 'Loot: empties chests',
};
const STAT_LABEL: Record<keyof Stats, string> = { hp: 'HP', str: 'Str', skl: 'Skl', spd: 'Spd', lck: 'Lck', def: 'Def' };

interface Props {
  initial: ChallengeMap;
  onPlay: (m: ChallengeMap) => void;
  onDone: () => void;
}

/** The map builder. Every change is saved to this browser straight away. */
export function MapBuilder({ initial, onPlay, onDone }: Props) {
  const [m, setM] = useState(initial);
  const [tool, setTool] = useState<Tool>({ kind: 'terrain', t: 'forest' });
  const [sel, setSel] = useState<Sel>(null);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(true);
  // new placements copy the last unit edited on that side, so a row of soldiers is one click each
  const lastPlayer = useRef<PlayerSpawn | undefined>(undefined);
  const lastEnemy = useRef<EnemyPlacement | undefined>(undefined);
  /** The last tile painted in this drag; fast drags skip tiles, so the gap is filled in a line. */
  const painting = useRef<{ x: number; y: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 800, h: 600 });

  useEffect(() => { setSaved(storeChallenge(m)); }, [m]);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const w = m.tiles[0].length, h = m.tiles.length;
  const scale = Math.min(1.25, (area.w - 24) / (w * TILE), (area.h - 24) / (h * TILE));
  const terrain = useMemo(() => parseMap(m.tiles), [m.tiles]);
  const players = useMemo(() => m.players.map((p, i) => playerUnit(p, i, m.loseRule)), [m.players, m.loseRule]);
  const enemies = useMemo(() => m.enemies.map(enemyUnit), [m.enemies]);

  const update = (f: (m: ChallengeMap) => ChallengeMap) => { setIssues(null); setM(f); };
  const setPlayer = (i: number, p: PlayerSpawn) => { lastPlayer.current = p; update(c => ({ ...c, players: c.players.map((q, j) => (j === i ? p : p.leader && q.leader ? { ...q, leader: false } : q)) })); };
  const setEnemy = (i: number, e: EnemyPlacement) => { lastEnemy.current = e; update(c => ({ ...c, enemies: c.enemies.map((q, j) => (j === i ? e : q)) })); };

  const tileOf = (e: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (TILE * scale)), y = Math.floor((e.clientY - r.top) / (TILE * scale));
    return x >= 0 && y >= 0 && x < w && y < h ? { x, y } : null;
  };

  function act(x: number, y: number) {
    if (tool.kind === 'terrain') { update(c => setTile(c, x, y, tool.t)); return; }
    const pi = m.players.findIndex(p => p.x === x && p.y === y);
    const ei = m.enemies.findIndex(e => e.x === x && e.y === y);
    if (tool.kind === 'erase') {
      if (pi >= 0) update(c => ({ ...c, players: c.players.filter((_, j) => j !== pi) }));
      else if (ei >= 0) update(c => ({ ...c, enemies: c.enemies.filter((_, j) => j !== ei) }));
      setSel(null);
      return;
    }
    if (pi >= 0) { setSel({ kind: 'player', i: pi }); return; }
    if (ei >= 0) { setSel({ kind: 'enemy', i: ei }); return; }
    if (tool.kind === 'player') {
      // with nothing edited yet, place the next story character not on the map
      const next = CHARACTER_IDS.find(id => !m.players.some(q => q.charId === id));
      let p = lastPlayer.current ? defaultPlayer(x, y, lastPlayer.current) : next ? playerOf(next, x, y) : genericOf('soldier', 1, x, y);
      p = { ...p, leader: false };
      // a story character can only be placed once; further copies become generic units of that class
      if (p.charId && m.players.some(q => q.charId === p.charId)) p = { ...genericOf(p.classId, p.level, x, y), weapons: p.weapons.filter(id => WEAPONS[id].tier < 99) };
      if (!p.weapons.length) p.weapons = [starterWeapon(p.classId)];
      if (!m.players.length) p.leader = true;
      update(c => ({ ...c, players: [...c.players, p] }));
      setSel({ kind: 'player', i: m.players.length });
      return;
    }
    if (tool.kind === 'enemy') {
      update(c => ({ ...c, enemies: [...c.enemies, defaultEnemy(x, y, lastEnemy.current)] }));
      setSel({ kind: 'enemy', i: m.enemies.length });
      return;
    }
    const t = tileAt(m, x, y);
    setSel(t === 'house' || t === 'chest' ? { kind: t, x, y } : null);
  }

  const play = () => {
    const p = problems(m);
    if (p.length) { setIssues(p); setSel(null); return; }
    onPlay(m);
  };

  const selTile = sel ? (sel.kind === 'player' ? m.players[sel.i] : sel.kind === 'enemy' ? m.enemies[sel.i] : sel) : null;

  return (
    <div className="builder">
      <header className="builder-bar">
        <input className="builder-name" value={m.name} maxLength={40} aria-label="Map name" onChange={e => update(c => ({ ...c, name: e.target.value }))} />
        <span className="hint">{saved ? 'Saved on this browser' : 'Could not save: browser storage is unavailable'}</span>
        <div className="spacer" />
        <button className="primary" onClick={play}>Test play</button>
        <button onClick={onDone}>Done</button>
      </header>

      <aside className="builder-tools">
        <h3>Place</h3>
        <div className="tool-row">
          <ToolButton on={tool.kind === 'select'} onClick={() => setTool({ kind: 'select' })} label="Select" hint="Click a unit, house or chest to edit it" />
          <ToolButton on={tool.kind === 'player'} onClick={() => setTool({ kind: 'player' })} label="Your unit" hint="Click an empty tile to place one of your units" />
          <ToolButton on={tool.kind === 'enemy'} onClick={() => setTool({ kind: 'enemy' })} label="Enemy" hint="Click an empty tile to place an enemy" />
          <ToolButton on={tool.kind === 'erase'} onClick={() => setTool({ kind: 'erase' })} label="Remove" hint="Click a unit to remove it" />
        </div>
        <h3>Terrain</h3>
        <div className="palette">
          {PAINTABLE.map(t => (
            <button key={t} className={`swatch ${tool.kind === 'terrain' && tool.t === t ? 'on' : ''}`} title={TERRAIN[t].name} aria-label={TERRAIN[t].name} onClick={() => setTool({ kind: 'terrain', t })}>
              <i className={`swatch-art t-${t}`}><TileArt t={t} x={3} y={5} /></i>
              <span>{TERRAIN[t].name}</span>
            </button>
          ))}
        </div>
        <p className="hint">Drag to paint terrain. Placing a unit copies the last one you edited.</p>
      </aside>

      <main className="builder-map" ref={areaRef}>
        <div style={{ width: w * TILE * scale, height: h * TILE * scale }}>
        <div
          className="map builder-board"
          style={{ width: w * TILE, height: h * TILE, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          onPointerDown={e => { const p = tileOf(e); if (!p) return; painting.current = tool.kind === 'terrain' ? p : null; e.currentTarget.setPointerCapture(e.pointerId); act(p.x, p.y); }}
          onPointerMove={e => {
            const from = painting.current;
            const p = from && e.buttons & 1 ? tileOf(e) : null;
            if (!from || !p || (p.x === from.x && p.y === from.y)) return;
            const n = Math.max(Math.abs(p.x - from.x), Math.abs(p.y - from.y));
            for (let i = 1; i <= n; i++) act(Math.round(from.x + ((p.x - from.x) * i) / n), Math.round(from.y + ((p.y - from.y) * i) / n));
            painting.current = p;
          }}
          onPointerUp={() => { painting.current = null; }}
        >
          <TerrainLayer map={terrain} />
          {players.map((u, i) => <UnitToken key={`p${i}`} u={u} selected={sel?.kind === 'player' && sel.i === i} targeted={false} />)}
          {enemies.map((u, i) => (
            <div key={`e${i}`} className={m.enemies[i].turn > 1 ? 'reinforcement' : undefined}>
              <UnitToken u={u} selected={sel?.kind === 'enemy' && sel.i === i} targeted={false} />
              {m.enemies[i].turn > 1 && <span className="arrival" style={{ transform: `translate(${u.x * TILE}px, ${u.y * TILE}px)` }}>T{m.enemies[i].turn}</span>}
            </div>
          ))}
          {m.players.filter(p => p.leader && m.loseRule === 'leader').map(p => <span key="lead" className="leader-mark" style={{ transform: `translate(${p.x * TILE}px, ${p.y * TILE}px)` }} title="Leader">★</span>)}
          {selTile && <div className="builder-sel" style={{ transform: `translate(${selTile.x * TILE}px, ${selTile.y * TILE}px)` }} />}
        </div>
        </div>
      </main>

      <aside className="builder-inspect">
        {sel?.kind === 'player' && m.players[sel.i] && (
          <PlayerEditor p={m.players[sel.i]} m={m} onChange={p => setPlayer(sel.i, p)} onRemove={() => { update(c => ({ ...c, players: c.players.filter((_, j) => j !== sel.i) })); setSel(null); }} />
        )}
        {sel?.kind === 'enemy' && m.enemies[sel.i] && (
          <EnemyEditor e={m.enemies[sel.i]} onChange={e => setEnemy(sel.i, e)} onRemove={() => { update(c => ({ ...c, enemies: c.enemies.filter((_, j) => j !== sel.i) })); setSel(null); }} />
        )}
        {(sel?.kind === 'house' || sel?.kind === 'chest') && (
          <TreasureEditor kind={sel.kind} h={(sel.kind === 'house' ? m.houses : m.chests).find(h => h.x === sel.x && h.y === sel.y)}
            onChange={hh => update(c => ({ ...c, [sel.kind === 'house' ? 'houses' : 'chests']: (sel.kind === 'house' ? c.houses : c.chests).map(o => (o.x === hh.x && o.y === hh.y ? hh : o)) }))} />
        )}
        {!sel && <MapSettings m={m} issues={issues} onChange={update} />}
        {sel && <button className="ghost small back-to-map" onClick={() => setSel(null)}>← Map settings</button>}
      </aside>
    </div>
  );
}

function ToolButton({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint: string }) {
  return <button className={`toggle ${on ? 'on' : ''}`} title={hint} onClick={onClick}>{label}</button>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={value} min={min} max={max}
        onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.round(n)))); }} />
    </Field>
  );
}

function MapSettings({ m, issues, onChange }: { m: ChallengeMap; issues: string[] | null; onChange: (f: (m: ChallengeMap) => ChallengeMap) => void }) {
  const w = m.tiles[0].length, h = m.tiles.length;
  const later = m.enemies.filter(e => e.turn > 1).length;
  return (
    <div className="inspect-body">
      <h3>Map</h3>
      <div className="field-row">
        <NumberField label="Width" value={w} min={MIN_SIZE} max={MAX_W} onChange={n => onChange(c => resize(c, n, h))} />
        <NumberField label="Height" value={h} min={MIN_SIZE} max={MAX_H} onChange={n => onChange(c => resize(c, w, n))} />
      </div>
      <Field label="Objective">
        <select value={m.objective} onChange={e => onChange(c => ({ ...c, objective: e.target.value as ChallengeMap['objective'] }))}>
          <option value="rout">Defeat all enemies</option>
          <option value="boss">Defeat the boss</option>
          <option value="survive">Survive a number of turns</option>
          <option value="seize">Seize the throne</option>
        </select>
      </Field>
      {m.objective === 'survive' && <NumberField label="Turns to survive" value={m.surviveTurns} min={1} max={50} onChange={n => onChange(c => ({ ...c, surviveTurns: n }))} />}
      {m.objective === 'seize' && <p className="hint">Paint a throne tile; your {m.loseRule === 'leader' ? 'leader' : 'units'} must stand on it and choose Seize.</p>}
      <Field label="You lose when">
        <select value={m.loseRule} onChange={e => onChange(c => ({ ...c, loseRule: e.target.value as ChallengeMap['loseRule'] }))}>
          <option value="leader">Your leader falls</option>
          <option value="all">Your whole army falls</option>
        </select>
      </Field>
      <p className="hint">{m.players.length} of your units, {m.enemies.length - later} enemies at the start{later ? `, ${later} arriving later` : ''}, {m.houses.length} houses, {m.chests.length} chests.</p>
      {issues && (
        <div className="issues" role="alert">
          <strong>Fix these before playing:</strong>
          <ul>{issues.map(i => <li key={i}>{i}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function WeaponList({ ids, options, onChange }: { ids: string[]; options: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="weapon-list">
      {ids.map((id, i) => (
        <div key={i} className="weapon-row">
          <select value={id} onChange={e => onChange(ids.map((x, j) => (j === i ? e.target.value : x)))}>
            {[...new Set([id, ...options])].map(o => <option key={o} value={o}>{WEAPONS[o]?.name ?? o}</option>)}
          </select>
          <button className="ghost small" aria-label="Remove weapon" onClick={() => onChange(ids.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      {ids.length < MAX_ITEMS && options.length > 0 && <button className="small" onClick={() => onChange([...ids, options[0]])}>Add weapon</button>}
    </div>
  );
}

function StatBonus({ value, onChange }: { value?: Partial<Stats>; onChange: (v: Partial<Stats> | undefined) => void }) {
  const any = STAT_KEYS.some(k => value?.[k]);
  return (
    <details className="stat-bonus" open={any}>
      <summary>Stat bonus{any ? ` (${STAT_KEYS.filter(k => value?.[k]).map(k => `${STAT_LABEL[k]} +${value![k]}`).join(', ')})` : ''}</summary>
      <div className="stat-grid">
        {STAT_KEYS.map(k => (
          <NumberField key={k} label={STAT_LABEL[k]} value={value?.[k] ?? 0} min={0} max={30}
            onChange={n => { const v = { ...value, [k]: n || undefined }; onChange(STAT_KEYS.some(s => v[s]) ? v : undefined); }} />
        ))}
      </div>
    </details>
  );
}

function PlayerEditor({ p, m, onChange, onRemove }: { p: PlayerSpawn; m: ChallengeMap; onChange: (p: PlayerSpawn) => void; onRemove: () => void }) {
  const c = CLASSES[p.classId];
  const taken = new Set(m.players.filter(q => q !== p && q.charId).map(q => q.charId));
  return (
    <div className="inspect-body">
      <h3>Your unit</h3>
      <Field label="Who">
        <select value={p.charId ?? ''} onChange={e => {
          const id = e.target.value;
          onChange(id ? { ...playerOf(id, p.x, p.y), leader: p.leader } : { ...genericOf(p.classId, p.level, p.x, p.y), leader: p.leader });
        }}>
          <option value="">Generic unit</option>
          {CHARACTER_IDS.map(id => <option key={id} value={id} disabled={taken.has(id)}>{CHARACTERS[id].name}{taken.has(id) ? ' (placed)' : ''}</option>)}
        </select>
      </Field>
      {!p.charId && (
        <Field label="Class">
          <select value={p.classId} onChange={e => onChange({ ...genericOf(e.target.value, p.level, p.x, p.y), leader: p.leader, statBonus: p.statBonus })}>
            {CLASS_IDS.map(id => <option key={id} value={id}>{CLASSES[id].name}</option>)}
          </select>
        </Field>
      )}
      <NumberField label="Level" value={p.level} min={1} max={20} onChange={n => onChange({ ...p, level: n })} />
      {m.loseRule === 'leader' && (
        <label className="check"><input type="checkbox" checked={!!p.leader} onChange={e => onChange({ ...p, leader: e.target.checked })} /> Leader (losing this unit loses the map)</label>
      )}
      <Field label="Weapons"><WeaponList ids={p.weapons} options={weaponsFor(p.classId, p.charId)} onChange={weapons => onChange({ ...p, weapons })} /></Field>
      <div className="field-row">
        <NumberField label="Vulneraries" value={p.potions} min={0} max={MAX_POTIONS} onChange={n => onChange({ ...p, potions: n })} />
        <NumberField label="Keys" value={p.keys} min={0} max={MAX_KEYS} onChange={n => onChange({ ...p, keys: n })} />
        {c?.steals && <NumberField label="Lockpicks" value={p.picks} min={0} max={MAX_ITEMS} onChange={n => onChange({ ...p, picks: n })} />}
        {c?.shifts && <NumberField label="Dragonstones" value={p.stones} min={0} max={MAX_STONES} onChange={n => onChange({ ...p, stones: n })} />}
      </div>
      <StatBonus value={p.statBonus} onChange={statBonus => onChange({ ...p, statBonus })} />
      <button className="danger small" onClick={onRemove}>Remove unit</button>
    </div>
  );
}

function EnemyEditor({ e, onChange, onRemove }: { e: EnemyPlacement; onChange: (e: EnemyPlacement) => void; onRemove: () => void }) {
  return (
    <div className="inspect-body">
      <h3>Enemy</h3>
      <Field label="Class">
        <select value={e.classId} onChange={ev => {
          const classId = ev.target.value;
          const ok = weaponsFor(classId);
          const weapons = e.weapons.filter(w => ok.includes(w));
          onChange({ ...e, classId, weapons: weapons.length ? weapons : [starterWeapon(classId)], ai: aiModesFor(classId).includes(e.ai ?? 'aggressive') ? e.ai : 'aggressive' });
        }}>
          {CLASS_IDS.map(id => <option key={id} value={id}>{CLASSES[id].name}</option>)}
        </select>
      </Field>
      <Field label="Name (optional)"><input value={e.name ?? ''} maxLength={24} placeholder={CLASSES[e.classId]?.name} onChange={ev => onChange({ ...e, name: ev.target.value || undefined })} /></Field>
      <div className="field-row">
        <NumberField label="Level" value={e.level} min={1} max={20} onChange={n => onChange({ ...e, level: n })} />
        <NumberField label="Arrives on turn" value={e.turn} min={1} max={50} onChange={n => onChange({ ...e, turn: n })} />
      </div>
      <Field label="Behaviour">
        <select value={e.ai ?? 'aggressive'} onChange={ev => onChange({ ...e, ai: ev.target.value as AIMode })}>
          {aiModesFor(e.classId).map(a => <option key={a} value={a}>{AI_LABEL[a]}</option>)}
        </select>
      </Field>
      <Field label="Weapons"><WeaponList ids={e.weapons} options={weaponsFor(e.classId)} onChange={weapons => onChange({ ...e, weapons })} /></Field>
      <label className="check"><input type="checkbox" checked={!!e.isBoss} onChange={ev => onChange({ ...e, isBoss: ev.target.checked || undefined })} /> Boss</label>
      <label className="check"><input type="checkbox" checked={!!e.key} onChange={ev => onChange({ ...e, key: ev.target.checked || undefined })} /> Carries a key</label>
      <NumberField label="Vulneraries" value={e.potions ?? 0} min={0} max={MAX_POTIONS} onChange={n => onChange({ ...e, potions: n || undefined })} />
      <StatBonus value={e.statBonus} onChange={statBonus => onChange({ ...e, statBonus })} />
      <button className="danger small" onClick={onRemove}>Remove enemy</button>
    </div>
  );
}

function TreasureEditor({ kind, h, onChange }: { kind: 'house' | 'chest'; h?: House; onChange: (h: House) => void }) {
  if (!h) return null;
  const reward = h.weapon ? 'weapon' : h.potion ? 'potion' : 'gold';
  const buyable = Object.values(WEAPONS).filter(w => w.tier < 99).map(w => w.id);
  return (
    <div className="inspect-body">
      <h3>{kind === 'house' ? 'House' : 'Chest'}</h3>
      <Field label="Holds">
        <select value={reward} onChange={e => {
          const r = e.target.value;
          onChange({ x: h.x, y: h.y, text: h.text, ...(r === 'gold' ? { gold: 500 } : r === 'weapon' ? { weapon: 'steel_sword' } : { potion: true }) });
        }}>
          <option value="gold">Gold</option>
          <option value="weapon">A weapon</option>
          <option value="potion">A vulnerary</option>
        </select>
      </Field>
      {reward === 'gold' && <NumberField label="Gold" value={h.gold ?? 0} min={0} max={9999} onChange={n => onChange({ ...h, gold: n })} />}
      {reward === 'weapon' && (
        <Field label="Weapon">
          <select value={h.weapon} onChange={e => onChange({ ...h, weapon: e.target.value })}>
            {buyable.map(id => <option key={id} value={id}>{WEAPONS[id].name}</option>)}
          </select>
        </Field>
      )}
      <Field label={kind === 'house' ? 'What the occupant says' : 'What the chest shows'}>
        <textarea rows={3} maxLength={200} value={h.text} onChange={e => onChange({ ...h, text: e.target.value })} />
      </Field>
      <p className="hint">{kind === 'house' ? 'Any of your units can visit it once by ending a move on it.' : 'Opened with a key, or a thief\'s lockpick.'}</p>
    </div>
  );
}
