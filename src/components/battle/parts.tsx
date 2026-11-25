import { memo } from 'react';
import { buildFor, lookFor } from '../../game/data/characters';
import { TERRAIN } from '../../game/data/terrain';
import { bondBonus, type Forecast, type SideCalc } from '../../game/combat';
import type { BattleState, Stats, TerrainId, Unit } from '../../game/types';
import { STAT_KEYS, STAT_LABEL } from '../../game/types';
import { canWield, classOf, movOf, wdef, weaponLabel } from '../../game/units';
import { profileFor } from '../../game/data/profiles';
import { Portrait, TileArt, WeaponIcon } from '../art';
import { Figure, standPose } from '../figure';

export const TILE = 48;

/** Which sides of a water tile touch land: 1 north, 2 east, 4 south, 8 west. The map edge counts as more water. */
function shoreMask(map: TerrainId[][], x: number, y: number): number {
  const land = (nx: number, ny: number) => { const t = map[ny]?.[nx]; return t !== undefined && t !== 'water' && t !== 'bridge'; };
  return (land(x, y - 1) ? 1 : 0) | (land(x + 1, y) ? 2 : 0) | (land(x, y + 1) ? 4 : 0) | (land(x - 1, y) ? 8 : 0);
}

export const TerrainLayer = memo(function TerrainLayer({ map }: { map: TerrainId[][] }) {
  return (
    <div className="terrain" style={{ gridTemplateColumns: `repeat(${map[0].length}, ${TILE}px)` }}>
      {map.flatMap((row, y) => row.map((t, x) => (
        <div key={`${x},${y}`} className={`tile t-${t} ${(x + y) % 2 ? 'odd' : ''}`}>
          <TileArt t={t} x={x} y={y} mask={t === 'water' ? shoreMask(map, x, y) : 0} />
        </div>
      )))}
    </div>
  );
});

export function HpBar({ hp, max, big }: { hp: number; max: number; big?: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const tone = pct > 50 ? 'ok' : pct > 25 ? 'warn' : 'low';
  return <div className={`hpbar ${big ? 'big' : ''}`}><div className={tone} style={{ width: `${pct}%` }} /></div>;
}

export function UnitToken({ u, selected, targeted, healed }: { u: Unit; selected: boolean; targeted: boolean; healed?: boolean }) {
  const w = u.weapons[u.equipped];
  return (
    <div
      className={`unit team-${u.team} ${u.done ? 'done' : ''} ${selected ? 'sel' : ''} ${targeted ? 'targeted' : ''} ${classOf(u).moveType === 'flying' ? 'flying' : ''}`}
      style={{ transform: `translate(${u.x * TILE}px, ${u.y * TILE}px)` }}
    >
      <div className="unit-base" />
      <div className="sprite"><Figure look={lookFor(u)} build={buildFor(u)} weapon={w && wdef(w).type} pose={healed ? 'healed' : u.done ? 'rest' : standPose(u.hp, u.stats.hp)} facing={u.team === 'enemy' ? 'left' : 'right'} size={56} /></div>
      {w && <span className="unit-weapon"><WeaponIcon type={wdef(w).type} size={13} /></span>}
      {u.isBoss && <span className="boss-mark" title="Boss">♛</span>}
      <HpBar hp={u.hp} max={u.stats.hp} />
    </div>
  );
}

export function UnitCard({ u, state, compact }: { u: Unit; state?: BattleState; compact?: boolean }) {
  const c = classOf(u);
  const bond = state ? bondBonus(state, u, u).hit : 0;
  return (
    <div className={`unit-card team-${u.team}`}>
      <div className="uc-head">
        <div className="uc-portrait"><Portrait look={lookFor(u)} size={58} /></div>
        <div className="uc-id">
          <strong>{u.name}{u.isBoss ? ' ♛' : ''}</strong>
          <span>Lv {u.level} {c.name}{u.team === 'player' ? <i> ({u.exp}/100 exp)</i> : null}</span>
          <div className="uc-hp"><HpBar hp={u.hp} max={u.stats.hp} /><span>{u.hp}/{u.stats.hp}</span></div>
        </div>
      </div>
      {!compact && (
        <>
          <div className="uc-stats">
            {STAT_KEYS.filter(k => k !== 'hp').map(k => (
              <div key={k}><span>{STAT_LABEL[k]}</span><b>{u.stats[k]}</b></div>
            ))}
            <div><span>Mov</span><b>{movOf(u)}</b></div>
          </div>
          <ul className="uc-weapons">
            {u.weapons.map((w, i) => (
              <li key={w.uid} className={`${i === u.equipped ? 'eq' : ''} ${canWield(u, w) ? '' : 'unusable'}`}>
                <WeaponIcon type={wdef(w).type} size={14} /> {weaponLabel(w)}
                <small>{wdef(w).type === 'staff' ? `heals ${wdef(w).heal}` : `Mt ${wdef(w).might + w.forge}, range ${wdef(w).minRange}${wdef(w).maxRange > 1 ? `–${wdef(w).maxRange}` : ''}`}</small>
              </li>
            ))}
            {u.potions > 0 && <li className="potion">Vulnerary ×{u.potions}</li>}
          </ul>
          {bond > 0 && <div className="uc-bond">Bond support: +{bond} hit / avoid</div>}
          {u.team === 'enemy' && u.ai && <div className="uc-ai">{u.ai === 'aggressive' ? 'Advancing' : u.ai === 'guard' ? 'Guarding — attacks if you come in range' : 'Holding position'}</div>}
        </>
      )}
    </div>
  );
}

export function TerrainInfo({ t }: { t: TerrainId }) {
  const d = TERRAIN[t];
  return (
    <div className="terrain-info">
      <strong>{d.name}</strong>
      <span>Def +{d.def}</span><span>Avo +{d.avo}</span>{d.heal > 0 && <span>Heals {d.heal}%</span>}
    </div>
  );
}

function triMark(sc: SideCalc) {
  if (sc.tri > 0) return <span className="tri up" title="Weapon advantage">▲</span>;
  if (sc.tri < 0) return <span className="tri down" title="Weapon disadvantage">▼</span>;
  return null;
}

export function ForecastPanel({ att, def, fc, weaponChoices, onCycle, onConfirm, onCancel }: {
  att: Unit; def: Unit; fc: Forecast; weaponChoices: number; onCycle: (d: number) => void; onConfirm: () => void; onCancel: () => void;
}) {
  const col = (u: Unit, sc: SideCalc, foeSc: SideCalc) => {
    const after = Math.max(0, u.hp - foeSc.dmg * foeSc.attacks);
    return (
      <div className={`fc-col team-${u.team}`}>
        <div className="fc-name">{u.name}</div>
        <div className="fc-weapon"><WeaponIcon type={sc.weaponType} size={14} /> {sc.weaponName} {triMark(sc)}</div>
        <dl>
          <dt>HP</dt><dd>{u.hp}<small> → {after}</small></dd>
          <dt>Dmg</dt><dd>{sc.weaponIdx == null ? '—' : sc.dmg}{sc.attacks === 2 && <em> ×2</em>}</dd>
          <dt>Hit</dt><dd>{sc.weaponIdx == null ? '—' : `${sc.hit}%`}</dd>
          <dt>Crit</dt><dd>{sc.weaponIdx == null ? '—' : `${sc.crit}%`}</dd>
        </dl>
        {sc.effective && <div className="fc-tag">Effective!</div>}
        {sc.bond > 0 && <div className="fc-tag bond">Bond +{sc.bond}</div>}
      </div>
    );
  };
  return (
    <div className="forecast">
      <div className="fc-title">Combat forecast</div>
      <div className="fc-grid">{col(att, fc.att, fc.def)}{col(def, fc.def, fc.att)}</div>
      {weaponChoices > 1 && (
        <div className="fc-cycle">
          <button onClick={() => onCycle(-1)} aria-label="Previous weapon">◀</button>
          <span>Change weapon</span>
          <button onClick={() => onCycle(1)} aria-label="Next weapon">▶</button>
        </div>
      )}
      <div className="fc-actions">
        <button className="primary" onClick={onConfirm}>Attack</button>
        <button className="ghost" onClick={onCancel}>Back</button>
      </div>
      <p className="hint">Click the target again to attack.</p>
    </div>
  );
}

export interface LevelUpView { name: string; level: number; gains: Partial<Stats>; stats: Stats; unit: Unit; }

export function LevelUpModal({ view, onClose }: { view: LevelUpView; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="levelup" role="dialog" aria-label="Level up">
        <div className="lu-portrait"><Portrait look={lookFor(view.unit)} size={110} /></div>
        <Figure look={lookFor(view.unit)} build={buildFor(view.unit)} weapon={view.unit.weapons[view.unit.equipped] && wdef(view.unit.weapons[view.unit.equipped]).type} pose="levelup" size={120} />
        <div>
          <h3>{view.name} reached level {view.level}</h3>
          <div className="lu-stats">
            {STAT_KEYS.map(k => (
              <div key={k} className={view.gains[k] ? 'up' : ''}>
                <span>{STAT_LABEL[k]}</span><b>{view.stats[k]}</b>{view.gains[k] ? <em>+{view.gains[k]}</em> : null}
              </div>
            ))}
          </div>
          <p className="hint">Click to continue</p>
        </div>
      </div>
    </div>
  );
}

export function TriangleLegend() {
  return (
    <div className="triangle">
      <svg viewBox="0 0 120 92" width="120" height="92" aria-label="Weapon triangle: sword beats axe, axe beats lance, lance beats sword">
        <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#c9a14a" /></marker></defs>
        <line x1="34" y1="22" x2="86" y2="22" stroke="#c9a14a" strokeWidth="1.6" markerEnd="url(#arr)" />
        <line x1="92" y1="32" x2="66" y2="70" stroke="#c9a14a" strokeWidth="1.6" markerEnd="url(#arr)" />
        <line x1="54" y1="70" x2="28" y2="32" stroke="#c9a14a" strokeWidth="1.6" markerEnd="url(#arr)" />
        <g transform="translate(12,10)"><WeaponIcon type="sword" size={22} /></g>
        <g transform="translate(88,10)"><WeaponIcon type="axe" size={22} /></g>
        <g transform="translate(49,66)"><WeaponIcon type="lance" size={22} /></g>
      </svg>
      <p>Sword beats axe, axe beats lance, lance beats sword: +15 hit, +1 damage. Bows reach 2 tiles and double their might against fliers.</p>
    </div>
  );
}

/* ---------- Bottom HUD ---------- */

export function HudUnit({ u, terrain, onProfile }: { u: Unit; terrain?: TerrainId | null; onProfile?: () => void }) {
  const w = u.weapons[u.equipped];
  return (
    <div className={`hud-unit team-${u.team}`}>
      <div className="hu-portrait"><Portrait look={lookFor(u)} size={56} /></div>
      <div className="hu-main">
        <div className="hu-name"><strong>{u.name}{u.isBoss ? ' ♛' : ''}</strong><span>Lv {u.level} {classOf(u).name}</span></div>
        <div className="uc-hp"><HpBar hp={u.hp} max={u.stats.hp} /><span>{u.hp}/{u.stats.hp}</span></div>
        <div className="hu-weapon">{w && <><WeaponIcon type={wdef(w).type} size={14} /> {weaponLabel(w)}</>}{u.potions > 0 && <span className="hu-pot">Vulnerary ×{u.potions}</span>}</div>
      </div>
      <dl className="hu-stats">
        {STAT_KEYS.filter(k => k !== 'hp').map(k => <div key={k}><dt>{STAT_LABEL[k]}</dt><dd>{u.stats[k]}</dd></div>)}
        <div><dt>Mov</dt><dd>{movOf(u)}</dd></div>
      </dl>
      <div className="hu-side">
        {terrain && <span className="hu-terrain">{TERRAIN[terrain].name}{TERRAIN[terrain].def || TERRAIN[terrain].avo ? ` +${TERRAIN[terrain].def} def, +${TERRAIN[terrain].avo} avo` : ''}</span>}
        {onProfile && profileFor(u) && <button className="ghost small" onClick={onProfile}>Profile</button>}
      </div>
    </div>
  );
}

export function HudForecast({ att, def, fc, weaponChoices, onCycle, onConfirm, onCancel }: {
  att: Unit; def: Unit; fc: Forecast; weaponChoices: number; onCycle: (d: number) => void; onConfirm: () => void; onCancel: () => void;
}) {
  const side = (u: Unit, sc: SideCalc, foe: SideCalc) => (
    <div className={`hf-side team-${u.team}`}>
      <div className="hf-who"><strong>{u.name}</strong><span><WeaponIcon type={sc.weaponType} size={13} /> {sc.weaponName} {triMark(sc)}</span></div>
      <dl>
        <div><dt>HP</dt><dd>{u.hp}<small>→{Math.max(0, u.hp - foe.dmg * foe.attacks)}</small></dd></div>
        <div><dt>Dmg</dt><dd>{sc.weaponIdx == null ? '–' : sc.dmg}{sc.attacks === 2 && <em>×2</em>}</dd></div>
        <div><dt>Hit</dt><dd>{sc.weaponIdx == null ? '–' : sc.hit}</dd></div>
        <div><dt>Crit</dt><dd>{sc.weaponIdx == null ? '–' : sc.crit}</dd></div>
      </dl>
      {(sc.effective || sc.bond > 0) && <div className="hf-tags">{sc.effective && <span>Effective</span>}{sc.bond > 0 && <span className="bond">Bond +{sc.bond}</span>}</div>}
    </div>
  );
  return (
    <div className="hud-forecast">
      {side(att, fc.att, fc.def)}
      <div className="hf-vs">
        {weaponChoices > 1 && <button className="small" onClick={() => onCycle(1)} title="Switch weapon">Switch weapon</button>}
      </div>
      {side(def, fc.def, fc.att)}
      <div className="hf-actions">
        <button className="primary" onClick={onConfirm}>Attack</button>
        <button className="ghost" onClick={onCancel}>Back</button>
      </div>
    </div>
  );
}
