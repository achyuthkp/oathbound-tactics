# Oathbound: Ashes of Aldmere

A grid-based tactical JRPG built with React + TypeScript. Five story chapters,
a rest area between every battle, a sword/lance/axe weapon triangle, ranged bows,
permadeath (optional), and bond conversations that can turn into romance.

## Play right now

Double-click **`Oathbound.html`**. It is a single self-contained file (all code and
styles inlined), so it runs straight from disk with no server and no install.
Saves go to your browser's local storage. The fonts load from Google Fonts when
you're online; offline it falls back to system serif fonts.

## Run from source

Requires Node 18+.

```bash
npm install
npm run dev        # dev server with hot reload at http://localhost:5173
npm run build      # type-checks, then writes dist/index.html (single file)
```

Optional headless check (validates every map and auto-plays battles AI vs AI):

```bash
npx esbuild test/sim.ts --bundle --platform=node --outfile=/tmp/sim.cjs && node /tmp/sim.cjs
```

## Screen layout

The battlefield fills the screen. The map scales to fit, and decorative terrain continues past
its edges, dimmed, so widescreen monitors have no empty bars; only the framed area is playable.
A bottom bar shows the objective, the unit under the cursor (or the combat forecast while
targeting), and the turn buttons. Press **D** or click **Details** for the full drawer: complete
stats and weapons for both units, terrain, the weapon triangle, and the battle log.

## Controls

| Action | Input |
| --- | --- |
| Select a unit | Click it. Blue tiles = movement, red = attack range, green = heal range |
| Move | Click a blue tile, then pick Attack / Heal / Vulnerary / Seize / Wait |
| Quick attack | With a unit selected, click an enemy in red: the unit walks to the safest tile that can hit it |
| Attack | Click the target again, or press Attack in the forecast. Use ◀ ▶ to switch weapons |
| Undo / back | Right-click or Esc (undoes a move until you act) |
| Enemy range | Click any enemy. "Danger zone" shows every tile enemies can hit next turn |
| Details drawer | D, or the Details button |
| Quicksave / quickload | F5 / F9 |
| Save menu / load menu | Ctrl+S / Ctrl+O (Cmd on Mac), or the buttons at camp and in the battle Menu |
| Combat animation | Click or Space to skip. Turn animations off under Menu |
| Dialogue | Click, Space or Enter to advance. Esc skips the scene |
| Rest area | WASD / arrow keys or click the ground to walk Kael. E (or click) to use what's nearby or talk |

## Saving

Saves live inside the browser (localStorage); nothing is downloaded. There are five slots:
**Quicksave** (F5 / F9), **Autosave** (written when you arrive at camp and when you march out),
and **Slots 1–3**. Ctrl+S opens the save menu, Ctrl+O the load menu, where you can also
overwrite or delete slots. **Continue** on the title screen loads the most recent save.

You can save at the rest area, or **mid-battle** on your turn when no unit is half-way through
an action: the whole board (positions, HP, who has acted, turn number, reinforcements) is
stored, so loading resumes that exact moment. Retrying after a defeat still restarts the
chapter from its beginning.

Saves belong to one browser and one way of opening the game: the `Oathbound.html` file and
`npm run dev` keep separate saves, and clearing site data deletes them.

## Rules

**Weapon triangle.** Sword beats axe, axe beats lance, lance beats sword. Advantage
grants +15 hit and +1 damage; disadvantage the reverse. Swords, lances and axes only
reach adjacent tiles. **Bows** strike at range 1–2, sit outside the triangle and deal
double might to flying units. Staves heal adjacent allies.

**Combat math** (all in `src/game/combat.ts`)
- Damage = Str + weapon might (+forge) ± triangle − (foe Def + terrain Def)
- Hit = weapon hit + Skl×2 + Lck/2 ± 15 + bond bonus − (foe attack speed×2 + Lck + terrain avoid)
- Crit = weapon crit + Skl/2 − foe Lck; crits deal ×3
- Attack speed = Spd − max(0, weapon weight − Str). 4+ faster than the foe = strike twice
- Hit rolls average two random numbers, so high odds are a bit more reliable than they look

**Terrain.** Movement cost is per tile; "blocked" means the unit type cannot enter.

| Terrain | Def | Avoid | Foot | Armour | Horse | Flying |
| --- | --- | --- | --- | --- | --- | --- |
| Plains, road, bridge | 0 | 0 | 1 | 1 | 1 | 1 |
| Forest | +1 | +20 | 2 | 2 | 3 | 1 |
| Hills | +2 | +30 | 3 | 4 | 4 | 1 |
| Desert | 0 | 0 | 3 | 4 | 4 | 1 |
| Mountain | – | – | blocked | blocked | blocked | 1 |
| Water | – | – | blocked | blocked | blocked | 1 |
| Fort (heals 20% per turn) | +2 | +20 | 2 | 2 | 2 | 1 |
| Throne (heals 20% per turn) | +3 | +30 | 1 | 1 | 1 | 1 |

Fliers pay 1 everywhere but receive no terrain bonus.

**Movement range.** Armoured classes move the least per turn (Knight 4), fliers the most (Sky
Knight 8), and everyone else sits in between (foot classes 5, Cavalier 7). Water is fliers
only for now; `src/game/data/terrain.ts` notes how a seafaring move type would slot in. No
chapter uses desert yet.

Tiles are 16×16 pixel art drawn in `src/components/tiles.tsx`, four variants per terrain; water
draws a sandy bank with foam on any side that touches land and animates its waves.

**Enemy behaviour.** Aggressive units hunt the best target in reach; guards wait until you
come into range (or attack them); holders such as bosses never leave their tile.

**Limits.** Each side fields at most 10 units (you deploy up to 8). Reinforcements stop
spawning once the enemy has 10 on the field.

**Defeat.** If Kael falls, the battle is lost and you can retry the chapter. In Classic
mode other fallen allies are gone for good; in Casual they return after the battle.

## The rest area

After every victory the party makes camp: a walkable night scene where you move Kael freely.
Companions idle around the fire; walk up to one (or click them) to open their profile and bonds.
Units recover half their missing HP on arrival. Each night has **3 activities**:

- **Campfire**: rest, full HP for everyone
- **Training dummies**: one unit gains 50 exp (may level up)
- **Cooking pot**: share a meal, +15 bond for a pair

Walk up to a companion and press E to chat: Kael and the companion turn to each other and
talk in speech bubbles. Afterwards you can ask them to **walk with you** (up to three follow
Kael in single file along his path), tell a follower to **wait here**, or open their profile
and bonds.

The **merchant wagon** (armory) is free: buy weapons and vulneraries, sell, equip, and
**forge** (+1 might, +5 hit per level, up to +5). The **war table** saves and marches to the
next battle. Every station is also reachable from the buttons in the top bar.

## Bonds and romance

Six pairs can build bonds by acting next to each other in battle (+2 per action) or sharing
meals. View their conversations at camp to raise the rank C → B → A (→ S for the three
romance pairs). Each rank gives +5 hit and +5 avoid when the pair stands within 2 tiles.
S ranks are exclusive — Kael can marry Lyra or Mira, not both — and change the epilogue.
One A-rank conversation also unlocks a gift weapon.

## Characters and animation

Every named character is in their 30s. Profiles (age, background, personality, appearance,
combat role, likes, quote, design notes) live in `src/game/data/profiles.ts` and appear in the
**Characters** screen (title and camp), when talking to companions at camp, and from the
Profile button during battle. Generic enemy types have shorter archetype profiles.

Characters are pixel art. `src/components/figure.tsx` composes each full-body sprite on a 32×34
pixel grid from parts: a head with one of nine hair styles (short, long, tied, spiky, hood, helm,
rugged, slick, bun), an outfit (cape, armour, robe, leather, hunter, gi, light), limbs, a weapon,
and a horse or pegasus for mounted classes. Colours come from each character's `Look` plus a
`Build` derived from their class, so every named character and enemy type has their own sprite.
Poses (idle, walk, talk, slash, thrust, chop, shoot, cast, hit, dodge, a six-frame bloody death,
and the situational poses below) are frame animations stepped by the keyframes in
`src/figure.css`. The same sprites stand on the battle map.

Situational poses: **victory** (weapon raised with a glint; a horse rears, a pegasus beats its
wings) plays for whoever fells their foe; **wounded** (hunched over a bleeding wound, the mount
hanging its head) replaces idle at a third of max HP or less, on the map and in combat; **rest**
(on one knee; a horse grazes, a pegasus lands and folds its wings) marks units that have acted;
**sit** is used by companions near the campfire; **healed** (eyes closed, green motes rising) plays
on the map for a unit receiving a heal; **levelup** (a jump with gold sparks and a rising arrow)
plays in the level-up window. Dodging is a five-frame leap back with speed lines.

Open the game with **`#sprites`** on the end of the URL (or press **Sprites** on the title screen)
for the sprite browser: every sprite and portrait the game can draw, filterable by type, group,
character, class, pose or expression, weapon and mount (terrain tiles are under type "Tiles"), with search, a size slider, a facing
toggle and a replay button.

Mounts are drawn in detail: shaded body, bridle, reins, blaze, saddle and blanket in the rider's
accent colour, a four-beat gallop with a streaming tail, a tail swish at rest, and a three-stage
wing beat with a far wing behind the body. A fallen mount lies beside its thrown rider.

Dialogue portraits are 40×48 pixel busts that blink, lip-sync while their line types out, and
change expression (neutral, happy, angry, sad, surprised) line by line; moods are set with
`mood` on dialogue lines in the chapter and bond data. `src/components/pixel.tsx` is the small
rasterizer both use: parts are drawn onto a grid, outlined per layer, and emitted as SVG paths,
so there are still no image assets and the game stays a single file.

Before every chapter, an illustrated map of Aldmere shows the party walking the road from the
last battle to the next one.

Attacks play as a short scene: the attacker dashes in and swings, arrows fly across the stage,
the defender recoils, sidesteps a miss or falls, and criticals pause with a glow and shake the
screen. Open the game with **`#gallery`** on the end of the URL (e.g. `Oathbound.html#gallery`)
for a model sheet showing every character in every pose.

### Art kit

`npm run export-art` renders every portrait (12 characters × 6 expressions), every full-body
pose (20 character types × 13 poses) and the world map to standalone SVGs in `art/`, with the
animation CSS embedded. `art/README.md` documents the sprite grids. The previous vector art is kept in
`art/legacy-vector/`.

## Project layout

```
src/
  game/                 pure TypeScript game logic (no React)
    types.ts            shared types
    combat.ts           triangle, forecast, hit/crit rolls
    pathfinding.ts      Dijkstra movement, ranges, danger zone
    ai.ts               enemy decision making
    battle.ts           battle state transitions, phases, reinforcements, victory checks
    progression.ts      exp and level-ups
    campaign.ts         roster merging, camp
    saves.ts            save slots (quick, auto, 1–3) in localStorage
    data/               chapters (maps + story), characters, classes, weapons, terrain, supports
  components/
    StoryScene.tsx      visual-novel dialogue
    pixel.tsx           pixel rasterizer (grid, per-layer outline, SVG paths)
    figure.tsx          pixel character sprites (frame animation in src/figure.css)
    art.tsx             pixel portrait busts (expressions, blink, lip-sync), icons
    tiles.tsx           pixel terrain tiles
    WorldMap.tsx        illustrated map of Aldmere and the travel animation
    SaveMenu.tsx        save / load slots
    Profile.tsx         profile viewer with live model preview, Characters codex
    ModelSheet.tsx      #gallery model sheet
    SpriteBrowser.tsx   #sprites browser: every sprite, with filters
    battle/             map, unit tokens, HUD, details drawer, CombatScene animation
    camp/               CampWorld (walkable scene) and rest-area panels
    Screens.tsx         title, game over, epilogue
test/sim.ts             data validation + AI-vs-AI auto-play
scripts/export-art.tsx  renders the art kit into art/
art/                    exported SVG illustrations (see art/README.md)
```

### Adding a chapter

Append an entry to `CHAPTERS` in `src/game/data/chapters.ts`. Maps are 14×10 strings using
the legend at the top of that file (`.` plains, `F` forest, `h` hills, `D` desert, `M` mountain, `W` water, `#` wall,
`H` fort, `B` bridge, `T` throne, `r` road). List player starts with the Lord first, then
enemies, optional reinforcements by turn, recruits, and the pre/post dialogue. Run the sim
to catch units placed on impassable tiles.
