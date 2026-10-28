# Ashwood Fold: Ages of the Valley

A rule-based village simulation of a Lancashire river valley, played from a Stone Age camp to an industrial city. Villagers with needs, grudges and families invent, argue over and build their own settlement. You only nudge. It runs in the browser, with no AI calls.

- **Play the current build:** https://claude.ai/artifact/WniLDonPJaa3wQ5cWFob8P
- **Design doc:** https://claude.ai/artifact/RVNmrHm5ow3RnjTUWQoMpu

## Status

| Phase | Goal | Gate | State |
| --- | --- | --- | --- |
| 0 | Port v5 into modules, esbuild, headless harness | Same seed gives the same annals as v5 | Passed at commit 6f340ea |
| 1 | Ideas and buildings as data; 2D map dropped | The v5 tech tree runs from data alone | |
| 2 | Valley terrain, scored building sites, 3D archetypes | The village grows itself | |
| 3 | Dynasty records, interludes, eras 1 to 3 | A run goes from camp to the Bronze Age | |
| 4 | Townsfolk groups and scale | 10,000 people under 2 ms a tick | |
| 5 | The full era ladder | 50 seeds reach the city, no dead ends | |
| 6 | Polish and ship | Plays well on a phone | |

## Getting started

Needs Node 22 or later (`.nvmrc` pins 22).

```sh
npm install
npm run build        # writes dist/ashwood-fold.html, one self-contained page
npm test             # valley and placement, old saves (v5 included), save codes, invariants over long runs
npm run harness      # balance report: 5 whole games of 65 years (--seeds 1,2,3 --years 80)
npm run diversity    # how different the histories are: ideas, eras, layouts, families (--seeds 20)
npm run nudges       # crossroads: the same villages never nudged, always nudged, nudged at random
node harness/compare.mjs --base ../other-checkout   # behaviour report against another branch
```

Open `dist/ashwood-fold.html` in a browser to play. Three.js r128 loads from cdnjs.

## Layout

| Path | What lives there |
| --- | --- |
| `src/data/` | Plain data: jobs, founding families, names, eras, heraldry; `ideas.js` (one record per idea), `buildings.js` (footprints, archetypes, placement rules), `styles.js` (how each era builds) |
| `src/sim/` | The simulation. Never touches the DOM or Three.js, so it runs the same in Node |
| `src/data/ages.js` | The ages of the valley (the manor village of 1290, the industrial village of 1750): each with its ideas, eras, styles, crossroads, cast and founding buildings |
| `src/sim/interlude.js`, `src/data/interludes.js` | The interlude between ages: which families come through, what becomes of each building, the centuries' events |
| `src/sim/crossroads.js`, `src/data/crossroads.js` | Crossroads: real pressures, the player's choice to tip the balance, and the annals' follow-up |
| `src/sim/dynasties.js` | Family records, kept apart from wealth and living members |
| `src/sim/valley.js` | The valley grown from the run's seed: terrain, river, soil, woods. Rebuilt on demand, never saved |
| `src/sim/placement.js` | Scores plots and places every building, cottage, canal and railway |
| `src/sim/paths.js` | Footfall: paths wear where people walk |
| `src/sim/hooks.js` | The only way the simulation reaches the page (redraw after a nudge, autosave) |
| `src/save/` | Save codes (`AF1:` prefix) and browser autosave |
| `src/view/` | 3D view (`terrain.js`, `archetypes.js`, `lines.js`, `three.js`), panels, portraits and arms, the annals book |
| `src/main.js` | Boot and game loop |
| `index.html`, `src/view/styles.css` | Page shell and styles, inlined by the build |
| `harness/` | Headless runner, balance report, invariants, the v5 reference (for loading old saves in tests), behaviour comparison between branches |
| `tests/` | Vitest tests |
| `tools/build.mjs` | esbuild bundle, inlined into one HTML file |
| `tools/port-v5.mjs` | One-off tool that split the prototype into modules (kept as a record) |
| `prototype/v5/` | The single-file prototype the port started from |

## Rules the code keeps

- One seeded RNG (`rnd` in `src/sim/state.js`) drives the simulation. Portraits, arms and visuals use their own seeded dice, so watching never changes the story.
- Game state is one plain JSON tree. Old save codes must keep loading.
- Every change is checked with the harness across several seeds before it is published.
