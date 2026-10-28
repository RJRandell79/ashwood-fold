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
//   folk                 the founding cast: [name, job, home, traits, age, sex] (src/data/folk.js)
//   founding             building ids laid out for a new village, in order (src/data/buildings.js)
//   next                 the age that follows, by way of an interlude, if any
import { INDUSTRIAL_CROSSROADS, useCrossroads } from './crossroads.js';
import { ERAS, ERA_LINES } from './eras.js';
import { FOLK } from './folk.js';
import { INDUSTRIAL_IDEAS, useIdeas } from './ideas.js';
import { ERA_STYLES } from './styles.js';

export const AGES = {
  industrial: {
    id: 'industrial', name: 'The Industrial Village', startYear: 1750,
    eras: ERAS, eraLines: ERA_LINES, ideas: INDUSTRIAL_IDEAS, crossroads: INDUSTRIAL_CROSSROADS, styles: ERA_STYLES, folk: FOLK,
    founding: ['square', 'chapel', 'tavern', 'market', 'hall', 'mill', 'fields', 'forge', 'bakery', 'weaving', 'garden', 'holt', 'pendle', 'barrow', 'fair', 'calder', 'greaves'],
    next: null,
  },
};
export const FIRST_AGE = 'industrial';

/** Makes an age's data the live data the simulation reads. */
export function useAge(id) {
  const a = AGES[id] || AGES[FIRST_AGE];
  useIdeas(a.ideas);
  useCrossroads(a.crossroads);
  return a;
}
