// STOCKZ · Accounts: overview, portfolio, activity and statements, all read from the chain
import { $, $$, esc, usd, pct, tone, num, short, mask, ICON, BASKET, SOL, store, gtaLeft, when, ago, solscan, toast, nyse, CONFIG } from './core.js';
import { tokens, price, chg24, history, candles, gtaIndex, txDetail } from './net.js';
import { area, spark } from './chart.js';
import { ALL } from './core.js';

const COLORS = { sol: '#3d6cf0', cash: '#0bb36a', stocks: '#e8247a', other: '#8a93a6' };
// numbers that count up to their value, like a banking app opening
export function countUp(el, v) { if (!el) return; if (v == null || !isFinite(v)) { el.textContent = usd(v); return; } const from = +el.dataset.v || 0; el.dataset.v = v; const t0 = performance.now(), d = 900;
  const step = n => { const k = Math.min(1, (n - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = usd(from + (v - from) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); setTimeout(() => { el.textContent = usd(v); }, d + 200); }
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
export const receipts = a => store.get('receipts:' + a, []);
export function addReceipt(a, r) { const l = receipts(a); l.unshift({ t: Date.now(), ...r }); store.set('receipts:' + a, l.slice(0, 200)); }
const tic = (r) => `<span class="tic">${r.icon ? `<img src="${esc(r.icon)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${esc((r.sym || '').slice(0, 4))}'}))">` : `<span class="ph">${esc((r.sym || '?').slice(0, 4))}</span>`}<span><b>${esc(r.name)}</b><small>${esc(r.sym)}</small></span></span>`;

function hoursRows() {
  const now = new Date(), ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })), off = now - ny, at = (h, m) => { const d = new Date(ny); d.setHours(h, m, 0, 0); return new Date(+d + off); };
  const t = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), m = ny.getHours() * 60 + ny.getMinutes(), wk = ny.getDay() > 0 && ny.getDay() < 6;
  return [['Pre-market', 240, 570, at(4, 0), at(9, 30)], ['Regular session', 570, 960, at(9, 30), at(16, 0)], ['After hours', 960, 1200, at(16, 0), at(20, 0)]].map(([n, a, b, x, y]) => `<span class="${wk && m >= a && m < b ? 'on' : ''}">${n}</span><span class="num ${wk && m >= a && m < b ? 'on' : ''}">${t(x)} – ${t(y)}</span>`).join('') + `<span class="mut">Your time zone</span><span class="mut">${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || '')}</span>`;
}
function todo(a) {
  const H = store.get('lasthold:' + a), rc = store.get('receipts:' + a, []), al = store.get('alerts', []);
  const steps = [['Fund your account', !!(H && H.total > 1), '#/app/transfer/request', 'Add SOL or USDC to your wallet'], ['Buy your first GTA stock', rc.some(r => r.kind === 'Bought'), '#/app/trade/TTWO', 'Take-Two is the publisher of GTA VI'],
    ['Set a price alert', al.length > 0, '#/app/watch', 'Get told when a stock crosses a price'], ['Launch a coin priced in a stock', rc.some(r => r.kind === 'Launched'), '#/app/launch', 'Your coin, paired with TTWO'], ['Post an OTC offer', !!store.get('otc:posted:' + a), '#/app/otc/new', 'Swap a bag wallet to wallet']];
  const done = steps.filter(x => x[1]).length; if (done === steps.length) return '';
  return `<div class="panel" id="todo"><header><h2>Get started</h2><span class="pill p">${done} of ${steps.length} done</span></header><div class="pad"><div class="todo">${steps.map(([t, d, h, sub]) => `<a href="${h}" class="${d ? 'done' : ''}"><i>${d ? ICON.check : ''}</i><span><b>${t}</b><small class="mut" style="display:block">${sub}</small></span></a>`).join('')}</div></div></div>`;
}
function rail() {
  const g = gtaLeft();
  return `<div class="gtacard"><h3>GTA VI</h3><div class="t" id="gtaT">${g.out ? 'Out now' : esc(g.text)}</div><div style="color:#c9d4ea;font-size:13px;margin-top:4px"><span id="gtaS">${g.out ? 'Released November 19, 2026 \u00b7 day ' + g.day : 'until release on November 19'}</span></div></div>
    <div class="panel"><header><h2>GTA VI Index</h2><span class="num" id="gxi" style="font-weight:750">\u2014</span></header><div class="chartbox" style="height:150px;padding:6px 8px"><canvas id="gxc"></canvas><div class="empty" id="gxe">Building the index\u2026</div></div>
      <div class="pad sm mut" style="padding-top:0">The five GTA VI stocks, equal weight, rebased to 100 a week ago. <span id="gxd"></span></div></div>
    <div class="panel"><header><h2>Market hours</h2><span class="pill ${nyse().open ? 'g' : ''}"><span class="dot"></span>${esc(nyse().label)}</span></header><div class="pad"><div class="hours">${hoursRows()}</div><p class="xs mut" style="margin:10px 0 0">The tokens trade around the clock. The shares behind them trade in New York, so prices can drift while Wall Street is closed.</p></div></div>
    <div class="panel"><header><h2>Market today</h2><a class="sm" href="#/app/markets">All markets</a></header><div class="list" id="mt">${BASKET.map(s => `<a class="it" href="#/app/trade/${s.sym}" style="color:inherit;text-decoration:none" data-m="${s.mint}"><span class="tic">${s.logo ? `<img src="${s.logo}" alt="">` : `<span class="ph" data-mint="${s.mint}">${s.sym}</span>`}<span><b>${s.sym}</b><small>${esc(s.name)}</small></span></span><span style="text-align:right"><b class="num px" data-live-px="${s.mint}">—</b><small class="num ch" style="display:block">—</small></span></a>`).join('')}</div></div>`;
}
async function fillIndex(main) {
  try { const S = await gtaIndex(BASKET.map(s => s.mint)); if (S.length < 2) throw 0; const last = S[S.length - 1].c, e = $('#gxi', main); if (!e) return;
    e.textContent = last.toFixed(2); e.className = 'num ' + tone(last - 100); $('#gxe', main).hidden = true; area($('#gxc', main), S);
    const meta = await tokens(BASKET.map(s => s.mint)), d = BASKET.map(s => chg24(meta[s.mint])).filter(v => v != null), avg = d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
    const rel = new Date(CONFIG.gta).getTime(), at = S.find(x => x.t >= rel);
    if (Date.now() > rel && at && last) { const ch = (last / at.c - 1) * 100, el = $('#gtaS', main); if (el) el.innerHTML = `Day ${gtaLeft().day} \u00b7 the five GTA VI stocks are <b class="${tone(ch)}" style="color:${ch >= 0 ? '#53f0b0' : '#ff8fa3'}">${pct(ch)}</b> since launch`;
      insight(main, 0, 'clock', `<b>GTA VI is out.</b> Since launch the five GTA VI stocks are <span class="${tone(ch)}">${pct(ch)}</span>, equal weight.`, '#/app/markets', 'See the basket'); }
    insight(main, 3, 'coins', `<b>The GTA VI Index is <span class="${tone(last - 100)}">${pct(last - 100)}</span> this week.</b> Five stocks, equal weight, rebased to 100 seven days ago.`, '#/app/markets', 'Compare them');
    $('#gxd', main).innerHTML = avg != null ? `Today: <b class="${tone(avg)}">${pct(avg)}</b> \u00b7 week: <b class="${tone(last - 100)}">${pct(last - 100)}</b>` : ''; }
  catch { const e = $('#gxe', main); if (e) e.textContent = 'The index needs chart data, which is unavailable right now.'; }
}
async function fillMarket(main) {
  fillIndex(main);
  const meta = await tokens(BASKET.map(s => s.mint));
  for (const a of $$('#mt [data-m]', main)) { const t = meta[a.dataset.m]; if (!t) continue; $('.px', a).textContent = usd(price(t)); const c = $('.ch', a); c.textContent = pct(chg24(t)); c.className = 'num ch ' + tone(chg24(t)); }
}

export async function overview(main, ctx) {
  const S = ctx.S;
  if (!S) {
    main.innerHTML = `<div class="ph1"><div><h1>Welcome to STOCKZ Online</h1><p>You are browsing as a guest.</p></div></div>
      <div class="cols"><div class="stack">${ctx.guestPanel('see your accounts')}
        <div class="panel"><header><h2>What you can do here</h2></header><div class="pad"><div class="qa">${[['trade', 'chart', 'Trade GTA stocks'], ['launch', 'rocket', 'Launch a coin'], ['otc', 'desk', 'OTC desk'], ['markets', 'coins', 'Markets']].map(([p, i, t]) => `<a href="#/app/${p}"><i>${ICON[i]}</i>${t}</a>`).join('')}</div></div></div></div>
      <div class="stack">${rail()}</div></div>`;
    fillMarket(main); return;
  }
  main.innerHTML = `<div class="ph1"><div><h1>${hello()}</h1><p>${S.demo ? 'Demo account · sample balances at live prices' : `Account ${esc(mask(S.address))} · ${S.last ? 'Last sign-in ' + esc(when(S.last)) : 'Welcome to your first sign-in'}`}</p></div>
      <div class="statusrow"><button class="btn ghost sm" id="rf">Refresh</button><a class="btn pink sm" href="#/app/trade/TTWO">${ICON.chart} Buy TTWO</a></div></div>
    <div class="accts" id="accts">${['Checking · SOL', 'Cash · USD stablecoins', 'Investments · GTA stocks', 'Other tokens'].map(k => `<div class="acct"><div class="k"><span>${k}</span><span>${S.demo ? 'Demo' : esc(mask(S.address))}</span></div><div class="v skel">$0,000.00</div><div class="s skel">loading</div></div>`).join('')}</div>
    <div class="cols" style="margin-top:20px"><div class="stack">
      <div class="panel hero3"><header><h2>Total balance</h2><span class="sm" id="asof"></span></header>
        <div class="net"><div><div class="sm">Net worth</div><div class="big" id="nw">\u2014</div></div><div><div class="sm">Change today</div><div class="num" style="font-size:20px;font-weight:700" id="day">\u2014</div></div><canvas id="hs" class="hspark"></canvas></div>
        <div class="alloc" id="alloc"></div><div class="legend" id="leg"></div>
        <div class="hacts"><a href="#/app/trade/TTWO">${ICON.chart} Buy</a><a href="#/app/transfer">${ICON.send} Send</a><a href="#/app/transfer/request">${ICON.wallet} Request</a><a href="#/app/launch">${ICON.rocket} Launch</a><a href="#/app/otc">${ICON.desk} OTC</a></div></div>
      <div class="panel"><header><h2>Insights</h2><span class="sm mut">from live prices and your balances</span></header><div class="list ins" id="ins"></div></div>
      ${todo(S.address)}
      <div class="panel"><header><h2>Your portfolio, last 7 days</h2><span class="sm mut">at what you hold now</span></header><div class="chartbox" style="height:220px"><canvas id="pv"></canvas><div class="empty" id="pve">Loading\u2026</div></div></div>
      <div class="panel"><header><h2>Movers today</h2><a class="sm" href="#/app/markets/stock">All stocks</a></header><div class="grid2" style="gap:0" id="mv"><div class="empty2">Loading\u2026</div></div></div>
      <div class="panel"><header><h2>GTA VI in the news</h2><span class="sm mut">Google News</span></header><div class="list" id="gn"><div class="empty2">Loading headlines\u2026</div></div></div>
      <div class="panel"><header><h2>Quick actions</h2></header><div class="pad"><div class="qa">${[['trade/TTWO', 'chart', 'Buy Take-Two'], ['launch', 'rocket', 'Launch a coin'], ['otc', 'desk', 'Swap OTC'], ['transfer', 'send', 'Send money']].map(([p, i, t]) => `<a href="#/app/${p}"><i>${ICON[i]}</i>${t}</a>`).join('')}</div></div></div>
      <div class="panel"><header><h2>Your holdings</h2><a class="sm" href="#/app/portfolio">See all</a></header><div class="flush"><table class="tbl"><thead><tr><th>Asset</th><th class="r">Balance</th><th class="r hide-s">Price</th><th class="r">Value</th><th class="r hide-s">24h</th></tr></thead><tbody id="hp"><tr><td colspan="5"><div class="skel" style="height:18px"></div></td></tr></tbody></table></div></div>
    </div><div class="stack">${rail()}
      <div class="panel"><header><h2>Recent activity</h2><a class="sm" href="#/app/activity">All activity</a></header><div class="list" id="ra"><div class="empty2">Loading…</div></div></div></div></div>`;
  fillMarket(main);
  const g0 = gtaLeft(); insight(main, 0, 'clock', g0.out ? `<b>GTA VI is out.</b> Day ${g0.day} of the launch: see how the five GTA VI stocks are moving.` : `<b>GTA VI launches in ${esc(g0.text)}.</b> The five stocks most tied to it are one order away.`, '#/app/trade/TTWO', g0.out ? 'See the basket' : 'Buy the basket');
  const paint = h => {
    if (!h) return; store.set('lasthold:' + S.address, { total: h.total, at: h.at });
    const td = $('#todo', main); if (td) { const n = todo(S.address); if (!n) td.remove(); else td.outerHTML = n; }
    const tiles = [[h.solUsd, `${num(h.sol)} SOL`], [h.cashUsd, h.cash.length ? h.cash.map(c => `${num(c.ui)} ${c.sym}`).join(' · ') : 'No stablecoins'], [h.stocksUsd, h.stocks.length ? h.stocks.length + ' stock' + (h.stocks.length > 1 ? 's' : '') : 'No stocks yet'], [h.otherUsd, h.other.length + ' token' + (h.other.length === 1 ? '' : 's')]];
    $$('.acct', main).forEach((el, i) => { const [v, s] = tiles[i]; $('.v', el).textContent = usd(v); $('.v', el).classList.remove('skel'); $('.s', el).textContent = s; $('.s', el).classList.remove('skel'); el.onclick = () => ctx.nav(i === 0 || i === 1 ? 'portfolio' : i === 2 ? 'portfolio/stocks' : 'portfolio/other'); });
    countUp($('#nw', main), h.total);
    const big = [{ name: 'SOL', usd: h.solUsd }, ...h.stocks.map(r => ({ name: r.stock ? r.stock.name : r.sym, usd: r.usd, sym: r.stock && r.stock.sym })), ...h.cash.map(r => ({ name: r.sym, usd: r.usd }))].filter(r => r.usd > 0).sort((a, b) => b.usd - a.usd)[0];
    if (big && h.total > 0) insight(main, 2, 'pie', `<b>${esc(big.name)} is ${(big.usd / h.total * 100).toFixed(0)}% of your money.</b> ${big.usd / h.total > .6 ? 'Most of your balance rides on one asset.' : 'Your balance is spread across a few assets.'}`, big.sym ? '#/app/trade/' + big.sym : '#/app/portfolio', big.sym ? 'Trade ' + big.sym : 'See portfolio');
    const d = $('#day', main); d.textContent = (h.dayUsd >= 0 ? '+' : '') + usd(h.dayUsd); d.className = 'num ' + tone(h.dayUsd);
    $('#asof', main).textContent = 'As of ' + new Date(h.at).toLocaleTimeString();
    const parts = [['sol', 'SOL', h.solUsd || 0], ['cash', 'Cash', h.cashUsd], ['stocks', 'GTA stocks', h.stocksUsd], ['other', 'Other', h.otherUsd]], tot = h.total || 1;
    $('#alloc', main).innerHTML = parts.map(([k, , v]) => `<i style="width:${(v / tot * 100).toFixed(2)}%;background:${COLORS[k]}"></i>`).join('');
    $('#leg', main).innerHTML = parts.map(([k, n, v]) => `<span><i style="background:${COLORS[k]}"></i>${n} ${h.total ? (v / tot * 100).toFixed(1) : '0'}%</span>`).join('');
    const rows = [{ sym: 'SOL', name: 'Solana', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', ui: h.sol, px: h.solPx, usd: h.solUsd }, ...h.stocks, ...h.cash, ...h.other].filter(r => r.ui > 0).slice(0, 7);
    $('#hp', main).innerHTML = rows.length ? rows.map(r => `<tr class="click" data-s="${esc(r.stock ? r.stock.sym : '')}"><td>${tic(r)}</td><td class="r num">${num(r.ui)}</td><td class="r num hide-s">${usd(r.px)}</td><td class="r num"><b>${usd(r.usd)}</b></td><td class="r num hide-s ${tone(r.chg)}">${pct(r.chg)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty2">This wallet is empty. Add SOL to start trading.</td></tr>';
    $$('#hp tr[data-s]', main).forEach(tr => tr.onclick = () => tr.dataset.s ? ctx.nav('trade/' + tr.dataset.s) : ctx.nav('portfolio'));
  };
  let pvDone = false;
  const pv = async h => { if (pvDone || !h) return; pvDone = true;
    const legs = [{ mint: SOL, ui: h.sol }, ...h.stocks.map(r => ({ mint: r.mint, ui: r.ui }))].filter(x => x.ui > 0);
    const cash = h.cashUsd + 0;
    try { const C = await Promise.all(legs.map(l => candles(l.mint, 'hour', 1, 168).catch(() => []))); const ok = C.filter(c => c.length > 24); if (!ok.length) throw 0;
      const hour = t => Math.floor(t / 36e5), hours = [...new Set(ok.flatMap(c => c.map(x => hour(x.t))))].sort((a, b) => a - b), maps = C.map(c => new Map(c.map(x => [hour(x.t), x.c]))), last = C.map(c => c.length ? c[0].c : 0);
      const S = hours.map(hh => { let v = cash; maps.forEach((m, i) => { if (m.has(hh)) last[i] = m.get(hh); v += last[i] * legs[i].ui; }); return { t: hh * 36e5, c: v }; });
      $('#pve', main).hidden = true; area($('#pv', main), S); const hs = $('#hs', main); if (hs) spark(hs, S.slice(-24).map(x => x.c), '#ffffff'); } catch { const e = $('#pve', main); if (e) e.textContent = 'Not enough chart data for your holdings yet.'; } };
  const movers = async () => { const M = await tokens(ALL.map(s => s.mint)), L = ALL.map(s => ({ s, c: chg24(M[s.mint]), p: price(M[s.mint]) })).filter(x => x.c != null).sort((a, b) => b.c - a.c);
    const row = x => `<a class="it" href="#/app/trade/${x.s.sym}" style="color:inherit;text-decoration:none"><span><b>${x.s.sym}</b><small class="mut" style="display:block">${esc(x.s.name)}</small></span><span style="text-align:right"><b class="num">${usd(x.p)}</b><small class="num ${tone(x.c)}" style="display:block">${pct(x.c)}</small></span></a>`;
    const bm = L.filter(x => BASKET.some(b => b.mint === x.s.mint)).sort((a, b) => Math.abs(b.c) - Math.abs(a.c))[0];
    if (bm) insight(main, 1, 'chart', `<b>${esc(bm.s.name)} is today\u2019s biggest mover in the basket</b>, <span class="${tone(bm.c)}">${pct(bm.c)}</span> at ${usd(bm.p)}.`, '#/app/trade/' + bm.s.sym, 'Trade ' + bm.s.sym);
    $('#mv', main).innerHTML = L.length ? `<div class="list" style="border-right:1px solid var(--line)"><div class="pad xs mut" style="padding-bottom:0">TOP GAINERS</div>${L.slice(0, 3).map(row).join('')}</div><div class="list"><div class="pad xs mut" style="padding-bottom:0">TOP LOSERS</div>${L.slice(-3).reverse().map(row).join('')}</div>` : '<div class="empty2">Prices unavailable.</div>'; };
  movers(); import('./p-invest.js').then(m => m.news($('#gn', main), 'gta', 6));
  const load = force => ctx.hold(force).then(h => { paint(h); pv(h); }).catch(e => { $('#hp', main).innerHTML = `<tr><td colspan="5"><div class="note r">${ICON.help}<span>Balances could not load: ${esc(e.message)}</span></div></td></tr>`; });
  paint(ctx.cached()); load(false);
  $('#rf', main).onclick = () => load(true);
  history(S.address, 6).then(l => { const box = $('#ra', main); if (!box) return; const L = l || []; box.innerHTML = L.length ? L.map(x => actRich(x, null, {})).join('') : `<div class="empty2">${S.demo ? 'No transactions in demo mode.' : 'No transactions yet.'}</div>`;
    enrich(L, S.address, () => { const b = $('#ra', main); if (b) b.innerHTML = L.map(x => actRich(x, x._d, {})).join(''); }); }).catch(() => { $('#ra', main).innerHTML = '<div class="empty2">Activity is unavailable right now.</div>'; });
  const t = setInterval(() => { const g = gtaLeft(), e = $('#gtaT', main); if (e) e.textContent = g.out ? 'Out now' : g.text; }, 1000);
  return () => clearInterval(t);
}
// one line per insight, kept in a fixed order; each source fills its own line when its data arrives
function insight(main, k, icon, html, href, label) {
  const box = $('#ins', main); if (!box) return;
  let el = box.querySelector(`[data-k="${k}"]`); if (!el) { el = document.createElement('div'); el.className = 'it'; el.dataset.k = k; const after = [...box.children].find(c => +c.dataset.k > k); box.insertBefore(el, after || null); }
  el.innerHTML = `<i class="ii">${ICON[icon] || ICON.chart}</i><span class="tx">${html}</span><a class="sm" href="${href}">${esc(label)}</a>`;
}
const memoText = m => { if (!m) return ''; const s = String(m).replace(/^\[\d+\]\s*/, ''); return s.startsWith('stockz:launch') ? 'Coin launched on STOCKZ' : s.startsWith('stockz:') ? 'STOCKZ OTC trade' : s.length > 60 ? s.slice(0, 60) + '…' : s; };
// a transaction in words, like a bank statement line: "Bought 0.0431 TTWO with 0.1 SOL", "Received 0.5 SOL"
const symOf = (m, meta) => { const s = ALL.find(x => x.mint === m); return m === SOL ? 'SOL' : s ? s.sym : meta && meta[m] && meta[m].symbol ? meta[m].symbol : short(m); };
function describe(x, d, meta) {
  const memo = String(x.memo || '').replace(/^\[\d+\]\s*/, '');
  if (!d) return { kind: memo.startsWith('stockz:') ? 'stockz' : 'other', text: memoText(x.memo) || 'Transaction', amt: '' };
  if (d.err) return { kind: 'other', text: 'Failed transaction (nothing moved but the fee)', amt: '' };
  const f = y => `${num(Math.abs(y.ui))} ${esc(symOf(y.mint, meta))}`, ins = d.deltas.filter(y => y.ui > 0), outs = d.deltas.filter(y => y.ui < 0);
  const amt = d.deltas.slice(0, 2).map(y => `<b class="num ${y.ui > 0 ? 'up' : ''}" style="display:block">${y.ui > 0 ? '+' : '\u2212'}${f(y)}</b>`).join('');
  if (memo.startsWith('stockz:launch')) return { kind: 'stockz', text: 'Launched a coin on STOCKZ', amt };
  if (memo.startsWith('stockz:')) return { kind: 'stockz', text: 'OTC trade' + (ins.length && outs.length ? `: ${outs.map(f).join(' + ')} for ${ins.map(f).join(' + ')}` : ''), amt };
  if (ins.length && outs.length) { const st = ins.find(y => ALL.some(s => s.mint === y.mint)), so = outs.find(y => ALL.some(s => s.mint === y.mint));
    return { kind: 'trade', text: st && !so ? `Bought ${f(st)} with ${outs.map(f).join(' + ')}` : so && !st ? `Sold ${f(so)} for ${ins.map(f).join(' + ')}` : `Swapped ${outs.map(f).join(' + ')} for ${ins.map(f).join(' + ')}`, amt }; }
  if (outs.length) return { kind: 'out', text: `Sent ${outs.map(f).join(' + ')}`, amt };
  if (ins.length) return { kind: 'in', text: `Received ${ins.map(f).join(' + ')}`, amt };
  return { kind: 'other', text: memoText(x.memo) || 'Account update', amt: '' };
}
const KICON = { trade: 'chart', out: 'send', in: 'wallet', stockz: 'rocket', other: 'doc' };
const actRich = (x, d, meta) => { const r = describe(x, d, meta);
  return `<a class="it act" data-k="${r.kind}" href="${solscan(x.signature)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><i class="ai k-${r.kind}">${ICON[KICON[r.kind]]}</i><span class="ad"><b style="font-weight:600">${r.text}</b><small class="mut" style="display:block">${x.blockTime ? esc(when(x.blockTime * 1000)) : 'Pending'} \u00b7 ${esc(short(x.signature))}${d && d.fee ? ' \u00b7 fee ' + num(d.fee) + ' SOL' : ''}</small></span><span class="aa">${r.amt}${x.err ? '<span class="pill r">Failed</span>' : r.amt ? '' : '<span class="pill g">Done</span>'}</span></a>`; };
// fill in the details a few at a time, newest first
async function enrich(list, owner, onEach) {
  let i = 0; const meta = {};
  const work = async () => { while (i < list.length) { const x = list[i++]; const d = await txDetail(x.signature, owner); x._d = d;
    const unknown = d ? d.deltas.map(y => y.mint).filter(m => m !== SOL && !ALL.some(s => s.mint === m) && !meta[m]) : [];
    if (unknown.length) Object.assign(meta, await tokens(unknown).catch(() => ({})));
    onEach(x, d, meta); } };
  await Promise.all([work(), work(), work()]); return meta;
}
const actRow = x => `<a class="it" href="${solscan(x.signature)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><span><b style="font-weight:600">${esc(memoText(x.memo) || 'Transaction')}</b><small class="mut" style="display:block">${x.blockTime ? esc(when(x.blockTime * 1000)) : 'Pending'} · ${esc(short(x.signature))}</small></span><span class="pill ${x.err ? 'r' : 'g'}">${x.err ? 'Failed' : 'Done'}</span></a>`;

export async function portfolio(main, ctx, rest) {
  if (!ctx.S) { main.innerHTML = `<div class="ph1"><div><h1>Portfolio</h1></div></div>` + ctx.guestPanel('see your portfolio'); return; }
  let tab = rest[0] || 'all';
  main.innerHTML = `<div class="ph1"><div><h1>Portfolio</h1><p>Everything in account ${esc(mask(ctx.S.address))}, priced live.</p></div><div class="statusrow"><button class="btn ghost sm" id="csv">${ICON.doc} Download CSV</button><button class="btn ghost sm" id="rf">Refresh</button></div></div>
    <div class="panel"><div class="tabs" id="tb">${[['all', 'All'], ['stocks', 'GTA & stocks'], ['cash', 'Cash'], ['other', 'Other tokens']].map(([k, t]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="flush"><table class="tbl"><thead><tr><th>Asset</th><th class="r">Balance</th><th class="r hide-s">Price</th><th class="r">Value</th><th class="r hide-s">24h</th><th class="r hide-s">Share</th><th></th></tr></thead><tbody id="pt"><tr><td colspan="7"><div class="skel" style="height:18px"></div></td></tr></tbody></table></div></div>`;
  let H = ctx.cached();
  const paint = () => {
    if (!H) return;
    const sol = { sym: 'SOL', name: 'Solana', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', ui: H.sol, px: H.solPx, usd: H.solUsd, kind: 'cash', mint: SOL };
    const all = [sol, ...H.cash.map(r => ({ ...r, kind: 'cash' })), ...H.stocks.map(r => ({ ...r, kind: 'stocks' })), ...H.other.map(r => ({ ...r, kind: 'other' }))];
    const rows = all.filter(r => tab === 'all' || r.kind === tab);
    $('#pt', main).innerHTML = rows.length ? rows.map(r => `<tr><td>${tic(r)}${r.frozen ? ' <span class="pill r">Frozen</span>' : ''}</td><td class="r num">${num(r.ui)}</td><td class="r num hide-s">${usd(r.px)}</td><td class="r num"><b>${usd(r.usd)}</b></td><td class="r num hide-s ${tone(r.chg)}">${pct(r.chg)}</td><td class="r num hide-s">${H.total && r.usd ? (r.usd / H.total * 100).toFixed(1) + '%' : '—'}</td>
      <td class="r" style="white-space:nowrap">${r.stock ? `<a class="btn ghost sm" href="#/app/trade/${r.stock.sym}">Trade</a> ` : ''}<a class="btn ghost sm" href="#/app/transfer/${esc(r.mint)}">Send</a></td></tr>`).join('') : '<tr><td colspan="7" class="empty2">Nothing here yet.</td></tr>';
  };
  $$('#tb button', main).forEach(b => b.onclick = () => { tab = b.dataset.t; $$('#tb button', main).forEach(x => x.classList.toggle('on', x === b)); paint(); });
  const load = f => ctx.hold(f).then(h => { H = h; paint(); }).catch(e => toast(esc(e.message), 'err'));
  paint(); load(false); $('#rf', main).onclick = () => load(true);
  $('#csv', main).onclick = () => { if (!H) return; const rows = [['asset', 'symbol', 'mint', 'balance', 'price_usd', 'value_usd'], ['Solana', 'SOL', SOL, H.sol, H.solPx ?? '', H.solUsd ?? ''], ...[...H.cash, ...H.stocks, ...H.other].map(r => [r.name, r.sym, r.mint, r.ui, r.px ?? '', r.usd ?? ''])]; download(`stockz-portfolio-${ctx.S.address.slice(0, 6)}.csv`, rows); };
}
export function download(name, rows) {
  const csv = rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export async function activity(main, ctx) {
  if (!ctx.S) { main.innerHTML = `<div class="ph1"><div><h1>Activity</h1></div></div>` + ctx.guestPanel('see your activity'); return; }
  const a = ctx.S.address; let tab = 'chain', last = null, all = [], kind = 'all', meta = {};
  main.innerHTML = `<div class="ph1"><div><h1>Activity</h1><p>Every transaction that touched your account, in plain words, straight from the chain.</p></div><button class="btn ghost sm" id="acsv">${ICON.doc} Download CSV</button></div>
    <div class="panel"><div class="tabs" id="tb"><button data-t="chain" class="on">On-chain</button><button data-t="rc">STOCKZ receipts</button></div>
      <div class="pad chipsrow" id="kf">${[['all', 'All'], ['in', 'Money in'], ['out', 'Money out'], ['trade', 'Trades'], ['stockz', 'Launches and OTC']].map(([k, t]) => `<button class="chip${k === 'all' ? ' on' : ''}" data-k="${k}">${t}</button>`).join('')}</div>
      <div class="list" id="al"><div class="empty2">Loading…</div></div>
    <div class="pad" style="text-align:center" id="more"><button class="btn ghost sm">Load more</button></div></div>`;
  const draw = () => {
    if (tab === 'rc') { const r = receipts(a); $('#al', main).innerHTML = r.length ? r.map(x => `<a class="it" href="${x.sig ? solscan(x.sig) : '#'}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><span><b style="font-weight:600">${esc(x.text)}</b><small class="mut" style="display:block">${esc(when(x.t))}${x.sig ? ' · ' + esc(short(x.sig)) : ''}</small></span><span class="pill ${x.ok === false ? 'r' : 'g'}">${esc(x.kind || 'Done')}</span></a>`).join('') : '<div class="empty2">No STOCKZ receipts on this device yet.</div>'; $('#more', main).hidden = true; return; }
    const rows = all.filter(x => kind === 'all' || describe(x, x._d, meta).kind === kind);
    $('#al', main).innerHTML = rows.length ? rows.map(x => actRich(x, x._d, meta)).join('') : `<div class="empty2">${all.length ? 'Nothing of this kind yet.' : 'No transactions yet.'}</div>`; $('#more', main).hidden = !last;
    $('#kf', main).hidden = false;
  };
  $$('#kf .chip', main).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('#kf .chip', main).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#acsv', main).onclick = () => { const rows = [['date', 'description', 'amounts', 'fee_sol', 'status', 'signature'], ...all.map(x => { const r = describe(x, x._d, meta), d = x._d;
      return [x.blockTime ? new Date(x.blockTime * 1000).toISOString() : '', r.text.replace(/<[^>]+>/g, ''), d ? d.deltas.map(y => (y.ui > 0 ? '+' : '') + y.ui + ' ' + symOf(y.mint, meta)).join(' ') : '', d ? d.fee : '', x.err ? 'failed' : 'done', x.signature]; })];
    download('stockz-activity.csv', rows); };
  let pend = null; const redraw = () => { if (pend) return; pend = setTimeout(() => { pend = null; if (tab === 'chain' && document.body.contains($('#al', main) || document.body)) draw(); }, 120); };
  const load = async () => { try { const l = await history(a, 25, last || undefined); const fresh = l || []; all = all.concat(fresh); last = l && l.length === 25 ? l[l.length - 1].signature : null; draw();
      enrich(fresh, a, (x, d, m) => { Object.assign(meta, m); redraw(); }); } catch (e) { $('#al', main).innerHTML = `<div class="empty2">Activity is unavailable: ${esc(e.message)}</div>`; } };
  $$('#tb button', main).forEach(b => b.onclick = () => { tab = b.dataset.t; $$('#tb button', main).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#more button', main).onclick = load; load();
}

export async function statements(main, ctx) {
  if (!ctx.S) { main.innerHTML = `<div class="ph1"><div><h1>Statements</h1></div></div>` + ctx.guestPanel('see your statements'); return; }
  const a = ctx.S.address, now = new Date();
  main.innerHTML = `<div class="ph1 noprint"><div><h1>Statements</h1><p>Your account as a bank statement. Print it, save it as PDF or download it as CSV.</p></div><div class="statusrow"><button class="btn ghost sm" id="csv">${ICON.doc} CSV</button><button class="btn pri sm" id="pr">Print or save PDF</button></div></div>
    <div class="stmt" id="st"><div class="shead"><div><span class="logo"><b class="wm" style="font-size:28px">STOCKZ</b></span><div class="mut sm" style="margin-top:6px">Account statement</div></div>
      <div style="text-align:right"><b>${ctx.S.demo ? 'Demo account' : 'Account ' + esc(mask(a))}</b><div class="mut sm" style="word-break:break-all;max-width:320px">${ctx.S.demo ? 'Sample balances at live prices. Not a real account.' : esc(a)}</div><div class="mut sm">Generated ${esc(now.toLocaleString())}</div></div></div>
      <div id="sb"><div class="skel" style="height:120px"></div></div></div>`;
  const [H, act] = await Promise.all([ctx.hold(false).catch(() => null), history(a, 25).catch(() => [])]);
  const lines = H ? [['Solana (SOL)', num(H.sol) + ' SOL', H.solUsd], ...H.cash.map(r => [r.name + ' (' + r.sym + ')', num(r.ui) + ' ' + r.sym, r.usd]), ...H.stocks.map(r => [r.name + ' (' + r.sym + ')', num(r.ui) + ' ' + r.sym, r.usd]), ...H.other.slice(0, 30).map(r => [r.name + ' (' + r.sym + ')', num(r.ui) + ' ' + r.sym, r.usd])] : [];
  $('#sb', main).innerHTML = `<div class="grid4" style="margin-bottom:22px">${H ? [['Checking · SOL', H.solUsd], ['Cash', H.cashUsd], ['GTA & stocks', H.stocksUsd], ['Total', H.total]].map(([k, v]) => `<div><div class="mut sm">${k}</div><div style="font-size:20px;font-weight:750;color:var(--head)" class="num">${usd(v)}</div></div>`).join('') : '<div class="note r">Balances unavailable.</div>'}</div>
    <h3 style="color:var(--head);margin:0 0 8px">Holdings</h3><table class="tbl"><thead><tr><th>Asset</th><th class="r">Balance</th><th class="r">Value</th></tr></thead><tbody>${lines.map(([n, b, v]) => `<tr><td>${esc(n)}</td><td class="r num">${esc(b)}</td><td class="r num">${usd(v)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty2">No holdings</td></tr>'}</tbody></table>
    <h3 style="color:var(--head);margin:24px 0 8px">Recent transactions</h3><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th>Status</th><th class="hide-s">Signature</th></tr></thead><tbody>${(act || []).map(x => `<tr><td class="num">${x.blockTime ? esc(new Date(x.blockTime * 1000).toLocaleString()) : '—'}</td><td>${esc(memoText(x.memo) || 'Transaction')}</td><td>${x.err ? 'Failed' : 'Completed'}</td><td class="hide-s mono xs">${esc(short(x.signature))}</td></tr>`).join('') || '<tr><td colspan="4" class="empty2">No transactions</td></tr>'}</tbody></table>
    <p class="mut xs" style="margin-top:24px">Values use live Jupiter prices at the time this statement was generated. STOCKZ is not a bank and does not hold your funds; this statement is a view of your Solana wallet. Tokenized stocks are issued by third parties and are not shares registered in your name.</p>`;
  $('#pr', main).onclick = () => window.print();
  $('#csv', main).onclick = () => download(`stockz-statement-${a.slice(0, 6)}-${now.toISOString().slice(0, 10)}.csv`, [['section', 'item', 'detail', 'value_usd'], ...lines.map(([n, b, v]) => ['holding', n, b, v ?? '']), ...(act || []).map(x => ['transaction', x.signature, x.blockTime ? new Date(x.blockTime * 1000).toISOString() : '', x.err ? 'failed' : 'ok'])]);
}
