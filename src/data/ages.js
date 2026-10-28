// The ages of the valley. Each age is a stretch of history played for a few generations, with its own
// ideas, eras, building styles, crossroads, founding cast and founding buildings. Interludes join one
// age to the next, skipping the centuries between (src/sim/interlude.js).
//
// Record fields
//   id, name             identity, and what the annals call the age
//   startYear            the calendar year of the age's first spring
//   eras, eraLines       era names within the age, and the line that announces each (index 0 = the opening)
//   ideas                the ideas villagers can think of in this age (src/data/ideas.js)
//   crossroads           the crossroads that can arise (src/data/crossroads.js)
//   styles               how buildings look, era by era (src/data/styles.js)
//   cast                 the founding cast and how they stand with each other (src/data/folk.js)
//   founding             building ids laid out for a new village, in order (src/data/buildings.js)
//   people               names for strangers, babies and newcomers (src/data/folk.js)
//   placeNames           what this age calls the buildings it shares with others (the hall is the Manor House)
//   lineage              how this age's surnames are spelt by the time of the next age
//   houseWord            what new homes are called (Croft); otherwise cottages early on and houses later
//   minYears, maxYears   the age may close once its last era has opened and minYears have passed, and closes
//                        regardless after maxYears; then the interlude to `next` can begin
//   next                 the age that follows, by way of an interlude, if any
import { INDUSTRIAL_CROSSROADS, MEDIEVAL_CROSSROADS, useCrossroads } from './crossroads.js';
import { ERAS, ERA_LINES, MEDIEVAL_ERAS, MEDIEVAL_ERA_LINES } from './eras.js';
import { INDUSTRIAL_CAST, INDUSTRIAL_NAMES, MEDIEVAL_CAST, MEDIEVAL_NAMES, useNames } from './folk.js';
import { INDUSTRIAL_IDEAS, MEDIEVAL_IDEAS, useIdeas } from './ideas.js';
import { ERA_STYLES, MEDIEVAL_STYLES } from './styles.js';

export const AGES = {
  medieval: {
    id: 'medieval', name: 'The Manor and the Market', startYear: 1290,
    eras: MEDIEVAL_ERAS, eraLines: MEDIEVAL_ERA_LINES, ideas: MEDIEVAL_IDEAS, crossroads: MEDIEVAL_CROSSROADS, styles: MEDIEVAL_STYLES, cast: MEDIEVAL_CAST,
    people: MEDIEVAL_NAMES,
    founding: ['square', 'chapel', 'tavern', 'hall', 'mill', 'fields', 'forge', 'bakery', 'weaving', 'garden', 'holt', 'pendle', 'barrow', 'fair', 'calder', 'greaves'],
    placeNames: {
      chapel: 'the Church', tavern: 'the Alehouse', hall: 'the Manor House', mill: "the Lord's Mill", fields: 'the Open Fields', forge: 'the Smithy',
      bakery: 'the Common Oven', weaving: "the Weavers' Shop", garden: 'the Herb Garth', holt: 'Holte Croft', pendle: 'Pendle Croft', barrow: 'Barwe Croft',
      fair: 'Fayreclough Farm', calder: 'Caldre Croft', greaves: "the Reeve's House", cottage: 'Croft',
    },
    lineage: { Holte: 'Holt', Pendle: 'Pendle', Barwe: 'Barrow', Fayreclough: 'Fairclough', Caldre: 'Calder', Greve: 'Greaves', Brewster: 'Brewster', Wryght: 'Wright' },
    houseWord: 'Croft',
    minYears: 18, maxYears: 40,
    next: 'industrial',
  },
  industrial: {
    id: 'industrial', name: 'The Industrial Village', startYear: 1750,
    eras: ERAS, eraLines: ERA_LINES, ideas: INDUSTRIAL_IDEAS, crossroads: INDUSTRIAL_CROSSROADS, styles: ERA_STYLES, cast: INDUSTRIAL_CAST, people: INDUSTRIAL_NAMES, placeNames: {},
    founding: ['square', 'chapel', 'tavern', 'market', 'hall', 'mill', 'fields', 'forge', 'bakery', 'weaving', 'garden', 'holt', 'pendle', 'barrow', 'fair', 'calder', 'greaves'],
    next: null,
  },
};
// A new game begins in the first age; saves from before ages existed are industrial (see ensureState).
export const FIRST_AGE = 'medieval';

/** Makes an age's data the live data the simulation reads. */
export function useAge(id) {
  const a = AGES[id] || AGES[FIRST_AGE];
  useIdeas(a.ideas);
  useCrossroads(a.crossroads);
  useNames(a.people);
  return a;
}
