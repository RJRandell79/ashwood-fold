// Every idea the villagers can think of, argue over, pay for and build.
// The simulation reads only these records: nothing in src/sim names an idea.
// The array is in tree order; the engine walks ideas in this order each day.
//
// Record fields
//   id, name, what, hint     identity and the words the annals and panels use
//   answers                  the pressure it answers: food, connectivity, economy or social (ideas sharing a signal compete)
//   requires                 ideas that must be built first; an inner list means any one of them ([['canal', 'turnpike']])
//   possibleWhen             a signal that must hold for anyone to think of it at all (the canal needs canal country)
//   inventorJobs             trades whose members may have the idea (most diligent wins)
//   inventorBias             optional { trait, weight, invert }: a trait that also favours an inventor
//   backers, cost            supporters and pennies needed to build it
//   buildDays, navvies       a great work takes days and may bring a navvy gang (0 = built at once)
//   pressure.base            pressure added each day while nobody has thought of it
//   pressure.when            { signal: extra }  daily extra while a signal holds (see sim/signals.js)
//   pressure.on              { event: amount }  one-off boosts when an event happens (see SIGNAL_EVENTS)
//   threatens                { job: weight }  how much it threatens a trade's living (opposition, sabotage)
//   effects                  { effect: { set | mul | adopterSet, while } }  see EFFECT_BASE below
//   adoption                 bought one by one by a trade (the flying shuttle)
//   hires                    a works that takes on hands
//   resentedBy               { job: daily opinion change towards the owner }
//   sabotage                 { place, what }  can be wrecked in the night by those it threatens
//   builtLines               extra chronicle lines when it is finished
//   places, line             buildings it raises and a line it cuts across the valley (src/data/buildings.js)
//   crossing                 what the river crossing becomes when it is built (the first village has a ford)
//   opensEra                 the era that begins when it is built
//   eraTitle, eraLine        how that era is named and announced, if this idea opens it (else src/data/eras.js)
//   emblem                   charge added to the inventor's family arms
// The ideas of the industrial village (1750 on). Other ages have their own lists (src/data/ages.js).
export const INDUSTRIAL_IDEAS = [
  {
    id: 'plough', answers: 'food', name: 'Heavy plough', what: 'turns the clay deeper so the South Fields yield more', hint: 'Talk of thin harvests',
    requires: [], inventorJobs: ['farmer', 'farmhand', 'smith'], backers: 5, cost: 30,
    pressure: { base: 0.03, when: { grainShort: 5 }, on: { thinHarvest: 50 } },
    threatens: { farmhand: 0.35 },
    effects: { farmYield: { mul: 1.45 } },
    emblem: 'plough',
  },
  {
    id: 'millstone', answers: 'food', name: 'Second millstone', what: 'lets the Watermill grind twice the corn', hint: 'Grumbling about bare shelves',
    requires: [], inventorJobs: ['miller', 'labourer', 'smith'], backers: 5, cost: 35,
    pressure: { base: 0.15, when: { flourShort: 4 }, on: { shelvesBare: 30 } },
    effects: { grindRate: { mul: 1.7 } },
    emblem: 'millstone',
  },
  {
    id: 'barn', answers: 'food', name: 'Tithe barn', what: 'keeps a whole harvest dry through the winter', hint: 'Worry about where to store the corn',
    places: ['barn'],
    requires: [], inventorJobs: ['farmer', 'reeve', 'carter'], backers: 6, cost: 45,
    pressure: { base: 0.05, when: { granaryFullAtHarvest: 6 }, on: { granaryFull: 3, cornFlattened: 30 } },
    effects: { grainCap: { set: 750 }, protectsHarvest: { set: 1 } },
    emblem: 'garb2',
  },
  {
    id: 'assart', answers: 'food', name: 'Wood clearing', what: 'fells the nearest wood and ploughs the ground beneath for new fields', hint: 'Talk of the good soil under the trees',
    places: ['assart'],
    requires: [], inventorJobs: ['farmer', 'farmhand', 'labourer'], backers: 5, cost: 25, buildDays: 4,
    pressure: { base: 0, when: { grainShort: 4, shortOfLand: 1 } },
    effects: { farmYield: { mul: 1.25 } },
    builtLines: ['Where the wood stood there are stumps and fresh furrows: the Intake Fields.'],
    emblem: 'axe',
  },
  {
    id: 'bridge', answers: 'connectivity', name: 'Stone bridge', what: 'carries the lane over the river, so the village can build on the far bank', hint: 'Talk of the good land across the water',
    crossing: 'bridge',
    requires: [], inventorJobs: ['carter', 'smith', 'reeve', 'farmer'], backers: 6, cost: 60, buildDays: 6,
    pressure: { base: 0.02, when: { shortOfLand: 4 } },
    effects: { farBank: { set: 1 } },
    builtLines: ['Carts no longer wait for low water at the ford.'],
    emblem: 'bridge',
  },
  {
    id: 'shuttle', answers: 'economy', name: 'Flying shuttle', what: 'lets one weaver do the work of two', hint: 'The cloth merchant wants more cloth',
    requires: [], inventorJobs: ['weaver', 'smith'], backers: 3, cost: 16,
    pressure: { base: 0.45, when: { weaversPoor: 3 } },
    threatens: { weaver: 1 },
    effects: { weaverWage: { set: 0.035, adopterSet: 0.11 } },
    adoption: { jobs: ['weaver'], cost: 4, chance: 0.12, minOpinion: -20, resentment: -2, memory: 'is taking my living' },
    sabotage: { place: 'weaving', what: 'the flying shuttle' },
    emblem: 'shuttle',
  },
  {
    id: 'school', answers: 'social', name: 'Village school', what: 'teaches the children their letters, and the village to question idle talk', hint: 'Concern about idle talk and idle children',
    places: ['school'],
    requires: [], inventorJobs: ['herbalist', 'reeve', 'innkeeper'], backers: 6, cost: 40,
    pressure: { base: 0.2, when: { manyChildren: 2 }, on: { rumourSpread: 20 } },
    effects: {
      rumourTrust: { mul: 0.6 }, rumourDoubtChance: { set: 0.25 }, juryBias: { set: 0.35 },
      canvassWeight: { mul: 0.8 }, childInherit: { set: 0.35 }, lessons: { set: 'school' },
    },
    emblem: 'book',
  },
  {
    id: 'cottonmill', answers: 'economy', name: 'Cotton mill', what: 'spins thread by water power down by the river', hint: 'Talk of the new mills in the next valley',
    places: ['cottonmill'],
    requires: ['shuttle', 'millstone'], inventorJobs: ['miller', 'weaver', 'smith'], backers: 8, cost: 90,
    inventorBias: { trait: 'warmth', weight: 0.25, invert: true },
    pressure: { base: 0.9, when: { hasWeavers: 0.6, weaversPoor: 1 } },
    threatens: { weaver: 1, carter: 0.3 },
    effects: {
      weaverWage: { mul: 0.55 }, millhandWage: { set: 0.1 }, millOwnerCut: { set: 0.05 }, millHandsCap: { set: 7 },
      factoryJob: { set: 'millhand' }, migrantJob: { set: 'millhand' },
    },
    hires: {
      job: 'millhand', place: 'cottonmill', chance: 0.25, maxCoins: 5, avoidsOwnerBelow: -35,
      fromJobs: ['weaver', 'labourer', 'carter', 'pedlar'], fromJobsIfFieldsManned: ['farmhand'],
      children: { minAge: 12, householdBelow: 6 },
    },
    resentedBy: { weaver: -1.5 },
    sabotage: { place: 'cottonmill', what: 'the spinning frames' },
    builtLines: ['A tall chimney now stands by the river. Some call it progress.'],
    opensEra: 1,
    emblem: 'spindle',
  },
  {
    id: 'canal', answers: 'connectivity', name: 'Canal', what: 'links the valley to the towns, bringing coal and corn by boat', hint: 'Talk of a canal cut through the next valley',
    line: 'canal', places: ['wharf'],
    requires: ['cottonmill'], inventorJobs: ['carter', 'reeve', 'miller', 'smith'], backers: 9, cost: 140, buildDays: 10, navvies: 3,
    pressure: { base: 0.1, when: { goodsStuck: 1.4 } },
    possibleWhen: 'canalCountry',
    threatens: { carter: 0.6 },
    effects: {
      weaverWage: { mul: 1.1 }, carterWage: { set: 0.045 }, winterUpkeep: { set: 0.8 },
      cornCartCost: { set: 15 }, cornCartThreshold: { set: 7 }, cornByBoat: { set: 1 },
    },
    opensEra: 2,
    emblem: 'anchor',
  },
  {
    id: 'turnpike', answers: 'connectivity', name: 'Turnpike road', what: 'makes a proper road up the valley, paid for by tolls', hint: 'Complaints about the state of the carters\' road',
    line: 'turnpike', places: ['tollhouse'],
    requires: ['cottonmill'], inventorJobs: ['carter', 'reeve', 'innkeeper', 'smith'], backers: 7, cost: 100, buildDays: 8, navvies: 2,
    pressure: { base: 0.1, when: { goodsStuck: 0.9, hillCountry: 0.8 } },
    effects: { carterWage: { set: 0.09 }, winterUpkeep: { set: 0.9 }, cornCartCost: { set: 25 }, cornCartThreshold: { set: 6 } },
    builtLines: ['Coaches and carts come up the valley on the new road, and the tollkeeper does well out of all of them.'],
    opensEra: 2, eraTitle: 'The Turnpike Years',
    eraLine: 'The turnpike is open. Carts and coaches come up the valley on a made road, and the Turnpike Years begin.',
    emblem: 'cartwheel',
  },
  {
    id: 'steam', answers: 'economy', name: 'Steam engine', what: 'drives the cotton mill with coal instead of the river', hint: 'The mill wants more power than the river gives',
    requires: [['canal', 'turnpike']], inventorJobs: ['smith', 'millhand', 'miller'], backers: 7, cost: 120, buildDays: 3,
    pressure: { base: 0.3, when: { worksRunning: 1 } },
    threatens: { weaver: 1, millhand: 0.3 },
    effects: {
      weaverWage: { mul: 0.6 },
      millhandWage: { set: 0.11, while: 'cottonmill' }, millOwnerCut: { set: 0.07, while: 'cottonmill' }, millHandsCap: { set: 12, while: 'cottonmill' },
      springMigrants: { set: 1 }, millCough: { set: 1 },
    },
    sabotage: { place: 'cottonmill', what: 'the engine' },
    opensEra: 3,
    emblem: 'cog',
  },
  {
    id: 'railway', answers: 'connectivity', name: 'Railway', what: 'puts Ashwood Fold an hour from Manchester', hint: 'Surveyors have been seen on the fells',
    line: 'railway', places: ['station'],
    requires: ['steam'], inventorJobs: ['reeve', 'smith', 'carter', 'miller'], backers: 10, cost: 180, buildDays: 10, navvies: 4,
    pressure: { base: 0.2, when: { worksRunning: 0.8 } },
    threatens: { carter: 1 },
    effects: {
      carterWage: { set: 0.025 }, springMigrants: { set: 2 },
      migrantReason: { set: 'on the train, looking for work' }, emigration: { set: 1 },
    },
    sabotage: { place: 'station', what: 'a stretch of the line' },
    opensEra: 4,
    emblem: 'wingedwheel',
  },
];

// What each effect is worth before anything is built. A built, working idea changes it:
// `set` replaces the value (the most recently built idea wins), `mul` multiplies it,
// `adopterSet` replaces it for people who have adopted that idea, and `while: id` limits
// the effect to times when another idea is also working (steam only helps a working mill).
export const EFFECT_BASE = {
  farmYield: 1,              // multiplier on field work
  grindRate: 1,              // multiplier on milling
  grainCap: 400,             // granary capacity
  protectsHarvest: 0,        // 1 = autumn storms no longer flatten the corn
  weaverWage: 0.07,          // pennies per working tick
  millhandWage: 0.015,
  millOwnerCut: 0,           // paid to the mill's founder per hand per tick
  millHandsCap: 0,           // most hands a works will take on
  carterWage: 0.07,
  winterUpkeep: 1,           // household cost per adult per winter day
  cornCartCost: 35,          // pennies for a load of corn from outside
  cornCartThreshold: 4,      // buy corn when grain + flour falls below this many per head
  cornByBoat: 0,             // 1 = the corn comes by canal
  springMigrants: 0,         // extra newcomers each spring
  migrantJob: 'labourer',
  migrantReason: 'looking for work at the mill',
  factoryJob: null,          // the trade poor youngsters are sent into
  millCough: 0,              // 1 = mill work shortens lives
  emigration: 0,             // 1 = young people may leave for the towns
  rumourTrust: 1,            // multiplier on how far a rumour is believed
  rumourDoubtChance: 0,      // chance anyone doubts a rumour on hearing it
  juryBias: 0.6,             // how much friendship sways a juror
  canvassWeight: 1,          // multiplier on election canvassing
  childInherit: 0.6,         // how strongly children take on their parents' opinions
  lessons: null,             // the place where children go to lessons, once there is one
  farBank: 0,                // 1 = buildings may go up on the far bank of the river
};

// The ideas of the manor village (1290 on). Some are shared with the industrial village (the same record):
// the tithe barn, the second millstone, wood clearing and the stone bridge.
const IDEA_OF = id => INDUSTRIAL_IDEAS.find(d => d.id === id);
export const MEDIEVAL_IDEAS = [
  IDEA_OF('millstone'), IDEA_OF('barn'), IDEA_OF('assart'), IDEA_OF('bridge'),
  {
    id: 'chantry', answers: 'social', name: 'Chantry school', what: 'pays a priest to sing for the dead and teach the children their letters', hint: 'Talk of the children growing up unlettered',
    places: ['chantry'],
    requires: [], inventorJobs: ['herbalist', 'reeve', 'innkeeper', 'baker'], backers: 5, cost: 35,
    pressure: { base: 0.2, when: { manyChildren: 2 }, on: { rumourSpread: 20 } },
    effects: { rumourTrust: { mul: 0.7 }, rumourDoubtChance: { set: 0.2 }, juryBias: { set: 0.4 }, childInherit: { set: 0.4 }, lessons: { set: 'chantry' } },
    emblem: 'book',
  },
  {
    id: 'charter', answers: 'economy', name: 'Market charter', what: "lets the village hold a market every week, by the king's leave", hint: 'Talk of the market at the next town, and the tolls paid there',
    places: ['market'],
    requires: [], inventorJobs: ['reeve', 'baker', 'innkeeper', 'farmer'], backers: 6, cost: 50,
    pressure: { base: 0.35, when: { granaryFullAtHarvest: 3, hasWeavers: 0.3 } },
    effects: { carterWage: { set: 0.09 }, springMigrants: { set: 1 }, migrantJob: { set: 'carter' }, migrantReason: { set: 'to trade at the new market' } },
    builtLines: ['A stone cross is raised where the market will stand.'],
    opensEra: 1,
    emblem: 'key',
  },
  {
    id: 'fulling', answers: 'economy', name: 'Fulling mill', what: "beats the cloth by water power instead of by men's feet", hint: "The weavers' cloth waits weeks for the walkers",
    places: ['fulling'],
    requires: ['charter'], inventorJobs: ['miller', 'weaver', 'smith'], backers: 6, cost: 70, buildDays: 5,
    pressure: { base: 0.3, when: { hasWeavers: 0.5, weaversPoor: 1.5 } },
    threatens: { labourer: 0.4 },
    effects: { weaverWage: { mul: 1.5 } },
    builtLines: ['The great hammers of the fulling mill can be heard from the Green.'],
    opensEra: 2,
    emblem: 'millwheel',
  },
];

/** The ideas of the age the village is in now. Switched by useIdeas when the age changes. */
export let IDEAS = INDUSTRIAL_IDEAS;
/** Every idea of every age, by id, so the annals can still name the ideas of earlier ages. */
export const IDEA = Object.fromEntries([...INDUSTRIAL_IDEAS, ...MEDIEVAL_IDEAS].map(d => [d.id, d]));
/** Makes an age's ideas the live ones, and registers them for lookup. */
export function useIdeas(list) {
  IDEAS = list;
  for (const d of list) IDEA[d.id] = d;
}
