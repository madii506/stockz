// STOCKZ · charts drawn on canvas: an area chart with a crosshair, and sparklines
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function fit(cv) {
  const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
  if (cv.width !== w * d || cv.height !== h * d) { cv.width = w * d; cv.height = h * d; }
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { g, w, h };
}
export function spark(cv, ys, color) {
  if (!cv || !ys || ys.length < 2) return;
  const { g, w, h } = fit(cv), lo = Math.min(...ys), hi = Math.max(...ys), sp = hi - lo || 1, up = ys[ys.length - 1] >= ys[0];
  g.clearRect(0, 0, w, h); g.beginPath();
  ys.forEach((y, i) => { const X = i / (ys.length - 1) * (w - 2) + 1, Y = h - 3 - (y - lo) / sp * (h - 6); i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
  g.strokeStyle = color || (up ? css('--up') : css('--dn')); g.lineWidth = color ? 2 : 1.6; g.lineJoin = 'round'; g.stroke();
}
// axis prices: tiny coin prices use the subscript form (0.0\u20852363 = 0.000002363) so they fit the axis
const SUBS = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
const fmt = v => v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1 ? v.toFixed(2) : v >= .001 || v <= 0 ? (+v.toPrecision(3)).toString()
  : (() => { const z = -Math.floor(Math.log10(v)) - 1, sig = (v * 10 ** (z + 1)).toFixed(2).replace('.', '').replace(/0+$/, ''); return '0.0' + String(z).split('').map(d => SUBS[+d]).join('') + sig; })();
// area chart of candle closes; returns a redraw function for resizes
export function area(cv, data, opt = {}) {
  if (!cv) return () => {};
  const draw = (hx = null) => {
    const { g, w, h } = fit(cv); g.clearRect(0, 0, w, h);
    if (!data || data.length < 2) return;
    const ys = opt.mode === 'candles' && data[0].h != null ? data.flatMap(d => [d.h, d.l]) : data.map(d => d.c), lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * .08 || hi * .01 || 1, L = lo - pad, H = hi + pad;
    const left = 8, right = 62, top = 10, bot = 24, W2 = w - left - right, H2 = h - top - bot;
    const X = i => left + i / (data.length - 1) * W2, Y = v => top + (1 - (v - L) / (H - L)) * H2;
    const up = data[data.length - 1].c >= data[0].c, col = up ? css('--up') : css('--dn');
    g.font = '11px Inter, sans-serif'; g.fillStyle = css('--mut'); g.strokeStyle = css('--line'); g.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const v = L + (H - L) * k / 4, y = Y(v); g.beginPath(); g.moveTo(left, y); g.lineTo(left + W2, y); g.stroke(); g.fillText('$' + fmt(v), left + W2 + 8, y + 4); }
    const n = Math.max(1, Math.min(5, data.length - 1, Math.floor(W2 / 95)));
    for (let k = 0; k <= n; k++) { const i = Math.round(k / n * (data.length - 1)), d = new Date(data[i].t);
      const s = opt.long ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric' });
      g.fillText(s, Math.min(Math.max(X(i) - 20, left), left + W2 - 40), h - 6); }
    if (opt.vol && data[0].v != null) {   // volume bars along the bottom fifth
      const vmax = Math.max(...data.map(d => d.v || 0)) || 1, bw = Math.max(1, W2 / data.length * .7);
      data.forEach((d, i) => { const vh = (d.v || 0) / vmax * H2 * .18; g.fillStyle = d.c >= d.o ? 'rgba(11,138,73,.22)' : 'rgba(196,43,59,.22)'; g.fillRect(X(i) - bw / 2, top + H2 - vh, bw, vh); });
    }
    if (opt.mode === 'candles' && data[0].o != null) {
      const ys2 = data.flatMap(d => [d.h, d.l]), lo2 = Math.min(...ys2), hi2 = Math.max(...ys2);
      if (lo2 < L || hi2 > H) { /* wicks can poke past the close range: let them */ }
      const bw = Math.max(1.5, W2 / data.length * .66);
      data.forEach((d, i) => { const u = d.c >= d.o, cc = u ? css('--up') : css('--dn'); g.strokeStyle = cc; g.fillStyle = cc; g.lineWidth = 1;
        g.beginPath(); g.moveTo(X(i), Math.max(top, Y(d.h))); g.lineTo(X(i), Math.min(top + H2, Y(d.l))); g.stroke();
        const y0 = Y(Math.max(d.o, d.c)), y1 = Y(Math.min(d.o, d.c)); g.fillRect(X(i) - bw / 2, y0, bw, Math.max(1, y1 - y0)); });
    } else {
      const gr = g.createLinearGradient(0, top, 0, top + H2); gr.addColorStop(0, up ? 'rgba(11,138,73,.18)' : 'rgba(196,43,59,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.beginPath(); data.forEach((d, i) => i ? g.lineTo(X(i), Y(d.c)) : g.moveTo(X(i), Y(d.c))); g.lineTo(X(data.length - 1), top + H2); g.lineTo(X(0), top + H2); g.closePath(); g.fillStyle = gr; g.fill();
      g.beginPath(); data.forEach((d, i) => i ? g.lineTo(X(i), Y(d.c)) : g.moveTo(X(i), Y(d.c))); g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
    }
    if (hx != null) {
      const i = Math.max(0, Math.min(data.length - 1, Math.round((hx - left) / W2 * (data.length - 1)))), d = data[i], x = X(i), y = Y(d.c);
      g.strokeStyle = css('--line2'); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + H2); g.stroke(); g.setLineDash([]);
      g.fillStyle = col; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
      const lab = '$' + fmt(d.c) + '  ' + new Date(d.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      g.font = '600 12px Inter, sans-serif'; const tw = g.measureText(lab).width + 16, bx = Math.min(Math.max(x - tw / 2, left), left + W2 - tw);
      g.fillStyle = '#0a1f44'; g.beginPath(); g.roundRect(bx, top, tw, 24, 6); g.fill(); g.fillStyle = '#fff'; g.fillText(lab, bx + 8, top + 16);
    }
  };
  draw();
  cv.onmousemove = e => { const r = cv.getBoundingClientRect(); draw(e.clientX - r.left); };
  cv.onmouseleave = () => draw();
  return draw;
}

// several series on one chart, each rebased to 0% at the start
export const PALETTE = ['#e8247a', '#1d4290', '#0b8a49', '#f08c00', '#7048e8'];
export function compare(cv, list) {
  if (!cv) return () => {};
  const draw = () => {
    const { g, w, h } = fit(cv); g.clearRect(0, 0, w, h);
    const S = list.filter(l => l.data.length > 2).map(l => ({ ...l, pts: l.data.map(d => ({ t: d.t, v: (d.c / l.data[0].c - 1) * 100 })) })); if (!S.length) return;
    const t0 = Math.min(...S.map(l => l.pts[0].t)), t1 = Math.max(...S.map(l => l.pts[l.pts.length - 1].t)), vs = S.flatMap(l => l.pts.map(p => p.v)), lo = Math.min(...vs, 0), hi = Math.max(...vs, 0), pad = (hi - lo) * .08 || 1;
    const left = 8, right = 54, top = 10, bot = 24, W2 = w - left - right, H2 = h - top - bot, X = t => left + (t - t0) / (t1 - t0 || 1) * W2, Y = v => top + (1 - (v - lo + pad) / (hi - lo + 2 * pad)) * H2;
    g.font = '11px Inter, sans-serif'; g.fillStyle = css('--mut'); g.strokeStyle = css('--line'); g.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const v = lo - pad + (hi - lo + 2 * pad) * k / 4, y = Y(v); g.beginPath(); g.moveTo(left, y); g.lineTo(left + W2, y); g.stroke(); g.fillText((v > 0 ? '+' : '') + v.toFixed(1) + '%', left + W2 + 6, y + 4); }
    g.strokeStyle = css('--line2'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(left, Y(0)); g.lineTo(left + W2, Y(0)); g.stroke(); g.setLineDash([]);
    S.forEach(l => { g.beginPath(); l.pts.forEach((p, i) => i ? g.lineTo(X(p.t), Y(p.v)) : g.moveTo(X(p.t), Y(p.v))); g.strokeStyle = l.color; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke(); });
    const n = Math.max(1, Math.min(5, Math.floor(W2 / 95)));
    for (let k = 0; k <= n; k++) { const t = t0 + (t1 - t0) * k / n; g.fillStyle = css('--mut'); g.fillText(new Date(t).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), Math.min(Math.max(X(t) - 20, left), left + W2 - 44), h - 6); }
  };
  draw(); return draw;
}
