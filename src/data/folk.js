// Ported from the v5 prototype by tools/port-v5.mjs.

export const FOLK=[
 ['Ada Holt','baker','holt',{temper:.35,warmth:.6,diligence:.85,forgive:.5,gossip:.4,scruple:.8},34,'f'],
 ['Sam Holt','labourer','holt',{temper:.6,warmth:.45,diligence:.4,forgive:.4,gossip:.3,scruple:.35},37,'m'],
 ['Tom Pendle','miller','pendle',{temper:.75,warmth:.3,diligence:.7,forgive:.2,gossip:.35,scruple:.55},52,'m'],
 ['Martha Pendle','weaver','pendle',{temper:.4,warmth:.5,diligence:.6,forgive:.4,gossip:.85,scruple:.6},48,'f'],
 ['Eli Barrow','smith','barrow',{temper:.55,warmth:.4,diligence:.8,forgive:.6,gossip:.15,scruple:.75},46,'m'],
 ['Ned Barrow','farmhand','barrow',{temper:.3,warmth:.75,diligence:.35,forgive:.7,gossip:.5,scruple:.4},19,'m'],
 ['Jonas Fairclough','farmer','fair',{temper:.65,warmth:.35,diligence:.75,forgive:.25,gossip:.3,scruple:.7},51,'m'],
 ['Ruth Fairclough','farmer','fair',{temper:.3,warmth:.7,diligence:.65,forgive:.65,gossip:.55,scruple:.7},18,'f'],
 ['Bess Calder','weaver','calder',{temper:.5,warmth:.4,diligence:.7,forgive:.3,gossip:.7,scruple:.5},39,'f'],
 ['Agnes Calder','herbalist','calder',{temper:.15,warmth:.85,diligence:.55,forgive:.85,gossip:.25,scruple:.9},68,'f'],
 ['Walter Greaves','reeve','greaves',{temper:.45,warmth:.3,diligence:.6,forgive:.35,gossip:.45,scruple:.85},61,'m'],
 ['Silas Wren','carter','greaves',{temper:.4,warmth:.6,diligence:.45,forgive:.55,gossip:.65,scruple:.45},42,'m'],
 ['Nell Hesketh','innkeeper','tavern',{temper:.35,warmth:.7,diligence:.7,forgive:.5,gossip:.9,scruple:.6},45,'f'],
 ['Kit Holt','child','holt',{temper:.5,warmth:.6,diligence:.45,forgive:.5,gossip:.5,scruple:.5},9,'m'],
 ['Lottie Pendle','child','pendle',{temper:.55,warmth:.45,diligence:.7,forgive:.3,gossip:.6,scruple:.6},13.7,'f']
];
// How the founding cast stands at the start: who is married to whom, whose child is whose, the old
// quarrels and friendships, and the lines that open the chronicle. Indices are into the cast's folk;
// {n} in a prologue line is the name of folk n.
//   opinions  [a, b, value]: what a thinks of b
//   midwife   everyone thinks at least this well of her (folk index, minimum)
//   children  whose opinions start as half their parents'
//   pairs     standing relationships: friends or feud
export const INDUSTRIAL_CAST = {
  folk: FOLK,
  spouses: [[0, 1], [2, 3]],
  parents: [[5, [4]], [7, [6]], [13, [0, 1]], [14, [2, 3]]],
  opinions: [
    [2, 6, -48], [6, 2, -52],   // Tom the miller and Jonas the farmer: grain prices
    [3, 8, -32], [8, 3, -38],   // Martha and Bess, rival weavers
    [5, 7, 66], [7, 5, 64],     // Ned and Ruth, sweethearts
    [11, 12, 58], [12, 11, 60], // Silas and Nell, old friends
  ],
  midwife: [9, 20],
  later: [[1, 10, -30]],        // Sam resents the reeve (set after the midwife)
  children: [13, 14],
  pairs: [[5, 7, 'friends'], [11, 12, 'friends'], [2, 6, 'feud']],
  prologue: [
    'Spring, and the first year of this chronicle. {2} the miller and {6} the farmer have not spoken civilly since the argument over grain prices last harvest.',
    '{3} and {8} both weave for the same cloth merchant, and neither forgets it.',
    'Everyone knows {5} is sweet on {7}. Nobody has said so to {6}.',
    'Old {9} has delivered most of the children in Ashwood Fold. {14} will be fourteen soon and wants a trade.',
  ],
};
const INDUSTRIAL_STRANGERS=[['Mercy Ogden','f'],['Caleb Thorne','m'],['Ivo Lark','m'],['Hester Quayle','f'],['Abel Royle','m']];
const INDUSTRIAL_GIRLS=['Hannah','Alice','Mary','Jane','Ellen','Grace','Betty','Ann','Peggy','Lydia','Sarah','Esther','Nancy','Kitty','Rose','Dolly','Harriet','Molly','Susan','Martha'];
const INDUSTRIAL_BOYS=['John','William','James','Thomas','Joseph','Richard','Henry','George','Robert','Edward','Samuel','Peter','Isaac','Matthew','Daniel','Luke','Jacob','Edwin','Walter','Arthur'];
const INDUSTRIAL_SURNAMES=['Haworth','Entwistle','Birtwistle','Pilling','Cottam','Sumner','Gregson','Whiteside','Rigby','Duckworth','Ashcroft','Seddon'];
export const RUMOURS=['has been watering the ale','was seen leaving the Bakehouse after dark with a full sack','owes money all over the village','has been speaking ill of the reeve','cheats with false weights at market','was heard cursing the chapel'];

/** The names of the age the village is in now: strangers who may walk in, and names for babies and newcomers. */
export let STRANGERS=INDUSTRIAL_STRANGERS, GIRLS=INDUSTRIAL_GIRLS, BOYS=INDUSTRIAL_BOYS, SURNAMES=INDUSTRIAL_SURNAMES;
export const INDUSTRIAL_NAMES={strangers:INDUSTRIAL_STRANGERS,girls:INDUSTRIAL_GIRLS,boys:INDUSTRIAL_BOYS,surnames:INDUSTRIAL_SURNAMES};
export function useNames(n){STRANGERS=n.strangers;GIRLS=n.girls;BOYS=n.boys;SURNAMES=n.surnames;}

// The manor village, from 1290. Surnames here are the old forms of the families later found in the valley
// (MEDIEVAL lineage in src/data/ages.js says which became which). The cast mirrors the trades and homes
// of the later village, so that the same crofts and workshops have people in them.
export const MEDIEVAL_FOLK=[
 ['Alice Holte','baker','holt',{temper:.35,warmth:.65,diligence:.8,forgive:.55,gossip:.4,scruple:.8},34,'f'],
 ['Hugh Holte','labourer','holt',{temper:.55,warmth:.45,diligence:.45,forgive:.45,gossip:.3,scruple:.4},37,'m'],
 ['Robert Pendle','miller','pendle',{temper:.7,warmth:.3,diligence:.7,forgive:.25,gossip:.35,scruple:.5},50,'m'],
 ['Margery Pendle','weaver','pendle',{temper:.4,warmth:.5,diligence:.6,forgive:.4,gossip:.8,scruple:.6},46,'f'],
 ['William Barwe','smith','barrow',{temper:.5,warmth:.45,diligence:.8,forgive:.6,gossip:.15,scruple:.75},44,'m'],
 ['Adam Barwe','farmhand','barrow',{temper:.3,warmth:.75,diligence:.4,forgive:.7,gossip:.5,scruple:.45},19,'m'],
 ['John Fayreclough','farmer','fair',{temper:.65,warmth:.35,diligence:.75,forgive:.25,gossip:.3,scruple:.65},52,'m'],
 ['Emma Fayreclough','farmer','fair',{temper:.3,warmth:.7,diligence:.65,forgive:.65,gossip:.55,scruple:.7},18,'f'],
 ['Isabel Caldre','weaver','calder',{temper:.5,warmth:.4,diligence:.7,forgive:.3,gossip:.7,scruple:.5},38,'f'],
 ['Joan Caldre','herbalist','calder',{temper:.15,warmth:.85,diligence:.55,forgive:.85,gossip:.25,scruple:.9},66,'f'],
 ['Thomas Greve','reeve','greaves',{temper:.45,warmth:.3,diligence:.65,forgive:.35,gossip:.45,scruple:.8},58,'m'],
 ['Walter Wryght','labourer','greaves',{temper:.4,warmth:.6,diligence:.5,forgive:.55,gossip:.6,scruple:.45},40,'m'],
 ['Agnes Brewster','innkeeper','tavern',{temper:.35,warmth:.7,diligence:.7,forgive:.5,gossip:.9,scruple:.55},44,'f'],
 ['Wat Holte','child','holt',{temper:.5,warmth:.6,diligence:.45,forgive:.5,gossip:.5,scruple:.5},9,'m'],
 ['Cecily Pendle','child','pendle',{temper:.55,warmth:.45,diligence:.7,forgive:.3,gossip:.6,scruple:.6},13.7,'f']
];
export const MEDIEVAL_CAST = {
  folk: MEDIEVAL_FOLK,
  spouses: [[0, 1], [2, 3]],
  parents: [[5, [4]], [7, [6]], [13, [0, 1]], [14, [2, 3]]],
  opinions: [
    [2, 6, -48], [6, 2, -52],   // Robert the lord's miller and John the farmer: the miller's share
    [3, 8, -30], [8, 3, -36],   // Margery and Isabel, spinning for the same chapman
    [5, 7, 64], [7, 5, 62],     // Adam and Emma, sweethearts
    [11, 12, 56], [12, 11, 58], // Walter and Agnes, old friends
  ],
  midwife: [9, 20],
  later: [[1, 10, -30]],        // Hugh resents the reeve
  children: [13, 14],
  pairs: [[5, 7, 'friends'], [11, 12, 'friends'], [2, 6, 'feud']],
  prologue: [
    'Spring, and the first year of this chronicle. {2} grinds the manor\'s corn at the lord\'s mill and keeps back the lord\'s share. {6} says the share grows every year.',
    '{3} and {8} both spin and weave for the same chapman, and neither forgets it.',
    'Everyone knows {5} is sweet on {7}. Nobody has said so to {6}.',
    'Old {9} has brought most of the manor\'s children into the world. {14} will be fourteen soon and wants a trade.',
  ],
};
export const MEDIEVAL_NAMES={
  strangers:[['Gilbert Chapman','m'],['Hawise Pedder','f'],['Jordan Palmer','m'],['Mabel Spicer','f'],['Osbert Wayfare','m']],
  girls:['Alice','Agnes','Joan','Margery','Isabel','Emma','Cecily','Matilda','Maud','Beatrice','Juliana','Edith','Avice','Rose','Sibyl','Mabel','Amice','Ellen','Petronel','Lettice'],
  boys:['John','William','Robert','Thomas','Richard','Hugh','Adam','Walter','Henry','Roger','Nicholas','Geoffrey','Simon','Ralph','Gilbert','Peter','Stephen','Hamo','Jordan','Laurence'],
  surnames:['Walker','Lister','Webster','Shepherd','Thatcher','Fowler','Tasker','Pinder','Hayward','Wodeward','Milner','Cowherd'],
};
