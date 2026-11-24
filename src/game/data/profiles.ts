/**
 * Character design profiles. Every named character is in their 30s: veterans of the
 * border war ten years ago, which is the shared history behind most of the cast.
 */
export interface Profile {
  id: string;
  name: string;
  title: string;
  age: string;
  classId: string;
  height: string;
  origin: string;
  personality: string;
  appearance: string;
  combat: string;
  likes: string;
  dislikes: string;
  quote: string;
  design: string;
  side: 'ally' | 'enemy' | 'archetype';
}

export const PROFILES: Record<string, Profile> = {
  kael: {
    id: 'kael', name: 'Kael Valen', title: 'Heir of House Valen', age: '31', classId: 'lord', height: '180 cm', side: 'ally',
    origin: 'Second son of the king. He became heir when his brother died in the border war, then spent his twenties as a garrison captain on the northern frontier rather than at court. He was three days\' ride away the night the capital fell.',
    personality: 'Dry-humoured, stubborn and quietly guilty about where he was that night. Listens more than he talks, then decides fast. Treats his companions as equals, which unsettles the knights.',
    appearance: 'Untamed dark-brown hair, a week of stubble and a healed scar through the left eyebrow. Valen-blue coat with gold trim and a navy field cape that has seen better years.',
    combat: 'Footwork duelist with the Valen Rapier. Light, accurate and fast enough to strike twice. He is the one unit that must not fall.',
    likes: 'Early mornings, old maps, plain bread.',
    dislikes: 'Ceremony, and being protected.',
    quote: 'A crown is just a promise with a weight to it.',
    design: 'The cape gives him a strong triangular silhouette that reads at map scale. Blue and gold anchor the player palette. Idle: weight on the back foot, blade held forward and low.',
  },
  lyra: {
    id: 'lyra', name: 'Lyra Ashford', title: 'Sworn Knight', age: '32', classId: 'cavalier', height: '175 cm', side: 'ally',
    origin: 'Daughter of the royal stablemaster. She grew up beside Kael, beat him in five childhood tourneys, and took her knight\'s oath to his father at sixteen.',
    personality: 'Blunt, loud when she laughs, fiercely protective and secretly sentimental. Has no patience for courtiers or for waiting.',
    appearance: 'Long copper-red hair, freckles, a crimson tabard over light mail. Rides Ember, a chestnut warhorse with a black mane.',
    combat: 'Mounted lancer who can swap between sword and lance to win the weapon triangle. Covers huge distances, but forests slow her and mountains stop her.',
    likes: 'Horses, dawn sparring, sour apples.',
    dislikes: 'Idle waiting, flattery.',
    quote: 'Point me at the problem, my lord.',
    design: 'The horse makes her the widest silhouette in the party. Red against Kael\'s blue keeps the two leads distinct side by side. The horse\'s legs gallop during every charge.',
  },
  brann: {
    id: 'brann', name: 'Brann Holt', title: 'Sellsword', age: '38', classId: 'fighter', height: '191 cm', side: 'ally',
    origin: 'Dunmarch-born. Twenty years of contracts across three kingdoms. Every coin he earns goes south to his widowed sister and her three children.',
    personality: 'Gruff, frugal and allergic to speeches. Plays the greedy mercenary so nobody notices how soft he is with children and wounded people.',
    appearance: 'The broadest frame in the company. Thick brown beard, weathered skin, a sleeveless leather jerkin and forearms crossed with old scars.',
    combat: 'Overhead axe chops that hit harder than anyone else. Slow and easy to hit, so he leans on a large health pool. Shreds lance users.',
    likes: 'Honest pay, thick stew, his sister\'s letters.',
    dislikes: 'Nobles who don\'t pay, boats.',
    quote: 'Everyone counts something.',
    design: 'A heavyweight silhouette with bare arms. His attack is the longest wind-up in the game, sold with a full-body lean into the chop.',
  },
  seren: {
    id: 'seren', name: 'Seren Vale', title: 'Hunter of the Vale', age: '33', classId: 'archer', height: '168 cm', side: 'ally',
    origin: 'The unofficial guardian of a hill village since her father\'s death. She has tracked deer, wolves and bandits through the same woods for twenty years.',
    personality: 'Sharp-tongued, patient and practical. Says little, notices everything, and keeps a running count of every arrow she has ever wasted.',
    appearance: 'Dark green hair tied back in a tail, olive hunting leathers, a short hood, and a quiver of grey-fletched arrows on her back.',
    combat: 'Shoots from one or two tiles away, so melee units can\'t answer her at range. Arrows deal double might to flying units.',
    likes: 'Quiet, honey cakes, fresh tracks.',
    dislikes: 'Wasted arrows, loud men (Brann excepted).',
    quote: 'Breathe out. Then loose.',
    design: 'Lean and vertical, the quiver breaking her outline from behind. Her attack is a full draw and release, followed by a visible arrow crossing the stage.',
  },
  mira: {
    id: 'mira', name: 'Mira Edda', title: 'Cleric of Saint Edda', age: '30', classId: 'cleric', height: '163 cm', side: 'ally',
    origin: 'Twelve years in the cloister of Saint Edda, two of them as a field healer in the border war. She left the cloister when the wounded stopped being brought to her.',
    personality: 'Warm until someone is hurt, then entirely in command. Scolds her patients, sings hymns off-key and laughs at Kael\'s jokes only when he isn\'t looking.',
    appearance: 'Pale blonde hair under a white hood, ivory robes with a blue hem, a simple oak staff with a pale crystal.',
    combat: 'Cannot attack. Heals an adjacent ally each turn and must be kept behind the line.',
    likes: 'Herb gardens, hymns, quiet mornings.',
    dislikes: 'Stubborn patients, cruelty.',
    quote: 'Hold still. This will only hurt the first time.',
    design: 'A long robe gives her a soft bell silhouette, the only one without visible legs. Her action raises the staff overhead while the crystal glows.',
  },
  tomas: {
    id: 'tomas', name: 'Tomas of Brenmoor', title: 'Knight of Brenmoor', age: '39', classId: 'knight', height: '186 cm', side: 'ally',
    origin: 'Served Kael\'s father for fifteen years, was pressed into Imperial service when Brenmoor surrendered, and broke ranks at Ironvale Bridge.',
    personality: 'Steady, formal and quietly ashamed of the year he wore the Empire\'s colours. Tells terrible jokes with a perfectly straight face.',
    appearance: 'Grey-streaked hair under an open helm with a blue plume, a square stubbled jaw, full plate with a Valen-blue tabard.',
    combat: 'The party\'s wall. Very high defense and low speed, four tiles of movement. Holds chokepoints and soaks hits for everyone else.',
    likes: 'Polished armour, routine, a good pipe.',
    dislikes: 'Bridges, these days.',
    quote: 'A shield is a promise, too.',
    design: 'Pauldrons widen the shoulders into a blocky silhouette. His lance thrust is short and heavy rather than fast.',
  },
  rei: {
    id: 'rei', name: 'Rei Kasane', title: 'Wandering Blade', age: '34', classId: 'myrmidon', height: '170 cm', side: 'ally',
    origin: 'Senior student of an eastern hill sword school. When the Empire burned her master\'s school she started hunting the unit responsible, one soldier at a time.',
    personality: 'Laconic, precise and impatient with wasted motion, including wasted words. Her warmth comes out in actions, rarely in speech.',
    appearance: 'Black hair in a high ponytail, a violet fighting gi with a silver sash, and a Killing Edge worn at the hip.',
    combat: 'The fastest unit in the party. Almost always strikes twice and has a high critical rate. Fragile if she gets caught.',
    likes: 'Whetstones, plum tea, silence.',
    dislikes: 'Heights, bragging.',
    quote: 'One clean cut is worth ten wild ones.',
    design: 'The ponytail trails her movement and the diagonal sash reads clearly at small sizes. Her slash is the snappiest swing in the game.',
  },
  ilse: {
    id: 'ilse', name: 'Ilse Marrow', title: 'Highmoor Sky Guard', age: '35', classId: 'skyknight', height: '172 cm', side: 'ally',
    origin: 'Last rider of the Highmoor Sky Guard. When the castle fell, her wing scattered and she spent months raiding Imperial patrols alone from the clouds.',
    personality: 'Cheerful, reckless and loud, with a lot of grief tucked behind the jokes. Trusts her pegasus Gale more than most people.',
    appearance: 'Pale blue hair pinned in a bun, white-and-blue light armour, riding Gale, a white pegasus with a frost-blue mane.',
    combat: 'Flies over water, mountains and forests. Strikes isolated targets, but bows deal double damage to her and she gains no terrain bonus.',
    likes: 'Storm clouds, apples for Gale, racing.',
    dislikes: 'Archers, being grounded.',
    quote: 'The sky doesn\'t care whose banner is flying. I do.',
    design: 'Wings flap continuously and the whole model hovers, so she always reads as airborne. The pale palette stands out against the darker cast.',
  },
  gorran: {
    id: 'gorran', name: 'Gorran', title: 'Brigand Chief', age: '37', classId: 'brigand', height: '188 cm', side: 'enemy',
    origin: 'A deserter from the border war who turned raider. He sells villages, roads and rumours to whoever pays, lately the Empire.',
    personality: 'Cheerful in the way of a man who has never been punished for anything. Cowardly when cornered.',
    appearance: 'Shaggy black hair and beard, a red sash over patched leathers, a notched steel axe.',
    combat: 'Holds the fort in Chapter 1. Hits hard but is clumsy, and swords have the advantage against him.',
    likes: 'Easy marks.', dislikes: 'Fair fights.',
    quote: 'Coin\'s coin, princeling.',
    design: 'A darker, rougher echo of Brann, deliberately: what a sellsword becomes without anyone to send the money to.',
  },
  varn: {
    id: 'varn', name: 'Captain Varn', title: 'Imperial Captain', age: '36', classId: 'soldier', height: '183 cm', side: 'enemy',
    origin: 'Aldmere-born career officer who chose the winning side the week the Empire crossed the border. Commanded Tomas for a year.',
    personality: 'Pragmatic and contemptuous of sentiment. Believes loyalty is something you rent.',
    appearance: 'Closed helm with a red plume, crimson Imperial tabard over plate, a steel lance.',
    combat: 'Holds the east-bank fort at Ironvale. Lances punish sword users; bring axes.',
    likes: 'Order, promotion.', dislikes: 'Deserters.',
    quote: 'We are the Empire\'s knights now. Or we are corpses.',
    design: 'Palette-swapped mirror of Tomas\'s armour in Imperial red, to make the defection read visually.',
  },
  morwen: {
    id: 'morwen', name: 'Lady Morwen', title: 'Warden of Highmoor', age: '34', classId: 'myrmidon', height: '174 cm', side: 'enemy',
    origin: 'An Imperial duelist rewarded with Highmoor after it fell. She has never lost a formal duel and considers sieges beneath her.',
    personality: 'Cold, theatrical and very patient. Enjoys making her enemies come to her.',
    appearance: 'Long black hair, a plum duelling coat with a crimson cape, and a Killing Edge.',
    combat: 'Never leaves the throne. Fast and crit-heavy; lances and high defense blunt her.',
    likes: 'Ceremony, ultimatums.', dislikes: 'Being hurried.',
    quote: 'Highmoor will make a fine tomb.',
    design: 'Same swordmaster frame as Rei, dressed in court colours: the two are meant to feel like a mirror match.',
  },
  malrec: {
    id: 'malrec', name: 'Malrec', title: 'The Ash Regent', age: '39', classId: 'ashlord', height: '185 cm', side: 'enemy',
    origin: 'Royal chancellor of Aldmere for eight years. He opened the gates of Caer Valen from the inside and now rules as the Empire\'s regent.',
    personality: 'Calm, articulate and certain he is the only adult in the room. Thinks of Aldmere\'s old kings as dreamers.',
    appearance: 'Prematurely silver hair swept back, a thin scar over one brow, an iron crown, a black coat over armour with an ember-red cape.',
    combat: 'Final boss. Very high stats and the Ashen Blade. Holds the throne; only one tile of approach.',
    likes: 'Order, silence, being right.', dislikes: 'Songs.',
    quote: 'I ended a dynasty of dreamers.',
    design: 'Black and ember against Kael\'s blue and gold. The crown is the only gold on any enemy, so he reads as a usurper at a glance.',
  },
};

/** Generic enemy types, shown for nameless units. */
export const ARCHETYPES: Record<string, Profile> = Object.fromEntries(([
  ['brigand', 'Ashen Brigand', 'Raiders who follow the Imperial army for its leftovers. Mostly deserters and desperate farmers.', 'Axes. Strong and inaccurate; swords beat them.'],
  ['fighter', 'Imperial Axeman', 'Shock infantry recruited from the Empire\'s mining provinces.', 'Heavy axes. They break lance lines.'],
  ['soldier', 'Imperial Soldier', 'The backbone of the occupation: conscripts in red tabards, many of them Aldmere-born.', 'Lances. Dangerous to sword users.'],
  ['knight', 'Imperial Knight', 'Armoured veterans who hold gates and bridges.', 'Very high defense, slow. Use axes or forged weapons.'],
  ['myrmidon', 'Ashen Blade', 'Duelists trained in the Regent\'s own school.', 'Fast swords with high critical rates.'],
  ['archer', 'Imperial Archer', 'Tower garrison bowmen.', 'Range 1–2. Keep fliers away from them.'],
  ['cavalier', 'Imperial Cavalier', 'Mounted raiders who run down stragglers.', 'Swords and lances, high movement.'],
  ['skyknight', 'Imperial Sky Knight', 'Pegasus riders taken from conquered kingdoms\' stables.', 'Fly over terrain. Weak to bows.'],
] as const).map(([id, name, origin, combat]) => [id, {
  id, name, title: 'Enemy unit', age: 'Late 20s to 30s', classId: id, height: 'Varies', side: 'archetype' as const,
  origin, personality: 'Professional, tired, far from home.', appearance: 'Imperial red and iron grey.', combat,
  likes: '—', dislikes: '—', quote: '', design: 'Shares body templates with the player classes, recoloured in Imperial red.',
}]));

export function profileFor(u: { id: string; classId: string; lookId?: string }): Profile | undefined {
  return PROFILES[u.lookId ?? u.id] ?? ARCHETYPES[u.classId];
}

export const ALLY_IDS = ['kael', 'lyra', 'brann', 'seren', 'mira', 'tomas', 'rei', 'ilse'];
export const NPC_IDS = ['gorran', 'varn', 'morwen', 'malrec'];
