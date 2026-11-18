// STOCKZ · the start screen: the branch scene, alive. The name in the middle, two buttons under it, nothing else.
// The photo runs in 2.5D (lobbygl.js): near things move more than far ones, people breathe, palms sway. Everything else that moves is
// drawn over it in the photo's own pixels: the LED ticker, the wall screens, the clock, the sunlight, the street.
// A first visit opens in the dark and the lights come on; signing in dives into the screen on the counter.
import { $, $$, esc, ICON, EMBLEM, store, sess, toast, reduced } from './core.js';
import { W, connect, signMessage } from './wallet.js';
import { lobbyGL, FOCUS } from './lobbygl.js';

const IW = 1584, IH = 672;                       // the photo's size: every overlay below is placed in these pixels
const SCREENS = [                                 // the wall monitors and the counter monitor (d = depth, matching the depth map)
  { x: 676, y: 231, w: 45, h: 53, k: 'area', hue: 150, d: .33 }, { x: 732, y: 240, w: 43, h: 105, k: 'line', hue: 330, d: .33 },
  { x: 781, y: 248, w: 34, h: 44, k: 'area', hue: 140, d: .33 }, { x: 676, y: 297, w: 45, h: 46, k: 'bars', hue: 200, d: .33 },
  { x: 781, y: 305, w: 34, h: 39, k: 'line', hue: 170, d: .33 }, { x: 655, y: 349, w: 78, h: 55, k: 'candles', hue: 0, d: .53 },
];
const TICK = { x: 646, y: 168, w: 180, h: 68, skew: .225, band: 27 };   // the LED band over the counter, drawn with its perspective slope
const CLOCK = { x: 935, y: 209, r: 21.5 };
const LED = { x: 921, y: 50 };                                          // the security camera's light
const PAN = { a: 0, b: 0, mid: 0, period: 64 };
const CAM = { ox: 0, oy: 0, dive: null };
// the opening: black, the windows glow, the ceiling lights stutter on, the ticker and the screens boot, the sign lights up
const INTRO = 3.7, EXP = [[0, 0], [.5, 0], [1, .07], [1.05, .07], [1.08, .58], [1.13, .06], [1.24, .64], [1.29, .14], [1.42, .88], [1.47, .52], [1.62, 1]];
const LIT = [[0, 0], [.3, 0], [1, .9], [1.6, 1]], T_TICK = 1.55, T_SCR = 1.72, T_SIGN = 2.05, T_BTN = 2.8;
const kf = (t, P) => { if (t <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [a, va] = P[i - 1], [b, vb] = P[i]; return va + (vb - va) * (t - a) / (b - a); } return P[P.length - 1][1]; };

export function renderHome(root, opts = {}) {
  document.title = 'STOCKZ'; CAM.dive = null;
  const play = !reduced() && !sess.get('intro') && location.hash !== '#/signin';
  root.innerHTML = `<div class="live${play ? ' pre intro' : ''}" id="live"><div class="cam" id="cam"><div class="stage" id="stage">
      <img src="/assets/img/lobby-1584.jpg" alt="" class="ph0" fetchpriority="high" draggable="false"><canvas class="gl" id="gl"></canvas>
      <canvas class="ov tk" id="tk" data-d=".33"></canvas>${SCREENS.map((s, i) => `<canvas class="ov sc${play ? ' off' : ''}" data-i="${i}" data-d="${s.d}"></canvas>`).join('')}
      <svg class="ov clk" id="clk" data-d=".44" viewBox="-24 -24 48 48"><circle r="22.6" fill="#f4f3ef" stroke="#2b2b2b" stroke-width="2.4"/>${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-18.6" x2="0" y2="${i % 3 ? -16.6 : -15.4}" stroke="#222" stroke-width="${i % 3 ? 1 : 1.8}" transform="rotate(${i * 30})"/>`).join('')}
        <line id="hh" x1="0" y1="2.5" x2="0" y2="-10.5" stroke="#1d1d1d" stroke-width="2.4" stroke-linecap="round"/><line id="mh" x1="0" y1="3" x2="0" y2="-15.5" stroke="#1d1d1d" stroke-width="1.6" stroke-linecap="round"/><line id="sh" x1="0" y1="4" x2="0" y2="-17" stroke="#d23a3a" stroke-width=".7" stroke-linecap="round"/><circle r="1.4" fill="#1d1d1d"/></svg>
      <i class="ov led" data-d=".6" style="${pct(LED.x - 1.7, LED.y - 1.7, 3.4, 3.4)}"></i>
      <div class="ov sun" style="${pct(1090, 150, 420, 330)}"><i></i><i></i><i></i><i></i></div>
      <canvas class="ov dust" id="dust" style="${pct(900, 120, 684, 552)}"></canvas>
      <canvas class="ov walk" id="walk" data-d=".06" style="${pct(1096, 330, 400, 120)}"></canvas>
    </div></div><div class="shade"></div>
    <div class="front"><h1 class="hname" aria-label="STOCKZ">${'STOCKZ'.split('').map((c, i) => `<span style="--d:${i * 70}ms">${c}</span>`).join('')}</h1>
      <div class="hbtns"><button class="btn pink lg" id="hsign">${ICON.lock} Sign in</button><button class="btn glass lg" id="hopen">Open an account</button></div></div></div>`;
  const live = $('#live', root), cam = $('#cam', root), stage = $('#stage', root), glc = $('#gl', root);
  const S = { gl: null, w: 1, h: 1, q: 1, intro: play ? Infinity : -1 };   // intro: the time it started (Infinity = waiting for the photo)
  // the photo covers the screen, framed on the wall, the counter and the screens
  const layout = () => {
    if (!document.body.contains(live)) { removeEventListener('resize', layout); return; }   // the start screen is gone: stop listening
    const vw = live.clientWidth, vh = live.clientHeight, s = Math.max(vw / IW, vh / IH) * 1.04, w = IW * s, h = IH * s;
    stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.style.left = '0px'; S.w = w; S.h = h;
    stage.style.top = Math.min(0, Math.max(vh - h, vh / 2 - h * .46)) + 'px';
    // the camera glides along the room: from the STOCKZ wall to the windows and back
    // on a phone the view is a narrow slice, so it opens on the busiest part (ticker, screens, clock, the customer) and glides to the doors
    if (vw < 700) { PAN.a = Math.max(vw - w, Math.min(0, -638 * s)); PAN.b = Math.max(vw - w, Math.min(PAN.a, -(1484 * s - vw))); }
    else { PAN.a = Math.min(0, -30 * s); PAN.b = Math.min(PAN.a, vw - w); }
    PAN.mid = (PAN.a + PAN.b) / 2; PAN.period = vw < 700 ? 80 : 64;
    for (const c of $$('canvas.ov', stage)) size(c);
    if (S.gl) S.gl.size(w, h, S.q);
  };
  S.layout = layout;
  // overlays live in photo pixels, as percentages of the stage
  const place = (el, x, y, w, h) => { el.style.cssText += pct(x, y, w, h); };
  place($('#tk', root), TICK.x, TICK.y, TICK.w, TICK.h);
  $$('canvas.sc', root).forEach(c => { const s = SCREENS[+c.dataset.i]; place(c, s.x, s.y, s.w, s.h); });
  place($('#clk', root), CLOCK.x - CLOCK.r, CLOCK.y - CLOCK.r, CLOCK.r * 2, CLOCK.r * 2);
  layout(); addEventListener('resize', layout);
  const begin = () => { if (play && S.intro === Infinity) { S.intro = performance.now(); sess.set('intro', 1); } };
  lobbyGL(glc, { photo: '/assets/img/lobby-1584.jpg', map: '/assets/img/lobby-map.png?v=1', mot: '/assets/img/lobby-mot.png?v=1' })
    .then(g => { if (!document.body.contains(glc)) return; S.gl = g; layout(); live.classList.add('gl-on'); glc.addEventListener('gl-lost', () => { S.gl = null; live.classList.remove('gl-on'); }); begin(); })
    .catch(err => { console.warn('STOCKZ lobby: flat photo (' + (err && err.message || err) + ')'); glc.remove(); live.classList.remove('intro'); begin(); S.intro = -1; finish(live); });
  // any key or tap skips the opening
  const skip = () => { if (S.intro > 0 && S.intro !== Infinity && performance.now() - S.intro < INTRO * 1000) S.intro = performance.now() - INTRO * 1000; };
  live.addEventListener('pointerdown', skip); addEventListener('keydown', skip, { once: true });
  $('#hsign', root).onclick = () => openSignIn(opts);
  $('#hopen', root).onclick = () => openAccountModal();
  if (location.hash === '#/signin') openSignIn(opts);
  animate(root, live, cam, stage, S);
}
const pct = (x, y, w, h) => `left:${x / IW * 100}%;top:${y / IH * 100}%;width:${w / IW * 100}%;height:${h / IH * 100}%;`;
function size(c) { const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.max(2, Math.round(r.width * d)), h = Math.max(2, Math.round(r.height * d)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } }
// the end of the opening: the sign is lit and the buttons are in
function finish(live) { for (const s of $$('.hname span', live)) s.classList.add('on'); live.classList.remove('pre'); $$('canvas.sc', live).forEach(c => c.classList.remove('off')); }

// ------------------------------------------------------------------ the motion
function animate(root, live, cam, stage, S) {
  const still = reduced(), tk = $('#tk', root), scr = $$('canvas.sc', root), dust = $('#dust', root), ovs = $$('[data-d]', stage).map(el => ({ el, d: +el.dataset.d }));
  const series = SCREENS.map((s, i) => { const a = []; let v = 50 + i * 7; for (let k = 0; k < 90; k++) { v += (Math.sin(k * .31 + i) * .8 + (Math.random() - .45) * 3.2); a.push(v); } return a; });
  const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: .5 + Math.random() * 1.6, v: .00004 + Math.random() * .0001, p: Math.random() * 6.28 }));
  const arrows = Array.from({ length: 40 }, (_, i) => ({ up: (i * 7919) % 5 < 3, w: 16 + ((i * 31) % 3) * 4 }));
  // people walking past outside the glass: two lanes, left and right of the woman by the kiosk; cars on the street behind them
  const LANES = [[4, 194], [318, 396]], walkers = Array.from({ length: 5 }, (_, i) => spawn(i * 2.3));
  function spawn(delay = 0) { const ln = LANES[Math.random() < .72 ? 0 : 1], dir = Math.random() < .5 ? 1 : -1;
    return { ln, dir, x: dir > 0 ? ln[0] - 30 : ln[1] + 30, v: 10 + Math.random() * 9, h: 66 + Math.random() * 22, ph: Math.random() * 6.28, wait: delay + Math.random() * 3, tone: 25 + Math.random() * 30, bag: Math.random() < .3 }; }
  const car = (wait = 4 + Math.random() * 9) => { const dir = Math.random() < .5 ? 1 : -1; return { dir, x: dir > 0 ? -110 : 300, v: 150 + Math.random() * 120, wait, tone: 30 + Math.random() * 70, len: 70 + Math.random() * 24, ht: 23 + Math.random() * 6 }; };
  let cars = [car(1.5)];
  const ign = new Set(), gaps = []; let mx = 0, my = 0, cx = 0, cy = 0, t0 = performance.now(), last = 0, shift = 0, done = S.intro < 0;
  if (done) finish(live);
  const pm = e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }; addEventListener('pointermove', pm, { passive: true });
  const frame = now => {
    if (!document.body.contains(cam)) { removeEventListener('pointermove', pm); return; }
    requestAnimationFrame(frame);
    if (document.hidden || now - last < 33) return; const dt = Math.min(.1, (now - (last || now)) / 1000);
    // a slow graphics chip gets fewer pixels: if frames keep coming late, the photo renders smaller and scales up
    if (S.gl && last && S.q > .5) { gaps.push(now - last); if (gaps.length >= 60) { const m = gaps.sort((a, b) => a - b)[30]; gaps.length = 0; if (m > 55) { S.q = Math.max(.5, S.q * .75); S.layout(); } } }
    last = now;
    const t = (now - t0) / 1000;
    // where the opening is: ti counts from when the photo was ready
    const ti = S.intro === Infinity ? 0 : S.intro < 0 ? 99 : (now - S.intro) / 1000;
    const e = kf(ti, EXP), l = kf(ti, LIT), set = Math.min(1, ti / 3.4), ease = 1 - Math.pow(1 - set, 3);
    if (!done) {
      live.style.setProperty('--e', e.toFixed(3)); live.style.setProperty('--l', l.toFixed(3));
      $$('.hname span', live).forEach((s, i) => { if (ti >= T_SIGN + [0, .28, .12, .4, .2, .33][i] && !ign.has(i)) { ign.add(i); s.classList.add('on'); } });
      if (ti >= T_BTN) live.classList.remove('pre');
      scr.forEach((c, i) => { if (ti >= T_SCR + i * .085) c.classList.remove('off'); });
      if (ti >= INTRO) { done = true; finish(live); live.style.removeProperty('--e'); live.style.removeProperty('--l'); }
    }
    // the camera: a slow drift, a glide along the room and a little parallax toward the pointer; the opening settles in from close
    if (!CAM.dive) {
      if (!still) { cx += (mx - cx) * .04; cy += (my - cy) * .04;
        const z = (1.02 + Math.sin(t / 15) * .02) * (1 + .12 * (1 - ease)), par = S.gl ? [10, 6, 3] : [22, 14, 5];
        cam.style.transform = `translate3d(${(-cx * par[0]).toFixed(2)}px,${(-cy * par[1] + Math.cos(t / 23) * par[2]).toFixed(2)}px,0) scale(${z.toFixed(4)})`;
        const k = (1 - Math.cos(t / PAN.period * 6.2832)) / 2, x = PAN.a + (PAN.b - PAN.a) * (k * k * (3 - 2 * k)); stage.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
        // depth: near things slide further than far ones as the camera glides, and lean away from the pointer
        // the photo is exact where the glide starts; the further the camera travels from there, the more the depth shows
        CAM.ox = -cx * .010 + (x - PAN.a) / Math.max(1, S.w) * .04; CAM.oy = -cy * .007 + Math.sin(t / 23) * .0016 + .008 * (1 - ease); }
      else { stage.style.transform = `translate3d(${PAN.mid}px,0,0)`; CAM.ox = CAM.oy = 0; }
    }
    if (S.gl) { S.gl.draw({ ox: CAM.ox, oy: CAM.oy, t: still ? 0 : t, e: done ? 1 : e, l: done ? 1 : l });
      for (const o of ovs) o.el.style.transform = `translate3d(${(CAM.ox * (o.d - FOCUS) * S.w).toFixed(2)}px,${(CAM.oy * (o.d - FOCUS) * S.h).toFixed(2)}px,0)`; }
    // the LED band: arrows scroll right to left; in the opening it boots from the right with a stutter
    shift += dt * 26;
    if (tk.width > 2) { const g = tk.getContext('2d'), s = tk.width / TICK.w; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, tk.width, tk.height);
      g.setTransform(s, TICK.skew * s, 0, s, 0, 0); g.fillStyle = '#07080b'; g.fillRect(-2, 0, TICK.w + 4, TICK.band);
      const rv = done ? 1 : Math.max(0, Math.min(1, (ti - T_TICK) / .55)), stut = !done && ti < T_TICK + .25 && Math.random() < .45;
      if (rv > 0 && !stut) { g.save(); g.beginPath(); g.rect(TICK.w * (1 - rv), -2, TICK.w * rv + 4, TICK.band + 4); g.clip();
        let x = -(shift % 22 * 1); for (let i = 0; x < TICK.w + 20; i++) { const a = arrows[(i + Math.floor(shift / 22)) % arrows.length]; drawArrow(g, x + 8, TICK.band / 2, a.up, t + i); x += 22; } g.restore(); }
      g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 1; y < TICK.band; y += 3) g.fillRect(0, y, TICK.w, 1); }
    // the screens: charts that keep printing; dark until they power on
    scr.forEach((c, i) => { if (c.width < 3) return; const s = SCREENS[i], a = series[i];
      if (CAM.dive && CAM.dive.c === c) return welcome(c, Math.min(1, (now - CAM.dive.t0) / 1150), CAM.dive.vis);
      const on = done ? 9 : ti - (T_SCR + i * .085);
      if (on < 0) { const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#04060c'; g.fillRect(0, 0, c.width, c.height); return; }
      if (Math.random() < .5) { let v = a[a.length - 1] + (Math.random() - .47) * 3.4; v = Math.max(15, Math.min(90, v)); a.push(v); if (a.length > 90) a.shift(); }
      chart(c, s, a, t, Math.min(1, on / .18)); });
    // the clock: the real time
    const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60;
    $('#hh', root).setAttribute('transform', `rotate(${hr * 30})`); $('#mh', root).setAttribute('transform', `rotate(${min * 6})`); $('#sh', root).setAttribute('transform', `rotate(${Math.floor(sec) * 6 + Math.min(1, (sec % 1) * 6) * 6})`);
    // the street outside: cars pass behind, people walk by the doors
    const wk = $('#walk', root);
    if (wk && wk.width > 2) { const g = wk.getContext('2d'), sx = wk.width / 400; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, wk.width, wk.height); g.setTransform(sx, 0, 0, sx, 0, 0);
      g.save(); g.beginPath(); g.rect(LANES[0][0], 0, LANES[0][1] - LANES[0][0], 120); g.clip();
      cars = cars.map(k => { if (k.wait > 0) { k.wait -= dt; return k; } k.x += k.dir * k.v * dt; if (k.x > 320 || k.x < -130) return car(); drawCar(g, k, 92, sx); return k; });
      g.restore();
      g.save(); g.beginPath(); for (const [a0, a1] of LANES) g.rect(a0, 0, a1 - a0, 120); g.clip();
      for (let i = 0; i < walkers.length; i++) { const p = walkers[i]; if (p.wait > 0) { p.wait -= dt; continue; } p.x += p.dir * p.v * dt; p.ph += dt * p.v * .5;
        if ((p.dir > 0 && p.x > p.ln[1] + 30) || (p.dir < 0 && p.x < p.ln[0] - 30)) { walkers[i] = spawn(1 + Math.random() * 4); continue; }
        person(g, p.x, 118, p.h, p.ph, p.dir, p.tone, p.bag, sx); }
      g.restore(); }
    // dust in the sunlight
    if (dust.width > 2) { const g = dust.getContext('2d'), w = dust.width, h = dust.height; g.clearRect(0, 0, w, h);
      for (const m of motes) { m.y -= m.v * 18; m.x += Math.sin(t * .4 + m.p) * .00012; if (m.y < 0) { m.y = 1; m.x = Math.random(); }
        const a = (.25 + .35 * Math.sin(t * 1.3 + m.p)) * Math.min(1, m.x * 2.2); if (a <= 0) continue; g.fillStyle = `rgba(255,246,220,${a.toFixed(3)})`; g.beginPath(); g.arc(m.x * w, m.y * h, m.r * (w / 600), 0, 6.283); g.fill(); } }
  };
  requestAnimationFrame(frame);
}
function drawCar(g, k, base, sx = 1) {
  const c = `rgba(${k.tone | 0},${k.tone | 0},${(k.tone + 14) | 0},.55)`, L = k.len, H = k.ht, x = k.x;
  g.filter = `blur(${(2.2 * sx).toFixed(1)}px)`; g.fillStyle = c;
  g.beginPath(); g.roundRect(x, base - H * .62, L, H * .5, H * .16); g.fill();                                        // the body
  g.beginPath(); g.moveTo(x + L * .2, base - H * .6); g.lineTo(x + L * .32, base - H); g.lineTo(x + L * .7, base - H); g.lineTo(x + L * .84, base - H * .6); g.closePath(); g.fill();   // the cabin
  g.fillStyle = `rgba(20,20,26,.6)`; for (const w of [.2, .8]) { g.beginPath(); g.arc(x + L * w, base - H * .12, H * .17, 0, 6.283); g.fill(); }   // wheels
  g.filter = 'none';
}
function person(g, x, foot, h, ph, dir, tone, bag, sx = 1) {
  const c = `rgba(${tone},${tone},${tone + 12},.46)`, sw = Math.sin(ph), bob = Math.abs(Math.cos(ph)) * h * .012, hip = foot - h * .47 - bob, sh = foot - h * .80 - bob, hd = h * .075;
  g.filter = `blur(${(2.3 * sx).toFixed(1)}px)`; g.strokeStyle = c; g.fillStyle = c; g.lineCap = 'round';
  g.lineWidth = h * .088; for (const k of [1, -1]) { g.beginPath(); g.moveTo(x, hip); g.lineTo(x + k * sw * h * .13, foot - h * .02); g.stroke(); }
  g.lineWidth = h * .066; for (const k of [1, -1]) { g.beginPath(); g.moveTo(x, sh + h * .03); g.lineTo(x - k * sw * h * .1, hip - h * .02); g.stroke(); }
  g.beginPath(); g.ellipse(x, (hip + sh) / 2, h * .108, (hip - sh) / 2 + h * .035, 0, 0, 6.283); g.fill();
  g.beginPath(); g.arc(x + dir * h * .01, sh - hd * 1.25, hd, 0, 6.283); g.fill();
  if (bag) { g.fillRect(x - dir * h * .13, hip - h * .1, h * .07, h * .12); }
  g.filter = 'none';
}
function drawArrow(g, x, y, up, ph) {
  const c = up ? '#2dff8a' : '#ff3b5c'; g.save(); g.translate(x, y); g.shadowColor = c; g.shadowBlur = 6; g.fillStyle = c; g.beginPath();
  if (up) { g.moveTo(0, -9); g.lineTo(6.5, -1.5); g.lineTo(2.4, -1.5); g.lineTo(2.4, 9); g.lineTo(-2.4, 9); g.lineTo(-2.4, -1.5); g.lineTo(-6.5, -1.5); }
  else { g.moveTo(0, 9); g.lineTo(6.5, 1.5); g.lineTo(2.4, 1.5); g.lineTo(2.4, -9); g.lineTo(-2.4, -9); g.lineTo(-2.4, 1.5); g.lineTo(-6.5, 1.5); }
  g.closePath(); g.globalAlpha = .82 + .18 * Math.sin(ph * 3); g.fill(); g.restore();
}
function chart(c, s, a, t, boot = 1) {
  const g = c.getContext('2d'), w = c.width, h = c.height; g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0c1736'); bg.addColorStop(1, '#070d22'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,160,255,.13)'; g.lineWidth = Math.max(1, w / 120); for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(0, h * k / 4); g.lineTo(w, h * k / 4); g.stroke(); }
  const n = s.k === 'candles' ? 30 : 60, L = a.slice(-n), lo = Math.min(...L) - 4, hi = Math.max(...L) + 4, X = i => i / (n - 1) * w, Y = v => h - (v - lo) / (hi - lo) * h * .82 - h * .09;
  if (s.k === 'candles' || s.k === 'bars') {
    const bw = w / n * .62;
    for (let i = 1; i < L.length; i++) { const o = L[i - 1], cl = L[i], up = cl >= o, x = X(i) - bw / 2;
      if (s.k === 'bars') { const bh = (cl - lo) / (hi - lo) * h * .8; g.fillStyle = `hsla(${s.hue + i * 2},90%,60%,.9)`; g.fillRect(x, h - bh, bw, bh); continue; }
      g.fillStyle = up ? '#2ee6a6' : '#ff4f6e'; g.fillRect(x, Math.min(Y(o), Y(cl)), bw, Math.max(1, Math.abs(Y(o) - Y(cl)))); g.fillRect(x + bw / 2 - .6, Math.min(Y(o), Y(cl)) - 2, 1.2, Math.abs(Y(o) - Y(cl)) + 4); }
  } else {
    const col = `hsl(${s.hue},85%,60%)`;
    if (s.k === 'area') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `hsla(${s.hue},85%,55%,.55)`); gr.addColorStop(1, `hsla(${s.hue},85%,55%,0)`);
      g.beginPath(); L.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = gr; g.fill(); }
    g.beginPath(); L.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.strokeStyle = col; g.lineWidth = Math.max(1.2, w / 60); g.shadowColor = col; g.shadowBlur = 4; g.stroke(); g.shadowBlur = 0;
    g.fillStyle = col; g.beginPath(); g.arc(X(L.length - 1), Y(L[L.length - 1]), Math.max(1.5, w / 50) * (1 + .3 * Math.sin(t * 6)), 0, 6.283); g.fill();
  }
  const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
  if (boot < 1) { g.fillStyle = `rgba(170,200,255,${((1 - boot) * .55).toFixed(3)})`; g.fillRect(0, 0, w, h); }
}

// ------------------------------------------------------------------ sign in, in a bank-style box
let pick = null;
export function openSignIn(opts = {}) {
  const v = document.createElement('div'); v.className = 'veil';
  v.innerHTML = `<form class="modal signin" id="signin" autocomplete="off" role="dialog" aria-modal="true" aria-label="Sign in"><header><span class="logo">${EMBLEM}<b class="wm">STOCKZ</b></span><button type="button" class="x" data-c aria-label="Close">${ICON.close}</button></header>
    <div class="body"><h2>Sign in to STOCKZ Online</h2><p class="sub">Your wallet is your account. No password, ever.</p>
      <div class="wlist" id="wlist"></div>
      <div class="row"><label class="chk"><input type="checkbox" id="remember" ${store.get('remember') ? 'checked' : ''}> Remember my wallet</label><a href="#/app/security" data-c>Security</a></div>
      <button class="btn pri wide lg" id="go" type="submit">${ICON.lock} Sign in</button>
      <div class="lk"><a href="#" id="op">Open an account</a><a href="#/app/help" data-c>How does this work?</a><a href="#/app/overview" data-c>Browse as a guest</a></div>
      <div class="sec">${ICON.shield}<span>Signing in asks your wallet to sign a message. It costs nothing, moves nothing and gives STOCKZ no access to your funds.</span></div></div></form>`;
  const close = () => { v.remove(); if (location.hash === '#/signin') history.replaceState(null, '', '#/'); };
  v.addEventListener('click', e => { if (e.target === v || e.target.closest('[data-c]')) close(); });
  document.body.appendChild(v);
  $('#op', v).onclick = e => { e.preventDefault(); close(); openAccountModal(); };
  const list = $('#wlist', v), btn = $('#go', v);
  const draw = () => {
    if (!document.body.contains(v)) return;
    if (!W.list.length) { list.innerHTML = `<div class="note w">${ICON.wallet}<span>No Solana wallet found in this browser. Install <a href="https://phantom.com" target="_blank" rel="noopener">Phantom</a>, <a href="https://solflare.com" target="_blank" rel="noopener">Solflare</a> or <a href="https://backpack.app" target="_blank" rel="noopener">Backpack</a>, then reload.</span></div>`; btn.disabled = true; return; }
    if (!pick || !W.list.find(w => w.name === pick)) pick = (store.get('remember') && W.list.find(w => w.name === store.get('remember'))) ? store.get('remember') : W.list[0].name;
    list.innerHTML = W.list.map(w => `<button type="button" class="wopt${w.name === pick ? ' on' : ''}" data-w="${esc(w.name)}">${w.icon ? `<img src="${w.icon}" alt="">` : `<span class="wi">${ICON.wallet}</span>`}<b>${esc(w.name)}</b><small>${w.name === pick ? 'Selected' : 'Detected'}</small></button>`).join('');
    btn.disabled = false; $$('.wopt', list).forEach(b => b.addEventListener('click', () => { pick = b.dataset.w; draw(); }));
  };
  draw(); setTimeout(draw, 600); setTimeout(draw, 1800);
  import('./core.js').then(({ on }) => on('wallets', draw));
  $('#signin', v).addEventListener('submit', async e => {
    e.preventDefault(); if (!pick) return;
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Waiting for your wallet';
    try {
      const addr = await connect(pick);
      const nonce = Math.random().toString(36).slice(2, 10).toUpperCase(), at = new Date().toISOString();
      btn.innerHTML = '<span class="spin"></span> Sign the message in your wallet';
      let signed = false;
      try { signed = !!(await signMessage(`STOCKZ Online\nSign in to your account.\n\nWallet: ${addr}\nTime: ${at}\nCode: ${nonce}\n\nThis is a sign-in only. It costs nothing and moves nothing.`)); }
      catch (err) { if (/reject|denied|cancel/i.test(err.message || '')) throw new Error('Sign-in cancelled in your wallet.'); }
      if ($('#remember', v).checked) store.set('remember', pick); else store.del('remember');
      const last = store.get('last:' + addr); store.set('last:' + addr, Date.now());
      v.remove(); opts.onSignedIn && opts.onSignedIn({ address: addr, wallet: pick, at: Date.now(), signed, last });
    } catch (err) { toast(esc(err.message || 'Sign-in failed'), 'err'); btn.disabled = false; btn.innerHTML = `${ICON.lock} Sign in`; }
  });
}

export function openAccountModal() {
  const v = document.createElement('div'); v.className = 'veil';
  v.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Open an account"><header><h3>Open a STOCKZ account</h3><button class="x" aria-label="Close">${ICON.close}</button></header>
    <div class="body"><p style="margin-top:0">Your STOCKZ account is a Solana wallet. There is no form and no password: your wallet signs you in.</p>
      <div class="steps"><div class="step"><div><h4>Get a wallet</h4><p><a href="https://phantom.com" target="_blank" rel="noopener">Phantom</a>, <a href="https://solflare.com" target="_blank" rel="noopener">Solflare</a> or <a href="https://backpack.app" target="_blank" rel="noopener">Backpack</a> on desktop or mobile.</p></div></div>
      <div class="step"><div><h4>Add SOL</h4><p>Buy SOL in your wallet or send some from an exchange. A little SOL pays the network fees.</p></div></div>
      <div class="step"><div><h4>Sign in</h4><p>Come back here, press Sign in and pick your wallet. Your balances show up like a bank account.</p></div></div></div></div>
    <footer><button class="btn pri" data-k>Sign in now</button></footer></div>`;
  const close = () => v.remove();
  v.addEventListener('click', e => { if (e.target === v || e.target.closest('.x')) close(); if (e.target.closest('[data-k]')) { close(); $('#hsign') && $('#hsign').click(); } });
  document.body.appendChild(v);
}

// ------------------------------------------------------------------ signing in: the camera dives into the screen on the counter
export function dive() {
  const live = $('#live'), c = live && $('canvas.sc[data-i="5"]', live);
  if (!live || !c || reduced()) return Promise.resolve();
  const r = c.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
  if (r.width < 4) return Promise.resolve();
  const S = Math.min(60, Math.max(vw / r.width, vh / r.height) * 1.1), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dpr = Math.min(2, devicePixelRatio || 1);
  // give the screen enough pixels to land sharp at full size
  c.width = Math.min(2400, Math.round(r.width * S * dpr)); c.height = Math.round(c.width * r.height / r.width);
  CAM.dive = { c, t0: performance.now(), vis: [Math.min(1, vw / (r.width * S)), Math.min(1, vh / (r.height * S))] };
  live.classList.add('diving'); live.style.transformOrigin = `${cx}px ${cy}px`;
  live.animate([{ transform: 'translate3d(0,0,0) scale(1)' }, { transform: `translate3d(${vw / 2 - cx}px,${vh / 2 - cy}px,0) scale(${S})` }], { duration: 1200, easing: 'cubic-bezier(.72,0,.22,1)', fill: 'forwards' });
  const veil = document.createElement('div'); veil.className = 'dvf'; document.body.appendChild(veil);
  return new Promise(ok => {
    setTimeout(() => veil.classList.add('on'), 1080);
    setTimeout(() => { ok(); setTimeout(() => { veil.classList.remove('on'); setTimeout(() => veil.remove(), 600); }, 260); }, 1380);
  });
}
// what the counter screen shows as the camera arrives: the STOCKZ welcome, sized to the part of the screen that will fill the view
function welcome(c, k, vis) {
  const g = c.getContext('2d'), w = c.width, h = c.height; g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0b1636'); bg.addColorStop(1, '#060b1d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const vw = w * vis[0], vh = h * vis[1], u = Math.min(vw, vh * 1.6) / 100, cx = w / 2, cy = h / 2;
  g.globalAlpha = Math.min(1, k * 1.6);
  const s = u * 11, ex = cx - u * 22, ey = cy - u * 9;                       // the emblem: a pink tile with the rising line
  g.fillStyle = '#e8247a'; g.beginPath(); g.roundRect(ex - s / 2, ey - s / 2, s, s, s * .24); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = s * .1; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  g.moveTo(ex - s * .3, ey + s * .16); g.lineTo(ex - s * .08, ey - s * .04); g.lineTo(ex + s * .06, ey + s * .08); g.lineTo(ex + s * .3, ey - s * .18); g.stroke();
  g.fillStyle = '#fff'; g.font = `italic 900 ${(u * 12).toFixed(1)}px Jost, Inter, sans-serif`; g.textBaseline = 'middle'; g.fillText('STOCKZ', ex + s * .75, ey + u * .6);
  g.fillStyle = '#b9c3dd'; g.font = `500 ${(u * 4.1).toFixed(1)}px Inter, sans-serif`; g.textAlign = 'center'; g.fillText('Opening your accounts', cx, cy + u * 6.5); g.textAlign = 'left';
  const bw = u * 46, bx = cx - bw / 2, by = cy + u * 13; g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(bx, by, bw, u * 1.3, u * .65); g.fill();
  g.fillStyle = '#e8247a'; g.beginPath(); g.roundRect(bx, by, bw * Math.min(1, .15 + k * .9), u * 1.3, u * .65); g.fill();
  g.globalAlpha = 1;
}
