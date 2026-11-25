import { useEffect, useRef, useState } from 'react';
import { buildFor, lookFor } from '../../game/data/characters';
import { TERRAIN } from '../../game/data/terrain';
import type { Forecast, Strike } from '../../game/combat';
import type { TerrainId, Unit } from '../../game/types';
import { classOf } from '../../game/units';
import { WeaponIcon } from '../art';
import { Figure, attackPose, standPose, type Pose } from '../figure';
import { HpBar } from './parts';

type Role = 'att' | 'def';

interface Props {
  att: Unit;
  def: Unit;
  fc: Forecast;
  strikes: Strike[];
  terrain: TerrainId;
  onDone: () => void;
}

const other = (r: Role): Role => (r === 'att' ? 'def' : 'att');

/**
 * Plays out one exchange between two units: dash in, swing, hit / dodge / fall.
 * The player's unit is always on the left facing right. Click or press Space to skip.
 */
export function CombatScene({ att, def, fc, strikes, terrain, onDone }: Props) {
  const leftRole: Role = att.team === 'player' ? 'att' : 'def';
  const [poses, setPoses] = useState<Record<Role, Pose>>({ att: standPose(att.hp, att.stats.hp), def: standPose(def.hp, def.stats.hp) });
  const [nonce, setNonce] = useState<Record<Role, number>>({ att: 0, def: 0 });
  const [hp, setHp] = useState({ att: att.hp, def: def.hp });
  const [dash, setDash] = useState<Role | null>(null);
  const [flash, setFlash] = useState<Role | null>(null);
  const [cue, setCue] = useState<Role | null>(null);
  const [shake, setShake] = useState(false);
  const [arrow, setArrow] = useState<{ by: Role; n: number } | null>(null);
  const [pop, setPop] = useState<{ role: Role; text: string; kind: 'dmg' | 'crit' | 'miss' } | null>(null);
  const skip = useRef(false);

  const ranged = fc.dist >= 2;
  const pos: Record<'L' | 'R', number> = ranged ? { L: 20, R: 80 } : { L: 31, R: 69 };
  const slotOf = (r: Role) => (r === leftRole ? 'L' : 'R');

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) => (skip.current ? Promise.resolve() : new Promise<void>(r => setTimeout(r, ms)));
    const setPose = (r: Role, p: Pose) => {
      setPoses(s => ({ ...s, [r]: p }));
      setNonce(n => ({ ...n, [r]: n[r] + 1 }));
    };
    (async () => {
      await wait(450);
      for (const st of strikes) {
        const who = st.by;
        const foe = other(who);
        const wt = fc[who].weaponType;
        const p = attackPose(wt);
        const foeHp = foe === 'att' ? st.attHp : st.defHp;
        if (st.crit) { setCue(who); await wait(450); }
        setPose(who, p);
        if (wt !== 'bow' && wt !== 'breath') setDash(who); // archers and dragons strike from where they stand
        if (p === 'shoot') {
          await wait(390);
          setArrow({ by: who, n: Math.random() });
          await wait(230);
        } else {
          await wait(p === 'chop' ? 400 : p === 'thrust' ? 320 : 350);
        }
        if (st.hit) {
          setPose(foe, foeHp <= 0 ? 'die' : 'hit');
          setFlash(foe);
          if (st.crit) setShake(true);
        } else {
          setPose(foe, 'dodge');
        }
        setPop({ role: foe, text: st.hit ? String(st.dmg) : 'Miss', kind: !st.hit ? 'miss' : st.crit ? 'crit' : 'dmg' });
        setHp({ att: st.attHp, def: st.defHp });
        await wait(240);
        setFlash(null);
        setArrow(null);
        await wait(330);
        setDash(null);
        setShake(false);
        setCue(null);
        await wait(300);
        setPop(null);
        // back to a ready stance (wounded if badly hurt); whoever felled their foe celebrates
        const stand = (r: Role) => standPose(r === 'att' ? st.attHp : st.defHp, (r === 'att' ? att : def).stats.hp);
        if (foeHp > 0) setPose(foe, stand(foe));
        setPose(who, foeHp <= 0 ? 'victory' : stand(who));
        await wait(170);
      }
      const last = strikes[strikes.length - 1];
      await wait(last && (last.attHp <= 0 || last.defHp <= 0) ? 750 : 300);
      if (!cancelled) onDone();
    })();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); skip.current = true; }
    };
    window.addEventListener('keydown', onKey);
    return () => { cancelled = true; window.removeEventListener('keydown', onKey); };
    // The sequence runs once per mounted scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fighter = (role: Role) => {
    const u = role === 'att' ? att : def;
    const slot = slotOf(role);
    const lunge = dash === role ? (slot === 'L' ? 1 : -1) * 110 : 0;
    return (
      <div
        key={role}
        className={`cs-fighter ${slot} ${flash === role ? 'flash' : ''} ${cue === role ? 'cue' : ''}`}
        style={{ left: `${pos[slot]}%`, transform: `translateX(-50%) translateX(${lunge}px)` }}
      >
        {cue === role && <div className="cs-crit-label">Critical!</div>}
        <Figure
          key={`${role}-${nonce[role]}`}
          look={lookFor(u)}
          build={buildFor(u)}
          weapon={fc[role].weaponType}
          weaponId={fc[role].weaponIdx == null ? undefined : u.weapons[fc[role].weaponIdx!]?.defId}
          pose={poses[role]}
          facing={slot === 'L' ? 'right' : 'left'}
          size={240}
        />
        {pop && pop.role === role && <div className={`cs-pop ${pop.kind}`}>{pop.text}</div>}
      </div>
    );
  };

  const panel = (role: Role) => {
    const u = role === 'att' ? att : def;
    const sc = fc[role];
    return (
      <div className={`cs-panel team-${u.team} ${slotOf(role)}`}>
        <div className="cs-panel-head">
          <strong>{u.name}</strong>
          <span>Lv {u.level} {classOf(u).name}</span>
        </div>
        <div className="cs-weapon"><WeaponIcon type={sc.weaponType} size={15} /> {sc.weaponName}</div>
        <div className="cs-hp"><HpBar hp={hp[role]} max={u.stats.hp} big /><b>{hp[role]}</b></div>
        <div className="cs-nums">
          <span>Dmg <b>{sc.weaponIdx == null ? '–' : sc.dmg}{sc.attacks === 2 ? ' ×2' : ''}</b></span>
          <span>Hit <b>{sc.weaponIdx == null ? '–' : `${sc.hit}%`}</b></span>
          <span>Crit <b>{sc.weaponIdx == null ? '–' : `${sc.crit}%`}</b></span>
        </div>
      </div>
    );
  };

  const leftR = leftRole;
  const rightR = other(leftRole);
  const arrowFrom = arrow ? pos[slotOf(arrow.by)] : 0;
  const arrowTo = arrow ? pos[slotOf(other(arrow.by))] : 0;

  return (
    <div className="cs-back" onClick={() => { skip.current = true; }} role="dialog" aria-label={`${att.name} attacks ${def.name}`}>
      <div className={`cs-stage cs-${terrain} ${shake ? 'shake' : ''}`}>
        <div className="cs-scenery" />
        <div className="cs-ground"><span>{TERRAIN[terrain].name}</span></div>
        {fighter(leftR)}
        {fighter(rightR)}
        {arrow && (
          <div
            key={arrow.n}
            className={`cs-arrow ${arrowTo < arrowFrom ? 'rev' : ''}`}
            style={{ ['--from' as string]: `${arrowFrom + (arrowTo > arrowFrom ? 6 : -6)}%`, ['--to' as string]: `${arrowTo}%` }}
          >
            <svg viewBox="0 0 40 8" width="40" height="8"><line x1="2" y1="4" x2="33" y2="4" stroke="#e8d8b0" strokeWidth="1.6" /><path d="M33 1 L40 4 L33 7 Z" fill="#e4ebf3" /><path d="M2 4 l-2 -3 M2 4 l-2 3" stroke="#c9944a" strokeWidth="1.4" /></svg>
          </div>
        )}
      </div>
      <div className="cs-hud">
        {panel(leftR)}
        {panel(rightR)}
      </div>
      <p className="cs-skip">Click or press Space to skip</p>
    </div>
  );
}
