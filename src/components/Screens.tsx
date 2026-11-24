import { useState } from 'react';
import { CHARACTER_ENDINGS, lookById, nameById } from '../game/data/characters';
import { SUPPORTS, pairKey } from '../game/data/supports';
import type { Campaign, GameMode } from '../game/types';
import { Portrait, WeaponIcon } from './art';
import { TriangleLegend } from './battle/parts';
import { Codex } from './Profile';

export function TitleScreen({ canContinue, onNew, onContinue, onLoad }: { canContinue: boolean; onNew: (m: GameMode) => void; onContinue: () => void; onLoad: () => void }) {
  const [panel, setPanel] = useState<'none' | 'mode' | 'help' | 'codex'>('none');
  return (
    <div className="title-screen">
      <div className="title-crest" aria-hidden="true">
        <WeaponIcon type="sword" size={46} /><WeaponIcon type="lance" size={46} /><WeaponIcon type="axe" size={46} />
      </div>
      <h1 className="logo">Oathbound</h1>
      <p className="logo-sub">Ashes of Aldmere</p>
      <div className="title-menu">
        {canContinue && <button className="primary" onClick={onContinue}>Continue</button>}
        <button className={canContinue ? '' : 'primary'} onClick={() => setPanel('mode')}>New game</button>
        {canContinue && <button onClick={onLoad}>Load game</button>}
        <button className="ghost" onClick={() => setPanel('codex')}>Characters</button>
        <button className="ghost" onClick={() => setPanel('help')}>How to play</button>
        <button className="ghost" onClick={() => { window.location.hash = '#sprites'; }}>Sprites</button>
      </div>
      <p className="title-foot">A tactical role-playing game in five chapters.</p>

      {panel === 'mode' && (
        <div className="modal-back" onClick={() => setPanel('none')}>
          <div className="mode-pick" onClick={e => e.stopPropagation()}>
            <h2>Choose your oath</h2>
            <button onClick={() => onNew('classic')}>
              <strong>Classic</strong>
              <span>Fallen allies are gone for good. Every move matters.</span>
            </button>
            <button onClick={() => onNew('casual')}>
              <strong>Casual</strong>
              <span>Fallen allies retreat and return after the battle.</span>
            </button>
            <p className="hint">In both modes, the battle is lost if Kael falls.</p>
          </div>
        </div>
      )}

      {panel === 'codex' && <Codex onClose={() => setPanel('none')} />}

      {panel === 'help' && (
        <div className="modal-back" onClick={() => setPanel('none')}>
          <div className="help" onClick={e => e.stopPropagation()}>
            <h2>How to play</h2>
            <div className="help-cols">
              <div>
                <h3>Your turn</h3>
                <p>Click one of your units to see where it can move (blue) and attack (red). Click a blue tile to move, then choose Attack, Heal, Vulnerary or Wait. Clicking an enemy in red moves you next to it automatically. Right-click or press Esc to undo a move.</p>
                <h3>Combat</h3>
                <p>Before attacking you see a forecast: damage, hit chance and crit chance for both sides. A unit with 4 more attack speed than its foe strikes twice. Heavy weapons slow you down if you lack the strength for them.</p>
                <h3>Terrain</h3>
                <p>Forests, forts and mountains add defense and avoid. Forts and thrones heal 20% each turn. Fliers ignore terrain costs but get no terrain bonus.</p>
              </div>
              <div>
                <TriangleLegend />
                <h3>Between battles</h3>
                <p>After every victory you make camp. Walk Kael around with WASD or the arrow keys (or click the ground). Walk up to the fire, training dummies, cooking pot or merchant and press E. Each night has three activities; the armory is free.</p>
                <h3>Bonds</h3>
                <p>Companions who fight side by side grow closer. View their conversations at camp to raise their rank and earn battle bonuses. A few bonds can blossom into romance.</p>
              </div>
            </div>
            <button className="primary" onClick={() => setPanel('none')}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GameOverScreen({ onRetry, onLoad, onTitle }: { onRetry: () => void; onLoad: () => void; onTitle: () => void }) {
  return (
    <div className="gameover">
      <h1>The oath is broken</h1>
      <p>Kael has fallen, and with him the last hope of Aldmere.</p>
      <div className="title-menu">
        <button className="primary" onClick={onRetry}>Retry the chapter</button>
        <button onClick={onLoad}>Load a save</button>
        <button className="ghost" onClick={onTitle}>Title screen</button>
      </div>
    </div>
  );
}

export function EndingScreen({ campaign, onTitle }: { campaign: Campaign; onTitle: () => void }) {
  const alive = campaign.roster.map(u => u.id);
  const sPairs = SUPPORTS.filter(p => p.romance && (campaign.ranks[pairKey(p.a, p.b)] ?? 0) >= 4 && alive.includes(p.a) && alive.includes(p.b));
  const paired = new Set(sPairs.flatMap(p => [p.a, p.b]));
  const solo = alive.filter(id => !paired.has(id));
  return (
    <div className="ending">
      <h1>Epilogue</h1>
      <div className="ending-list">
        {sPairs.map(p => (
          <article key={pairKey(p.a, p.b)} className="ending-pair">
            <div className="bond-faces"><Portrait look={lookById(p.a)} size={64} /><Portrait look={lookById(p.b)} size={64} /></div>
            <p>{p.ending}</p>
          </article>
        ))}
        {solo.map(id => (
          <article key={id}>
            <Portrait look={lookById(id)} size={64} />
            <p>{CHARACTER_ENDINGS[id]}</p>
          </article>
        ))}
        {campaign.fallen.length > 0 && (
          <article className="memorial">
            <p>In memory of {campaign.fallen.map(nameById).join(', ')}, who did not live to see the dawn they fought for.</p>
          </article>
        )}
      </div>
      <p className="the-end">The end</p>
      <button className="primary" onClick={onTitle}>Return to title</button>
    </div>
  );
}
