import { CHARACTERS, buildFor, lookFor } from '../game/data/characters';
import { CLASSES } from '../game/data/classes';
import { ALLY_IDS, ARCHETYPES, NPC_IDS, PROFILES } from '../game/data/profiles';
import { Figure, attackPose, type Pose } from './figure';
import { Portrait, type Mood } from './art';
import { lookById } from '../game/data/characters';

/** Character model sheet: open the game with #gallery to see every model in every pose. */
export function ModelSheet() {
  const ids = [...ALLY_IDS, ...NPC_IDS, ...Object.keys(ARCHETYPES)];
  return (
    <div className="model-sheet">
      <h1>Character model sheet</h1>
      <h2>Portrait expressions</h2>
      <div className="ms-portraits">
        {[...ALLY_IDS, ...NPC_IDS].map(id => (
          <div key={id} className="ms-prow">
            <span>{PROFILES[id].name}</span>
            {(['neutral', 'happy', 'angry', 'sad', 'surprised'] as Mood[]).map(m => (
              <figure key={m}><Portrait look={lookById(id)} mood={m} size={110} /><figcaption>{m}</figcaption></figure>
            ))}
            <figure><Portrait look={lookById(id)} talking size={110} /><figcaption>talking</figcaption></figure>
          </div>
        ))}
      </div>
      <h2>Full-body models</h2>
      {ids.map(id => {
        const p = PROFILES[id] ?? ARCHETYPES[id];
        const u = { id, classId: p.classId, lookId: CHARACTERS[id] ? id : undefined };
        const weapon = CLASSES[p.classId].weapons[0];
        const poses: Pose[] = ['idle', 'walk', 'talk', attackPose(weapon), 'hit', 'dodge', 'die'];
        return (
          <section key={id}>
            <h2>{p.name} <small>{p.age}, {CLASSES[p.classId].name}</small></h2>
            <div className="ms-row">
              {poses.map(pose => (
                <figure key={pose}>
                  <Figure look={lookFor(u)} build={buildFor(u)} weapon={weapon} pose={pose} size={150} />
                  <figcaption>{pose}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
