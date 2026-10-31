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
//     wooded             prefer standing woodland, to fell it (weight); otherwise woodland counts against a plot
//     high               prefer ground well above the settlement, where the wind is (weight)
//     road               prefer well-trodden ground (weight)
//     near, away         { kind or building id: weight }  prefer to be close to / far from
//     line               must stand beside a line (canal, railway)
//     maxSlope, maxFlood hard limits (defaults 0.35 and 0.15)
//   founding           order in which the first village is laid out (lower first); absent = built later
//   hue                household colour for a founding home
//   legacy             what the valley does with it as time passes:
//                        replaceable  pulled down and replaced (cottages, fields)
//                        adaptable    rebuilt or put to new use on the same site (inn, mill, hall)
//                        enduring     kept as a landmark, and later a ruin or protected site (green, chapel, cross)
export const BUILDINGS = {
  square:   { name: 'the Green', legacy: 'enduring', w: 8, h: 6, indoor: false, kind: 'open', archetype: 'green', features: ['well'],
              place: { centre: 4, flat: 3, dry: 2 }, founding: 1 },
  chapel:   { name: 'the Chapel', legacy: 'enduring', w: 4, h: 4, indoor: true, kind: 'sacred', archetype: 'sacred', features: ['spire'],
              place: { centre: 3, flat: 2, dry: 2, near: { square: 2 } }, founding: 2 },
  tavern:   { name: 'The Plough', legacy: 'adaptable', w: 6, h: 4, indoor: true, kind: 'civic', archetype: 'long', features: ['sign', 'chimney'],
              place: { centre: 3, near: { square: 3 }, road: 1 }, founding: 3 },
  market:   { name: 'the Market Cross', legacy: 'enduring', w: 6, h: 3, indoor: false, kind: 'open', archetype: 'market', features: ['cross', 'stalls'],
              place: { centre: 3, near: { square: 3 }, road: 1 }, founding: 4 },
  hall:     { name: 'the Moot Hall', legacy: 'adaptable', w: 4, h: 3, indoor: true, kind: 'civic', archetype: 'civic',
              place: { centre: 3, near: { square: 2 } }, founding: 5 },
  mill:     { name: 'the Watermill', legacy: 'adaptable', w: 5, h: 4, indoor: true, kind: 'work', archetype: 'workshop', features: ['waterwheel'],
              place: { riverbank: true, centre: 2, maxFlood: 1, maxSlope: 0.5 }, founding: 6 },
  fields:   { name: 'the South Fields', legacy: 'replaceable', w: 12, h: 5, indoor: false, kind: 'field', archetype: 'field', features: ['crops'],
              place: { fertile: 4, flat: 3, nearWater: 1, edge: 1, away: { sacred: 1 }, maxFlood: 0.6 }, founding: 7 },
  forge:    { name: 'the Forge', legacy: 'adaptable', w: 4, h: 3, indoor: true, kind: 'work', archetype: 'workshop', features: ['chimney'],
              place: { centre: 2, flat: 1, away: { sacred: 1 } }, founding: 8 },
  bakery:   { name: 'the Bakehouse', legacy: 'adaptable', w: 4, h: 3, indoor: true, kind: 'work', archetype: 'workshop', features: ['chimney'],
              place: { centre: 2, near: { market: 2 } }, founding: 9 },
  weaving:  { name: 'the Weaving Shed', legacy: 'adaptable', w: 5, h: 4, indoor: true, kind: 'work', archetype: 'long',
              place: { centre: 1, flat: 2, near: { home: 1 } }, founding: 10 },
  garden:   { name: 'the Physic Garden', legacy: 'replaceable', w: 5, h: 3, indoor: false, kind: 'open', archetype: 'garden', features: ['beds'],
              place: { fertile: 1, centre: 3, near: { sacred: 3 } }, founding: 11 },
  holt:     { name: 'Holt Cottage', legacy: 'replaceable', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { home: 2 }, dry: 2 }, founding: 12, hue: 12 },
  pendle:   { name: 'Pendle Cottage', legacy: 'replaceable', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { mill: 2, home: 1 }, dry: 2 }, founding: 13, hue: 208 },
  barrow:   { name: 'Barrow Cottage', legacy: 'replaceable', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { forge: 2, home: 1 }, dry: 2 }, founding: 14, hue: 36 },
  fair:     { name: 'Fairclough Farmhouse', legacy: 'replaceable', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { near: { fields: 4 }, centre: 1, dry: 2 }, founding: 15, hue: 128 },
  calder:   { name: 'Calder Cottage', legacy: 'replaceable', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { garden: 2, home: 1 }, dry: 2 }, founding: 16, hue: 285 },
  greaves:  { name: 'Greaves House', legacy: 'replaceable', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 3, near: { hall: 2, home: 1 }, dry: 2 }, founding: 17, hue: 172 },
  cottage:  { name: 'Cottage', legacy: 'replaceable', w: 4, h: 3, indoor: true, home: true, kind: 'home', archetype: 'house', features: ['chimney'],
              place: { centre: 2, near: { home: 3 }, road: 1, dry: 2, flat: 1 } },
  assart:   { name: 'the Intake Fields', legacy: 'replaceable', w: 10, h: 5, indoor: false, kind: 'field', archetype: 'field', features: ['crops'],
              place: { wooded: 4, fertile: 2, flat: 2, near: { fields: 2, home: 1 }, maxFlood: 0.6, maxSlope: 0.45 } },
  barn:     { name: 'the Tithe Barn', legacy: 'adaptable', w: 3, h: 4, indoor: true, kind: 'work', archetype: 'long',
              place: { near: { fields: 5 }, dry: 2 } },
  school:   { name: 'the School', legacy: 'adaptable', w: 4, h: 3, indoor: true, kind: 'civic', archetype: 'civic', features: ['bell', 'chimney'],
              place: { centre: 2, near: { home: 2, sacred: 1 }, away: { works: 2 } } },
  cottonmill: { name: 'the Cotton Mill', legacy: 'adaptable', w: 6, h: 4, indoor: true, kind: 'works', archetype: 'industrial', features: ['stack'],
              place: { riverbank: true, centre: 1, away: { sacred: 2 }, maxFlood: 1, maxSlope: 0.5 } },
  wharf:    { name: 'the Canal Wharf', legacy: 'adaptable', w: 4, h: 2, indoor: false, kind: 'open', archetype: 'wharf', features: ['crane'],
              place: { line: 'canal', centre: 3 } },
  fulling:  { name: 'the Fulling Mill', legacy: 'adaptable', w: 4, h: 3, indoor: true, kind: 'work', archetype: 'workshop', features: ['waterwheel'],
              place: { riverbank: true, centre: 1, away: { sacred: 1 }, maxFlood: 1, maxSlope: 0.5 } },
  chantry:  { name: 'the Chantry', legacy: 'adaptable', w: 3, h: 3, indoor: true, kind: 'civic', archetype: 'civic', features: ['bell'],
              place: { centre: 2, near: { sacred: 4 } } },
  // What is left of a building the valley no longer uses: low walls in the grass. Its name and size are
  // the old building's; it stands where it stood (made by the interludes, src/sim/interlude.js).
  windmill: { name: 'the Windmill', legacy: 'adaptable', w: 3, h: 3, indoor: true, kind: 'work', archetype: 'windmill',
              place: { high: 4, edge: 1, dry: 2, away: { home: 1, sacred: 1 }, maxSlope: 0.5 } },
  guildhall: { name: 'the Guild Hall', legacy: 'adaptable', w: 4, h: 3, indoor: true, kind: 'civic', archetype: 'civic', features: ['chimney'],
              place: { centre: 3, near: { square: 2, sacred: 1 } } },
  ruin:     { name: 'the ruins', legacy: 'enduring', w: 4, h: 3, indoor: false, kind: 'open', archetype: 'ruin', place: {} },
  tollhouse: { name: 'the Toll House', legacy: 'adaptable', w: 3, h: 3, indoor: true, kind: 'civic', archetype: 'house', features: ['chimney'],
              place: { line: 'turnpike', centre: 3 } },
  station:  { name: 'the Station', legacy: 'adaptable', w: 5, h: 2, indoor: true, kind: 'civic', archetype: 'station',
              place: { line: 'railway', centre: 3 } },
};

// Housing for the named cast. About 30 people are simulated in full (decided 27 Oct), which needs
// at most about 16 homes; homes are built only when someone needs one, and never beyond this.
// Everyone else will live as townsfolk groups in terrace blocks (Phase 4).
export const MAX_HOMES = 16;

// Cottage names are built from old Lancashire field and place-name words, in an order set by the valley.
// The first two match the plots of the v5 village, so old saves keep their names.
export const COTTAGE_FIRST = ['Market Row', 'Lane End'];
export const NAME_PARTS = ['Brook', 'Fold', 'Brow', 'Clough', 'Hollin', 'Ing', 'Moss', 'Intack', 'Holme', 'Ash', 'Withy', 'Rake',
  'Croft', 'Carr', 'Lea', 'Heys', 'Shaw', 'Height', 'Bank', 'Nook', 'Laithe', 'Gill', 'Royd', 'Hey Top', 'Mill Brow', 'Well'];
// A house built in the cottage or mill years is a cottage; later ones are houses.
export const HOUSE_WORD = era => (era <= 1 ? 'Cottage' : 'House');
// Household colours for new homes.
export const COTTAGE_HUES = [240, 95, 330, 20, 160, 265, 60, 190, 300, 120, 0, 220, 80, 350];

// Long works that cut across the valley, routed along a contour when their idea is built.
//   target: height above the hearth to follow; smooth: how hard the route resists bending
//   water: a waterway, which must keep one level (so not every valley can carry one)
export const LINES = {
  canal:   { name: 'the canal', target: 0.4, smooth: 2.5, width: 1, water: true },
  railway: { name: 'the railway', target: 2.2, smooth: 6, width: 1 },
  turnpike: { name: 'the turnpike', target: 1.2, smooth: 3, width: 1 },
};

// Ways over the river. The first village fords it; the stone bridge idea replaces the ford.
export const CROSSINGS = {
  ford: { name: 'the ford' },
  bridge: { name: 'the bridge' },
};

// The legacies a building can have (see `legacy` above).
export const LEGACIES = ['replaceable', 'adaptable', 'enduring'];
// Archetypes whose look follows the era style, so rebuilding them shows (the rest keep their first look).
export const STYLED_ARCHETYPES = ['house', 'long', 'workshop', 'civic'];

// Inherited influence (decided 30 Oct): the valley remembers where things stood, and a new building is drawn
// to where its kind stood in an earlier age, on the remembered site itself or beside the ruin of it.
//   site    weight for standing on the remembered site of a building of the same kind (same building, or
//           both homes, or both fields), falling off with distance out to `reach` cells
//   ruin    weight for standing beside the ruin of the same building, out to `reach`
export const MEMORY = { site: 3, ruin: 2.5, reach: 10 };
