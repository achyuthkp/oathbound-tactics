# Troubleshooting

This page covers common problems with saves, controllers, fonts, the camera, animation and
performance, and explains what to include in a bug report. For controls and rules, see
[manual.md](manual.md). For setup and scripts, see [contributing.md](contributing.md). For
known gaps, see [known-limitations.md](known-limitations.md).

## Saves and local storage

### My saves disappeared

Saves live in the browser's localStorage, not in the game file. They are tied to a browser
profile and to the exact origin that opened the game. Common causes:

- A different browser, browser profile, or private/incognito window.
- Clearing cookies and site data, or a privacy tool that clears storage on exit.
- Opening the game a different way. `Oathbound.html` opened from disk and `npm run dev` at
  `http://localhost:5173` are different origins with separate saves. A different dev-server
  port is also a different origin.
- Browser policy that blocks or discards localStorage for `file://` pages. Behaviour here
  varies by browser.

There is no cloud account and no server-side save. If the data was cleared, the game cannot
recover it by itself. Export saves regularly from the Save/Load menu; the exported JSON is the
backup. If a save is missing after checking the points above, it is almost certainly gone from
that origin. If this persists across a fresh browser profile and a normal restart, report it with
the browser and how you opened the game.

### I want to move a save between `Oathbound.html` and the dev server

Use the Save/Load menu's **Export** and **Import** buttons. Export the save in the old origin,
then open the game in the new origin and import the JSON file. Import restores the save to the
slot recorded in the file and asks before overwriting an occupied slot. The imported copy then
lives in the new browser's storage, so keep the JSON if you may need it again.

Do not hand-edit the JSON unless you are prepared to lose the save. The importer checks the save's
version and shape before storing it.

### I cannot save during a battle

Mid-battle saving is only available on your turn, and only when no unit is part-way through an
action. Finish or cancel the current move, attack, trade, visit or dialogue, then try again.
During the enemy phase, in a story scene, or after the battle has ended, saving is unavailable.
You can always save at camp.

Retrying after a defeat is separate from loading a save: it restarts the chapter from its
beginning, even if you saved mid-battle earlier.

### Saving says storage is unavailable

The browser refused the localStorage write, usually because storage is full or disabled. Delete
old or unwanted slots in the Load menu, clear space for the site, and avoid private windows.
Export any save you still have before clearing data. If this persists with plenty of free space
and normal browser settings, report the browser, its version, and whether the game was opened
from disk or the dev server.

### Import does not seem to work

Confirm the file is a JSON save exported by this game and that you completed the overwrite
confirmation if the target slot was occupied. After importing, the game should show the restored
slot in the Save/Load menu. If the slot still looks empty, reload the page and check the same
origin again. If this persists, keep the JSON file and include it in a bug report if you are
comfortable sharing your progress.

## Controllers

### The controller is not detected

Gamepad support uses the browser's Gamepad API. Try these in order:

1. Connect the controller, then **press a button or move a stick**. Browsers often hide a pad
   from the page until it sends input.
2. Click the game window so it has focus, then press a button again.
3. Use a current browser with Gamepad API support, and check the pad in a gamepad tester to
   confirm the operating system sees it.
4. Prefer a wired connection or re-pair Bluetooth while the game is closed, then reopen the game
   and press a button.
5. On Steam Deck or with Steam Input, check whether Steam is presenting the pad as a standard
   gamepad, as keyboard/mouse, or not at all. The game prefers a pad with the standard mapping.
   If Steam Input emits keyboard and mouse events instead, the normal keyboard bindings still
   work, but on-screen controller hints may not appear.

Some controllers report a non-standard button mapping. The game can still detect them, but
individual buttons may be mismatched. If the pad works in the system tester and not here, report
the controller model, connection type, browser, and which buttons fail. If this persists, try a
different browser before filing the report.

### The controller works in menus but not on the battlefield

Make sure the game window has focus and that no other overlay has captured input. Close any open
sheet or pause menu with B / Circle, then try the D-pad again. The battle map, camp, combat scene
and story scenes take direction input directly; ordinary menus move focus between buttons.

## Fonts, offline play, and opening the game

### The fonts look different offline

The page asks Google Fonts for Cinzel, Alegreya and Alegreya Sans. When those requests fail, the
game falls back to Palatino/Georgia-style serif fonts and the system UI font. This is expected
and does not affect gameplay. The built `Oathbound.html` includes its code and styles but not the
font files, so the fallback also appears on a first offline load.

### The page is blank

Open `Oathbound.html`, which is the self-contained build. Opening the repository's `index.html`
directly through `file://` will not work: it is the Vite entry page and expects the dev server
and module resolution. Either double-click `Oathbound.html` or run `npm run dev` from the source
tree.

If `Oathbound.html` is blank, try a current browser, disable script-blocking extensions for the
file, and check the browser console for an error. If this persists, report the browser, operating
system and the console error.

### F5 and F9 do not reload or save

In game, F5 is quicksave and F9 is quickload; the game intercepts them while its window has
focus. To reload the browser page, use Ctrl+R (Cmd+R on Mac) or Ctrl+Shift+R for a hard reload.
F9 with no quicksave reports that the slot is empty rather than loading anything.

Quickload is not a general undo. It loads the quicksave slot, which may be older than your
current battle. Use the Save/Load menu to choose a specific slot.

## Map, camera, animation and performance

### The map will not scroll

The camera only scrolls when the map is larger than the visible area. Chapter maps are 22×14
against a 14×10 viewport, so they normally do. Drag with the left mouse button, use the wheel or
trackpad, or move the cursor with the arrow keys or a controller and let the camera follow. The
camera also opens your turn on a unit that can act. If the window is very small, the game scales
the view down to fit; resizing the window can change how much scrolling is needed.

### The camera jumped or the map is cut off

The camera follows the active unit and recenters during turn changes. Decorative terrain past a
small map's edges is dimmed on purpose. If a unit seems off-screen, move the cursor with the
arrow keys or press `[` / `]` to jump between units that can still act. If the view stays stuck
after resizing, reload the page and note the chapter.

### I want fewer animations

Open the battle **Menu** and turn **Battle animations** off. Combat then resolves without the
full attack scene. You can still skip an individual scene with a click or Space. The game also
honours the operating system's reduced-motion setting through CSS, and the campaign travel
animation is skipped when reduced motion is requested.

### The game runs slowly

Try, in order: turn battle animations off, close other tabs and heavy applications, make the
window smaller (the map scales to fit), and enable hardware acceleration in the browser. Long
battles with many units and effects are the most demanding. If performance is still poor on a
machine that handles similar browser games, report the browser, hardware, chapter, turn, and
whether the slowdown happens during AI turns, combat scenes or camp. If this persists, include a
short recording if you can.

## Reporting a bug

Use the project's issue tracker and include enough detail to reproduce the problem:

- Game version or commit, and whether you played `Oathbound.html` or `npm run dev`.
- Browser and version, operating system, and whether you used keyboard/mouse or a controller
  (including the controller model).
- Game mode (Classic or Casual), chapter, turn, and the units or menu involved.
- Exact steps, what you expected, and what happened instead.
- Any console errors: open the browser developer tools, reproduce the problem, and copy the
  error text.
- A screenshot or short recording when the problem is visual.
- An exported save if the problem involves progression, and you are comfortable sharing it. Saves
  contain your campaign progress.

If a workaround above fixes the problem, mention it; that still helps narrow down the cause. Do
not claim a fix is needed for expected behaviour such as offline font fallback, reduced-motion
skipping, or the deliberate separation of saves between origins.
