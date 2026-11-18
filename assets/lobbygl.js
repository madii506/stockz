// STOCKZ · the lobby photo in 2.5D. A hand-drawn depth map moves near things more than far ones as the camera glides,
// soft masks let the teller, the customer and the girl breathe, the palms outside sway, and the lights can come on one by one.
const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
varying vec2 v; uniform sampler2D I, M, N; uniform vec2 O; uniform float T, E, L;
const float F = .33;
void main() {
  // march from near to far: the first layer whose surface reaches it wins, so near things cover far ones
  vec2 sp = v - O * (1. - F), s = sp; float hp = texture2D(M, sp).r - 1.;
  for (int i = 1; i <= 12; i++) {
    float z = 1. - float(i) / 12.; vec2 sc = v - O * (z - F); float h = texture2D(M, sc).r - z;
    if (h >= 0.) { s = mix(sp, sc, hp / (hp - h)); break; }
    sp = sc; hp = h; s = sc;
  }
  vec3 m = texture2D(M, s).rgb, n = texture2D(N, s).rgb;
  // breathing: each upper body rises a hair from the waist, each on its own rhythm; the palms outside sway
  s.y += n.r * (.681 - s.y) * .012 * sin(T * 1.31 + 1.)
       + n.g * (.708 - s.y) * .011 * sin(T * 1.12)
       + n.b * (.705 - s.y) * .012 * sin(T * 1.43 + 2.);
  s.x += m.g * (.0016 * sin(T * 1.05 + v.y * 26.) + .0007 * sin(T * 2.6 + v.x * 50.));
  vec3 c = texture2D(I, s).rgb;
  gl_FragColor = vec4(c * mix(E, L, m.b), 1.);
}`;
export const FOCUS = .33;
const load = src => new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });

export async function lobbyGL(cv, src) {
  const gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('no webgl');
  const [img, map, mot] = await Promise.all([load(src.photo), load(src.map), load(src.mot)]);
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
  tex(0, img, false); tex(1, map, true); tex(2, mot, true);
  const U = n => gl.getUniformLocation(pr, n);
  gl.uniform1i(U('I'), 0); gl.uniform1i(U('M'), 1); gl.uniform1i(U('N'), 2);
  const uO = U('O'), uT = U('T'), uE = U('E'), uL = U('L');
  let lost = false;
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; cv.dispatchEvent(new Event('gl-lost')); });
  return {
    get lost() { return lost; },
    // the canvas never needs more pixels than the photo has: past ~1.25x the source it only costs
    size(cssW, cssH, q = 1) { const d = Math.min(1.5, devicePixelRatio || 1), w = Math.round(Math.min(cssW * d, 1980) * q), h = Math.round(w * cssH / cssW);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } },
    draw(o) { if (lost) return; gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uO, o.ox, o.oy); gl.uniform1f(uT, o.t); gl.uniform1f(uE, o.e); gl.uniform1f(uL, o.l); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); },
  };
}
