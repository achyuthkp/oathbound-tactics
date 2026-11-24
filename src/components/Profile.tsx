import { useState, type ReactNode } from 'react';
import { CHARACTERS, buildFor, lookFor } from '../game/data/characters';
import { CLASSES } from '../game/data/classes';
import { ALLY_IDS, ARCHETYPES, NPC_IDS, PROFILES, type Profile } from '../game/data/profiles';
import { Figure, attackPose, type Pose } from './figure';

const unitFor = (p: Profile) => ({ id: p.id, classId: p.classId, lookId: CHARACTERS[p.id] ? p.id : undefined });

export function ProfileView({ profile: p, children }: { profile: Profile; children?: ReactNode }) {
  const [pose, setPose] = useState<Pose>('idle');
  const [n, setN] = useState(0);
  const u = unitFor(p);
  const cls = CLASSES[p.classId];
  const weapon = cls.weapons[0];
  const look = lookFor(u);
  const build = buildFor(u);
  const play = (next: Pose) => { setPose(next); setN(x => x + 1); };
  const poses: [Pose, string][] = [['idle', 'Idle'], ['walk', 'Walk'], [attackPose(weapon), 'Attack'], ['hit', 'Hit'], ['dodge', 'Dodge'], ['victory', 'Victory'], ['wounded', 'Wounded'], ['rest', 'Rest'], ['healed', 'Healed'], ['levelup', 'Level up']];

  return (
    <div className="profile">
      <div className="pf-model">
        <div className="pf-stage">
          <Figure key={`${p.id}-${n}`} look={look} build={build} weapon={weapon} pose={pose} size={260} />
        </div>
        <div className="pf-poses" role="group" aria-label="Preview animation">
          {poses.map(([id, label]) => (
            <button key={label} className={pose === id ? 'on' : ''} onClick={() => play(id)}>{label}</button>
          ))}
        </div>
        <div className="pf-palette" aria-label="Palette">
          {[look.skin, look.hair, look.cloth, look.accent, build.cape, build.coat].filter(Boolean).map((c, i) => (
            <span key={i} style={{ background: c }} title={c} />
          ))}
        </div>
      </div>
      <div className="pf-text">
        <header>
          <h2>{p.name}</h2>
          <p>{p.title}</p>
        </header>
        <dl className="pf-facts">
          <div><dt>Age</dt><dd>{p.age}</dd></div>
          <div><dt>Class</dt><dd>{cls.name}</dd></div>
          <div><dt>Height</dt><dd>{p.height}</dd></div>
        </dl>
        {p.quote && <blockquote>“{p.quote}”</blockquote>}
        <h3>Background</h3><p>{p.origin}</p>
        <h3>Personality</h3><p>{p.personality}</p>
        <h3>Appearance</h3><p>{p.appearance}</p>
        <h3>In battle</h3><p>{p.combat}</p>
        {p.likes !== '—' && <p className="pf-likes"><b>Likes:</b> {p.likes} <b>Dislikes:</b> {p.dislikes}</p>}
        <h3>Design notes</h3><p className="pf-design">{p.design}</p>
        {children}
      </div>
    </div>
  );
}

export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="ghost" onClick={onClose} aria-label="Close">Close</button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Codex({ onClose }: { onClose: () => void }) {
  const [id, setId] = useState('kael');
  const groups: [string, Profile[]][] = [
    ['Companions', ALLY_IDS.map(i => PROFILES[i])],
    ['Adversaries', NPC_IDS.map(i => PROFILES[i])],
    ['Enemy units', Object.values(ARCHETYPES)],
  ];
  const current = PROFILES[id] ?? ARCHETYPES[id];
  return (
    <Sheet title="Characters" onClose={onClose} wide>
      <div className="codex">
        <nav>
          {groups.map(([label, list]) => (
            <div key={label}>
              <h3>{label}</h3>
              {list.map(p => (
                <button key={p.id} className={p.id === id ? 'on' : ''} onClick={() => setId(p.id)}>{p.name}</button>
              ))}
            </div>
          ))}
        </nav>
        <ProfileView key={current.id} profile={current} />
      </div>
    </Sheet>
  );
}
