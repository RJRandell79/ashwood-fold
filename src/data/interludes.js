// Interludes: the centuries skipped between one age and the next. The engine (src/sim/interlude.js)
// decides which families come through and what becomes of each building; these records give the
// history that happened in between, in the annals' plain voice.
//
// Record fields
//   from, to             the ages it joins (src/data/ages.js)
//   title                the annals chapter's title
//   plague               the year and words for the great mortality that tests every family
//   events               what else happened, in order. `when` names a building or idea that must have
//                        existed for the line to be told; {place} is that building's name at the time.
//   lostWords, keptWords how the annals say a family was lost or came through (chosen by the dice)
export const INTERLUDES = [
  {
    from: 'medieval', to: 'industrial',
    title: 'The Long Interlude',
    plague: { year: 1349, text: 'In the summer of 1349 the pestilence came up the valley. Whole households were carried to the churchyard in a week.' },
    events: [
      { year: 1316, text: 'The rains of 1315 and 1316 rotted the harvest in the fields, and the hungry years that followed were remembered long after.' },
      { year: 1381, text: 'In 1381 there was talk in the alehouse of the risings in the south, and of men who would no longer work the lord\'s land for nothing.', when: 'tavern' },
      { year: 1461, text: 'Men of the valley marched for Lancaster in 1461. Not all of them came home.' },
      { year: 1536, text: 'In 1536 the abbey that owned the tithes was dissolved, and its lands sold to a family from the next valley.', when: 'barn' },
      { year: 1548, text: 'The king\'s commissioners closed {place} in 1548. Its priest was pensioned off, and the children went unlettered again.', when: 'chantry' },
      { year: 1600, text: 'The lord\'s family died out, and {place} passed through many hands, and was let and sublet until no one called it the manor any more.', when: 'hall' },
      { year: 1643, text: 'In 1643 soldiers were quartered in the valley, and took what they wanted from the barns.' },
      { year: 1690, text: 'The old open strips were enclosed and hedged, field by field, over a hundred years.' },
      { year: 1720, text: 'By 1720 the looms in the cottages were working for merchants in the towns, and the valley grew a little richer and a great deal busier.' },
    ],
    lostWords: ['were all taken by the pestilence', 'died out when the last of them was buried', 'left for the towns and were not heard of again', 'lost their land and went away'],
    keptWords: ['came through the pestilence', 'held on through every hard year', 'stayed when others left', 'kept their land, if not always their luck'],
  },
];

export const interludeFor = (from, to) => INTERLUDES.find(i => i.from === from && i.to === to) || null;
