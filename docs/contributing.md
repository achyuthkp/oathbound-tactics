# Contributor guide

This guide is for anyone changing *Oathbound: Ashes of Aldmere*. It covers setup, scripts, the
project layout, the architecture, adding a chapter, and the release and art pipelines. For how
the game plays, see [manual.md](manual.md); for player-facing fixes, see
[troubleshooting.md](troubleshooting.md).

## Requirements and setup

You need **Node 18 or newer** and npm. The repository's `engines` field requires Node 18, and
`.nvmrc` pins Node 20 for local development.

```bash
npm install
npm run dev
```

`npm run dev` starts Vite with hot reload at `http://localhost:5173`. The project uses React 18,
TypeScript 5.6, Vite 5, `vite-plugin-singlefile`, and esbuild as a development dependency. There
is no separate server or database, and no asset build step is needed to run the game.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload at `http://localhost:5173` |
| `npm run build` | Runs `tsc --noEmit`, then `vite build`; writes a single `dist/index.html` with JS and CSS inlined |
| `npm run preview` | Serves the built `dist/` locally so you can check the production bundle |
| `npm run typecheck` | Runs `tsc --noEmit` only |
| `npm test` | Alias for `npm run sim` |
| `npm run sim` | Bundles `test/sim.ts` for Node with esbuild and runs the headless checks and AI-vs-AI campaign |
| `npm run release` | Runs the build, then `scripts/release.mjs` copies `dist/index.html` to `Oathbound.html` |
| `npm run export-art` | Renders the portrait, sprite and world-map art kit into `art/` |

There is no lint or formatting script; match the style of the code you are editing.

### What the sim checks

`npm run sim` (also `npm test`) is the main automated safety net. It runs five kinds of checks:

- **Movement rule**: armoured classes must move least, fliers most, and every other class
  strictly between them.
- **Map and data validation**: map rows are equal length and no wider than 64 tiles; houses and
  chests sit on the right tiles and have valid rewards; enemy weapons exist; player starts,
  enemies and reinforcements are in bounds, on passable terrain, and not overlapping; objectives
  such as seize are on the right tile; each side has at most 10 units; and class abilities such
  as `raid` and `loot` are only used on classes that have them.
- **Documentation drift**: it parses the terrain table and the chapter/house table from
  `docs/manual.md`, then compares the values with `src/game/data/terrain.ts` and `CHAPTERS`. It
  also checks that every chapter title appears and that the number of chapters in the prose
  matches the data.
- **AI behaviour**: attacking a guard must wake the nearby guard post.
- **AI-vs-AI auto-play**: it plays 40 full campaigns with the AI controlling both sides, then
  reports how many reached the final chapter and where the others stopped.

The sim prints `ERROR` lines for failures and finishes with `data OK` when the data checks pass.
Read the output rather than assuming a silent run is a pass. The AI-vs-AI clear rate is a
balance signal, not a unit test: a low clear count is worth investigating but is not by itself a
build failure.

## Project layout

```
Oathbound.html          built single-file game (tracked release artifact)
index.html              Vite entry page
package.json            scripts and dependencies
package-lock.json       locked dependency tree
vite.config.ts          React plugin and single-file build
tsconfig.json           strict TypeScript config
.nvmrc                  Node version for local development
LICENSE                 MIT license
CHANGELOG.md            release notes
CONTRIBUTING.md         short pointer to this guide
.github/workflows/      CI: type check and tests
art/                    exported SVG art kit (see art/README.md)
  portraits/            dialogue busts by character and mood
  models/               full-body sprites by character type and pose
  legacy-vector/        previous vector art, kept for reference
docs/
  manual.md             player manual and canonical rules tables
  contributing.md       this guide
  troubleshooting.md    player-facing fixes and bug-report guidance
  known-limitations.md  current gaps and art-only features
scripts/
  export-art.tsx        renders every illustration to art/
  release.mjs           copies dist/index.html to Oathbound.html
src/
  main.tsx              entry point; routes #gallery and #sprites
  App.tsx               campaign state machine and save shortcuts
  gamepad.ts            Gamepad API support and arrow-key menu navigation
  styles.css            global styles and animations
  figure.css            frame-animation keyframes for character sprites
  game/                 pure TypeScript game logic (no React)
    types.ts            shared types
    units.ts            packs, trading, durability, forging, dragon form
    combat.ts           triangle, forecast, hit and crit rolls
    pathfinding.ts      Dijkstra movement, ranges, danger zone
    ai.ts               enemy decision making
    battle.ts           battle transitions, phases, reinforcements, victory checks
    progression.ts      exp and level-ups
    campaign.ts         roster merging, camp, activity points
    saves.ts            save slots and localStorage persistence
    data/
      chapters.ts       maps, objectives, enemies, houses, chests, dialogue
      characters.ts     player templates, looks, builds, names
      classes.ts        class stats, movement types, class abilities
      weapons.ts        weapon stats, effective types, shop list
      terrain.ts        terrain bonuses, healing and movement costs
      supports.ts       bond pairs, conversations, thresholds, gifts
      camp.ts           camp chatter lines
      profiles.ts       character and archetype profiles
  components/
    Screens.tsx         title, game over, epilogue
    StoryScene.tsx      visual-novel dialogue
    WorldMap.tsx        illustrated map of Aldmere and travel animation
    SaveMenu.tsx        save/load slots and export/import
    Profile.tsx         profile viewer and Characters codex
    ModelSheet.tsx      #gallery model sheet
    SpriteBrowser.tsx   #sprites browser
    pixel.tsx           pixel rasterizer (grid, per-layer outline, SVG paths)
    figure.tsx          pixel character sprites and weapon styles
    art.tsx             portrait busts, expressions, icons
    tiles.tsx           pixel terrain tiles
    greatdragon.tsx     three-by-three Dark Dragon sprite (sprite-only)
    battle/             map, tokens, HUD, details drawer, combat animation
    camp/               CampWorld walkable scene and rest-area panels
test/sim.ts             data validation, documentation drift, AI-vs-AI auto-play
```

## Architecture and data flow

The codebase splits into a pure logic layer and a React presentation layer.

- **`src/game/` has no React imports.** It owns types, combat, pathfinding, AI, battle
  transitions, progression, campaign merging and saves. Randomness is passed in as an `RNG`
  function so the UI and the sim can supply their own source.
- **`src/game/data/` is static content.** Chapters, classes, weapons, terrain, supports,
  characters and profiles are plain exported constants. Adding content usually means editing
  these files rather than adding special cases to the engine.
- **`src/components/` renders state and collects input.** Battle screens animate moves and
  attacks, then apply the pure transition functions. Camp screens edit the campaign object and
  hand it back through `onChange`.
- **`App.tsx` owns the campaign and the screen state machine.** It moves between title, travel,
  story, battle, camp, game over and ending; it also handles global save shortcuts and the
  save/load menu.
- **Saves are versioned.** `src/game/saves.ts` stores one localStorage key per slot under
  `oathbound-slot-`, with a `SaveData` record at version 2. A camp save holds the campaign; a
  mid-battle save also holds the full `BattleState`. The loader migrates the old
  `oathbound-save-v1` key into the autosave slot.
- **Input is unified.** Keyboard handlers are the source of truth. `src/gamepad.ts` polls the
  Gamepad API and dispatches arrow-key or button events into the same handlers, so a new
  on-screen control can opt into controller support with a `data-pad` attribute.

When changing battle rules, update the pure function in `src/game/` and let both the UI and the
sim exercise it. Avoid putting rules in components, because the sim cannot see them.

## Adding a chapter

1. Append an entry to `CHAPTERS` in `src/game/data/chapters.ts`. Give it `number`, `title`,
   `backdrop`, `map`, `objective`, `objectiveText`, `playerStarts`, `enemies`, `pre` and `post`
   dialogue, and `reward`. Add `houses`, `chests`, `reinforcements` or `recruits` when needed.
2. Draw the map as rows of equal-length strings using the legend at the top of the file:

   `.` plains, `r` road, `F` forest, `h` hills, `D` desert, `M` mountain, `W` water, `#` wall,
   `H` fort, `B` bridge, `T` throne, `V` house, `b` building, `x` ruins, `C` chest, `d` locked
   door, `G` locked gate.

   Maps can be any size up to 64 tiles wide. Chapters are conventionally 22×14, matching the
   14×10 battle viewport so the camera has room to scroll. Rows must all be the same length.
3. List `playerStarts` in deployment order with the Lord first. Use passable, unique tiles and
   no more than 10 starts.
4. Add enemies with a `classId`, level, weapon ids, position and optional `ai` (`aggressive`,
   `guard`, `hold`, `raid` for brigands, `loot` for thieves), `isBoss`, `key`, `name`, `lookId`
   and `statBonus`. Only classes with the matching ability may use `raid` or `loot`. The sim
   rejects more than 10 enemies and units on impassable tiles.
5. Add optional `reinforcements` by turn, `recruits` for units that join after the chapter, and
   `houses` or `chests` with their rewards. A house may give gold, a potion, a weapon, or a
   recruit. A chest may give gold or a weapon. Locks must only guard optional rooms, never the
   objective.
6. Write the `pre` and `post` dialogue as speaker/text lines. Use existing character ids and
   optional `mood` values (`neutral`, `happy`, `angry`, `sad`, `surprised`) so portraits match.
7. Run `npm run typecheck` and `npm run sim`. Fix any map error before playtesting. Add the
   chapter to the chapter/house table in [manual.md](manual.md) so the documentation-drift check
   stays green, and update the manual's chapter count in prose if you add a sixth chapter.

## Content conventions

- Keep engine rules in `game/` and content in `game/data/`.
- Stable ids matter: saves, supports, profiles, sprites and dialogue all refer to unit and weapon
  ids. Renaming an id can invalidate existing saves or break art lookups.
- Saves are versioned and migrated in `saves.ts`. If you change the save shape, bump the version
  and keep the old loader working rather than silently discarding player progress.
- TypeScript is strict. Prefer explicit types at module boundaries and `type` imports for
  type-only dependencies.
- Components are PascalCase and data exports are lowercase or SCREAMING_SNAKE_CASE, following
  the surrounding files. Use two-space indentation, single quotes, semicolons, and arrow
  functions, matching the existing source.
- Every interactive control should be keyboard reachable and, where it appears on the battlefield
  or camp, tagged with `data-pad` so the controller can reach it. Keep keyboard and pad behaviour
  in parity.
- Do not commit `dist/` or `node_modules/`; both are ignored. `Oathbound.html` is the tracked
  release artifact and should only change through `npm run release`.

## Release pipeline

`npm run build` runs the TypeScript check and Vite. `vite.config.ts` enables
`vite-plugin-singlefile`, so the output is one self-contained `dist/index.html` with all JS and
CSS inlined and relative base paths.

`npm run release` builds and then runs `scripts/release.mjs`, which copies `dist/index.html` to
`Oathbound.html` in the repository root. That file is what players double-click; it must keep
working from `file://`.

Before releasing:

1. Run `npm run typecheck` and `npm test`.
2. Run `npm run build`, then open `dist/index.html` from disk to confirm the single-file build
   works without the dev server.
3. Run `npm run release` and open `Oathbound.html`.
4. Check that saves, the camp, a battle and at least one dialogue scene still work in the built
   file, and that the offline font fallback looks acceptable.

## Art pipeline

`npm run export-art` bundles `scripts/export-art.tsx` and renders the SVG art kit into `art/`:
portraits for every character and expression, full-body models for every character type and
pose, and the world map. Each file embeds the animation CSS from `src/figure.css`, so opening
one in a browser plays its loop.

`art/README.md` documents the sprite grids, pose names, animation frames and palette. The art is
generated from the same `Look` and class data as the in-game sprites, so edit the source data or
the drawing code and re-run the export; do not hand-edit the generated SVGs as the source of
truth. `art/legacy-vector/` is reference material and is not used by the game.

## CI and pull-request checklist

`.github/workflows/ci.yml` runs `npm ci`, `npm run typecheck` and `npm test` on every push and
pull request. Run both checks locally as well; do not rely on CI to catch a broken map or a
drifted table.

Before opening a pull request:

- [ ] `npm run typecheck` passes.
- [ ] `npm test` (or `npm run sim`) reports `data OK` with no `ERROR` lines.
- [ ] If game data changed, the terrain and chapter/house tables in `docs/manual.md` still match.
- [ ] The affected battle, camp, menu or dialogue path was played in `npm run dev`.
- [ ] The built `Oathbound.html` was checked if the change affects the release build.
- [ ] Keyboard and controller paths were checked if input changed.
- [ ] Save compatibility was considered if types or save fields changed.
- [ ] No `dist/`, `node_modules/` or unrelated generated files are included.
