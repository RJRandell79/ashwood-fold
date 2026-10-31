// What a family leaves behind across an interlude (src/sim/legacy.js): the odds, and how the annals say it.
//   standing        rose, fell: chances for a family that comes through, shifted by perRank by where the family
//                   stood among the valley's families at the close (wealth, offices, honours, disgraces). effect: what the
//                   heirs start with (coins multiplied and added) and how far others regard them.
//   marriage        chance that a surviving name came down through a marriage rather than in the male line
//   landmark        chance a lane, field or wood keeps the family's name: base, plus perHonour for each honour
//                   (up to four). kinds: the word, whether a new house may take the name, and the annals' line.
//   carved          chance an honoured family's arms are carved on the enduring church
//   bonds           the deepest feud (the most grudges held between their members, at least feudGrudges) and
//                   the warmest friendship (average feeling at or above friendAbove) between two families in the valley at the close are each remembered with this
//                   chance. A feud passes to whoever holds both names by descent, marriage or with the land
//                   (feudPasses); a friendship only to true heirs (friendshipPasses). They start at `feud` or
//                   `friends` with each other.
//   lines           the annals' words
export const LEGACY = {
  standing: {
    rose: 0.1, fell: 0.4, perRank: 0.3,   // rose 10–40% and fell 40–10%, from the least to the most of the valley's families
    effect: {
      rose: { coins: 1.6, add: 10, regard: 8 },
      held: { coins: 1, add: 0, regard: 0 },
      fell: { coins: 0.5, add: 0, regard: -4 },
    },
  },
  marriage: 0.25,
  landmark: {
    base: 0.15, perHonour: 0.06,
    kinds: [
      { word: 'Lane', line: 'The lane up past their old croft is still called {name}, though few remember the {fam}.' },
      { word: 'Field', line: 'One of the enclosed fields is still called {name}, after the {fam} who first ploughed it.' },
      { word: 'Wood', line: 'The wood above the village is still called {name}, after the {fam}.' },
      { word: 'Ing', line: 'The wet meadow by the river is still called {name}, after the {fam} who mowed it.' },
      { word: 'Fold', house: true, line: 'The old {fam} holding is still called {name}, and a house there will take the name.' },
      { word: 'Brow', line: 'The steep lane out of the village is still called {name}, after the {fam}.' },
    ],
  },
  carved: 0.5,
  bonds: {
    feudGrudges: 1, friendAbove: 95, chance: 0.8, feud: -35, friends: 35,
    feudPasses: ['descent', 'marriage', 'land'],   // decided 31 Oct: newcomers who took the land take up the feud
    friendshipPasses: ['descent', 'marriage'],
  },
  lines: {
    standing: {
      rose: 'The {fam} did well out of the centuries: they hold more land than any family in the valley now.',
      held: '',
      fell: 'The {fam} came down in the world. They work other men\'s land now, where once they had their own.',
    },
    carved: 'In {place} the arms of the {fam} are still carved above the door.',
    feud: 'The {a} and the {b} have quarrelled for as long as anyone can remember, though no one now knows why.',
    feudLand: 'The {a} and the {b} have never got on. The {oa} and the {ob} quarrelled before them, and whoever holds that land seems to take up the quarrel with it.',
    friends: 'The {a} and the {b} have always stood by each other, as their grandfathers\' grandfathers did.',
    descent: 'The {fam} are the oldest family in the valley: there have been {old} here since {first}.',
    marriage: 'The {fam} are an old name in the valley, though the line ran out in a daughter long ago, and her husband took the name with the land.',
    land: 'The {fam} are newcomers, though they took their name from the old {old}\' land.',
    name: 'The {fam} are newcomers. There were {old} here once, but no tie between them is known.',
  },
};
