// What a family leaves behind across an interlude (src/sim/legacy.js): the odds, and how the annals say it.
//   standing        rose, fell: base chances for a family that comes through; perWorth shifts both by how
//                   the valley rated the family (wealth, offices, honours, disgraces). effect: what the
//                   heirs start with (coins multiplied and added) and how far others regard them.
//   marriage        chance that a surviving name came down through a marriage rather than in the male line
//   landmark        chance a lane, field or wood keeps the family's name: base, plus perHonour for each honour
//                   (up to four). kinds: the word, whether a new house may take the name, and the annals' line.
//   carved          chance an honoured family's arms are carved on the enduring church
//   bonds           a feud (feeling at or below feudBelow) or friendship (at or above friendAbove) between two
//                   families that both came through is remembered with this chance, and their heirs start at
//                   `feud` or `friends` with each other
//   lines           the annals' words
export const LEGACY = {
  standing: {
    rose: 0.15, fell: 0.3, perWorth: 0.12,
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
  bonds: { feudBelow: -20, friendAbove: 30, chance: 0.6, feud: -35, friends: 35 },
  lines: {
    standing: {
      rose: 'The {fam} did well out of the centuries: they hold more land than any family in the valley now.',
      held: '',
      fell: 'The {fam} came down in the world. They work other men\'s land now, where once they had their own.',
    },
    carved: 'In {place} the arms of the {fam} are still carved above the door.',
    feud: 'The {a} and the {b} have quarrelled for as long as anyone can remember, though no one now knows why.',
    friends: 'The {a} and the {b} have always stood by each other, as their grandfathers\' grandfathers did.',
    descent: 'The {fam} are the oldest family in the valley: there have been {old} here since {first}.',
    marriage: 'The {fam} are an old name in the valley, though the line ran out in a daughter long ago, and her husband took the name with the land.',
    land: 'The {fam} are newcomers, though they took their name from the old {old}\' land.',
    name: 'The {fam} are newcomers. There were {old} here once, but no tie between them is known.',
  },
};
