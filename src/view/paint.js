// The valley as a watercolour (docs/art-bible.md, sections 3–5 and 11). The scene is drawn to a texture with
// its depth, then one full-screen pass paints it: washes on warm paper, cool transparent shade, the far valley
// fading to the paper, a fine sepia pen on near buildings, and a painted sky. Lettering (layer 1) is drawn after
// the paint, crisp and unpainted. Phones and low-power devices get a lighter pass. Reads no game state.

export const LETTERING = 1;   // the layer that lettering lives on, drawn over the paint

const PAPER = [0.945, 0.918, 0.851], INK = [0.27, 0.212, 0.165], SKY = [0.74, 0.81, 0.86];

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = `
uniform sampler2D tCol; uniform sampler2D tDep;
uniform vec2 res; uniform float near; uniform float far; uniform float dpr; uniform float dusk; uniform float storm;
uniform float fadeNear; uniform float fadeFar; uniform vec3 paper; uniform vec3 ink; uniform vec3 skyTop;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<4;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; } return s; }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 sat(vec3 c, float s){ float l = lum(c); return mix(vec3(l), c, s); }
float lin(vec2 uv){ float d = texture2D(tDep, uv).x; return (near*far)/(far - d*(far-near)); }
// the pen: where depth jumps, relative to distance, so creases and silhouettes ink but slopes do not
float depthEdge(vec2 uv, float px){
  vec2 o = px/res; float d = lin(uv);
  float e = abs(lin(uv+vec2(o.x,0.))-d) + abs(lin(uv-vec2(o.x,0.))-d) + abs(lin(uv+vec2(0.,o.y))-d) + abs(lin(uv-vec2(0.,o.y))-d);
  return smoothstep(0.035, 0.09, e/d);
}
float colEdge(vec2 uv, float px){
  vec2 o = px/res;
  float gx = lum(texture2D(tCol, uv+vec2(o.x,0.)).rgb) - lum(texture2D(tCol, uv-vec2(o.x,0.)).rgb);
  float gy = lum(texture2D(tCol, uv+vec2(0.,o.y)).rgb) - lum(texture2D(tCol, uv-vec2(0.,o.y)).rgb);
  return length(vec2(gx, gy));
}
// dusk and night: the paper darkens to a blue-grey wash, never black; lamplight stays the brightest thing
vec3 night(vec3 c){
  float L = lum(c);
  vec3 n = vec3(0.05, 0.06, 0.1) + c*vec3(0.66, 0.7, 0.92);
  float lampLit = smoothstep(0.55, 0.8, L) * smoothstep(0.05, 0.2, c.r - c.b);   // a lit window: bright and warm
  return mix(n, vec3(0.96, 0.78, 0.45), lampLit);
}
// The look of a value in the wash: the source colour moved onto the palette (night, saturation, warm light, cool
// shade), before it becomes pigment.
vec3 tone(vec3 c){
  c = sat(c, 0.62);
  float gr = smoothstep(0.02, 0.15, c.g - max(c.r, c.b));                 // greens lean to sap and ochre, never acid
  c = mix(c, c*vec3(1.08, 0.97, 0.86), gr*0.75);
  float l = lum(c);
  c = mix(c, c*vec3(0.80, 0.84, 1.14), smoothstep(0.55, 0.12, l)*0.75);   // shade is a cool wash, never grey
  c = mix(c, c*vec3(1.05, 1.01, 0.90), smoothstep(0.45, 0.80, l)*0.5);    // light leans warm
  return max(c, vec3(0.1, 0.11, 0.16));
}
// Pigment, not light: how much of the paper's brightness a wash takes away, per channel. Colour brighter than the
// paper carries no pigment at all, so highlights are bare paper.
vec3 absorb(vec3 c){ return max(-log(max(c, vec3(0.02)) / paper), 0.0); }
// Which wash a value falls in: three or four flat values per surface, their borders wandering as a brush would.
float washOf(float a, vec2 fc){ return floor(a*3.4 + (fbm(fc/55.) - 0.5)*1.1); }
void main(){
  vec2 fc = gl_FragCoord.xy / dpr;                       // in CSS pixels, so grain looks the same on every screen
  float tooth = fbm(fc/1.7 + 3.1);                       // the paper's surface: pigment settles in its hollows
  float raw = texture2D(tDep, vUv).x;
  if(raw > 0.99999){                                     // the sky: wet-in-wet, soft blooms of thin colour on paper
    vec3 A = absorb(skyTop) * smoothstep(0.2, 1.0, vUv.y) * (0.35 + 0.8*fbm(fc/150. + vec2(0.0, fc.x/400.)));
    A += absorb(vec3(0.62, 0.64, 0.68)) * storm * 0.6 * fbm(fc/90.);
    vec3 s = paper * exp(-A);
    s = mix(s, lum(s)*vec3(0.5, 0.56, 0.78) + vec3(0.03, 0.04, 0.08), dusk*0.6);
    gl_FragColor = vec4(s, 1.0); return;
  }
  vec2 wob = (vec2(fbm(fc/90.), fbm(fc/90. + 7.3)) - 0.5) * 4.0 * dpr / res;   // a wash's edge wanders a little
  vec2 uv = vUv + wob;
  vec3 src = texture2D(tCol, uv).rgb, c = tone(src);
  float lamp = smoothstep(0.62, 0.85, lum(src)) * smoothstep(0.08, 0.25, src.r - src.b) * dusk;   // a lit window
  float dist = lin(uv);
  vec3 A = absorb(c);
  A = min(A * (1.0 - 0.38*dusk), vec3(1.7));             // even the darkest wash, and dusk, stay readable
  float a = dot(A, vec3(0.3333)), w = washOf(a, fc);
  A *= mix(1.0, ((w + 0.5)/3.4) / max(a, 0.03), 0.85) * 0.86;    // flat washes: each value laid as one flat coat
  // pigment density: blotchy where it pooled and thinned, granular in the paper's hollows, heavier in the darks
  float dens = 0.74 + 0.42*fbm(fc/46.) + 0.24*(fbm(fc/10.) - 0.5);
  float laid = smoothstep(0.05, 0.6, a);
  dens += (0.5 - tooth) * 0.6 * laid * (1.0 - 0.65*smoothstep(0.7, 1.5, a));   // granulation, easing off in the darkest washes
#ifndef LITE
  // edge darkening: where this wash meets a lighter one, pigment has collected along its border
  float o = 2.2*dpr, rim = 0.0;
  for(int i = 0; i < 4; i++){
    vec2 d = i == 0 ? vec2(o, 0.) : i == 1 ? vec2(-o, 0.) : i == 2 ? vec2(0., o) : vec2(0., -o);
    float an = dot(absorb(tone(texture2D(tCol, uv + d/res).rgb)), vec3(0.3333));
    rim = max(rim, step(washOf(an, fc + d/dpr) + 0.5, w));
  }
  dens += rim * 0.42;
#endif
  // the colour stops just short of the pen, leaving a sliver of paper beside the line
  float near_ = 1.0 - smoothstep(fadeNear*0.55, fadeNear*1.25, dist);
  float line = depthEdge(vUv, 1.3*dpr);
  float gap = depthEdge(vUv + vec2(1.8, -1.4)*dpr/res, 1.0*dpr) * (1.0 - line);
  dens *= 1.0 - gap * 0.35 * near_;
  // distance: less and less pigment, back to the paper
  float fade = smoothstep(fadeNear, fadeFar, dist);
  A = mix(A, absorb(mix(paper, skyTop, 0.3)) * 0.8, fade * 0.85);
  c = paper * exp(-A * max(dens, 0.0));
  if(dusk > 0.0) c = mix(c, c*vec3(0.92, 0.94, 1.0), dusk*fade);
  c *= 1.0 - (1.0 - tooth) * 0.07 * laid * (1.0 - 0.6*smoothstep(0.7, 1.5, a));
  c = mix(c, c*vec3(0.86, 0.9, 1.14), smoothstep(0.42, 0.12, lum(c))*0.55);   // the darkest shade stays a cool wash, not grey                                 // the grain shows in the pigment, not on bare paper
  // dusk: a blue-grey glaze over the painting, never more than about half; lit windows are the only bright marks
  c = mix(c, lum(c)*vec3(0.5, 0.56, 0.78) + vec3(0.03, 0.04, 0.08), dusk*0.45);
  c = mix(c, vec3(0.93, 0.74, 0.4), lamp);
  float hand = 0.45 + 0.55*smoothstep(0.3, 0.7, fbm(fc/14.));            // the line breaks and changes weight
  float pen = max(line, smoothstep(0.22, 0.4, colEdge(vUv, 1.0*dpr))*0.7*(1.0 - dusk)) * hand * near_;
  c = mix(c, mix(ink, vec3(0.22, 0.24, 0.34), dusk), min(1.0, pen*1.05));
  gl_FragColor = vec4(c, 1.0);
}`;

/** Whether this device should get the lighter pass. */
export function lowPower() {
  try { return (navigator.hardwareConcurrency || 8) <= 4 || matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
}

/** The painting stage for a renderer. paint.render(scene, camera, light) draws a frame. */
export function makePaint(renderer, { lite = lowPower() } = {}) {
  const size = new THREE.Vector2(), rt = new THREE.WebGLRenderTarget(1, 1);
  rt.depthTexture = new THREE.DepthTexture(1, 1); rt.depthTexture.type = THREE.UnsignedIntType;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false, defines: lite ? { LITE: 1 } : {},
    uniforms: {
      tCol: { value: rt.texture }, tDep: { value: rt.depthTexture }, res: { value: new THREE.Vector2(1, 1) },
      near: { value: 0.5 }, far: { value: 320 }, dpr: { value: 1 }, dusk: { value: 0 }, storm: { value: 0 },
      fadeNear: { value: 60 }, fadeFar: { value: 150 },
      paper: { value: new THREE.Color(...PAPER) }, ink: { value: new THREE.Color(...INK) }, skyTop: { value: new THREE.Color(...SKY) },
    },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), post = new THREE.Scene(), flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.frustumCulled = false; post.add(quad);
  const U = mat.uniforms;
  return {
    lite,
    paper: new THREE.Color(...PAPER),
    /** light: { dusk 0–1, storm 0–1, radius } */
    render(scene, camera, light) {
      renderer.getDrawingBufferSize(size);
      if (rt.width !== size.x || rt.height !== size.y) { rt.setSize(size.x, size.y); U.res.value.copy(size); }
      U.near.value = camera.near; U.far.value = camera.far; U.dpr.value = renderer.getPixelRatio();
      U.dusk.value = light.dusk; U.storm.value = light.storm;
      U.fadeNear.value = light.radius * 0.85 + 6; U.fadeFar.value = light.radius * 2.0 + 30;
      camera.layers.set(0);
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(post, flat);
      lettering(renderer, scene, camera);
    },
    dispose() { rt.dispose(); mat.dispose(); quad.geometry.dispose(); },
  };
}

/** The scene drawn plain, lettering and all. */
export function renderPlain(renderer, scene, camera) {
  camera.layers.set(0); renderer.render(scene, camera);
  lettering(renderer, scene, camera);
}

function lettering(renderer, scene, camera) {
  const auto = renderer.autoClear, shadows = renderer.shadowMap.autoUpdate, bg = scene.background;
  renderer.autoClear = false; renderer.shadowMap.autoUpdate = false; scene.background = null;
  camera.layers.set(LETTERING); renderer.render(scene, camera);
  camera.layers.set(0); renderer.autoClear = auto; renderer.shadowMap.autoUpdate = shadows; scene.background = bg;
}
