import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS } from '../../game/data/chapters';
import { planEnemy } from '../../game/ai';
import {
  applyAttack, applyHeal, applyPotion, applySeize, attackableTargets, bestWeaponFor, createBattle,
  endEnemyPhase, endPlayerPhase, healAmount, healTargets, markDone, outcome, toResult,
  type BattleEvents, type BattleResult,
} from '../../game/battle';
import { canAttackAt, counterWeapon, forecast } from '../../game/combat';
import { TERRAIN } from '../../game/data/terrain';
import {
  computeReach, destinations, key, manhattan, pathTo, threatTiles, tilesInRange, unitAt, type Reach,
} from '../../game/pathfinding';
import type { BattleState, Campaign, Pos, Unit } from '../../game/types';
import { attackWeapons, isFlying, staffIndex, wdef } from '../../game/units';
import { profileFor } from '../../game/data/profiles';
import type { Strike, Forecast } from '../../game/combat';
import type { TerrainId } from '../../game/types';
import { ProfileView, Sheet } from '../Profile';
import { CombatScene } from './CombatScene';
import {
  HudForecast, HudUnit, LevelUpModal, TILE, TerrainInfo, TerrainLayer, TriangleLegend,
  UnitCard, UnitToken, type LevelUpView,
} from './parts';

const ANIM_KEY = 'oathbound-animations';
const readAnimPref = () => { try { return localStorage.getItem(ANIM_KEY) !== 'off'; } catch { return true; } };

interface SceneView { att: Unit; def: Unit; fc: Forecast; strikes: Strike[]; terrain: TerrainId; onDone: () => void; }

const STEP_MS = 85;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

type Mode =
  | { kind: 'idle' }
  | { kind: 'selected'; unitId: string }
  | { kind: 'menu'; unitId: string; from: Pos }
  | { kind: 'target'; unitId: string; from: Pos; action: 'attack' | 'heal'; targets: string[]; targetId: string; weaponIdx: number };

interface Float { id: number; x: number; y: number; text: string; tone: 'dmg' | 'heal' | 'exp' | 'gold' | 'info'; }
interface Banner { text: string; tone: string; sub?: string; }

export type SaveSource = () => { ok: true; battle: BattleState } | { ok: false; reason: string };

interface Props {
  chapterIndex: number;
  campaign: Campaign;
  /** Board state restored from a save. */
  resume?: BattleState;
  registerSave: (fn: SaveSource | null) => void;
  onOpenSaveMenu: (mode: 'save' | 'load') => void;
  onVictory: (r: BattleResult) => void;
  onDefeat: () => void;
  onQuit: () => void;
}

export function BattleScreen({ chapterIndex, campaign, resume, registerSave, onOpenSaveMenu, onVictory, onDefeat, onQuit }: Props) {
  const chapter = CHAPTERS[chapterIndex];
  const [state, _setState] = useState<BattleState>(() => (resume ? structuredClone(resume) : createBattle(chapterIndex, campaign.roster, campaign.ranks)));
  const stateRef = useRef(state);
  const setState = useCallback((s: BattleState) => { stateRef.current = s; _setState(s); }, []);

  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [busy, setBusy] = useState(true);
  const [hover, setHover] = useState<Pos | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [scene, setScene] = useState<SceneView | null>(null);
  const [details, setDetails] = useState(false);
  const [animOn, setAnimOn] = useState(readAnimPref);
  const [profileUnit, setProfileUnit] = useState<Unit | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [floats, setFloats] = useState<Float[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpView | null>(null);
  const [danger, setDanger] = useState(false);
  const [inspect, setInspect] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<(() => void) | null>(null);
  const endedRef = useRef(false);
  const floatSeq = useRef(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const busyRef = useRef(busy);
  busyRef.current = busy;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    registerSave(() => {
      if (endedRef.current) return { ok: false, reason: 'The battle is over.' };
      if (stateRef.current.phase !== 'player' || busyRef.current) return { ok: false, reason: 'Wait until it is your turn to save.' };
      const k = modeRef.current.kind;
      if (k === 'menu' || k === 'target') return { ok: false, reason: 'Finish or undo the current move before saving.' };
      return { ok: true, battle: structuredClone(stateRef.current) };
    });
    return () => registerSave(null);
  }, [registerSave]);

  /* ---------- helpers ---------- */

  const find = (id: string) => stateRef.current.units.find(u => u.id === id);

  async function showBanner(text: string, tone: string, ms: number, sub?: string) {
    setBanner({ text, tone, sub });
    await sleep(ms);
    setBanner(null);
    await sleep(120);
  }

  function addFloat(p: Pos, text: string, tone: Float['tone']) {
    const id = ++floatSeq.current;
    setFloats(f => [...f, { id, x: p.x, y: p.y, text, tone }]);
    window.setTimeout(() => setFloats(f => f.filter(z => z.id !== id)), 1300);
  }

  function waitContinue(ms: number) {
    return new Promise<void>(res => {
      const t = window.setTimeout(() => { continueRef.current = null; res(); }, ms);
      continueRef.current = () => { window.clearTimeout(t); continueRef.current = null; res(); };
    });
  }

  async function animateMove(unitId: string, path: Pos[]) {
    for (let i = 1; i < path.length; i++) {
      const s = stateRef.current;
      setState({ ...s, units: s.units.map(u => (u.id === unitId ? { ...u, x: path[i].x, y: path[i].y } : u)) });
      await sleep(STEP_MS);
    }
  }

  async function playEvents(ev: BattleEvents) {
    for (const x of ev.exp) {
      const u = find(x.unitId);
      if (u) addFloat(u, `+${x.amount} exp`, 'exp');
    }
    if (ev.gold) {
      const lord = stateRef.current.units.find(u => u.isLord);
      if (lord) addFloat(lord, `+${ev.gold} gold`, 'gold');
    }
    for (const lu of ev.levelUps) {
      const u = find(lu.unitId);
      if (!u) continue;
      setLevelUp({ name: lu.name, level: lu.level, gains: lu.gains, stats: u.stats, unit: u });
      await waitContinue(4500);
      setLevelUp(null);
      await sleep(120);
    }
  }

  async function doCombat(attId: string, defId: string, widx: number) {
    const before = stateRef.current;
    const att = before.units.find(u => u.id === attId);
    const def = before.units.find(u => u.id === defId);
    if (!att || !def) return;
    const res = applyAttack(before, attId, defId, widx, Math.random);
    if (animOn) {
      await new Promise<void>(resolve => setScene({
        att, def, fc: res.forecast, strikes: res.strikes, terrain: before.map[def.y][def.x], onDone: resolve,
      }));
      setScene(null);
    } else {
      for (const st of res.strikes) {
        const target = st.by === 'att' ? def : att;
        addFloat(target, st.hit ? `${st.crit ? 'Crit ' : ''}-${st.dmg}` : 'Miss', 'dmg');
        await sleep(420);
      }
    }
    setState(res.state);
    await playEvents(res.events);
  }

  async function doHeal(healerId: string, targetId: string) {
    const res = applyHeal(stateRef.current, healerId, targetId, Math.random);
    setState(res.state);
    const t = find(targetId);
    if (t) addFloat(t, `+${res.amount}`, 'heal');
    await sleep(650);
    await playEvents(res.events);
  }

  async function checkEnd(): Promise<boolean> {
    if (endedRef.current) return true;
    const s = stateRef.current;
    const o = outcome(s);
    if (o === 'ongoing') return false;
    endedRef.current = true;
    setBusy(true);
    setMode({ kind: 'idle' });
    if (o === 'victory') {
      await showBanner('Victory', 'victory', 2200, chapter.objectiveText);
      if (alive.current) onVictory(toResult(s));
    } else {
      await showBanner('Defeat', 'defeat', 2200, 'Kael has fallen. The oath is broken.');
      if (alive.current) onDefeat();
    }
    return true;
  }

  /* ---------- fit the map to the screen ---------- */

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - 16, h = el.clientHeight - 16;
      setScale(Math.max(0.4, Math.min(w / (state.width * TILE), h / (state.height * TILE))));
      setArea({ w: el.clientWidth, h: el.clientHeight });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.width, state.height]);

  function toggleAnim() {
    setAnimOn(v => {
      try { localStorage.setItem(ANIM_KEY, v ? 'off' : 'on'); } catch { /* storage unavailable */ }
      return !v;
    });
  }

  /* ---------- turn flow ---------- */

  useEffect(() => {
    (async () => {
      if (resume) {
        await showBanner('Player phase', 'player', 950, `Turn ${resume.turn}, resumed`);
      } else {
        await showBanner(chapter.title, 'chapter', 1700, `Chapter ${chapter.number}: ${chapter.objectiveText}`);
        await showBanner('Player phase', 'player', 950, 'Turn 1');
      }
      setBusy(false);
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runEnemyPhase() {
    const order = stateRef.current.units
      .filter(u => u.team === 'enemy')
      .sort((a, b) => Number(isFlying(b)) - Number(isFlying(a)) || b.stats.spd - a.stats.spd)
      .map(u => u.id);
    for (const id of order) {
      if (endedRef.current || !alive.current) return;
      const unit = find(id);
      if (!unit) continue;
      const plan = planEnemy(stateRef.current, unit);
      const acts = plan.path.length > 1 || !!plan.attack;
      if (plan.path.length > 1) { await animateMove(id, plan.path); await sleep(110); }
      if (plan.attack) await doCombat(id, plan.attack.targetId, plan.attack.weaponIdx);
      if (find(id)) setState(markDone(stateRef.current, id));
      if (await checkEnd()) return;
      if (acts) await sleep(140);
    }
  }

  async function endTurn() {
    if (endedRef.current) return;
    setBusy(true);
    setMode({ kind: 'idle' });
    setInspect(null);
    const r = endPlayerPhase(stateRef.current);
    setState(r.state);
    await showBanner('Enemy phase', 'enemy', 950);
    for (const h of r.heals) { const u = find(h.unitId); if (u) addFloat(u, `+${h.amount}`, 'heal'); }
    await runEnemyPhase();
    if (endedRef.current || !alive.current) return;
    const r2 = endEnemyPhase(stateRef.current);
    setState(r2.state);
    if (await checkEnd()) return;
    const obj = chapter.objective;
    const sub = obj.type === 'survive' ? `Turn ${r2.state.turn} of ${obj.turns}` : `Turn ${r2.state.turn}`;
    if (r2.spawned.length) await showBanner('Reinforcements', 'enemy', 1100, `${r2.spawned.length} enemies arrive`);
    await showBanner('Player phase', 'player', 950, sub);
    for (const h of r2.heals) { const u = find(h.unitId); if (u) addFloat(u, `+${h.amount}`, 'heal'); }
    setBusy(false);
  }

  async function finishAction(unitId: string) {
    if (find(unitId)) setState(markDone(stateRef.current, unitId));
    setMode({ kind: 'idle' });
    if (await checkEnd()) return;
    setBusy(false);
    const players = stateRef.current.units.filter(u => u.team === 'player');
    if (players.length && players.every(u => u.done)) await endTurn();
  }

  /* ---------- derived view data ---------- */

  const focusUnit = mode.kind === 'selected'
    ? state.units.find(u => u.id === mode.unitId)
    : mode.kind === 'idle' && inspect ? state.units.find(u => u.id === inspect) : undefined;

  const overlay = useMemo(() => {
    const move = new Set<number>(), attack = new Set<number>(), heal = new Set<number>();
    let reach: Reach | null = null;
    if (focusUnit) {
      reach = computeReach(state, focusUnit);
      const dests = focusUnit.team === 'enemy' && focusUnit.ai === 'hold' ? [{ x: focusUnit.x, y: focusUnit.y }] : destinations(state, focusUnit, reach);
      dests.forEach(p => move.add(key(p.x, p.y)));
      const ws = attackWeapons(focusUnit).map(i => wdef(focusUnit.weapons[i]));
      const si = staffIndex(focusUnit);
      for (const d of dests) {
        for (const w of ws) for (const p of tilesInRange(state, d, w.minRange, w.maxRange)) {
          const k = key(p.x, p.y); if (!move.has(k)) attack.add(k);
        }
        if (si >= 0) for (const p of tilesInRange(state, d, 1, 1)) {
          const k = key(p.x, p.y); if (!move.has(k) && !attack.has(k)) heal.add(k);
        }
      }
    }
    return { move, attack, heal, reach };
  }, [state, focusUnit]);

  const dangerSet = useMemo(() => {
    if (!danger) return null;
    const set = new Set<number>();
    for (const u of state.units) if (u.team === 'enemy') threatTiles(state, u).forEach(k => set.add(k));
    for (const k of [...set]) if (state.map[Math.floor(k / 64)][k % 64] === 'wall') set.delete(k);
    return set;
  }, [danger, state]);

  const pathPreview = useMemo(() => {
    if (mode.kind !== 'selected' || !hover || !overlay.reach || !overlay.move.has(key(hover.x, hover.y))) return [];
    return pathTo(overlay.reach, hover.x, hover.y);
  }, [mode, hover, overlay]);

  /* Decorative terrain that continues past the map edges so the battlefield fills the screen. */
  const extX = Math.max(0, Math.ceil((area.w / scale - state.width * TILE) / 2 / TILE) + 1);
  const extY = Math.max(0, Math.ceil((area.h / scale - state.height * TILE) / 2 / TILE) + 1);
  const surround = useMemo(() => {
    const rows: TerrainId[][] = [];
    for (let y = -extY; y < state.height + extY; y++) {
      const row: TerrainId[] = [];
      for (let x = -extX; x < state.width + extX; x++) {
        const cx = Math.max(0, Math.min(state.width - 1, x));
        const cy = Math.max(0, Math.min(state.height - 1, y));
        let t = state.map[cy][cx];
        if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
          if (t === 'road' || t === 'fort' || t === 'throne' || t === 'bridge') t = 'plains';
          const h = (Math.imul(x + 97, 73856093) ^ Math.imul(y + 89, 19349663)) >>> 0;
          const out = Math.max(-x, -y, x - state.width + 1, y - state.height + 1);
          if (t === 'plains' && h % 6 === 0) t = 'forest';
          else if (t === 'plains' && out > 2 && h % 9 === 1) t = 'mountain';
        }
        row.push(t);
      }
      rows.push(row);
    }
    return rows;
  }, [state.map, state.width, state.height, extX, extY]);

  /* ---------- input ---------- */

  function tileFromEvent(e: React.MouseEvent): Pos | null {
    const el = mapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * state.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * state.height);
    if (x < 0 || y < 0 || x >= state.width || y >= state.height) return null;
    return { x, y };
  }

  function cancel() {
    if (continueRef.current) { continueRef.current(); return; }
    if (profileUnit) { setProfileUnit(null); return; }
    if (busy) return;
    if (mode.kind === 'selected') setMode({ kind: 'idle' });
    else if (mode.kind === 'menu') {
      const s = stateRef.current;
      setState({ ...s, units: s.units.map(u => (u.id === mode.unitId ? { ...u, x: mode.from.x, y: mode.from.y } : u)) });
      setMode({ kind: 'selected', unitId: mode.unitId });
    } else if (mode.kind === 'target') setMode({ kind: 'menu', unitId: mode.unitId, from: mode.from });
    else setInspect(null);
  }

  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;

  /**
   * Keyboard / controller cursor. Arrows move the tile cursor (or step between targets while
   * aiming), Enter acts on the tile under it exactly like a click, [ and ] jump between units
   * that can still act. Returns true when the key was used.
   */
  const keyNavRef = useRef<(k: string) => boolean>(() => false);
  keyNavRef.current = (k: string): boolean => {
    const s = stateRef.current;
    if (busy || paused || profileUnit || endedRef.current || s.phase !== 'player' || mode.kind === 'menu') return false;
    const dir = ({ ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } as Record<string, number[]>)[k];
    const confirm = k === 'Enter' || k === ' ';
    if (mode.kind === 'target') {
      if (dir) {
        const n = mode.targets.length;
        const id = mode.targets[(mode.targets.indexOf(mode.targetId) + (dir[0] + dir[1] > 0 ? 1 : n - 1)) % n];
        selectTarget(id);
        return true;
      }
      if (confirm) { void confirmTarget(); return true; }
      return false;
    }
    const ready = s.units.filter(u => u.team === 'player' && !u.done);
    if (dir) {
      const from = hover ?? (() => { const u = ready[0] ?? s.units[0]; return { x: u.x - dir[0], y: u.y - dir[1] }; })();
      setHover({ x: Math.max(0, Math.min(s.width - 1, from.x + dir[0])), y: Math.max(0, Math.min(s.height - 1, from.y + dir[1])) });
      return true;
    }
    if ((k === '[' || k === ']') && ready.length) {
      const i = ready.findIndex(u => hover && u.x === hover.x && u.y === hover.y);
      const u = ready[(i + (k === ']' ? 1 : ready.length - 1) + (i < 0 && k === '[' ? 1 : 0)) % ready.length];
      setHover({ x: u.x, y: u.y });
      return true;
    }
    if (confirm && hover) { void clickTile(hover); return true; }
    return false;
  };
  // while aiming, the cursor sits on the current target
  const aimAt = mode.kind === 'target' ? mode.targetId : null;
  useEffect(() => {
    const t = aimAt && stateRef.current.units.find(u => u.id === aimAt);
    if (t) setHover({ x: t.x, y: t.y });
  }, [aimAt]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') cancelRef.current();
      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) setDetails(v => !v);
      if (e.key === ' ' || e.key === 'Enter') { if (continueRef.current) { e.preventDefault(); continueRef.current(); return; } }
      // a focused button or field keeps its own keys
      if (e.ctrlKey || e.metaKey || (e.target as HTMLElement | null)?.closest?.('button, a, input, select')) return;
      if (keyNavRef.current(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function enterTarget(unit: Unit, from: Pos, preferTarget?: string) {
    const s = stateRef.current;
    const targets = attackableTargets(s, unit);
    if (!targets.length) return;
    const t = targets.find(x => x.id === preferTarget) ?? targets[0];
    setMode({ kind: 'target', unitId: unit.id, from, action: 'attack', targets: targets.map(x => x.id), targetId: t.id, weaponIdx: bestWeaponFor(s, unit, t) });
  }

  function onMapClick(e: React.MouseEvent) {
    const p = tileFromEvent(e);
    if (p) void clickTile(p);
  }

  async function clickTile(p: Pos) {
    if (busy || endedRef.current) return;
    const s = stateRef.current;
    if (s.phase !== 'player') return;
    const u = unitAt(s, p.x, p.y);

    if (mode.kind === 'idle') {
      if (u && u.team === 'player' && !u.done) { setInspect(null); setMode({ kind: 'selected', unitId: u.id }); }
      else if (u) setInspect(inspect === u.id ? null : u.id);
      else setInspect(null);
      return;
    }

    if (mode.kind === 'selected') {
      const unit = s.units.find(x => x.id === mode.unitId);
      if (!unit) { setMode({ kind: 'idle' }); return; }
      const from = { x: unit.x, y: unit.y };
      if (u && u.id === unit.id) { setMode({ kind: 'menu', unitId: unit.id, from }); return; }
      if (u && u.team === 'player' && !u.done) { setMode({ kind: 'selected', unitId: u.id }); return; }
      const reach = overlay.reach;
      if (!u && reach && overlay.move.has(key(p.x, p.y))) {
        setBusy(true);
        await animateMove(unit.id, pathTo(reach, p.x, p.y));
        setBusy(false);
        setMode({ kind: 'menu', unitId: unit.id, from });
        return;
      }
      if (u && u.team === 'enemy' && reach) {
        // Clicking an enemy in range: walk to the safest tile that can hit it, then open the forecast.
        const options = destinations(s, unit, reach)
          .filter(d => attackWeapons(unit).some(i => canAttackAt(unit, i, manhattan(d, u))))
          .map(d => {
            const dist = manhattan(d, u);
            const t = TERRAIN[s.map[d.y][d.x]];
            const safe = counterWeapon(u, dist) === null ? 100 : 0;
            const cost = reach.get(key(d.x, d.y))?.cost ?? 0;
            return { d, score: safe + t.def * 10 + t.avo - cost };
          })
          .sort((a, b) => b.score - a.score);
        if (options.length) {
          const best = options[0].d;
          setBusy(true);
          await animateMove(unit.id, pathTo(reach, best.x, best.y));
          setBusy(false);
          const moved = find(unit.id);
          if (moved) enterTarget(moved, from, u.id);
          return;
        }
        setMode({ kind: 'idle' });
        setInspect(u.id);
        return;
      }
      setMode({ kind: 'idle' });
      return;
    }

    if (mode.kind === 'target') {
      if (u && mode.targets.includes(u.id)) {
        if (mode.targetId === u.id) await confirmTarget();
        else selectTarget(u.id);
      }
    }
  }

  function selectTarget(id: string) {
    if (mode.kind !== 'target' || mode.targetId === id) return;
    const s = stateRef.current;
    const actor = s.units.find(x => x.id === mode.unitId);
    const t = s.units.find(x => x.id === id);
    if (!actor || !t) return;
    setMode({ ...mode, targetId: id, weaponIdx: mode.action === 'attack' ? bestWeaponFor(s, actor, t) : mode.weaponIdx });
  }

  function onMapMove(e: React.MouseEvent) {
    const p = tileFromEvent(e);
    if (!p) { setHover(null); return; }
    if (!hover || hover.x !== p.x || hover.y !== p.y) {
      setHover(p);
      if (mode.kind === 'target' && !busy) {
        const u = unitAt(stateRef.current, p.x, p.y);
        if (u && mode.targets.includes(u.id)) selectTarget(u.id);
      }
    }
  }

  async function confirmTarget() {
    if (mode.kind !== 'target' || busy) return;
    const m = mode;
    setBusy(true);
    setMode({ kind: 'idle' });
    if (m.action === 'attack') await doCombat(m.unitId, m.targetId, m.weaponIdx);
    else await doHeal(m.unitId, m.targetId);
    await finishAction(m.unitId);
  }

  function cycleWeapon(dir: number) {
    if (mode.kind !== 'target' || mode.action !== 'attack') return;
    const s = stateRef.current;
    const actor = s.units.find(x => x.id === mode.unitId);
    const t = s.units.find(x => x.id === mode.targetId);
    if (!actor || !t) return;
    const opts = attackWeapons(actor).filter(i => canAttackAt(actor, i, manhattan(actor, t)));
    if (opts.length < 2) return;
    const cur = Math.max(0, opts.indexOf(mode.weaponIdx));
    setMode({ ...mode, weaponIdx: opts[(cur + dir + opts.length) % opts.length] });
  }

  async function onMenu(action: string) {
    if (mode.kind !== 'menu') return;
    const m = mode;
    const s = stateRef.current;
    const u = s.units.find(x => x.id === m.unitId);
    if (!u) return;
    if (action === 'attack') { enterTarget(u, m.from); return; }
    if (action === 'heal') {
      const ts = healTargets(s, u);
      if (ts.length) setMode({ kind: 'target', unitId: u.id, from: m.from, action: 'heal', targets: ts.map(t => t.id), targetId: ts[0].id, weaponIdx: staffIndex(u) });
      return;
    }
    setBusy(true);
    setMode({ kind: 'idle' });
    if (action === 'item') {
      const r = applyPotion(s, u.id);
      setState(r.state);
      addFloat(u, `+${r.amount}`, 'heal');
      await sleep(600);
    }
    if (action === 'seize') setState(applySeize(stateRef.current));
    await finishAction(u.id);
  }

  /* ---------- render ---------- */

  const menuUnit = mode.kind === 'menu' ? state.units.find(u => u.id === mode.unitId) : undefined;
  const menuItems: { id: string; label: string }[] = [];
  if (menuUnit) {
    if (attackableTargets(state, menuUnit).length) menuItems.push({ id: 'attack', label: 'Attack' });
    if (healTargets(state, menuUnit).length) menuItems.push({ id: 'heal', label: `Heal (+${healAmount(menuUnit)})` });
    if (menuUnit.potions > 0 && menuUnit.hp < menuUnit.stats.hp) menuItems.push({ id: 'item', label: `Vulnerary (${menuUnit.potions})` });
    const o = chapter.objective;
    if (o.type === 'seize' && menuUnit.isLord && menuUnit.x === o.x && menuUnit.y === o.y) menuItems.push({ id: 'seize', label: 'Seize' });
    menuItems.push({ id: 'wait', label: 'Wait' });
  }

  const targetMode = mode.kind === 'target' ? mode : null;
  const actor = targetMode ? state.units.find(u => u.id === targetMode.unitId) : undefined;
  const target = targetMode ? state.units.find(u => u.id === targetMode.targetId) : undefined;
  const fc = targetMode && targetMode.action === 'attack' && actor && target ? forecast(state, actor, target, targetMode.weaponIdx) : null;
  const weaponChoices = actor && target ? attackWeapons(actor).filter(i => canAttackAt(actor, i, manhattan(actor, target))).length : 0;

  const hoverUnit = hover ? unitAt(state, hover.x, hover.y) : undefined;
  const infoUnit = hoverUnit ?? focusUnit ?? menuUnit;
  const hoverTerrain = hover ? state.map[hover.y][hover.x] : null;

  const obj = chapter.objective;
  const W = state.width * TILE, H = state.height * TILE;
  const playersLeft = state.units.filter(u => u.team === 'player' && !u.done).length;

  const menuPos = menuUnit ? {
    left: menuUnit.x * TILE + (menuUnit.x > state.width - 4 ? -132 : TILE + 6),
    top: Math.min(menuUnit.y * TILE, H - (menuItems.length * 38 + 12)),
  } : null;

  const tileStyle = (k: number) => ({ left: (k % 64) * TILE, top: Math.floor(k / 64) * TILE, width: TILE, height: TILE });

  const hudContext = fc && actor && target ? (
    <HudForecast att={actor} def={target} fc={fc} weaponChoices={weaponChoices} onCycle={cycleWeapon} onConfirm={confirmTarget} onCancel={cancel} />
  ) : targetMode && targetMode.action === 'heal' && actor && target ? (
    <div className="hud-heal">
      <span><b>{actor.name}</b> heals <b>{target.name}</b>: {target.hp} → {Math.min(target.stats.hp, target.hp + healAmount(actor))} / {target.stats.hp}</span>
      <button className="primary" onClick={confirmTarget}>Heal</button>
      <button className="ghost" onClick={cancel}>Back</button>
    </div>
  ) : infoUnit ? (
    <HudUnit u={infoUnit} terrain={hoverTerrain} onProfile={() => setProfileUnit(infoUnit)} />
  ) : (
    <div className="hud-hint">
      {hoverTerrain ? <TerrainInfo t={hoverTerrain} /> : null}
      <span className="kbm-only">Click a unit, then a blue tile to move. Click a red enemy to attack it. Right-click or Esc undoes. Press D for details.</span>
      <span className="pad-only">Move the cursor with the D-pad or left stick. <b className="pad-a" /> selects and confirms, <b className="pad-b" /> undoes, <b className="pad-lb" /> <b className="pad-rb" /> jump between units that can still act.</span>
    </div>
  );

  const secondUnit = target ?? (hoverUnit && focusUnit && hoverUnit.id !== focusUnit.id ? focusUnit : undefined);
  const profile = profileUnit ? profileFor(profileUnit) : undefined;

  return (
    <div className={`battle backdrop-${chapter.backdrop}`}>
      <div className="map-area" ref={areaRef}>
        {area.w > 0 && (
          <div
            className="map-surround"
            aria-hidden="true"
            style={{ width: surround[0].length * TILE, height: surround.length * TILE, transform: `translate(-50%, -50%) scale(${scale})` }}
          >
            <TerrainLayer map={surround} />
          </div>
        )}
        <div className="map-frame" style={{ width: W * scale, height: H * scale }}>
          <div
            className={`map ${busy ? 'is-busy' : ''}`}
            ref={mapRef}
            style={{ width: W, height: H, transform: `scale(${scale})` }}
            onClick={onMapClick}
            onMouseMove={onMapMove}
            onMouseLeave={() => setHover(null)}
            onContextMenu={e => { e.preventDefault(); cancel(); }}
          >
            <TerrainLayer map={state.map} />
            <div className="hl-layer">
              {dangerSet && [...dangerSet].map(k => <div key={`d${k}`} className="hl danger" style={tileStyle(k)} />)}
              {[...overlay.move].map(k => <div key={`m${k}`} className={`hl move ${focusUnit?.team === 'enemy' ? 'foe' : ''}`} style={tileStyle(k)} />)}
              {[...overlay.attack].map(k => <div key={`a${k}`} className="hl attack" style={tileStyle(k)} />)}
              {[...overlay.heal].map(k => <div key={`h${k}`} className="hl heal" style={tileStyle(k)} />)}
              {targetMode && targetMode.targets.map(id => {
                const t = state.units.find(u => u.id === id);
                return t ? <div key={`t${id}`} className={`hl ${targetMode.action === 'heal' ? 'heal' : 'attack'} strong`} style={tileStyle(key(t.x, t.y))} /> : null;
              })}
              {obj.type === 'seize' && <div className="hl seize" style={tileStyle(key(obj.x, obj.y))} />}
              {pathPreview.slice(1).map((p, i) => <div key={`p${i}`} className="path-dot" style={{ left: p.x * TILE + TILE / 2 - 5, top: p.y * TILE + TILE / 2 - 5 }} />)}
              {hover && !busy && <div className="hl cursor" style={tileStyle(key(hover.x, hover.y))} />}
            </div>
            <div className="unit-layer">
              {state.units.map(u => (
                <UnitToken
                  key={u.id}
                  u={u}
                  selected={(mode.kind !== 'idle' && mode.unitId === u.id) || inspect === u.id}
                  targeted={!!targetMode && targetMode.targetId === u.id}
                  healed={floats.some(f => f.tone === 'heal' && f.x === u.x && f.y === u.y)}
                />
              ))}
            </div>
            {floats.map(f => (
              <div key={f.id} className={`float ${f.tone}`} style={{ left: f.x * TILE + TILE / 2, top: f.y * TILE }}>{f.text}</div>
            ))}
            {menuUnit && menuPos && !busy && (
              <div className="action-menu" style={menuPos} onClick={e => e.stopPropagation()}>
                {menuItems.map((m, i) => (
                  <button key={m.id} autoFocus={i === 0} onClick={() => onMenu(m.id)}>{m.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {details && (
          <div className="drawer" role="region" aria-label="Battle details">
            <header>
              <h3>Details</h3>
              <button className="ghost small" onClick={() => setDetails(false)}>Hide (D)</button>
            </header>
            <div className="drawer-grid">
              {infoUnit ? (
                <div className="drawer-col">
                  <UnitCard u={infoUnit} state={state} />
                  {profileFor(infoUnit) && <button className="ghost small" onClick={() => setProfileUnit(infoUnit)}>View {infoUnit.name}'s profile</button>}
                </div>
              ) : <div className="empty-card">Hover or select a unit to see its full stats.</div>}
              {secondUnit && secondUnit.id !== infoUnit?.id && <div className="drawer-col"><UnitCard u={secondUnit} state={state} /></div>}
              <div className="drawer-col">
                {hoverTerrain && <TerrainInfo t={hoverTerrain} />}
                <TriangleLegend />
              </div>
              <ol className="log drawer-col" aria-live="polite">
                {state.log.slice(-9).map((l, i) => <li key={`${state.log.length}-${i}`}>{l}</li>)}
              </ol>
            </div>
          </div>
        )}
      </div>

      <footer className="hud">
        <section className="hud-obj">
          <div className="chapter-no">Chapter {chapter.number}: {chapter.title}</div>
          <p>{chapter.objectiveText}</p>
          <div className="turn-row">
            <span className={`phase-tag ${state.phase}`}>{state.phase === 'player' ? 'Your turn' : 'Enemy turn'}</span>
            <span>Turn {state.turn}{obj.type === 'survive' ? ` of ${obj.turns}` : ''}</span>
            <span>{(n => `${n} ${n === 1 ? 'foe' : 'foes'}`)(state.units.filter(u => u.team === 'enemy').length)}</span>
          </div>
        </section>
        <section className="hud-context">{hudContext}</section>
        <section className="hud-actions">
          <button className="primary" data-pad="select" disabled={busy || state.phase !== 'player'} onClick={endTurn}>
            End turn{playersLeft ? ` (${playersLeft})` : ''}
          </button>
          <div className="hud-toggles">
            <button className={danger ? 'toggle on' : 'toggle'} data-pad="y" onClick={() => setDanger(d => !d)} aria-pressed={danger}>Danger zone</button>
            <button className={details ? 'toggle on' : 'toggle'} data-pad="x" onClick={() => setDetails(d => !d)} aria-pressed={details}>Details</button>
            <button className="ghost" data-pad="start" onClick={() => setPaused(true)}>Menu</button>
          </div>
        </section>
      </footer>

      {scene && <CombatScene {...scene} />}
      {levelUp && <LevelUpModal view={levelUp} onClose={() => continueRef.current?.()} />}
      {banner && (
        <div className={`phase-banner ${banner.tone}`}>
          <div className="ribbon"><span>{banner.text}</span>{banner.sub && <small>{banner.sub}</small>}</div>
        </div>
      )}
      {profile && profileUnit && (
        <Sheet title={profileUnit.team === 'player' ? 'Companion' : 'Enemy'} onClose={() => setProfileUnit(null)} wide>
          <ProfileView profile={profile} />
        </Sheet>
      )}
      {paused && (
        <div className="modal-back" onClick={() => { setPaused(false); setConfirmQuit(false); }}>
          <div className="pause" onClick={e => e.stopPropagation()}>
            <h3>Paused</h3>
            <button className="primary" onClick={() => setPaused(false)}>Resume</button>
            <button onClick={() => { setPaused(false); onOpenSaveMenu('save'); }}>Save game <kbd>Ctrl+S</kbd></button>
            <button onClick={() => { setPaused(false); onOpenSaveMenu('load'); }}>Load game <kbd>Ctrl+O</kbd></button>
            <button className={animOn ? 'toggle on' : 'toggle'} aria-pressed={animOn} onClick={toggleAnim}>
              Battle animations: {animOn ? 'on' : 'off'}
            </button>
            {!confirmQuit
              ? <button className="ghost" onClick={() => setConfirmQuit(true)}>Quit to title</button>
              : <button className="danger" onClick={onQuit}>Quit and lose this battle's progress</button>}
          </div>
        </div>
      )}
    </div>
  );
}
