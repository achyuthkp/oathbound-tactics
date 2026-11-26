# Story notes (developer-facing)

The approved plan for Oathbound's story, agreed with the owner on 2026-11-26. The owner's premise
is the base: anything in the game that disagrees with it gets rewritten. This file is for people
working on the game, not players. Do not copy the **hidden** items below into the manual, the
in-game help or any tooltip.

## Premise

Malrec, the royal chancellor, murders King Aldric's family at the harvest feast and takes the
crown with the Ashen Empire's backing. Prince Kael sees it happen and escapes with Lyra, his
sworn knight and guardian. They win back the kingdom by helping towns and villages along the
way, gathering supporters who choose to follow them.

Beneath Caer Valen sleeps the sealed **Dark Dragon**. Malrec has stolen part of its power and
uses it to bind dragonkin minds; most dragonkin kneel, a few resist and join Kael. To finish
the binding Malrec needs light: **Aurelie**, a light dragonkin raised by the temple city of
Solenne as its living goddess, who does not know what she is. Once strong enough, Malrec turns
on his Imperial backers.

## Outline (about 15 chapters)

| # | Chapter | Story | Joins |
|---|---|---|---|
| 1 | The Burning Road | Opens on the murder and the escape. A village burned by Gorran's raiders | Kael, Lyra, Brann, Seren, Mira |
| 2 | Ironvale Bridge | The bridge town's sons are pressed into the garrison; freeing it | Tomas, Pip |
| 3 | Whispering Wood | The charcoal-burners' wood is hunted by Malrec's men | Rei, Osric (optional) |
| 4 | Siege of Highmoor | Freeing the castle town. Afterwards Sable is found in the vault: she resisted Malrec's call | Ilse |
| 5 | The Ashen Throne | **A defeat.** Malrec reveals the dragon power; survive, then escape the capital | Sable |
| 6 | Saltmere | Port town; bound water dragonkin sink ships. Three green Saltmere guards: save all three for 3,000 gold and the side chapter | Nerys (water) |
| 6s | The Drowned Archive (side chapter) | Only if all three guards lived. Sea caves under Saltmere; the Legion burns the dragon archive | Vesper (mage) |
| 7 | Deepforge | Mining town enslaved to dig toward the Dark Dragon's seal. Vesper (if she joined) finds a raw dragonstone and becomes a Dragon Sage | Garrow (earth) |
| 8 | Solenne | Temple city; defending its goddess from Malrec | Aurelie (light) |
| 9 | Galewatch | Mountain pass; the Sky Guard returns | Kestrel (wind) |
| 10 | (title tbd) | **Aurelie is captured**: Malrec needs her light | |
| 11 | (tbd) | Rescuing Aurelie | |
| 12 | (tbd) | Freeing a bound dragonkin legion | |
| 13 | (tbd) | Malrec betrays the Empire: a three-way battle; the Imperial general may come over | |
| 14 | (tbd) | Caer Valen retaken; Malrec beaten as a man | |
| 15 | (tbd) | The Dark Dragon: Malrec merges with it (the 3x3 boss). Kael is crowned | |

## New characters

| Name | Kind | One line |
|---|---|---|
| Nerys | Water dragonkin | Quietly guarded Saltmere's fishermen for a century. Dry humour, hates being thanked |
| Garrow | Earth dragonkin | Slow-spoken, immovable. Was made to dig his own kin's prison and refused |
| Kestrel | Wind dragonkin | Restless and quick-mouthed; never lands for long. Befriends Ilse's riders |
| Vesper | Mage, later Dragon Sage | Keeper of the Drowned Archive. Bookish and quietly reckless. Missable: lost for good if any Saltmere guard dies. Starts with no stones; from chapter 7 picks fire, water, earth or wind each time she transforms (light is exclusive to Aurelie, dark to the Dark Dragon), max 3 stones |
| Aurelie | Light dragonkin | Solenne's living goddess: serene in public, sheltered and curious in private. Romance option for Kael |

Malrec's own forces are **the Ashen Legion**, fighting beside Imperial troops.

## Romance (hidden easter egg)

Kael's romance options are Lyra, Mira and Aurelie. **Hidden:** he can reach a romance with up to
two of them. If both of those partners stand next to each other in battle, both lose their bond
bonuses and take -10 hit and -10 avoid (jealousy). This is an easter egg: never explain it to
the player anywhere in the game or the manual.

## Built so far

- The hidden romance rule: `ROMANCE_LIMIT` in `src/game/campaign.ts` (Kael: 2) and `jealous()` in `src/game/combat.ts`. When a third romance is blocked, the camp shows the ordinary "already holds an S bond" message, and the forecast never shows the penalty. The epilogue has a special entry when Kael holds two romances.
- Nerys, Garrow, Kestrel and Aurelie: looks, builds, templates, profiles, endings, and bonds (Kael and Aurelie romance; Aurelie and Mira; Sable and Garrow; Ilse and Kestrel). They are in `LATER_IDS`: shown in the sprite browser and model sheet and placeable in challenge mode, but kept out of the title-screen codex until their chapters exist. None of them is recruited by any chapter yet.

- Chapters 6 (Saltmere) and 7 (Deepforge), with bosses Commodore Hesk and Overseer Druss and bound water and earth dragonkin. Nerys and Garrow join and are in the codex.
- Green allies (`allies` on a chapter, team `ally`, an Ally phase between player and enemy), the Saltmere reward and flag, side chapters (`requires`), the side chapter The Drowned Archive, tomes (Fire, Thunder, Blizzard), the Mage and Dragon Sage classes, and Vesper (in `LATER_IDS`, so kept out of the codex as a secret).

## Still to build

- Chapters 8 to 15, a few at a time; wind and light enemy dragonkin placed on them.
- The world map still draws the Highmoor to Caer Valen route for chapters 6 onwards; Saltmere, the archive and Deepforge need places on it.
- The Dark Dragon as a 3x3 unit before chapter 15.
- Optional: pirates and a sea movement type around Saltmere.
