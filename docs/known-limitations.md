# Known limitations

This page describes what the current build of *Oathbound: Ashes of Aldmere* does not do. These
are present-day limits, not a roadmap or a promise of future features. Terms follow
[the manual](manual.md).

## The Dark Dragon is a sprite-only showcase

The full-size Dark Dragon is drawn as a three-by-three sprite in
`src/components/greatdragon.tsx`, with idle, hit and death animations and five attack poses. It
can be viewed in the sprite browser under the **Dragons** group (type **Sprites**), but it is
not a playable or enemy unit: multi-tile footprint, movement, targeting and attack rules are not
implemented, and the Dark Dragon does not appear in any battle.

## Only fire dragonkin appear in the campaign

Water, earth, wind, light and dark dragonkin are drawn, and their breath weapons are defined in
`src/game/data/weapons.ts` (including **Radiant Breath** and **Umbral Flame**), but none of them
is placed on a campaign map. Sable and the enemy dragonkin are fire dragons, so the other
breaths cannot be seen in normal play yet.

## Saves stay in the browser

Saves are origin-bound and use the browser's `localStorage`. They belong to one browser profile
and one way of opening the game: the packaged `Oathbound.html`, a dev server and any other build
are different origins with separate saves. There are no cloud saves, accounts or cross-device
sync, and clearing site data deletes the saves. The **Export** button in the Save/Load menu
downloads a slot as `oathbound-<slot>.json`; **Import save file** restores a file to the slot
named inside it (unknown or missing slots go to Slot 1), asks before overwriting an occupied
slot, and does not load the save automatically. Export is the only way to keep a backup outside
this browser.

## Mid-battle saving has conditions

A mid-battle save is only allowed during your turn, when no unit is part-way through an action
and no action menu or combat forecast is open. Saving is refused during the enemy phase, combat
animations, dialogue, level-ups, visits, stealing, trading, and after the battle has ended. The
save menu reports the reason when saving is unavailable. Saving at the rest area is always
available.

## Touch input is not officially supported

Mouse/trackpad, keyboard and gamepad are the supported inputs. Touch screens are not officially
supported or tested: taps may act as clicks in some browsers, but dragging the map, pinch
zooming, scrolling and small controls are not designed for touch, and there are no on-screen
touch controls.

## No online play

The game is single-player only. There is no online multiplayer, co-op, matchmaking, server-hosted
play, cloud saving or leaderboard. Everything runs locally in the browser, apart from web-font
loading.
