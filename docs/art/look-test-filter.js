// Look tests: the game's scene drawn through one post-processing pass in a chosen illustrated style.
// Throwaway: bundled only into the look-test build, never the game.
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = `
uniform sampler2D tCol; uniform sampler2D tDep; uniform vec2 res; uniform float near; uniform float far; uniform int mode;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<4;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; } return s; }
float lin(vec2 uv){ float d = texture2D(tDep, uv).x; float z = (near*far)/((far-near)*d - far); return -z; }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
// ink where depth jumps (silhouettes and creases), relative to distance so far things stay clean
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
vec3 sat(vec3 c, float s){ float l = lum(c); return mix(vec3(l), c, s); }
void main(){
  vec2 fc = vUv*res;
  vec3 paper = vec3(0.945, 0.918, 0.85);
  if(mode == 1){                       // watercolour: soft washes, pooled edges, paper, sepia ink
    vec2 w = (vec2(fbm(fc/90.), fbm(fc/90.+7.3)) - 0.5) * 5.0 / res;
    vec2 uv = vUv + w;
    vec3 c = vec3(0.0); float k = 2.5/res.x;
    c += texture2D(tCol, uv).rgb*0.4; c += texture2D(tCol, uv+vec2(k,0.)).rgb*0.15; c += texture2D(tCol, uv-vec2(k,0.)).rgb*0.15;
    c += texture2D(tCol, uv+vec2(0.,k)).rgb*0.15; c += texture2D(tCol, uv-vec2(0.,k)).rgb*0.15;
    c = sat(c, 0.8);
    float l = lum(c); float band = floor(l*5.0 + fbm(fc/60.)*0.8)/5.0;
    c = c * mix(1.0, (band+0.1)/max(l,0.05), 0.45);
    c = mix(c, paper, 0.26 + 0.14*fbm(fc/140.));
    c = mix(c, c*vec3(1.04,1.0,0.92), 0.5);             // the paper shows through thin washes
    c *= 1.0 - 0.14*smoothstep(0.08, 0.25, colEdge(uv, 2.0)); // pigment pooled at the edge of a wash
    c *= 0.93 + 0.07*fbm(fc/2.5);                              // grain
    c *= 1.0 - 0.10*step(0.78, hash(floor(fc/2.0)))*(1.0-l);  // granulation in the darks
    float ink = depthEdge(uv, 1.3) * (0.55 + 0.45*fbm(fc/18.));
    c = mix(c, vec3(0.27, 0.21, 0.16), ink*0.6);
    gl_FragColor = vec4(c, 1.0);
  } else if(mode == 2){                // engraving: hatching for tone, a little colour, strong ink
    vec3 src = texture2D(tCol, vUv).rgb; float l = lum(src)*1.5;
    vec3 c = mix(paper, sat(src, 0.6), 0.22);
    float wob = (fbm(fc/40.)-0.5)*4.0, sp = 6.0;
    float h1 = abs(fract((fc.x+fc.y+wob)/sp)-0.5)*2.0;
    float h2 = abs(fract((fc.x-fc.y+wob)/sp)-0.5)*2.0;
    float h3 = abs(fract((fc.y+wob*0.5)/(sp*0.75))-0.5)*2.0;
    float t = 0.0;
    t = max(t, (1.0-smoothstep(0.15, 0.35, h1)) * (1.0-smoothstep(0.62, 0.72, l)));
    t = max(t, (1.0-smoothstep(0.15, 0.35, h2)) * (1.0-smoothstep(0.42, 0.52, l)));
    t = max(t, (1.0-smoothstep(0.25, 0.5, h3)) * (1.0-smoothstep(0.22, 0.32, l)));
    vec3 inkc = vec3(0.16, 0.13, 0.11);
    c = mix(c, inkc, t*0.85);
    c = mix(c, inkc, depthEdge(vUv, 1.0)*0.95);
    c *= 0.95 + 0.05*fbm(fc/3.0);
    gl_FragColor = vec4(c, 1.0);
  } else if(mode == 3){                // storybook: flat bands of colour, warm shade, outlines in a darker tone
    vec3 src = texture2D(tCol, vUv).rgb; float l = lum(src);
    float b = 0.34 + 0.27*smoothstep(0.30, 0.36, l) + 0.2*smoothstep(0.62, 0.70, l);
    vec3 c = sat(src, 1.05) * mix(1.0, b/max(l, 0.04), 0.7);
    c = mix(c, c*vec3(0.78, 0.74, 1.0), smoothstep(0.7, 0.3, b)*0.6);   // shade leans violet
    c = mix(c, c*vec3(1.08, 1.02, 0.88), smoothstep(0.7, 0.9, b)*0.6);  // light leans warm
    c = clamp(mix(c, vec3(0.98, 0.95, 0.88), 0.14), 0.0, 1.0);
    float e = max(depthEdge(vUv, 1.6), smoothstep(0.1, 0.22, colEdge(vUv, 1.2))*0.7);
    c = mix(c, c*0.3 + vec3(0.04, 0.03, 0.06), e);
    gl_FragColor = vec4(c, 1.0);
  } else gl_FragColor = texture2D(tCol, vUv);
}`;

export function installLook(G, mode) {
  const r = G.renderer, size = new THREE.Vector2();
  r.getDrawingBufferSize(size);
  const rt = new THREE.WebGLRenderTarget(size.x, size.y);
  rt.depthTexture = new THREE.DepthTexture(size.x, size.y); rt.depthTexture.type = THREE.UnsignedIntType;
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    uniforms: { tCol: { value: rt.texture }, tDep: { value: rt.depthTexture }, res: { value: size.clone() }, near: { value: G.camera.near }, far: { value: G.camera.far }, mode: { value: mode } } });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), ps = new THREE.Scene(), pc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.frustumCulled = false; ps.add(quad);
  const orig = r.render.bind(r);
  r.render = (s, c) => {
    if (s !== G.scene) return orig(s, c);
    s.traverse(o => { if (o.isSprite) o.visible = false; });   // labels would be lettered separately
    r.setRenderTarget(rt); orig(s, c); r.setRenderTarget(null); orig(ps, pc);
  };
}
