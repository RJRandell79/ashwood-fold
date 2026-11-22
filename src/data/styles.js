// How buildings look in each era. A building takes the style of the era it was built in. It wears with
// the years and the weather, and is rebuilt in the style of the day when it is worn out, or worn and out of
// date, and someone can pay (src/sim/placement.js).
//   wall, roof, trim   colours (hex)
//   pitch              roof height as a share of the building's depth
//   storeys            extra floors for long and civic buildings
//   material           how the chronicle describes a building put up in this style
//   wears              how much of its life a building in this style loses each year (thatch goes faster than slate)
export const ERA_STYLES = [
  { name: 'cottage years', material: 'stone and thatch', wears: 0.02, wall: 0xcdbe9e, wallAlt: 0xd6c9ab, roof: 0xb8975f, roofAlt: 0xa88752, trim: 0x5b4636, pitch: 0.6, storeys: 0 },
  { name: 'mill years', material: 'stone and flags', wears: 0.015,    wall: 0xcdbe9e, wallAlt: 0xc2b394, roof: 0x8e8a7f, roofAlt: 0x84807a, trim: 0x4a3b2e, pitch: 0.42, storeys: 0 },
  { name: 'canal years', material: 'stone and slate', wears: 0.012,   wall: 0xc6b796, wallAlt: 0xbcae8f, roof: 0x8a867c, roofAlt: 0x7f7b73, trim: 0x3f342b, pitch: 0.4, storeys: 1 },
  { name: 'age of steam', material: 'brick and slate', wears: 0.01,  wall: 0xb07058, wallAlt: 0xa6684f, roof: 0x69727a, roofAlt: 0x616a72, trim: 0x3a3230, pitch: 0.38, storeys: 1 },
  { name: 'railway age', material: 'brick and slate', wears: 0.01,   wall: 0xa6644f, wallAlt: 0x9c5d49, roof: 0x646d75, roofAlt: 0x5c646c, trim: 0x332d2b, pitch: 0.36, storeys: 1 },
];

// Ground and foliage by season: spring, summer, autumn, winter.
export const SEASON_GROUND = {
  grass: [0x839a68, 0x7c9561, 0x969558, 0xdfe5e8],
  lush: [0x768f5d, 0x708a57, 0x8c8c50, 0xd8dfe3],
  moor: [0x8b8a5a, 0x8d8556, 0x8e6f45, 0xcfd4d6],
  bank: [0x7f8f5c, 0x83905a, 0x8a8a58, 0xc9d0d4],
  path: [0xc2ae86, 0xcbb68d, 0xb79f78, 0xbfb6a6],
  lane: [0x9c8a6a, 0xa38f6c, 0x8f7c5e, 0x9b9488],
};
export const SEASON_LEAF = [[0x6f9256, 0x7f9e5e, 0x9aa877], [0x3f6e3a, 0x4f7d3c, 0x5d8a45], [0xb8652a, 0xd39b3a, 0x8f7a35], [0x3d5544, 0x4a5d4a, 0x56665a]];
export const SEASON_CROP = { colour: [0x7fae4c, 0x6f9d3c, 0xd2b450, 0x8a7350], height: [0.25, 0.8, 1.05, 0.12] };

// The manor village, 1290 on: timber frames and thatch, stone for the better buildings later.
//   timber: walls show their frame
export const MEDIEVAL_STYLES = [
  { name: 'manor years', material: 'timber and thatch', wears: 0.025, wall: 0xe6dec8, wallAlt: 0xd9cba8, roof: 0xb8975f, roofAlt: 0xa88752, trim: 0x5b4636, pitch: 0.72, storeys: 0, timber: true },
  { name: 'market years', material: 'timber and thatch', wears: 0.025, wall: 0xe6dec8, wallAlt: 0xddd0b0, roof: 0xb39159, roofAlt: 0xa3834e, trim: 0x5b4636, pitch: 0.7, storeys: 0, timber: true },
  { name: 'cloth years', material: 'stone and thatch', wears: 0.02, wall: 0xd3c6a6, wallAlt: 0xcdbe9e, roof: 0xb8975f, roofAlt: 0xa88752, trim: 0x5b4636, pitch: 0.66, storeys: 0 },
];
