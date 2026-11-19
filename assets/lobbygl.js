// STOCKZ · the lobby photo in 2.5D. A hand-drawn depth map moves near things more than far ones as the camera glides,
// soft masks let the teller, the customer and the girl breathe, the palms outside sway, and the lights can come on one by one.
const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
varying vec2 v; uniform sampler2D I, M, N, N2, N3, N4; uniform vec2 O; uniform float T, E, L;
uniform vec3 Ht, Hc, Hg;     // heads: teller, customer, girl (angle, x, y in photo pixels)
uniform vec3 Bd;             // whole-body sway: customer, girl; and the second teller's head
uniform vec3 Hd;             // teller's typing hands, the girl's thumb, the phone's glow on her
const float F = .33; const vec2 PX = vec2(1584., 672.);
// rotate a sample point about a pivot in photo pixels: sampling at -a shows the content turned by +a
vec2 rot(vec2 s, vec2 c, float a) { vec2 p = s * PX - c; float sn = sin(-a), cs = cos(-a); return (c + vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y)) / PX; }
void main() {
  // march from near to far: the first layer whose surface reaches it wins, so near things cover far ones
  vec2 sp = v - O * (1. - F), s = sp; float hp = texture2D(M, sp).r - 1.;
  for (int i = 1; i <= 12; i++) {
    float z = 1. - float(i) / 12.; vec2 sc = v - O * (z - F); float h = texture2D(M, sc).r - z;
    if (h >= 0.) { s = mix(sp, sc, hp / (hp - h)); break; }
    sp = sc; hp = h; s = sc;
  }
  vec3 m = texture2D(M, s).rgb, b3 = texture2D(N3, s).rgb;
  // weight shifts: the customer and the girl lean a hair from their feet
  s = mix(s, rot(s, vec2(897., 604.), Bd.x), b3.r);
  s = mix(s, rot(s, vec2(1352., 626.), Bd.y), b3.g);
  vec3 n = texture2D(N, s).rgb;
  // breathing: each upper body rises a hair from the waist, each on its own rhythm; the palms outside sway
  s.y += n.r * (.681 - s.y) * .012 * sin(T * 1.31 + 1.)
       + n.g * (.708 - s.y) * .011 * sin(T * 1.12)
       + n.b * (.705 - s.y) * .012 * sin(T * 1.43 + 2.);
  s.x += m.g * (.0016 * sin(T * 1.05 + v.y * 26.) + .0007 * sin(T * 2.6 + v.x * 50.));
  // heads turn and nod about the neck
  vec3 h2 = texture2D(N2, s).rgb;
  s = mix(s, rot(s, vec2(423., 382.), Ht.x) - Ht.yz / PX, h2.r);
  s = mix(s, rot(s, vec2(897., 344.), Hc.x) - Hc.yz / PX, h2.g);
  s = mix(s, rot(s, vec2(1366., 372.), Hg.x) - Hg.yz / PX, h2.b);
  // hands: the teller types, the girl scrolls; the second teller looks around; the people at the back bob, each on their own beat
  vec3 h4 = texture2D(N4, s).rgb;
  s.y -= b3.b * Hd.x / PX.y; s.y -= h4.g * Hd.y / PX.y;
  s = mix(s, rot(s, vec2(752., 358.), Bd.z), h4.b);
  float ay = s.x * PX.x < 1100. ? 466. : s.x * PX.x < 1355. ? 500. : 535.;
  s.y += h4.r * (ay / PX.y - s.y) * .014 * sin(T * 1.25 + s.x * 70.);
  vec3 c = texture2D(I, s).rgb;
  c += vec3(.55, .72, 1.) * Hd.z * smoothstep(30., 4., distance(s * PX, vec2(1398., 372.)));   // her phone lights her face
  gl_FragColor = vec4(c * mix(E, L, m.b), 1.);
}`;
export const FOCUS = .33;
const ZERO = { ht: [0, 0, 0], hc: [0, 0, 0], hg: [0, 0, 0], bd: [0, 0, 0], hd: [0, 0, 0] };
// what each person is doing at time t: small, slow, never in step with each other
const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x), pulse = (p, a, b, e) => sm((p - a) / e) * (1 - sm((p - b) / e));
export function rigs(t) {
  // the teller works at her screen and looks up at the counter now and then; she types when she is looking down
  const look = pulse((t + 3) % 9.5, 5.6, 7.5, .45), burst = sm((Math.sin(t * 1.3) + .2) / .35);
  const ht = [.07 * look + .01 * Math.sin(t * .9), 3 * look, -3.4 * look + .45 * Math.sin(t * 1.7)];
  const typing = (1 - look) * burst * (Math.sin(t * 23) * .55 + Math.sin(t * 31 + 1) * .4) * 1.1;
  // the customer talks to her: a short double nod every few seconds, and he shifts his weight
  const cp = (t + 1.3) % 5.2, nod = cp < .9 ? Math.sin(cp / .9 * Math.PI * 2) * Math.sin(cp / .9 * Math.PI) : 0;
  const hc = [-.07 * nod + .015 * Math.sin(t * .6), 0, .35 * Math.sin(t * .8)];
  // the girl reads her phone and flicks through it with her thumb
  const flick = pulse(t % 2.8, .2, .42, .08);
  const hg = [.02 * Math.sin(t * .8) - .018 * flick, 0, .6 * Math.sin(t * 1.1) + .5 * flick];
  return { ht, hc, hg, bd: [.011 * Math.sin(t * 6.2832 / 8.7), .005 * Math.sin(t * 6.2832 / 6.3 + 1), .035 * Math.sin(t * .5 + 2)], hd: [typing, -1.7 * flick, .035 + .015 * Math.sin(t * 3.1) + .035 * flick] };
}
const load = src => new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });

export async function lobbyGL(cv, src) {
  const gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('no webgl');
  const [img, map, mot, mot2, mot3, mot4] = await Promise.all([load(src.photo), load(src.map), load(src.mot), load(src.mot2), load(src.mot3), load(src.mot4)]);
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  const tex = (unit, im, raw) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, raw ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); };
  tex(0, img, false); tex(1, map, true); tex(2, mot, true); tex(3, mot2, true); tex(4, mot3, true); tex(5, mot4, true);
  const U = n => gl.getUniformLocation(pr, n);
  gl.uniform1i(U('I'), 0); gl.uniform1i(U('M'), 1); gl.uniform1i(U('N'), 2); gl.uniform1i(U('N2'), 3); gl.uniform1i(U('N3'), 4); gl.uniform1i(U('N4'), 5);
  const uO = U('O'), uT = U('T'), uE = U('E'), uL = U('L'), uHt = U('Ht'), uHc = U('Hc'), uHg = U('Hg'), uBd = U('Bd'), uHd = U('Hd');
  let lost = false;
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; cv.dispatchEvent(new Event('gl-lost')); });
  return {
    get lost() { return lost; },
    // the canvas never needs more pixels than the photo has: past ~1.25x the source it only costs
    size(cssW, cssH, q = 1) { const d = Math.min(1.5, devicePixelRatio || 1), w = Math.round(Math.min(cssW * d, 1980) * q), h = Math.round(w * cssH / cssW);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } },
    draw(o) { if (lost) return; gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uO, o.ox, o.oy); gl.uniform1f(uT, o.t); gl.uniform1f(uE, o.e); gl.uniform1f(uL, o.l);
      const r = o.r || ZERO; gl.uniform3fv(uHt, r.ht); gl.uniform3fv(uHc, r.hc); gl.uniform3fv(uHg, r.hg); gl.uniform3fv(uBd, r.bd); gl.uniform3fv(uHd, r.hd);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); },
  };
}
