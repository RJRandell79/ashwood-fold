// How buildings look in each era. A building takes the style of the era it was built in. It wears with
// the years and the weather, and is rebuilt in the style of the day when it is worn out, or worn and out of
// date, and someone can pay (src/sim/placement.js).
//   wall, roof, trim   colours (hex)
//   pitch              roof height as a share of the building's depth
//   storeys            extra floors for long and civic buildings
//   material           how the chronicle describes a building put up in this style
//   wears              how much of its life a building in this style loses each year (thatch goes faster than slate)
export const ERA_STYLES = [
  { name: 'cottage years', material: 'stone and thatch', wears: 0.02, wall: 0xe6dcc4, wallAlt: 0xd8ccb0, roof: 0x9b7f4e, roofAlt: 0x7c6440, trim: 0x4a3326, pitch: 0.55, storeys: 0 },
  { name: 'mill years', material: 'stone and flags', wears: 0.015,    wall: 0xcfc6ae, wallAlt: 0xbdb39a, roof: 0x6b655c, roofAlt: 0x5c564e, trim: 0x3d3128, pitch: 0.45, storeys: 0 },
  { name: 'canal years', material: 'stone and slate', wears: 0.012,   wall: 0xc4b89c, wallAlt: 0xb2a68a, roof: 0x58606a, roofAlt: 0x4d545d, trim: 0x33302c, pitch: 0.42, storeys: 1 },
  { name: 'age of steam', material: 'brick and slate', wears: 0.01,  wall: 0xa85a42, wallAlt: 0x96503b, roof: 0x4e5560, roofAlt: 0x454b55, trim: 0x2b2a28, pitch: 0.38, storeys: 1 },
  { name: 'railway age', material: 'brick and slate', wears: 0.01,   wall: 0x96503b, wallAlt: 0x8a4834, roof: 0x474d57, roofAlt: 0x3e434c, trim: 0x2b2a28, pitch: 0.36, storeys: 1 },
];

// Ground and foliage by season: spring, summer, autumn, winter.
export const SEASON_GROUND = {
  grass: [0x7aa258, 0x739d4e, 0x949a52, 0xdfe5e8],
  lush: [0x6c9a4c, 0x669546, 0x8a9248, 0xd8dfe3],
  moor: [0x8b8a5a, 0x8d8556, 0x8e6f45, 0xcfd4d6],
  bank: [0x7f8f5c, 0x83905a, 0x8a8a58, 0xc9d0d4],
  path: [0xc2ae86, 0xcbb68d, 0xb79f78, 0xbfb6a6],
  lane: [0x9c8a6a, 0xa38f6c, 0x8f7c5e, 0x9b9488],
};
export const SEASON_LEAF = [[0x5d9a4a, 0x6aa54f, 0xd9a7b8], [0x3f6e3a, 0x4f7d3c, 0x5d8a45], [0xb8652a, 0xd39b3a, 0x8f7a35], [0x3d5544, 0x4a5d4a, 0x56665a]];
export const SEASON_CROP = { colour: [0x7fae4c, 0x6f9d3c, 0xd2b450, 0x8a7350], height: [0.25, 0.8, 1.05, 0.12] };

// The manor village, 1290 on: timber frames and thatch, stone for the better buildings later.
//   timber: walls show their frame
export const MEDIEVAL_STYLES = [
  { name: 'manor years', material: 'timber and thatch', wears: 0.025, wall: 0xcdb994, wallAlt: 0xc2ad86, roof: 0xa48a58, roofAlt: 0x8e7548, trim: 0x3b2a1e, pitch: 0.65, storeys: 0, timber: true },
  { name: 'market years', material: 'timber and thatch', wears: 0.025, wall: 0xd6c6a2, wallAlt: 0xc9b690, roof: 0x9e8350, roofAlt: 0x8a7145, trim: 0x3b2a1e, pitch: 0.62, storeys: 0, timber: true },
  { name: 'cloth years', material: 'stone and thatch', wears: 0.02, wall: 0xd8ceb6, wallAlt: 0xcabfa4, roof: 0x9b7f4e, roofAlt: 0x7c6440, trim: 0x3b2a1e, pitch: 0.58, storeys: 0 },
];
