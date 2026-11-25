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

The battlefield fills the screen and shows up to 14×10 tiles at a time. Chapter maps are 22×14,
so the view scrolls: drag the map, use the mouse wheel or trackpad, or move the cursor with the
arrow keys or a controller and the camera follows. It also follows units as they move and opens
each of your turns on a unit that can act. Where a map is smaller than the view, decorative
terrain continues past its edges, dimmed. A bottom bar shows the objective, the unit under the
cursor (or the combat forecast while targeting), and the turn buttons. Press **D** or click
**Details** for the full drawer: complete stats and weapons for both units, terrain, the weapon
triangle, and the battle log.

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

### Controller

Xbox, PS5 (DualSense) and Steam Deck / Steam Input controllers work through the browser's
Gamepad API; plug one in and press any button. Buttons on screen show which pad button presses
them, with Xbox letters or PlayStation shapes to match the controller.

| Action | Xbox / Steam | PS5 |
| --- | --- | --- |
| Move the battle cursor, walk Kael at camp, move the highlight in menus | D-pad or left stick | D-pad or left stick |
| Select / confirm / advance dialogue / talk | A | ✕ |
| Undo / back / close a menu | B | ○ |
| Jump between units that can still act; switch weapon while aiming | LB, RB | L1, R1 |
| Details drawer (battle) | X | □ |
| Danger zone (battle); top bar (camp) | Y | △ |
| Pause menu (battle); skip scene (story) | Menu | Options |
| End turn | View | Create |

While aiming, the D-pad steps between targets. The arrow keys do everything the D-pad does, so
the game is also fully playable from the keyboard. `src/gamepad.ts` holds the mapping: the pad
drives the existing keyboard and button handlers rather than a separate code path, and any
button can be given a pad shortcut by adding `data-pad="x"` (or `y`, `lb`, `rb`, `start`,
`select`) to it.

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
Knight and Wyvern Rider 8), and everyone else sits in between (foot classes 5, Cavalier 7). Water is fliers
only for now; `src/game/data/terrain.ts` notes how a seafaring move type would slot in. No
chapter uses desert yet.

Tiles are 16×16 pixel art drawn in `src/components/tiles.tsx`, four variants per terrain; water
draws a sandy bank with foam on any side that touches land and animates its waves.

**Towns and houses.** A map only has houses where the story has people living there:

| Chapter | Setting | Houses |
| --- | --- | --- |
| 1 The Burning Road | a farming village in the raiders' path | 2, and raiders come for them |
| 2 Ironvale Bridge | a guarded river crossing | none |
| 3 Whispering Wood | deep forest | a woodward's lone cabin |
| 4 Siege of Highmoor | the town under the castle walls | 2 |
| 5 The Ashen Throne | the burned capital: ruins | 1 still standing |

A **house** with a lit doorway can be visited once: end a unit's move on it and choose
**Visit**. Each gives one reward (gold, a vulnerary, or a weapon that goes into the visitor's
pack, sold for half price if the pack is full); the cabin in chapter 3 holds a companion you can
otherwise miss entirely. A visited house shuts its door. Town buildings block movement; ruins
are rough ground with a little cover.

**Raiders.** Only **brigands** can raid. They are their own unit: an axe fighter in a red head-wrap and fur mantle who carries a lit torch in the off hand. Brigands marked *Raiding* ignore your army and walk to the nearest house still
standing to burn it down; a burned house's reward is gone for good. In chapter 1 two raiders
ride in on turn 3 and, left alone, burn one house on turn 4 and the other on turn 5. Stop them by
defeating them, by visiting the house first, or by standing a unit in the doorway, which
protects that house and sends the raider to the next. With nothing left to burn they fight
like anyone else. Give a brigand `ai: 'raid'` in `src/game/data/chapters.ts` to make one; the sim rejects the flag on any other class (the ability is `raids` on the class in `src/game/data/classes.ts`).

**Thieves.** Fast, frail sword users (Pip joins in chapter 2; the Empire has its own
cutpurses). Standing next to an enemy that is not faster, a thief can **Steal** a vulnerary or
any weapon that is not a personal one, if there is room in the thief's pack. Taking the weapon
out of an enemy's hand needs 4 more Spd than the victim and never works on a boss; a disarmed
enemy cannot attack. A thief can also steal a key.

**Locks: chests, doors and gates.** Treasure chests, locked doors and locked gates each take
one **key** or one **lockpick** to open. Stand on or beside a chest, or beside a door or gate,
and the action menu offers *Chest: use key*, *Door: use lockpick* and so on. Any unit can use a
key; only a thief can use a lockpick, and a thief carrying both chooses which to spend. An
opened door or gate stays open for both sides. A lockpick opens 5 locks and then snaps; Pip starts with one and the armory sells more at
500 gold. Keys: some enemies carry one, shown by a small gold key
above them. Whoever defeats that enemy takes the key into their own pack (if the pack is full
the key is lost), and it stays with that unit into later chapters until it is used. In chapter
4 the two strongrooms are behind doors; in chapter 5 each chest sits in a vault behind a gate.
Locks only ever guard optional rooms, never the objective. An enemy thief marked *Looting*
carries a worn lockpick good for 2 locks, picks a door if the chests are locked in, then empties a chest; defeat
that thief and everything it took drops as gold.

**Packs and trading.** A unit carries at most **5 items**. Anything with durability counts one
each: every weapon and every lockpick. Consumables stack: all of a unit's vulneraries are one
item, and likewise its keys and its dragonstones. A unit standing next to an ally gets **Trade**
in the action menu: pick an item on either side to hand it across, as long as the receiver has
room. Personal weapons cannot be traded. Trading does not use the unit's action, but once
something has changed hands the move can no longer be taken back. At camp, the armory has a
**Give items to** picker that does the same between any two companions.

**Effective weapons.** Some weapons deal triple might against one kind of unit, and the
forecast marks the attack *Effective*. Bows against flying units. The **Rapier** (and Kael's
Valen Rapier) and the **Hammer** against armoured units. The **Ridersbane** lance against
mounted and flying units. The merchant sells the Rapier, Hammer and Ridersbane from chapter 2.

**Durability.** Every blow that lands wears the weapon by one use, and every heal wears the
staff; a miss costs nothing. The stronger the weapon, the fewer uses it has: iron-grade 40,
steel 30, killer weapons 20, silver 15. At zero it breaks and is gone. Personal weapons wear as well (30
uses) and can be repaired like any other; only a dragon's own breath never wears. The count shows after the weapon's name,
as in *Steel Lance 27/30*. The smith at the armory repairs a worn weapon for up to half its
price, in proportion to the wear. Enemy weapons wear too.

**Dragonkin.** Helpless in human form (Sable joins in chapter 4; the Regent keeps one in
chapter 5). **Transform** spends a dragonstone and the unit's action, and for the next three
turns the unit is a dragon: HP +10, Str +8, Skl +3, Spd +2, Def +7, with fire breath that
reaches two tiles and sits outside the weapon triangle. Then it changes back. A dragonkin
carries up to 3 dragonstones; the merchant sells more at 1,200 gold each. Enemy dragonkin
transform when your army comes within their movement range, so they can be baited and waited
out.

**Dragon kinds.** A dragonkin's element comes from the breath it carries, and sets how its
dragon form looks and what it breathes: **fire** (red, embers and a burning tail), **water**
(blue, a sail fin and flukes; Tide Breath is accurate), **earth** (wingless, rock plates and
crystals; Stone Breath is short and breaks armour), **wind** (pale green, streamers; Gale Breath
reaches three tiles and is strong against fliers), **light** (ivory and gold, feathered wings,
antlers and a halo; Radiant Breath) and **dark**. In human form each shows small wings, a tail
and cheek scales in its element's colours. Sable and the enemy dragonkin are fire dragons; the
other kinds are drawn and have their breath weapons defined but are not placed on a map yet.

**The Dark Dragon.** The final boss is a full dragon, three tiles by three, drawn in
`src/components/greatdragon.tsx` with idle, hit and death animations and five attacks: Umbral
Flame, Rending Claw, Tail Sweep, Wing Gale and Dread Roar. It is a sprite only for now, shown in
the sprite browser under the *Dragons* group; the multi-tile unit rules come with the story.

**Who marches.** Up to 10 units deploy (it was 8). With more companions than that, the Army
panel at camp has a Marching / In reserve toggle for everyone but Kael.

**Enemy behaviour.** Aggressive units hunt the best target in reach; guards wait until you
come into range (or attack them); holders such as bosses never leave their tile.

**Limits.** Each side fields at most 10 units. Reinforcements stop
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

Every weapon has its own look in the hand, so a unit's sprite changes with what it has equipped,
on the map, in combat and at camp: steel is heavier and two-tone, killer weapons are dark with a
red edge, silver is bright with a blue edge, and the personal weapons (the Valen Rapier, the
Ashen Blade, the Oaken Staff) are one of a kind. The table is `WEAPON_STYLE` in
`src/components/figure.tsx`.

**Wyvern Riders** are the Empire's heavy fliers: armoured axe riders on red wyverns (horned head,
pale belly plates, bat wings, a bladed tail, two legs tucked in flight). They hit harder and take
more than Sky Knights but are slower, and bows are still their weakness. They appear in chapters
4 and 5.

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
  gamepad.ts            controller support (Gamepad API) and arrow-key menu navigation
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

Append an entry to `CHAPTERS` in `src/game/data/chapters.ts`. Maps are rows of equal-length strings using
the legend at the top of that file (`.` plains, `F` forest, `h` hills, `D` desert, `M` mountain, `W` water, `#` wall,
`H` fort, `B` bridge, `T` throne, `r` road, `V` house, `b` building, `x` ruins) and can be any size up to 64 tiles wide. List player starts with the Lord first, then
enemies, optional reinforcements by turn, recruits, and the pre/post dialogue. Run the sim
to catch units placed on impassable tiles.
