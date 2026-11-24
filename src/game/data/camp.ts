/** Short exchanges when Kael talks to a companion at camp. Picked in rotation. */
type Line = [speaker: string, text: string];

export const CAMP_CHATTER: Record<string, Line[][]> = {
  lyra: [
    [['kael', 'Still awake?'], ['lyra', 'Ember threw a shoe. I\'m pretending I know how to fix it.'], ['kael', 'Do you?'], ['lyra', 'Absolutely not.']],
    [['lyra', 'You keep looking north.'], ['kael', 'Habit. Ten years on the frontier.'], ['lyra', 'Then look at the fire for once. It\'s warmer.']],
    [['kael', 'Spar at dawn?'], ['lyra', 'Only if you promise not to sulk when you lose.'], ['kael', 'I never sulk.'], ['lyra', 'You\'re sulking right now.']],
  ],
  brann: [
    [['brann', 'Your Highness. Come to count my coin?'], ['kael', 'Come to thank you, actually.'], ['brann', '...Huh. Well. Don\'t make a habit of it.']],
    [['kael', 'That axe has seen some wear.'], ['brann', 'Twenty years. Same handle, four new heads.'], ['kael', 'Then is it the same axe?'], ['brann', 'Don\'t start with the philosophy, lad.']],
    [['brann', 'My sister\'s eldest wants to be a knight.'], ['kael', 'And you?'], ['brann', 'I want her to be bored and safe. We\'ll see who wins.']],
  ],
  seren: [
    [['seren', 'Walk quieter. You\'ll spook the owls.'], ['kael', 'There are owls?'], ['seren', 'Not anymore.']],
    [['kael', 'How many arrows left?'], ['seren', 'Forty-one. Forty if Brann keeps borrowing them as toothpicks.']],
    [['seren', 'The village sent bread. It\'s terrible.'], ['kael', 'Then why are you smiling?'], ['seren', 'Because they sent it.']],
  ],
  mira: [
    [['mira', 'Let me see your hands.'], ['kael', 'They\'re fine.'], ['mira', 'They\'re blistered. Sit.']],
    [['kael', 'Do you ever rest?'], ['mira', 'When everyone else is asleep. So, rarely, with this lot.']],
    [['mira', 'The abbess would faint if she saw me now.'], ['kael', 'Proud or horrified?'], ['mira', 'Both. She was very good at both.']],
  ],
  tomas: [
    [['tomas', 'My lord. The watch is set.'], ['kael', 'Just Kael, by the fire.'], ['tomas', 'As you wish, my lord.']],
    [['kael', 'You polish that armour every night.'], ['tomas', 'A knight\'s armour should shine. Especially when he hasn\'t.']],
    [['tomas', 'Why did the knight bring a ladder to the siege?'], ['kael', 'Please don\'t.'], ['tomas', 'He heard the stakes were high.']],
  ],
  rei: [
    [['rei', '...'], ['kael', 'Mind if I sit?'], ['rei', 'You already are.']],
    [['kael', 'Your form is perfect.'], ['rei', 'No. But it is closer than yesterday.']],
    [['rei', 'Your footwork drifts left when you\'re tired.'], ['kael', 'You noticed that?'], ['rei', 'So will the enemy. Fix it.']],
  ],
  ilse: [
    [['ilse', 'Gale wants an apple. Gale always wants an apple.'], ['kael', 'And you?'], ['ilse', 'I also always want an apple.']],
    [['kael', 'Do you miss the Sky Guard?'], ['ilse', 'Every time it storms. They used to race the lightning.']],
    [['ilse', 'From up there, the camp looks like one little candle.'], ['kael', 'Is that a comfort?'], ['ilse', 'It\'s ours. That\'s the comfort.']],
  ],
};
