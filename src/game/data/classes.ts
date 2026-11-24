import type { ClassDef, Stats } from '../types';

const s = (hp: number, str: number, skl: number, spd: number, lck: number, def: number): Stats =>
  ({ hp, str, skl, spd, lck, def });

const LIST: ClassDef[] = [
  { id: 'lord', name: 'Lord', weapons: ['sword'], moveType: 'foot', mov: 5, base: s(18, 5, 5, 7, 5, 5), growth: s(80, 45, 45, 50, 55, 30), desc: 'Noble swordsman. If the Lord falls, the battle is lost.' },
  { id: 'cavalier', name: 'Cavalier', weapons: ['sword', 'lance'], moveType: 'horse', mov: 7, base: s(19, 5, 4, 5, 3, 5), growth: s(75, 40, 40, 40, 35, 30), desc: 'Mounted knight. Swords and lances; slowed by forests, blocked by mountains.' },
  { id: 'fighter', name: 'Fighter', weapons: ['axe'], moveType: 'foot', mov: 5, base: s(22, 6, 2, 3, 1, 3), growth: s(90, 55, 30, 30, 25, 20), desc: 'Hard-hitting axe user.' },
  { id: 'brigand', name: 'Brigand', weapons: ['axe'], moveType: 'foot', mov: 5, base: s(20, 5, 1, 3, 0, 2), growth: s(85, 50, 20, 30, 15, 20), desc: 'Axe-wielding raider.' },
  { id: 'soldier', name: 'Soldier', weapons: ['lance'], moveType: 'foot', mov: 5, base: s(18, 4, 3, 3, 1, 4), growth: s(75, 40, 35, 30, 20, 30), desc: 'Imperial footman with a lance.' },
  { id: 'knight', name: 'Knight', weapons: ['lance'], moveType: 'armor', mov: 4, base: s(20, 6, 3, 1, 1, 9), growth: s(85, 45, 30, 15, 20, 55), desc: 'Heavily armored lancer. Slow but sturdy.' },
  { id: 'myrmidon', name: 'Myrmidon', weapons: ['sword'], moveType: 'foot', mov: 5, base: s(17, 4, 7, 9, 3, 2), growth: s(65, 35, 55, 55, 40, 20), desc: 'Swift swordmaster with a keen eye for criticals.' },
  { id: 'archer', name: 'Archer', weapons: ['bow'], moveType: 'foot', mov: 5, base: s(17, 4, 5, 4, 2, 2), growth: s(60, 40, 55, 45, 35, 20), desc: 'Attacks from 1–2 tiles. Deadly against fliers.' },
  { id: 'cleric', name: 'Cleric', weapons: ['staff'], moveType: 'foot', mov: 5, base: s(16, 1, 5, 6, 7, 2), growth: s(55, 15, 50, 45, 60, 15), desc: 'Heals adjacent allies. Cannot attack.' },
  { id: 'skyknight', name: 'Sky Knight', weapons: ['lance'], moveType: 'flying', mov: 7, base: s(17, 4, 6, 7, 5, 3), growth: s(65, 40, 45, 55, 50, 20), desc: 'Flies over any terrain. Weak to bows; gets no terrain bonus.' },
  { id: 'ashlord', name: 'Ash Regent', weapons: ['sword', 'axe'], moveType: 'foot', mov: 5, base: s(30, 9, 10, 8, 6, 9), growth: s(80, 50, 45, 40, 30, 40), desc: 'Usurper of Aldmere.' },
];

export const CLASSES: Record<string, ClassDef> = Object.fromEntries(LIST.map(c => [c.id, c]));
