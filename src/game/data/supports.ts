import type { DialogueLine, Mood, RankLetter, SupportPair } from '../types';

export const RANKS: RankLetter[] = ['C', 'B', 'A', 'S'];
export const RANK_THRESHOLD: Record<RankLetter, number> = { C: 8, B: 20, A: 36, S: 55 };
/** Bond points gained when two partners act next to each other in battle. */
export const BATTLE_BOND = 2;
/** Bond points gained from a shared meal at camp. */
export const MEAL_BOND = 15;

export const rankLetter = (r: number): string => (r <= 0 ? '–' : RANKS[r - 1]);
export const pairKey = (a: string, b: string): string => [a, b].sort().join('|');

const L = (speaker: string, text: string, mood?: Mood): DialogueLine => ({ speaker, text, mood });

export const SUPPORTS: SupportPair[] = [
  {
    a: 'kael', b: 'lyra', romance: true, start: 8,
    ending: 'Kael and Lyra were wed beneath the restored towers of Caer Valen. Queen Lyra kept a sword beside the bed for the rest of her life, "just in case."',
    convos: [
      { rank: 'C', lines: [
        L('lyra', 'My lord, you took a blow meant for me today. Don\'t do that again.', 'angry'),
        L('kael', 'You would have done the same for me.'),
        L('lyra', 'That\'s my duty. I swore to your father I\'d keep you alive.'),
        L('kael', 'And I never swore to let you die for me. So we\'re even.'),
        L('lyra', '...That is not how oaths work, Kael.', 'happy'),
      ] },
      { rank: 'B', lines: [
        L('kael', 'Still sharpening that sword? It\'s past midnight.'),
        L('lyra', 'I can\'t sleep. Every time I close my eyes I see the capital burning.', 'sad'),
        L('kael', '...Me too. Sit with me a while?'),
        L('lyra', 'Only for a moment. Someone has to keep watch.'),
        L('kael', 'Then we\'ll keep it together.', 'happy'),
      ] },
      { rank: 'A', lines: [
        L('lyra', 'Do you remember the tourney when we were children? You lost to me four times.'),
        L('kael', 'Five. I still say the fifth was rigged.', 'happy'),
        L('lyra', 'It wasn\'t. ...I used to think I\'d spend my whole life guarding you from a distance.'),
        L('kael', 'And now?'),
        L('lyra', 'Now I\'d rather stand beside you. If you\'ll have me there.'),
        L('kael', 'There\'s nowhere I would rather you be.', 'happy'),
      ] },
      { rank: 'S', lines: [
        L('kael', 'Lyra. When this is over, Aldmere will need a ruler. And I will need someone I trust above everyone.'),
        L('lyra', 'You\'ll have your whole court, my lord.'),
        L('kael', 'I don\'t want a court. I want you. Not as my knight. As my partner.'),
        L('lyra', '...You\'re serious.', 'surprised'),
        L('kael', 'I have never been more serious about anything.'),
        L('lyra', 'Then yes. A thousand times yes. But I\'m still guarding your back in battle.', 'happy'),
        L('kael', 'I would expect nothing less.'),
      ] },
    ],
  },
  {
    a: 'kael', b: 'mira', romance: true, start: 4,
    ending: 'Kael and Mira were wed in the rebuilt chapel of Saint Edda. The new queen founded a hospice in every province, and the king never once escaped a lecture over a scraped knee.',
    convos: [
      { rank: 'C', lines: [
        L('mira', 'Hold still, my lord. That cut needs cleaning.'),
        L('kael', 'It\'s nothing.'),
        L('mira', 'Everything is "nothing" to you until it festers. Hold. Still.', 'angry'),
        L('kael', '...Yes, Sister Mira.'),
        L('mira', 'Good. You can be taught.', 'happy'),
      ] },
      { rank: 'B', lines: [
        L('kael', 'Why did you leave the cloister to follow us?'),
        L('mira', 'The abbess told me healing is a quiet vocation. That I should wait for the wounded to come to me.'),
        L('mira', 'But the wounded were everywhere, and no one was bringing them anywhere.'),
        L('kael', 'So you came to them.'),
        L('mira', 'So I came to you. ...To all of you, I mean.'),
      ] },
      { rank: 'A', lines: [
        L('mira', 'I pray every night, you know. For all of us.'),
        L('kael', 'Does it help?'),
        L('mira', 'Lately I find myself praying mostly for one person. That probably isn\'t very saintly of me.'),
        L('kael', 'Who?'),
        L('mira', '...Ask me again when the war is over.', 'happy'),
      ] },
      { rank: 'S', lines: [
        L('kael', 'The war is nearly over. So I\'m asking again.'),
        L('mira', 'You remembered.'),
        L('kael', 'I remember everything you say.'),
        L('mira', 'Then remember this: it was you. It has always been you, Kael.', 'happy'),
        L('kael', 'Stay with me, Mira. After all of this. Always.'),
        L('mira', 'Always. Though I am still going to scold you for every scratch.'),
      ] },
    ],
  },
  {
    a: 'brann', b: 'seren', romance: false, start: 0,
    convos: [
      { rank: 'C', lines: [
        L('seren', 'You count your coins after every battle.'),
        L('brann', 'And you count your arrows. Everybody counts something.'),
        L('seren', 'My arrows keep me alive. What do coins do?'),
        L('brann', 'Feed people. Some of them, anyway.'),
      ] },
      { rank: 'B', lines: [
        L('seren', '"Feed people." What did you mean by that?'),
        L('brann', 'Got a sister in Dunmarch. Three little ones, no husband. Every coin I earn goes south.'),
        L('seren', '...So the greedy sellsword act is just an act.'),
        L('brann', 'Tell anyone and I\'ll deny it.', 'angry'),
      ] },
      { rank: 'A', lines: [
        L('seren', 'I sent a pouch to Dunmarch. Half my share.'),
        L('brann', 'You what? Why?', 'surprised'),
        L('seren', 'Because you\'d do it for my village. You already did.'),
        L('brann', '...Hunter, you\'re going to make an old mercenary weep.'),
        L('seren', 'Do it quietly. You\'ll scare the deer.', 'happy'),
      ] },
    ],
  },
  {
    a: 'mira', b: 'brann', romance: false, start: 0,
    convos: [
      { rank: 'C', lines: [
        L('mira', 'Brann, you\'re bleeding through your bandages again.'),
        L('brann', 'Bandages are for people who don\'t swing axes.'),
        L('mira', 'Bandages are for people who would like to keep their arm.'),
        L('brann', '...Fair point.'),
      ] },
      { rank: 'B', lines: [
        L('brann', 'Why do you patch up folk like me? I\'ve killed men for coin.'),
        L('mira', 'So has everyone in this camp, now. I don\'t heal people for being good, Brann.'),
        L('mira', 'I heal them because they\'re hurt.'),
        L('brann', 'That\'s a dangerous way to live.'),
        L('mira', 'It\'s the only way I know.'),
      ] },
      { rank: 'A', lines: [
        L('brann', 'Made you something.'),
        L('mira', 'A staff? You carved this?'),
        L('brann', 'Yours is cracked. Can\'t have our healer\'s stick snapping mid-fight.'),
        L('mira', 'Brann, it\'s beautiful.', 'happy'),
        L('brann', 'It\'s oak. Don\'t make a fuss.', 'happy'),
        L('narrator', 'Mira received the Oaken Staff.'),
      ] },
    ],
  },
  {
    a: 'lyra', b: 'tomas', romance: false, start: 0,
    convos: [
      { rank: 'C', lines: [
        L('tomas', 'Your stance is good, Lady Lyra. Who trained you?'),
        L('lyra', 'Your old captain. He spoke of you, Sir Tomas. Said you were the finest lance in Aldmere.'),
        L('tomas', 'He was too kind. And I wore the Empire\'s colours for a year.'),
        L('lyra', 'You took them off. That\'s what matters.'),
      ] },
      { rank: 'B', lines: [
        L('tomas', 'I keep thinking of the men I left on that bridge. Some were my friends.'),
        L('lyra', 'You couldn\'t save them.'),
        L('tomas', 'I didn\'t try.', 'sad'),
        L('lyra', 'You can\'t carry every soul, Tomas. Carry the ones still standing beside you.'),
      ] },
      { rank: 'A', lines: [
        L('lyra', 'Spar with me? I want to learn that feint of yours.'),
        L('tomas', 'That "feint" is twenty years of practice.'),
        L('lyra', 'Then I had better start now.'),
        L('tomas', 'Ha! Very well. Shields up, Lady Lyra.', 'happy'),
      ] },
    ],
  },
  {
    a: 'rei', b: 'ilse', romance: true, start: 0,
    ending: 'Rei and Ilse rebuilt the Highmoor Sky Guard together. Recruits learned the sword on the ground and the lance in the clouds, and never, ever teased their commanders about holding hands.',
    convos: [
      { rank: 'C', lines: [
        L('ilse', 'You fight like the wind. I\'ve never seen a blade move that fast.'),
        L('rei', 'And you fight from the sky. We both avoid the ground, it seems.'),
        L('ilse', 'Was that a joke? I didn\'t think you made jokes.', 'surprised'),
        L('rei', 'Rarely. Don\'t get used to it.'),
      ] },
      { rank: 'B', lines: [
        L('ilse', 'You never talk about your master.'),
        L('rei', 'There isn\'t much to say. He took me in when I was nobody. Taught me the blade. Then the Empire came.'),
        L('ilse', 'I lost my whole wing at Highmoor. I know that kind of empty.', 'sad'),
        L('rei', '...Then perhaps we can be empty together. For a while.'),
      ] },
      { rank: 'A', lines: [
        L('rei', 'Ilse. Take me flying.'),
        L('ilse', 'You? You hate heights.', 'surprised'),
        L('rei', 'I hate many things. I would like to understand what you love.'),
        L('ilse', '...Hold on tight, then. And don\'t look down.'),
        L('rei', 'I\'ll be looking at you instead.', 'happy'),
      ] },
      { rank: 'S', lines: [
        L('ilse', 'When the war is done, where will you go? Back to wandering?'),
        L('rei', 'I had planned to. A sword needs no home.'),
        L('ilse', 'And a rider needs only the sky. Unless...'),
        L('rei', 'Unless she finds something better on the ground?'),
        L('ilse', 'Stay with me, Rei. Highmoor will need a sword master. And I will need you.'),
        L('rei', 'I don\'t make promises I can\'t keep. So I\'ll make this one: I\'ll stay.', 'happy'),
      ] },
    ],
  },
  {
    a: 'kael', b: 'aurelie', romance: true, start: 0,
    ending: 'Kael married Aurelie in Solenne\'s temple, which she insisted on sweeping herself first. Aldmere called her its dawn queen, and she never once let anyone kneel to her twice.',
    convos: [
      { rank: 'C', lines: [
        L('aurelie', 'Kael. In Solenne nobody spoke to me without kneeling first. You just asked me to pass the bread.'),
        L('kael', 'Did you want me to kneel?'),
        L('aurelie', 'No! No. I liked it. Ask me to pass something else.', 'happy'),
        L('kael', '...The salt?'),
        L('aurelie', 'Gladly.', 'happy'),
      ] },
      { rank: 'B', lines: [
        L('kael', 'You\'ve been staring at the river for an hour.'),
        L('aurelie', 'They told me my light was a blessing from the sky. It came from my own blood. Everything they built around me was a beautiful mistake.', 'sad'),
        L('kael', 'They loved you. That part wasn\'t a mistake.'),
        L('aurelie', 'They loved a goddess. I don\'t know yet who they\'d have loved if they had met me.'),
        L('kael', 'Then let people meet you. Starting with me.'),
      ] },
      { rank: 'A', lines: [
        L('aurelie', 'Rei tried to teach me a sword stance today. I fell over four times.'),
        L('kael', 'Only four? Lyra beat me five times when we were children.'),
        L('aurelie', 'Rei says I\'m hopeless. I\'ve never been hopeless at anything before. It\'s wonderful.', 'happy'),
        L('kael', 'You\'re a strange woman, Aurelie.'),
        L('aurelie', 'I\'m a dragon, Kael. But thank you for noticing the woman part.'),
      ] },
      { rank: 'S', lines: [
        L('kael', 'When this is over, Solenne will want its goddess back.'),
        L('aurelie', 'And Aldmere will want its king. We\'ll both be expected to stand very still on very high platforms.', 'sad'),
        L('kael', 'Then let\'s stand on the same one. Stay with me. Not as a goddess, not as a weapon. As you.'),
        L('aurelie', 'Do you know, nobody has ever asked me what I want?', 'surprised'),
        L('aurelie', 'I want this. I want you.'),
        L('kael', 'Then it\'s settled.'),
        L('aurelie', 'You said that like a king. Say it again like Kael.', 'happy'),
        L('kael', 'I love you.'),
      ] },
    ],
  },
  {
    a: 'aurelie', b: 'mira', romance: false, start: 0,
    convos: [
      { rank: 'C', lines: [
        L('mira', 'You pray, don\'t you? I\'ve heard you at night.'),
        L('aurelie', 'I don\'t know who to pray to. For twenty years people prayed to me.'),
        L('mira', 'Then pray with me. Saint Edda never minded company.'),
        L('aurelie', 'Is that allowed?'),
        L('mira', 'I\'ve decided it is.', 'happy'),
      ] },
      { rank: 'B', lines: [
        L('aurelie', 'A wounded soldier called me "holy one" today. I told him my name, and he cried.'),
        L('mira', 'Sometimes people need a name more than a miracle.'),
        L('aurelie', 'Then I\'ll give them mine. It\'s the one thing I have that is really mine.'),
      ] },
      { rank: 'A', lines: [
        L('aurelie', 'Teach me to bind a wound. Properly, I mean. Not as a blessing.'),
        L('mira', 'Roll up your sleeves, hold still, and stop glowing at me.'),
        L('aurelie', '...Yes, Sister Mira.', 'happy'),
      ] },
    ],
  },
  {
    a: 'sable', b: 'garrow', romance: false, start: 0,
    convos: [
      { rank: 'C', lines: [
        L('garrow', 'Sable. You slept.'),
        L('sable', 'And you dug. We all did what we could.'),
        L('garrow', 'I dug for him for a year before I put the pick down.', 'sad'),
        L('sable', 'You put it down. That\'s the part that counts.'),
      ] },
      { rank: 'B', lines: [
        L('sable', 'You never speak first, Garrow.'),
        L('garrow', 'Stone doesn\'t.'),
        L('sable', 'You\'re not stone. You\'re just very, very patient.'),
        L('garrow', '...Same thing, at my age.', 'happy'),
      ] },
      { rank: 'A', lines: [
        L('garrow', 'When it\'s done, I\'ll fill in the tunnels under Deepforge.'),
        L('sable', 'All of them? That\'s years of work.'),
        L('garrow', 'I have years. And I\'d like company.'),
        L('sable', 'Then I\'ll carry the lantern.', 'happy'),
      ] },
    ],
  },
  {
    a: 'ilse', b: 'kestrel', romance: false, start: 0,
    convos: [
      { rank: 'C', lines: [
        L('kestrel', 'Your pegasus is slow.'),
        L('ilse', 'Gale is not slow. Gale is dignified.', 'angry'),
        L('kestrel', 'Race you to the ridge, then. Dignified.'),
        L('ilse', '...You\'re on.'),
      ] },
      { rank: 'B', lines: [
        L('ilse', 'The Sky Guard flew out of Galewatch, once. You must have watched us.'),
        L('kestrel', 'Every morning. I used to fly behind your formation and copy it.'),
        L('ilse', 'That was you? We thought it was a very rude hawk.', 'surprised'),
        L('kestrel', 'It was a very rude dragon.', 'happy'),
      ] },
      { rank: 'A', lines: [
        L('kestrel', 'Malrec\'s voice is quieter up here. The wind drowns it out.'),
        L('ilse', 'Then stay up here with us. The Sky Guard has room for one more.'),
        L('kestrel', 'A dragon in the Sky Guard?'),
        L('ilse', 'You already know the formations.', 'happy'),
      ] },
    ],
  },
];

export const SUPPORT_KEYS = new Set(SUPPORTS.map(p => pairKey(p.a, p.b)));

/** Gifts unlocked by viewing a conversation: pairKey|rank -> weapon id given to unit. */
export const SUPPORT_GIFTS: Record<string, { unitId: string; weaponId: string }> = {
  [`${pairKey('mira', 'brann')}|A`]: { unitId: 'mira', weaponId: 'oak_staff' },
};

export function initialBonds(): Record<string, number> {
  return Object.fromEntries(SUPPORTS.map(p => [pairKey(p.a, p.b), p.start]));
}
