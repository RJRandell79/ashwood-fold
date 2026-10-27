# Prototype v5

The single-file prototype that the modular game is being ported from. It plays as-is: open `ashwood-fold.html` in a browser.

`source/` holds the parts the file is built from, concatenated in this order:

    a_head.html b_core.js c_life.js d_world.js g_faces.js h_civic.js e_ui.js f_3d.js

| Part | Contents |
| --- | --- |
| a_head.html | Title, CSS, page markup, Three.js r128 script tag |
| b_core.js | Constants, places, jobs, founding families, idea table, RNG, time, state setup, save migration, log, relationships |
| c_life.js | Planning, needs, work, eating, theft, encounters, quarrels, gossip, kindness |
| d_world.js | Ideas, life and death, succession, newcomers, seasons, food, upkeep, nudges, saves |
| g_faces.js | Inherited portraits and heraldry |
| h_civic.js | Elections, court, eras (canal, steam, railway), emigration |
| e_ui.js | 2D map, panels, roster, Moot Hall, families, annals book |
| f_3d.js | Three.js 3D view, game loop, boot |

Rebuild with:

    cd prototype/v5 && cat source/a_head.html source/b_core.js source/c_life.js source/d_world.js source/g_faces.js source/h_civic.js source/e_ui.js source/f_3d.js > ashwood-fold.html

Note: the browser save key stays `ashworth-fold-v1` (the game's earlier name) so villages already saved in players' browsers keep loading.
