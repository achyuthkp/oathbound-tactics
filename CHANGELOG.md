# Changelog

All notable changes to Oathbound: Ashes of Aldmere are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Split player documentation into a manual, contributor guide, troubleshooting page and known-limitations page.
- Save export and import from the Save/Load menu, with overwrite confirmation for occupied slots.
- Battle keyboard shortcuts: `T` ends the turn, `Z` toggles the danger zone, `R` switches weapons while aiming.
- Documentation-drift checks in the simulation, comparing the manual's terrain and chapter tables with game data.
- `npm test` / `npm run sim`: headless map validation and AI-vs-AI battle simulation.
- `npm run release`: builds and copies the single-file output to `Oathbound.html`.
- CI workflow running typecheck and tests on push and pull requests.
- Node version pin (`.nvmrc`) and an `engines` requirement of Node 18+.
- MIT `LICENSE`.

### Changed

- Enemy AI now values kills, the lord and healers, avoids overkill and suicidal counters, weighs
  the rest of your army's threat range, falls back to forts when wounded, and wakes nearby guards
  when one is attacked or killed.
- Restructured `README.md` around quick start, docs, controls and contributing; details now live in `docs/`.

## [1.0.0]

### Added

- Five-chapter tactical campaign with a walkable rest area between battles.
- Weapon triangle, bows, staves, terrain costs and bonuses, and optional permadeath.
- Combat forecast, danger zone, undo, mid-battle saving, and five save slots.
- Camp activities (campfire, training, cooking), bonds, and romance ranks.
- Armory with buying, selling, forging, repairing, and item trading.
- Pixel-art characters, mounts, terrain, portraits, and animated combat scenes.
- Mouse, keyboard, and gamepad controls; single-file offline build.
- Headless simulation (`test/sim.ts`) that validates maps and auto-plays battles.
