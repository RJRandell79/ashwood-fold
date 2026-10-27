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

Needs Node 20 or later.

```sh
npm install
npm run build        # writes dist/ashwood-fold.html, one self-contained page
npm test             # parity with v5, save codes, invariants over long runs
npm run harness      # balance report: 5 seeds x 30 years (--seeds 1,2,3 --years 50)
npm run parity       # full comparison with the v5 prototype (--seeds, --years)
```

Open `dist/ashwood-fold.html` in a browser to play. Three.js r128 loads from cdnjs.

## Layout

| Path | What lives there |
| --- | --- |
| `src/data/` | Plain data: places, jobs, founding families, names, ideas, eras, heraldry |
| `src/sim/` | The simulation. Never touches the DOM or Three.js, so it runs the same in Node |
| `src/sim/hooks.js` | The only way the simulation reaches the page (redraw after a nudge, autosave) |
| `src/save/` | Save codes (`AF1:` prefix) and browser autosave |
| `src/view/` | 2D map, 3D view, panels, portraits and arms, the annals book |
| `src/main.js` | Boot and game loop |
| `index.html`, `src/view/styles.css` | Page shell and styles, inlined by the build |
| `harness/` | Headless runner, balance report, invariants, v5 reference and parity check |
| `tests/` | Vitest tests |
| `tools/build.mjs` | esbuild bundle, inlined into one HTML file |
| `tools/port-v5.mjs` | One-off tool that split the prototype into modules (kept as a record) |
| `prototype/v5/` | The single-file prototype the port started from |

## Rules the code keeps

- One seeded RNG (`rnd` in `src/sim/state.js`) drives the simulation. Portraits, arms and visuals use their own seeded dice, so watching never changes the story.
- Game state is one plain JSON tree. Old save codes must keep loading.
- Every change is checked with the harness across several seeds before it is published.
