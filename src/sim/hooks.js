// The simulation never calls the view directly. The game loop (main.js) fills these in;
// in the headless harness they stay as no-ops.
export const hooks = {
  changed() {},   // state changed outside a tick (a nudge); the view should redraw
  autosave() {},  // a good moment to save (every 36 ticks)
};
