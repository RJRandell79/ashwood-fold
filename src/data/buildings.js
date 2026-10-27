// Every kind of building the valley can hold. Nothing here says where a building stands:
// src/sim/placement.js scores plots against `place` and picks the best one when it is built.
//
// Fields
//   name               what the chronicle and labels call it
//   w, h               footprint in cells
//   indoor             people shelter there from storms
//   home               people live there
//   kind               home | civic | work | sacred | open | field | works
//   archetype          3D shape family (see src/view/archetypes.js)
//   features           extra 3D details: waterwheel, sign, bell, spire, chimney, stack, well, cross, stalls, crops
//   place              placement rules, scored by src/sim/placement.js:
//     centre / edge      prefer the middle of the settlement / its edges (weight)
//     nearWater          prefer closeness to the river (weight)
//     riverbank          must touch the river bank (true)
//     fertile, flat, dry prefer good soil / level ground / ground that does not flood (weight)
//     road               prefer well-trodden ground (weight)
//     near, away         { kind or building id: weight }  prefer to be close to / far from
//     line               must stand beside a line (canal, railway)
//     maxSlope, maxFlood hard limits (defaults 0.35 and 0.15)
//   founding           order in which the first village is laid out (lower first); absent = built later
//   hue                household colour for a founding home
export const BUILDINGS = {
  square:   { name: 'the Green', w: 8, h: 6, indoor: false, kind: 'open', archetype: 'green', features: ['well'],
              place: { centre: 4, flat: 3, dry: 2 }, founding: 1 },
  chapel:   { name: 'the Chapel', w: 4, h: 4, indoor: true, kind: 'sacred', archetype: 'sacred', features: ['spire'],
              place: { centre: 3, flat: 2, dry: 2, near: { square: 2 } }, founding: 2 },
  tavern:   { name: 'The Plough', w: 6, h: 4, indoor: true, kind: 'civic', archetype: 'long', features: ['sign', 'chimney'],
              place: { centre: 3, near: { square: 3 }, road: 1 }, founding: 3 },
  market:   { name: 'the Market Cross', w: 6, h: 3, indoor: false, kind: 'open', archetype: 'market', features: ['cross', 'stalls'],
              place: { centre: 3, near: { square: 3 }, road: 1 }, founding: 4 },
  hall:     { name: 'the Moot Hall', w: 4, h: 3, indoor: true, kind: 'civic', archetype: 'civic',
              place: { centre: 3, near: { square: 2 } }, founding: 5 },
  mill:     { name: 'the Watermill', w: 5, h: 4, indoor: true, kind: 'work', archetype: 'workshop', features: ['waterwheel'],
              place: { riverbank: true, centre: 2, maxFlood: 1, maxSlope: 0.5 }, founding: 6 },
  fields:   { name: 'the South Fields', w: 12, h: 5, indoor: false, kind: 'field', archetype: 'field', features: ['crops'],
              place: { fertile: 4, flat: 3, nearWater: 1, edge: 1, away: { sacred: 1 }, maxFlood: 0.6 }, founding: 7 },
  forge:    { name: 'the Forge', w: 4, h: 3, indoor: true, kind: 'work', archetype: 'workshop', features: ['chimney'],
              place: { centre: 2, flat: 1, away: { sacred: 1 } }, founding: 8 },
  bakery:   { name: 'the Bakehouse', w: 4, h: 3, indoor: true, kind: 'work', archetype: 'workshop', features: ['chimney'],
              place: { centre: 2, near: { market: 2 } }, founding: 9 },
  weaving:  { name: 'the Weaving Shed', w: 5, h: 4, indoor: true, kind: 'work', archetype: 'long',
              place: { centre: 1, flat: 2, near: { home: 1 } }, founding: 10 },
  garden:   { name: 'the Physic Garden', w: 5, h: 3, indoor: false, kind: 'open', archetype: 'garden', features: ['beds'],
              place: { fertile: 1, centre: 3, near: { sacred: 3 } }, founding: 11 },
  holt:     { name: 'Holt Cottage', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { home: 2 }, dry: 2 }, founding: 12, hue: 12 },
  pendle:   { name: 'Pendle Cottage', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { mill: 2, home: 1 }, dry: 2 }, founding: 13, hue: 208 },
  barrow:   { name: 'Barrow Cottage', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { forge: 2, home: 1 }, dry: 2 }, founding: 14, hue: 36 },
  fair:     { name: 'Fairclough Farmhouse', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { near: { fields: 4 }, centre: 1, dry: 2 }, founding: 15, hue: 128 },
  calder:   { name: 'Calder Cottage', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { garden: 2, home: 1 }, dry: 2 }, founding: 16, hue: 285 },
  greaves:  { name: 'Greaves House', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 3, near: { hall: 2, home: 1 }, dry: 2 }, founding: 17, hue: 172 },
  cottage:  { name: 'Cottage', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { home: 3 }, road: 1, dry: 2, flat: 1 } },
  barn:     { name: 'the Tithe Barn', w: 3, h: 4, indoor: true, kind: 'work', archetype: 'long',
              place: { near: { fields: 5 }, dry: 2 } },
  school:   { name: 'the School', w: 4, h: 3, indoor: true, kind: 'civic', archetype: 'civic', features: ['bell', 'chimney'],
              place: { centre: 2, near: { home: 2, sacred: 1 }, away: { works: 2 } } },
  cottonmill: { name: 'the Cotton Mill', w: 6, h: 4, indoor: true, kind: 'works', archetype: 'industrial', features: ['stack'],
              place: { riverbank: true, centre: 1, away: { sacred: 2 }, maxFlood: 1, maxSlope: 0.5 } },
  wharf:    { name: 'the Canal Wharf', w: 4, h: 2, indoor: false, kind: 'open', archetype: 'wharf', features: ['crane'],
              place: { line: 'canal', centre: 3 } },
  station:  { name: 'the Station', w: 5, h: 2, indoor: true, kind: 'civic', archetype: 'station',
              place: { line: 'railway', centre: 3 } },
};

// Names for cottages built as the village grows, in the order they are used.
export const COTTAGE_NAMES = ['Market Row Cottage', 'Lane End Cottage', 'Brook Cottage', 'Fold Cottage', 'Brow Cottage', 'Clough Cottage',
  'Hollin Cottage', 'Ing Cottage', 'Moss Cottage', 'Intack Cottage', 'Holme Cottage', 'Ash Cottage', 'Withy Cottage', 'Rake Cottage'];
// Household colours for those cottages.
export const COTTAGE_HUES = [240, 95, 330, 20, 160, 265, 60, 190, 300, 120, 0, 220, 80, 350];

// Long works that cut across the valley, routed along a contour when their idea is built.
//   target: height above the hearth to follow; smooth: how hard the route resists bending
export const LINES = {
  canal:   { name: 'the canal', target: 0.4, smooth: 2.5, width: 1 },
  railway: { name: 'the railway', target: 2.2, smooth: 6, width: 1 },
};

// Ways over the river. The first village fords it; the stone bridge idea replaces the ford.
export const CROSSINGS = {
  ford: { name: 'the ford' },
  bridge: { name: 'the bridge' },
};

// Which archetypes are rebuilt in a newer style as the eras pass (the rest keep their first look).
export const RESTYLED = ['house', 'long', 'workshop', 'civic'];
