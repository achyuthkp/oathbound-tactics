# Oathbound art kit

Every character illustration in the game, rendered to standalone SVG by `npm run export-art`.
The art is pixel art drawn as SVG rectangles (`shape-rendering: crispEdges`), so it scales to
any size without blurring. Each file embeds its animation CSS, so opening one in a browser
plays its loop. Re-run the script after changing any art code.

## portraits/  (72 files)

`<character>-<mood>.svg` for the 8 companions and 4 named villains. Moods: `neutral`,
`happy`, `angry`, `sad`, `surprised`, plus `talking` (lip-sync loop). 40×48 pixels on a
200×240 artboard (5 units per pixel).

Drawn back to front in `drawBust` (`src/components/art.tsx`): back hair / ponytail / bun / hood,
shoulders and costume, head, eyes, front hair or helm, brows, mouth. Three overlay groups hold
only the pixels that change: `blinkf` (eyes shut), `m1` and `m2` (mouth half open, open).

## models/  (140 files)

`<id>-<pose>.svg` for every named character and the 8 generic enemy types. Poses: `idle`,
`walk`, `talk`, the class attack (`slash`, `thrust`, `chop`, `shoot` or `cast`), `hit`, `dodge`,
`die`. 32×34 pixels on a 160×170 artboard, feet on row 31, facing right (mirror with
`scaleX(-1)` for left).

Each file holds one `<g class="fr">` per animation frame (idle 2, walk 4 on foot or 2 mounted,
talk 2, attacks 3). `drawFrame` in `src/components/figure.tsx` builds a frame from: mount,
cape or quiver, back arm, legs, torso and outfit, head (`FACE` plus a `HAIR` template), weapon,
front arm. Head, hair, horse head and wings are ASCII templates in that file; edit them to
redraw a part.

## world-map.svg

The Kingdom of Aldmere, still vector art. In game the party walks the highlighted road between
chapters.

## legacy-vector/

The earlier rigged vector portraits and models, kept for reference. Not used by the game.

## Palette

Character colours live in `src/game/data/characters.ts` (`Look`: skin, hair, hair style,
cloth, accent, eye colour, lashes, freckles, stubble, scar, outfit, cape). Changing a value
there updates the portrait, the sprite, the map token and these exports together.
