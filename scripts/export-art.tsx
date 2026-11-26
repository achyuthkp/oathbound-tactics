/**
 * Renders every illustration to standalone SVG files in ./art so they can be used outside the
 * game (concept sheets, an external engine, or as a base for hand-painted replacements).
 * Each file embeds the rig/animation CSS, so idle animations (breathing, blinking, walking)
 * still play when an SVG is opened in a browser.
 *
 *   npm run export-art
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHARACTERS, buildFor, lookById, lookFor } from '../src/game/data/characters';
import { CLASSES } from '../src/game/data/classes';
import { ALLY_IDS, ARCHETYPES, LATER_IDS, NPC_IDS, PROFILES } from '../src/game/data/profiles';
import { Portrait, type Mood } from '../src/components/art';
import { Figure, SCENARIO_POSES, attackPose, type Pose } from '../src/components/figure';
import { MapArt, ROUTES } from '../src/components/WorldMap';

const css = readFileSync('src/figure.css', 'utf8');
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Alegreya:ital@0;1&display=swap');
.wm-label{font:700 17px Cinzel,Georgia,serif;fill:#3a2a1c;text-anchor:middle;paint-order:stroke;stroke:#efe3c4;stroke-width:4px}
.wm-label.empire{font-size:22px;letter-spacing:.3em;fill:#5a2a20}.wm-title{font:700 22px Cinzel,Georgia,serif;fill:#3a2a1c;text-anchor:middle}
.wm-sub{font:italic 400 14px Alegreya,Georgia,serif;fill:#6a5232;text-anchor:middle}.wm-compass{font:700 14px Cinzel,Georgia,serif;fill:#3a2a1c;text-anchor:middle}`;

function standalone(markup: string, extraCss = '') {
  return markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/(<svg[^>]*>)/, `$1<style><![CDATA[${css}${extraCss}]]></style>`);
}

const write = (path: string, svg: string) => { writeFileSync(path, standalone(svg)); };
mkdirSync('art/portraits', { recursive: true });
mkdirSync('art/models', { recursive: true });

const moods: Mood[] = ['neutral', 'happy', 'angry', 'sad', 'surprised'];
let count = 0;
for (const id of [...ALLY_IDS, ...LATER_IDS, ...NPC_IDS]) {
  for (const m of moods) { write(`art/portraits/${id}-${m}.svg`, renderToStaticMarkup(<Portrait look={lookById(id)} mood={m} size={400} />)); count++; }
  write(`art/portraits/${id}-talking.svg`, renderToStaticMarkup(<Portrait look={lookById(id)} talking size={400} />)); count++;
}
for (const id of [...ALLY_IDS, ...LATER_IDS, ...NPC_IDS, ...Object.keys(ARCHETYPES)]) {
  const p = PROFILES[id] ?? ARCHETYPES[id];
  const u = { id, classId: p.classId, lookId: CHARACTERS[id] ? id : undefined };
  const weapon = CLASSES[p.classId].weapons[0];
  const poses: Pose[] = ['idle', 'walk', 'talk', attackPose(weapon), 'hit', 'dodge', 'die', ...SCENARIO_POSES];
  for (const pose of poses) {
    write(`art/models/${id}-${pose}.svg`, renderToStaticMarkup(<Figure look={lookFor(u)} build={buildFor(u)} weapon={weapon} pose={pose} size={480} />));
    count++;
  }
}
writeFileSync('art/world-map.svg', standalone(renderToStaticMarkup(<MapArt cleared={[]} routeD={ROUTES[0].d} routeRef={createRef()} />), FONTS));
count++;
console.log(`Exported ${count} SVG files to ./art`);
