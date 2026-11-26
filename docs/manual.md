# Player manual

*Oathbound: Ashes of Aldmere* is a grid-based tactical JRPG built with React and TypeScript.
You lead a small band through five chapters, fight on tile maps, make camp between battles, and
build bonds that can become romances. This manual covers how to play, the battle rules, saving,
and the optional screens. For development, see [contributing.md](contributing.md); for fixes
and workarounds, see [troubleshooting.md](troubleshooting.md) and
[known-limitations.md](known-limitations.md).

## Contents

- [Getting started](#getting-started)
- [Screen layout](#screen-layout)
- [Controls](#controls)
- [Saving and loading](#saving-and-loading)
- [Rules](#rules)
- [The rest area](#the-rest-area)
- [Challenge mode and the map builder](#challenge-mode-and-the-map-builder)
- [Bonds and romance](#bonds-and-romance)
- [Characters, art, and animation](#characters-art-and-animation)
- [Further reading](#further-reading)

## Getting started

Double-click **`Oathbound.html`**. It is a single self-contained file with all code and styles
inlined, so it runs from disk with no server and no install. Saves go to your browser's local
storage.

The fonts load from Google Fonts when you are online. Offline, the game falls back to system
serif fonts and remains fully playable.

To run the game from source instead, see [contributing.md](contributing.md). The two ways of
opening the game keep separate saves; see [Saving and loading](#saving-and-loading).

## Screen layout

The battlefield fills the screen and shows up to 14×10 tiles at a time. Chapter maps are 22×14,
so the view scrolls: drag the map, use the mouse wheel or trackpad, or move the cursor with the
arrow keys or a controller and the camera follows. It also follows units as they move and opens
each of your turns on a unit that can act. Where a map is smaller than the view, decorative
terrain continues past its edges, dimmed.

A bottom bar shows the objective, the unit under the cursor (or the combat forecast while
targeting), and the turn buttons. Press **D** or click **Details** for the full drawer: complete
stats and weapons for both units, terrain, the weapon triangle, and the battle log.

Outside battle, illustrated screens show the road to the next chapter, dialogue scenes, the
walkable camp, and the ending. The title screen also offers **Characters**, **How to play**, and
**Sprites**.

## Controls

### Keyboard and mouse

| Action | Input |
| --- | --- |
| Select a unit | Click it. Blue tiles = movement, red = attack range, green = heal range |
| Move | Click a blue tile, then pick Attack / Heal / Vulnerary / Seize / Wait |
| Quick attack | With a unit selected, click an enemy in red: the unit walks to the safest tile that can hit it |
| Attack | Click the target again, or press Attack in the forecast. Use ◀ ▶ or **R** to switch weapons while aiming |
| End turn | **T** |
| Undo / back | Right-click or Esc (undoes a move until you act) |
| Enemy range | Click any enemy. **Z** or the Danger zone button toggles every tile enemies can hit next turn |
| Details drawer | **D**, or the Details button |
| Quicksave / quickload | **F5** / **F9** |
| Save menu / load menu | **Ctrl+S** / **Ctrl+O** (Cmd on Mac), or the buttons at camp and in the battle Menu |
| Combat animation | Click or Space to skip. Turn animations off under Menu |
| Dialogue | Click, Space or Enter to advance. Esc skips the scene |
| Rest area | WASD / arrow keys or click the ground to walk Kael. **E** (or click) to use what is nearby or talk |
| Menus | Arrow keys move the highlight; Enter or Space activates. Use the sheet's Close button to dismiss save and profile panels |

On the battlefield, **T** ends your turn, **Z** toggles the danger zone, and **R** cycles the
weapons that can reach the current target. **`[`** and **`]`** jump between units that can still
act. Arrow keys move the tile cursor, and Enter or Space acts on the tile under it exactly like a
click.

### Controller

Xbox, PS5 (DualSense) and Steam Deck / Steam Input controllers work through the browser's
Gamepad API. Plug one in and press any button. Buttons on screen show which pad button presses
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
the game is fully playable from the keyboard. `src/gamepad.ts` holds the mapping: the pad drives
the existing keyboard and button handlers rather than a separate code path, and any button can be
given a pad shortcut by adding `data-pad="x"` (or `y`, `lb`, `rb`, `start`, `select`) to it.

### Accessibility

The battle screen is playable from the keyboard, and on-screen buttons show their controller
prompts when a pad is connected. Battle animations can be turned off in the battle Menu, and the
game honours the operating system's reduced-motion setting.

## Saving and loading

Saves live inside the browser (localStorage); the game does not upload them anywhere. There are
five slots:

- **Quicksave** (F5 / F9)
- **Autosave**, written when you arrive at camp and when you march out
- **Slots 1–3**

**Continue** on the title screen loads the most recent save. Ctrl+S opens the save menu and
Ctrl+O the load menu, where you can also overwrite or delete slots.

You can save at the rest area, or **mid-battle** on your turn when no unit is half-way through an
action. The whole board (positions, HP, who has acted, turn number, reinforcements) is stored, so
loading resumes that exact moment. Retrying after a defeat still restarts the chapter from its
beginning.

Saves belong to one browser and one way of opening the game: the `Oathbound.html` file and
`npm run dev` keep separate saves, and clearing site data deletes them. Private browsing may also
discard storage when the window closes.

### Exporting and importing saves

The Save/Load menu has an **Export** button on every filled slot and an **Import save file**
button at the bottom. Export downloads that slot as a JSON file, which you can keep as a backup
or move to another browser or machine. Import reads an exported JSON save and stores it in the
slot recorded in the file. If that slot already holds a save, the game asks before overwriting
it. The imported save is not loaded automatically; load it from its slot when you are ready.

Export is the reliable way to back up progress before clearing browser data, changing browsers,
or switching between `Oathbound.html` and the dev server. An imported save still lives in the
receiving browser's local storage; keep the JSON file if you may need it again.

## Rules

### Weapon triangle

Sword beats axe, axe beats lance, lance beats sword. Advantage grants +15 hit and +1 damage;
disadvantage the reverse. Swords, lances and axes only reach adjacent tiles.

**Bows** strike at range 1–2, sit outside the triangle and deal double might to flying units.
**Staves** heal adjacent allies.

### Combat math

All of the following is implemented in `src/game/combat.ts`.

- Damage = Str + weapon might (+forge) ± triangle − (foe Def + terrain Def)
- Hit = weapon hit + Skl×2 + Lck/2 ± 15 + bond bonus − (foe attack speed×2 + Lck + terrain avoid)
- Crit = weapon crit + Skl/2 − foe Lck; crits deal ×3
- Attack speed = Spd − max(0, weapon weight − Str). 4+ faster than the foe = strike twice
- Hit rolls average two random numbers, so high odds are a bit more reliable than they look

The forecast before an attack shows damage, hit and crit for both sides, including counters when
the defender's weapon reaches.

### Terrain

Movement cost is per tile; "blocked" means the unit type cannot enter.

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

Tiles are 16×16 pixel art drawn in `src/components/tiles.tsx`, four variants per terrain; water
draws a sandy bank with foam on any side that touches land and animates its waves. Ruins are
rough ground with a little cover; town buildings block movement.

### Movement range

Armoured classes move the least per turn (Knight 4), fliers the most (Sky Knight and Wyvern Rider
8), and everyone else sits in between (most foot classes 5, Thief 6, Cavalier 7). Water is fliers
only for now; `src/game/data/terrain.ts` notes how a seafaring move type would slot in. Chapter 5
uses desert tiles.

### Towns and houses

A map only has houses where the story has people living there:

| Chapter | Setting | Houses |
| --- | --- | --- |
| 1 The Burning Road | a farming village in the raiders' path | 2, and raiders come for them |
| 2 Ironvale Bridge | a guarded river crossing | none |
| 3 Whispering Wood | deep forest | a woodward's lone cabin |
| 4 Siege of Highmoor | the town under the castle walls | 2 |
| 5 The Ashen Throne | the burned capital: ruins | 1 still standing |

A **house** with a lit doorway can be visited once: end a unit's move on it and choose **Visit**.
Each gives one reward (gold, a vulnerary, or a weapon that goes into the visitor's pack, sold for
half price if the pack is full); the cabin in chapter 3 holds a companion you can otherwise miss
entirely. A visited house shuts its door. Town buildings block movement; ruins are rough ground
with a little cover.

### Raiders

Only **brigands** can raid. They are their own unit: an axe fighter in a red head-wrap and fur
mantle who carries a lit torch in the off hand. Brigands marked *Raiding* ignore your army and
walk to the nearest house still standing to burn it down; a burned house's reward is gone for
good.

In chapter 1 two raiders ride in on turn 3 and, left alone, burn one house on turn 4 and the
other on turn 5. Stop them by defeating them, by visiting the house first, or by standing a unit
in the doorway, which protects that house and sends the raider to the next. With nothing left to
burn they fight like anyone else.

Raiding is a class ability. In the data, a brigand spawn gets `ai: 'raid'`; the simulated tests
reject that flag on any other class.

### Thieves

Fast, frail sword users (Pip joins in chapter 2; the Empire has its own cutpurses). Standing next
to an enemy that is not faster, a thief can **Steal** a vulnerary or any weapon that is not a
personal one, if there is room in the thief's pack.

Taking the weapon out of an enemy's hand needs 4 more Spd than the victim, bosses included; a
disarmed enemy cannot attack. A thief can also steal a key.

Enemy thieves steal too: an Imperial thief walks up to whoever carries the most valuable thing it
can take and robs them instead of fighting. Defeat that thief and the victor takes back every
stolen weapon and vulnerary, along with any keys it carried. With no room in the victor's pack, a
key is lost and anything else is sold, as at houses.

### Locks: chests, doors and gates

Treasure chests, locked doors and locked gates each take one **key** or one **lockpick** to open.
Stand on or beside a chest, or beside a door or gate, and the action menu offers *Chest: use key*,
*Door: use lockpick* and so on. Any unit can use a key; only a thief can use a lockpick, and a
thief carrying both chooses which to spend. An opened door or gate stays open for both sides.

A lockpick opens 5 locks and then snaps; Pip starts with one and the armory sells more at 500
gold. Some enemies carry a key, shown by a small gold key above them. Whoever defeats that enemy
takes the key into their own pack (if the pack is full the key is lost), and it stays with that
unit into later chapters until it is used.

In chapter 4 the two strongrooms are behind doors; in chapter 5 each chest sits in a vault behind
a gate. Locks only ever guard optional rooms, never the objective. An enemy thief marked
*Looting* carries a worn lockpick good for 2 locks, picks a door if the chests are locked in,
then empties a chest; defeat that thief and everything it took drops as gold.

### Packs and trading

A unit carries at most **5 items**. Anything with durability counts one each: every weapon and
every lockpick. Consumables stack: all of a unit's vulneraries are one item, and likewise its
keys and its dragonstones.

A unit standing next to an ally gets **Trade** in the action menu: pick an item on either side to
hand it across, as long as the receiver has room. Personal weapons cannot be traded. Trading does
not use the unit's action, but once something has changed hands the move is committed: the unit
cannot walk again or take the move back, though it can still attack, heal or wait. At camp, the armory has a **Give items to** picker that does the same between any two
companions.

### Effective weapons

Some weapons deal double might against one kind of unit, and the forecast marks the attack
*Effective*. (A critical hit is separate: it triples the damage, and Killing and Killer weapons
have +30 crit.) The pairings:

- Bows against flying units
- The **Rapier** (and Kael's Valen Rapier) and the **Hammer** against armoured units
- The **Ridersbane** lance against mounted and flying units

The merchant sells the Rapier, Hammer and Ridersbane from chapter 2.

### Durability

Every blow that lands wears the weapon by one use, and every heal wears the staff; a miss costs
nothing. The stronger the weapon, the fewer uses it has: iron-grade 40, steel 30, killer weapons
20, silver 15. At zero it breaks and is gone.

Personal weapons wear as well (30 uses) and can be repaired like any other; only a dragon's own
breath never wears. The count shows after the weapon's name, as in *Steel Lance 27/30*. The smith
at the armory repairs a worn weapon for up to half its price, in proportion to the wear. Enemy
weapons wear too.

### Dragonkin

Helpless in human form (Sable joins after chapter 4; Malrec looses bound dragonkin in chapter 5).
**Transform** spends a dragonstone and the unit's action, and makes the unit a dragon for three
turns after the transformation: HP +10, Str +8, Skl +3, Spd +2, Def +7, with fire breath that
reaches two tiles and sits outside the weapon triangle. Then it changes back.

A dragonkin carries up to 3 dragonstones; the merchant sells more at 1,200 gold each. Enemy
dragonkin transform when your army comes within their movement range, so they can be baited and
waited out.

### Dragon kinds

A dragonkin's element comes from the breath it carries, and sets how its dragon form looks and
what it breathes: **fire** (red, embers and a burning tail), **water** (blue, a sail fin and
flukes; Tide Breath is accurate), **earth** (wingless, rock plates and crystals; Stone Breath is
short and breaks armour), **wind** (pale green, streamers; Gale Breath reaches three tiles and is
strong against fliers), **light** (ivory and gold, feathered wings, antlers and a halo; Radiant
Breath) and **dark**.

In human form each shows small wings, a tail and cheek scales in its element's colours. Sable and
the enemy dragonkin are fire dragons; the other kinds are drawn and have their breath weapons
defined but are not placed on a map yet.

### The Dark Dragon

The Dark Dragon is a full dragon, three tiles by three, drawn in
`src/components/greatdragon.tsx` with idle, hit and death animations and five attacks: Umbral
Flame, Rending Claw, Tail Sweep, Wing Gale and Dread Roar. It is a sprite only for now, shown in
the sprite browser under the *Dragons* group; the multi-tile unit rules and its place in the
story are not implemented yet.

### Who marches

Up to 10 units deploy. With more companions than that, the Army panel at camp has a
**Marching / In reserve** toggle for everyone but Kael. The order in the panel is the deployment
order.

### Enemy behaviour

Aggressive units hunt the best target in reach, weighing kills, the lord and healers, and try
not to end their move where your whole army can strike back. A wounded attacker with nothing in
range falls back to a fort or throne instead of feeding. Guards wait until you come into range
(or attack them); attacking a guard, or defeating any enemy near one, wakes the nearby guard
post. Holders such as bosses never leave their tile.

### Limits

Each side fields at most 10 units. Reinforcements stop spawning once the enemy has 10 on the
field.

### Defeat

If Kael falls, the battle is lost and you can retry the chapter. In Classic mode other fallen
allies are gone for good; in Casual they return after the battle.

## Challenge mode and the map builder

**Challenge mode** (on the title screen) holds maps you build yourself. They have nothing to do
with the story: no roster, gold or experience carries in or out. Each map is just a puzzle.

From the challenge list you can start a **New map**, **Play**, **Edit**, **Export** or
**Delete** a map, or **Import map file**. Maps are saved in this browser as you edit them.
Export writes a `.json` file anyone can import into their own copy of Oathbound. Your best
(fewest turns) clear is kept on your browser and is not part of the exported file.

### Building a map

The builder has three columns: tools on the left, the map in the middle, and settings for the
map or the selected thing on the right.

- **Terrain**: pick a tile and click or drag to paint it. Every terrain from the story maps is
  available, including thrones, houses, chests, locked doors and gates.
- **Your unit** and **Enemy**: click an empty tile to place one. The first units you place are
  the story characters not yet on the map, at their usual level and kit. After that, each new
  unit copies the last one you edited on that side, so a row of archers takes one edit and a few
  clicks.
- **Select**: click a unit, house or chest to edit it. **Remove** deletes the unit you click.

A new map starts as 16 by 10 plains with Kael (the leader) and Lyra against two soldiers, so it
is playable before you change anything. Every option below has a default.

| Setting | Options | Default |
| --- | --- | --- |
| Size | 6 to 40 wide, 6 to 30 tall | 16 by 10 |
| Objective | defeat all enemies, defeat the boss, survive N turns, seize the throne | defeat all enemies |
| You lose when | your leader falls, or your whole army falls | your leader falls |
| Your unit | a story character at a chosen level, or a generic unit of any class | the next unused character |
| Unit items | weapons (up to 5), vulneraries, keys, lockpicks (thieves), dragonstones (dragonkin) | the class's usual kit |
| Enemy | class, level, weapons, behaviour, boss, carries a key, vulneraries, name | Lv 1 soldier with an iron lance |
| Arrives on turn | 1 means on the map at the start; later turns make it a reinforcement | 1 |
| Stat bonus | extra HP, Str, Skl, Spd, Lck and Def for one unit | none |
| House or chest | gold, a weapon or a vulnerary, and what it says | 500 gold (house), 1,000 gold (chest) |

A story character raised above their usual level gains each stat's average growth per level.
Reinforcements show faded with their arrival turn; up to 10 enemies may be on the map at the
start, and any number can arrive later.

**Test play** checks the map first and lists anything that stops it from being played: no
leader, a unit standing on terrain it cannot enter, a seize objective with no throne, and so on.
Challenge battles use every normal rule but cannot be saved mid-battle.

## The rest area

After each victory except the last, the party makes camp: a walkable night scene where you move
Kael freely. Companions idle around the fire; walk up to one (or click them) to open their profile
and bonds. Units recover half their missing HP on arrival.

Each night has **3 activities**:

- **Campfire**: rest, full HP for everyone
- **Training dummies**: one unit gains 50 exp (may level up)
- **Cooking pot**: share a meal, +15 bond for a pair

Walk up to a companion and press **E** to chat: Kael and the companion turn to each other and
talk in speech bubbles. Afterwards you can ask them to **walk with you** (up to three follow Kael
in single file along his path), tell a follower to **wait here**, or open their profile and
bonds.

The **merchant wagon** (armory) is free: buy weapons and vulneraries, sell, equip, and **forge**
(+1 might, +5 hit per level, up to +5). The **war table** saves and marches to the next battle.
Every station is also reachable from the buttons in the top bar.

## Bonds and romance

Six pairs can build bonds by acting next to each other in battle (+2 per action) or sharing
meals. View their conversations at camp to raise the rank C → B → A (→ S for the three romance
pairs). Each rank gives +5 hit and +5 avoid when the pair stands within 2 tiles; an S rank also
adds +5 crit.

S ranks are exclusive. Kael can marry Lyra or Mira, not both, and the choice changes the
epilogue. One A-rank conversation also unlocks a gift weapon.

## Characters, art, and animation

Every named character is in their 30s. Profiles (age, background, personality, appearance,
combat role, likes, quote, design notes) live in `src/game/data/profiles.ts` and appear in the
**Characters** screen (title and camp), when talking to companions at camp, and from the Profile
button during battle. Generic enemy types have shorter archetype profiles.

Characters are pixel art. `src/components/figure.tsx` composes each full-body sprite on a 32×34
pixel grid from parts: a head with one of ten hair styles, an outfit, limbs, a weapon, and a
horse, pegasus or wyvern for mounted classes. Colours come from each character's `Look` plus a
`Build` derived from their class, so every named character and enemy type has their own sprite.
Poses (idle, walk, talk, attacks, hit, dodge, a six-frame bloody death, and situational poses) are
frame animations stepped by the keyframes in `src/figure.css`. The same sprites stand on the
battle map.

Situational poses: **victory** (weapon raised with a glint; a horse rears, a pegasus beats its
wings) plays for whoever fells their foe; **wounded** (hunched over a bleeding wound, the mount
hanging its head) replaces idle at a third of max HP or less, on the map and in combat; **rest**
(on one knee; a horse grazes, a pegasus lands and folds its wings) marks units that have acted;
**sit** is used by companions near the campfire; **healed** (eyes closed, green motes rising)
plays on the map for a unit receiving a heal; **levelup** (a jump with gold sparks and a rising
arrow) plays in the level-up window. Dodging is a five-frame leap back with speed lines.

Weapons have distinct looks by type and tier, so a unit's sprite changes with what it has
equipped, on the map, in combat and at camp: steel is heavier and two-tone, killer weapons are
dark with a red edge, silver is bright with a blue edge, and the personal weapons (the Valen
Rapier, the Ashen Blade, the Oaken Staff) are one of a kind. The table is `WEAPON_STYLE` in
`src/components/figure.tsx`.

**Wyvern Riders** are the Empire's heavy fliers: armoured axe riders on red wyverns. They hit
harder and take more than Sky Knights but are slower, and bows are still their weakness. They
appear in chapters 4 and 5.

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
screen. Open the game with **`#gallery`** on the end of the URL (for example
`Oathbound.html#gallery`) for a model sheet showing every character in every pose.

### Sprite browser and gallery

Open the game with **`#sprites`** on the end of the URL (or press **Sprites** on the title
screen) for the sprite browser: every sprite and portrait the game can draw, filterable by type,
group, character, class, pose or expression, weapon and mount (terrain tiles are under type
"Tiles"), with search, a size slider, a facing toggle and a replay button.

The `#gallery` model sheet shows every character type in every pose at once.

## Further reading

- [Contributor guide](contributing.md) — setup, scripts, architecture, release and art pipelines
- [Troubleshooting](troubleshooting.md) — saves, controllers, fonts, performance and bug reports
- [Known limitations](known-limitations.md) — current gaps and unimplemented features
