// Historical conditions: what the wider world does to the valley while an age is played. Decided 30 Oct:
// real history strikes within an age as conditions, not scripted outcomes. A condition changes the
// pressures the village lives under (its harvests, its deaths, its wages); what the village does about
// it still emerges from its people, stores and ideas.
//
// Conditions are rolled each spring with the simulation's own dice, inside a window of real years.
//
// Record fields
//   id                   identity
//   years                [first, last] calendar years in which the condition may begin
//   chance               chance each spring in the window that it begins (it is certain in the last year
//                        of the window when `certain` is set and it has not yet come)
//   repeats              it may come again in later years of the window (the wet years); otherwise once
//   after                another condition that must already have come (labour is scarce after the pestilence)
//   lasts                years it holds once begun
//   effects              while it holds, effects on the village in the grammar of src/data/ideas.js
//                        ({ mul } or { set }), applied after the ideas'
//   stores               what share of each store is left when it begins (the damp gets into the granary)
//   mortality            a visitation: in `season` (0 spring … 3 winter) of each year it holds, each person may
//                        die of `cause`. Chance is `base`, plus `old` over 55, `young` under 10, `crowd` for
//                        each housemate beyond two and `hungry` for the hungry, at most `max`. Its `end` line
//                        tells the toll ({dead} the number, {names} some of them); `few` when four or fewer
//                        died ({names} all of them); `spared` if no one did.
//   migrants             newcomers each spring while it holds, and the trade and reason they come for
//   begin, again, end    what the annals say when it begins, when it comes again, and when it is over
export const MEDIEVAL_CONDITIONS = [
  {
    id: 'wetYears', years: [1315, 1317], chance: 0.8, repeats: true, lasts: 1,
    effects: { farmYield: { mul: 0.4 }, stormChance: { mul: 2 }, cornCartCost: { mul: 2.5 } },
    stores: { grain: 0.5 },
    mortality: {
      season: 3, base: 0.01, hungry: 0.25, old: 0.04, young: 0.04, crowd: 0, max: 0.4, cause: 'of the bloody flux',
      end: 'The flux went through the hungry houses that winter. {dead} died of it, among them {names}.',
      few: 'The flux went through the hungry houses that winter, and took {names}.',
    },
    begin: 'The rain began at Whitsun and did not stop. The corn stood in water, and the hay rotted where it lay.',
    again: 'Another wet summer. The seed corn that was saved last year rots in the furrows.',
    end: 'The weather mends at last. There is talk of nothing but the price of bread.',
  },
  {
    id: 'pestilence', years: [1348, 1350], chance: 0.5, certain: true, lasts: 1,
    effects: { strangersCome: { set: 0 } },   // no one is travelling who need not
    mortality: {
      season: 1, base: 0.3, old: 0.12, young: 0.08, crowd: 0.03, max: 0.6, cause: 'of the pestilence',
      end: 'By Michaelmas the pestilence had passed on. {dead} of the village were in the churchyard, among them {names}.',
      few: 'By Michaelmas the pestilence had passed on. It took {names}.',
      spared: 'By Michaelmas the pestilence had passed on, and by some mercy no one in the village had died of it.',
    },
    begin: 'The pestilence has come up the valley from the coast. Doors are shut, and the bell tolls every day.',
  },
  {
    id: 'deadHands', years: [1349, 1351], chance: 1, after: 'pestilence', lasts: 10,
    effects: { scarceWage: { set: 0.8 }, duesRate: { mul: 0.5 }, strangersCome: { set: 0.25 } },
    begin: 'There are too few hands for the land. Labourers ask twice the old wage, and get it, and the manor takes what dues it can.',
    end: 'The fields have hands enough again, and the old wage is the wage once more.',
  },
];

export const CONDITION = Object.fromEntries(MEDIEVAL_CONDITIONS.map(c => [c.id, c]));
