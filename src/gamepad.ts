/**
 * Controller support (Xbox, PS5 DualSense, Steam Deck / Steam Input, anything the browser
 * reports with the "standard" Gamepad mapping).
 *
 * The pad does not get its own code path through the game. It drives what is already there:
 *   - directions become arrow-key events (camp movement, the battle cursor) or move focus
 *     between buttons when a menu is open;
 *   - A / Cross clicks the focused button, otherwise sends Enter;
 *   - B / Circle closes the open menu, otherwise sends Backspace (cancel);
 *   - every other button clicks the on-screen control tagged `data-pad="x|y|lb|rb|start|select"`.
 * Arrow-key focus navigation also works from a keyboard.
 */

/** Standard-mapping button index -> our name. */
const BUTTONS: Record<number, string> = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 8: 'select', 9: 'start' };
const DIRS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const;
const REPEAT_DELAY = 340, REPEAT_EVERY = 110, STICK = 0.5;

const FOCUSABLE = 'button:not(:disabled), a[href], select, input:not(:disabled)';
/** Layers that take over input while they are open, lowest to highest. */
const OVERLAYS = '.modal-back, .sheet-back, .action-menu, .cw-choice';

const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

/** The element whose buttons the directions should move between, or null when the game owns them. */
function navScope(): HTMLElement | null {
  const overlays = [...document.querySelectorAll<HTMLElement>(OVERLAYS)].filter(visible);
  if (overlays.length) return overlays[overlays.length - 1];
  const group = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-pad-group]');
  if (group) return group;
  // the battle map, the camp, a combat scene or a story scene use the directions themselves
  if (document.querySelector('.map-frame, .cw-world, .cs-back, .story')) return null;
  return document.body;
}

function moveFocus(scope: HTMLElement, key: string): boolean {
  const items = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
  if (!items.length) return false;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !items.includes(cur)) {
    (items.find(i => i.classList.contains('primary')) ?? items[0]).focus();
    return true;
  }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  const [dx, dy] = key === 'ArrowUp' ? [0, -1] : key === 'ArrowDown' ? [0, 1] : key === 'ArrowLeft' ? [-1, 0] : [1, 0];
  let best: HTMLElement | null = null, bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const vx = b.left + b.width / 2 - ax, vy = b.top + b.height / 2 - ay;
    const along = vx * dx + vy * dy, across = Math.abs(vx * dy) + Math.abs(vy * dx);
    if (along <= 1) continue; // not in that direction
    const score = along + across * 2.5; // prefer what lies straight ahead
    if (score < bestScore) { bestScore = score; best = el; }
  }
  best?.focus();
  best?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}

function sendKey(key: string, type: 'keydown' | 'keyup' = 'keydown') {
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
}

function press(name: string) {
  const scope = navScope();
  const focused = document.activeElement as HTMLElement | null;
  if (name === 'a') {
    if (scope && focused && scope.contains(focused) && focused.matches(FOCUSABLE)) focused.click();
    // a notice with nothing to choose (level up): any confirm dismisses it
    else if (scope?.matches('.modal-back') && !scope.querySelector(FOCUSABLE)) scope.click();
    else { if (focused && focused !== document.body) focused.blur(); sendKey('Enter'); }
    return;
  }
  if (name === 'b') {
    const close = scope?.querySelector<HTMLElement>('[data-pad="b"], button[aria-label="Close"]');
    if (close) close.click();
    else if (scope?.matches('.modal-back, .sheet-back')) scope.click();
    else if (scope?.matches('[data-pad-group]')) focused?.blur();
    else sendKey('Backspace');
    return;
  }
  // a tagged on-screen control, looked up inside the open menu first
  const root = scope && scope !== document.body && !scope.matches('[data-pad-group]') ? scope : document;
  const target = [...root.querySelectorAll<HTMLElement>(`[data-pad="${name}"]`)].find(el => visible(el) && !(el as HTMLButtonElement).disabled);
  if (target?.hasAttribute('data-pad-group')) target.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  else if (target) target.click();
  else if (name === 'lb') sendKey('[');
  else if (name === 'rb') sendKey(']');
}

/** Xbox-style letters or PlayStation shapes, for the on-screen hints (see the pad rules in styles.css). */
function padType(id: string): 'ps' | 'xbox' {
  return /dualsense|dualshock|playstation|054c/i.test(id) ? 'ps' : 'xbox';
}

export function startGamepad() {
  // arrow keys (from a keyboard or from the pad) move focus while a menu owns the screen
  window.addEventListener('keydown', e => {
    if (!DIRS.includes(e.key as typeof DIRS[number]) || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (e.isTrusted && t?.matches('select, input')) return; // let native controls use their own arrows
    const scope = navScope();
    if (scope && moveFocus(scope, e.key)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  const held = new Map<string, number>(); // direction or button -> time of next repeat
  const poll = () => {
    const pad = [...navigator.getGamepads()].find(p => p && p.connected && p.mapping === 'standard')
      ?? [...navigator.getGamepads()].find(p => p && p.connected);
    const now = performance.now();
    if (pad) {
      document.body.classList.add('pad-on');
      document.body.dataset.padType = padType(pad.id);
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const down = [
        b(12) || pad.axes[1] < -STICK, b(13) || pad.axes[1] > STICK,
        b(14) || pad.axes[0] < -STICK, b(15) || pad.axes[0] > STICK,
      ];
      DIRS.forEach((key, i) => {
        if (down[i]) {
          const next = held.get(key);
          if (next === undefined) { held.set(key, now + REPEAT_DELAY); sendKey(key); }
          else if (now >= next) { held.set(key, now + REPEAT_EVERY); sendKey(key); }
        } else if (held.delete(key)) sendKey(key, 'keyup');
      });
      for (const [i, name] of Object.entries(BUTTONS)) {
        if (b(Number(i))) { if (!held.has(name)) { held.set(name, 0); press(name); } }
        else held.delete(name);
      }
    } else if (held.size) {
      for (const key of DIRS) if (held.delete(key)) sendKey(key, 'keyup');
      held.clear();
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
  window.addEventListener('gamepaddisconnected', () => document.body.classList.remove('pad-on'));
}
