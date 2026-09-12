/**
 * How common each word is among the sitting members' names, written at build
 * time by scripts/build-name-idf.ts (npm run build, or npm run idf) from
 * data/members.json. The posts matcher weights shared words by this, so a
 * surname three dozen members share cannot carry a match on its own.
 */
import table from '../../../data/name-idf.json';
import type { IdfTable } from './nameMatch';

export const NAME_IDF: IdfTable = table;
