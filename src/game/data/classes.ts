import type { ClassDef, Stats } from '../types';

const s = (hp: number, str: number, skl: number, spd: number, lck: number, def: number): Stats =>
  ({ hp, str, skl, spd, lck, def });

/*
 * Movement rule: armoured classes move the least per turn, flying classes the most, and every
 * other class falls strictly in between (test/sim.ts checks this).
 */
const LIST: ClassDef[] = [
  { id: 'lord', name: 'Lord', weapons: ['sword'], moveType: 'foot', mov: 5, base: s(18, 5, 5, 7, 5, 5), growth: s(80, 45, 45, 50, 55, 30), desc: 'Noble swordsman. If the Lord falls, the battle is lost.' },
  { id: 'cavalier', name: 'Cavalier', weapons: ['sword', 'lance'], moveType: 'horse', mov: 7, base: s(19, 5, 4, 5, 3, 5), growth: s(75, 40, 40, 40, 35, 30), desc: 'Mounted knight. Swords and lances; slowed by forests, blocked by mountains.' },
  { id: 'fighter', name: 'Fighter', weapons: ['axe'], moveType: 'foot', mov: 5, base: s(22, 6, 2, 3, 1, 3), growth: s(90, 55, 30, 30, 25, 20), desc: 'Hard-hitting axe user.' },
  { id: 'brigand', name: 'Brigand', weapons: ['axe'], moveType: 'foot', mov: 5, raids: true, base: s(20, 5, 1, 3, 0, 2), growth: s(85, 50, 20, 30, 15, 20), desc: 'Axe-wielding raider with a torch. The only class that burns houses.' },
  { id: 'soldier', name: 'Soldier', weapons: ['lance'], moveType: 'foot', mov: 5, base: s(18, 4, 3, 3, 1, 4), growth: s(75, 40, 35, 30, 20, 30), desc: 'Imperial footman with a lance.' },
  { id: 'knight', name: 'Knight', weapons: ['lance'], moveType: 'armor', mov: 4, base: s(20, 6, 3, 1, 1, 9), growth: s(85, 45, 30, 15, 20, 55), desc: 'Heavily armored lancer. Slow but sturdy.' },
  { id: 'myrmidon', name: 'Myrmidon', weapons: ['sword'], moveType: 'foot', mov: 5, base: s(17, 4, 7, 9, 3, 2), growth: s(65, 35, 55, 55, 40, 20), desc: 'Swift swordmaster with a keen eye for criticals.' },
  { id: 'archer', name: 'Archer', weapons: ['bow'], moveType: 'foot', mov: 5, base: s(17, 4, 5, 4, 2, 2), growth: s(60, 40, 55, 45, 35, 20), desc: 'Attacks from 1–2 tiles. Deadly against fliers.' },
  { id: 'cleric', name: 'Cleric', weapons: ['staff'], moveType: 'foot', mov: 5, base: s(16, 1, 5, 6, 7, 2), growth: s(55, 15, 50, 45, 60, 15), desc: 'Heals adjacent allies. Cannot attack.' },
  { id: 'skyknight', name: 'Sky Knight', weapons: ['lance'], moveType: 'flying', mov: 8, base: s(17, 4, 6, 7, 5, 3), growth: s(65, 40, 45, 55, 50, 20), desc: 'Flies over any terrain. Weak to bows; gets no terrain bonus.' },
  { id: 'thief', name: 'Thief', weapons: ['sword'], moveType: 'foot', mov: 6, steals: true, base: s(16, 3, 6, 9, 4, 2), growth: s(60, 30, 50, 60, 45, 15), desc: 'Quick and fragile. Steals weapons and vulneraries from adjacent enemies it is at least as fast as, and opens chests, doors and gates with lockpicks as well as keys.' },
  { id: 'manakete', name: 'Dragonkin', weapons: ['breath'], moveType: 'foot', mov: 5, shifts: true, base: s(18, 3, 4, 5, 4, 3), growth: s(75, 40, 35, 35, 35, 30), desc: 'Harmless in human form. Spends a dragonstone to become a dragon for three turns: far stronger and tougher, with fire breath that reaches two tiles.' },
  { id: 'mage', name: 'Mage', weapons: ['tome'], moveType: 'foot', mov: 5, base: s(16, 5, 5, 6, 4, 2), growth: s(60, 50, 45, 45, 35, 15), desc: 'Casts spells from tomes at one or two tiles. Outside the weapon triangle; fragile up close.' },
  { id: 'dragonsage', name: 'Dragon Sage', weapons: ['tome', 'breath'], moveType: 'foot', mov: 5, shifts: true, forms: true, base: s(18, 6, 6, 7, 5, 3), growth: s(65, 50, 50, 45, 40, 20), desc: 'A mage who can shape a dragonstone to her will. Casts tomes in human form; on transforming, chooses fire, water, earth or wind, and breathes that element for three turns.' },
  { id: 'wyvern', name: 'Wyvern Rider', weapons: ['axe'], moveType: 'flying', mov: 8, base: s(21, 7, 4, 4, 2, 7), growth: s(80, 50, 35, 35, 25, 40), desc: 'Armoured axe rider on a red wyvern. Flies over any terrain, hits hard and shrugs off blows, but is slow. Weak to bows.' },
  { id: 'ashlord', name: 'Usurper', weapons: ['sword', 'axe'], moveType: 'foot', mov: 5, base: s(30, 9, 10, 8, 6, 9), growth: s(80, 50, 45, 40, 30, 40), desc: 'Usurper of Aldmere.' },
];

export const CLASSES: Record<string, ClassDef> = Object.fromEntries(LIST.map(c => [c.id, c]));
