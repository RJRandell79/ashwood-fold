// Crossroads: moments when the village is under a real pressure and the player may tip the balance.
// Decided 27 Oct: a nudge is a question asked of history, not an instruction given to it. The player
// can influence what the valley attempts, never decide what it becomes, and declining is always free.
//
// A crossroads opens when its signal (src/sim/signals.js) has held for `days` days running. It stays
// open for a while, then closes whether or not the player acted. The player sees the situation, how
// serious it is, and what each choice hopes for, but never a chance of success.
//
// Record fields
//   id, answers          identity, and the pressure family it belongs to (food, connectivity, economy, social)
//   when, days           the signal that must hold, and for how many days running
//   crisis               a crisis may open even when this era's crossroads are spent (once per era)
//   title, situation     what the player reads: a headline and the state of things
//   options              choices besides letting it be. Each has a label, an intent (what it hopes for,
//                        not what will happen) and one of:
//                          favour: idea id   the village leans towards that idea: its pressure jumps and
//                                            its backers argue harder for two years. It still needs an
//                                            inventor, backers and money, and may fail.
//                          relief: verb      a one-off act whose result depends on the village's means and
//                                            temper: corn (buy corn in), alms (the better-off help the
//                                            poor), reconcile (a peacemaking at the chapel), infill (build
//                                            closer in for a while)
//                        An option that favours an idea is offered only while that idea could be thought of.

export const NUDGES_PER_ERA = 3;   // a hypothesis to test, not a law
export const OPEN_DAYS = 10;        // how long a crossroads stays open (half a year)
export const FAVOUR_DAYS = 40;      // how long the village leans towards a favoured idea (two years)
export const COOLDOWN_DAYS = 30;    // after closing, the same crossroads waits this long before it can open again
export const MAX_OPEN = 2;          // pressures can compete: at most two crossroads open at once

// The crossroads of the industrial village. Other ages have their own (src/data/ages.js).
export const INDUSTRIAL_CROSSROADS = [
  {
    id: 'hunger', answers: 'food', when: 'grainShort', days: 5,
    title: 'Thin bellies',
    situation: 'The granary is low and the next harvest is a long way off. At The Plough the talk is of how the village is to feed itself.',
    options: [
      { label: 'Speak for the heavy plough', intent: 'Turn the clay deeper so the same fields give more. It needs a smith, backers and money.', favour: 'plough' },
      { label: 'Look to the woods', intent: 'Fell the nearest wood and break new ground. Some will grieve for the trees.', favour: 'assart' },
      { label: 'Send for corn', intent: 'The better-off club together for a cartload now. It eases this winter, not the next.', relief: 'corn' },
    ],
  },
  {
    id: 'famine', answers: 'food', when: 'famine', days: 2, crisis: true,
    title: 'Hunger in the cottages',
    situation: 'Children are going to bed hungry and the bread is all but gone. People are frightened.',
    options: [
      { label: 'Send for corn', intent: 'Whoever has money is asked to pay for corn from the next valley, at whatever price.', relief: 'corn' },
      { label: 'Ask the better-off to share', intent: 'Those with full purses are asked to help those with none. Not all will.', relief: 'alms' },
    ],
  },
  {
    id: 'crowded', answers: 'connectivity', when: 'shortOfLand', days: 6,
    title: 'No room to grow',
    situation: 'Every good plot near the Green is taken, and the next family will have to build well out of the village.',
    options: [
      { label: 'Speak for a bridge', intent: 'Open the far bank of the river to houses and fields. A great work, and a costly one.', favour: 'bridge' },
      { label: 'Build closer in', intent: 'Squeeze new houses onto the plots by the lanes for a few years. The village grows denser, not wider.', relief: 'infill' },
    ],
  },
  {
    id: 'carriage', answers: 'connectivity', when: 'goodsStuck', days: 6,
    title: 'Goods by packhorse',
    situation: 'The mill turns out more than the carters can carry on a bad road, and corn costs dear by the time it arrives.',
    options: [
      { label: 'Talk up a canal', intent: 'Cut a waterway along the valley side. Only possible where the land lies level enough.', favour: 'canal' },
      { label: 'Talk up a turnpike', intent: 'A made road paid for by tolls. The carters would do well out of it.', favour: 'turnpike' },
    ],
  },
  {
    id: 'looms', answers: 'economy', when: 'weaversPoor', days: 6,
    title: 'Hard times at the looms',
    situation: 'The weavers are working longer for less, and the cloth merchant wants more than the cottage looms can give.',
    options: [
      { label: 'Back the flying shuttle', intent: 'One weaver could do the work of two. Those who cannot afford one may be left behind.', favour: 'shuttle' },
      { label: 'Listen to talk of a mill', intent: 'Spin by water power, as they do in the next valley. It would change everything, and not for everyone\'s good.', favour: 'cottonmill' },
      { label: 'Ask the better-off to help', intent: 'Tide the weaving families over. Kindness now, and perhaps gratitude later.', relief: 'alms' },
      { label: 'Talk of a fulling mill', intent: 'Let the river beat the cloth. The walkers who tread it now would lose their work.', favour: 'fulling' },
    ],
  },
  {
    id: 'quarrels', answers: 'social', when: 'feudsRife', days: 4,
    title: 'Bad blood',
    situation: 'Old feuds are flaring. Doors are shut, the court is busy, and some will not sit in the same pew.',
    options: [
      { label: 'Call a peacemaking at the chapel', intent: 'Ask the feuding families to shake hands before the village. The forgiving may; the proud may not.', relief: 'reconcile' },
      { label: 'Speak for a school', intent: 'Teach the children their letters, and the village to question idle talk. Slow to pay off.', favour: 'school' },
      { label: 'Speak for a chantry', intent: 'Pay a priest to pray for the dead and teach the children. The village would have to find his keep.', favour: 'chantry' },
      { label: 'Talk of a parish guild', intent: 'Bind the families in a brotherhood sworn to keep the peace. Some will not join.', favour: 'guild' },
    ],
  },
];

/** The crossroads of the age the village is in now. */
export let CROSSROADS = INDUSTRIAL_CROSSROADS;
/** Every crossroads of every age, by id. */
// The manor village shares most of these (options for ideas the age does not have are never offered),
// and has one of its own: a good harvest with nowhere to sell it.
export const MEDIEVAL_CROSSROADS = [
  ...INDUSTRIAL_CROSSROADS.filter(c => c.id !== 'carriage'),
  {
    id: 'surplus', answers: 'economy', when: 'granaryFullAtHarvest', days: 2,
    title: 'Corn and nowhere to sell it',
    situation: 'The barns are full and the price has fallen. The nearest market is a long day away, and the tolls there are heavy.',
    options: [
      { label: 'Petition for a market charter', intent: "Ask the king's leave to hold a market here. It will cost money and goodwill, and the next town will not like it.", favour: 'charter' },
      { label: 'Speak for a tithe barn', intent: 'Keep the surplus dry against a bad year. It does nothing for the price.', favour: 'barn' },
      { label: 'Ask for a fair as well', intent: 'A midsummer fair would bring buyers from three valleys. Only once there is a market.', favour: 'fair' },
    ],
  },
];
export const CROSSROAD = Object.fromEntries([...INDUSTRIAL_CROSSROADS, ...MEDIEVAL_CROSSROADS].map(c => [c.id, c]));
export function useCrossroads(list) {
  CROSSROADS = list;
  for (const c of list) CROSSROAD[c.id] = c;
}
