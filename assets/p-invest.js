// STOCKZ · Invest: the trade ticket (Jupiter Ultra), markets, watchlist and price alerts
import { $, $$, esc, usd, pct, tone, num, short, ago, ICON, BASKET, ALL, SOL, USDC, bySym, byMint, store, toast, copy, solscan, nyse } from './core.js';
import { tokens, price, chg24, vol24, order, execute, candles, rpc, stockzCoins, trades, pools, api } from './net.js';
import { signAll } from './wallet.js';
import { area, spark, compare, PALETTE } from './chart.js';
import { addReceipt } from './p-accounts.js';

const b64e = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const PAY = { SOL: { mint: SOL, dec: 9, sym: 'SOL' }, USDC: { mint: USDC, dec: 6, sym: 'USDC' } };
const TF = { '1D': ['minute', 15, 96, false], '1W': ['hour', 1, 168, false], '1M': ['hour', 4, 180, true], '3M': ['day', 1, 90, true] };
const logo = s => s.logo ? `<img src="${s.logo}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${s.sym}'}))">` : `<span class="ph" data-mint="${s.mint}">${s.sym}</span>`;

// what the issuer can do to the token: read from the mint's Token-2022 extensions
export async function controls(mint) {
  try {
    const r = await rpc('getAccountInfo', [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }]); const v = r && r.value; if (!v) return null;
    const info = v.data.parsed.info, ext = info.extensions || [], has = k => ext.find(e => e.extension === k);
    const out = [];
    if (info.freezeAuthority) out.push(['Can freeze accounts', 'w']);
    if (has('permanentDelegate') && has('permanentDelegate').state.delegate) out.push(['Permanent delegate can move tokens', 'w']);
    if (has('pausableConfig')) out.push([has('pausableConfig').state.paused ? 'Paused now' : 'Can be paused', has('pausableConfig').state.paused ? 'r' : 'w']);
    if (has('transferHook') && has('transferHook').state.programId) out.push(['Transfer hook', 'w']);
    if (has('defaultAccountState') && has('defaultAccountState').state.accountState === 'frozen') out.push(['New accounts start frozen', 'r']);
    if (has('scaledUiAmountConfig')) out.push(['Balance scales with corporate actions', '']);
    return { program: v.owner === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token-2022' : 'SPL Token', flags: out, supply: +info.supply / 10 ** info.decimals, decimals: info.decimals };
  } catch { return null; }
}

export async function trade(main, ctx, rest) {
  const s = bySym((rest[0] || 'TTWO').toUpperCase()) || BASKET[0];
  let side = rest[1] === 'sell' ? 'sell' : 'buy', pay = store.get('pay') === 'USDC' ? 'USDC' : 'SOL', tf = '1W', mode = 'line', T = null, quote = null, redraw = () => {};
  main.innerHTML = `<div class="ph1"><div><h1>Trade</h1><p>Tokenized stocks, routed through Jupiter. Your wallet signs every order.</p></div></div>
    <div class="picks" style="margin-bottom:18px">${BASKET.map(x => `<button data-s="${x.sym}" class="${x.sym === s.sym ? 'on' : ''}">${logo(x)}${x.sym}<small>${esc(x.name)}</small></button>`).join('')}</div>
    <div class="cols"><div class="stack">
      <div class="panel"><div class="qhead"><span class="tic">${logo(s)}<span><b style="font-size:18px">${esc(s.name)}</b><small>${s.sym} · ${esc(s.tok)} by ${s.issuer}</small></span></span><span class="px" id="px" data-live-px="${s.mint}">—</span><span class="num" id="ch" style="font-weight:700">—</span>
        <span style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap"><span class="seg" id="cmode"><button data-m="line" class="on">Line</button><button data-m="candles">Candles</button></span><span class="seg" id="tf">${Object.keys(TF).map(k => `<button data-k="${k}" class="${k === tf ? 'on' : ''}">${k}</button>`).join('')}</span></span></div>
        <div class="chartbox"><canvas id="cv"></canvas><div class="empty" id="ce">Loading chart…</div></div><div class="pad sm" style="padding-top:0;padding-bottom:10px" id="rt"></div>
        <div class="pad" style="border-top:1px solid var(--line)"><dl class="kv" style="grid-template-columns:repeat(4,auto 1fr)" id="st"><dt>24h volume</dt><dd>—</dd><dt>Liquidity</dt><dd>—</dd><dt>Holders</dt><dd>—</dd><dt>Market cap</dt><dd>—</dd></dl></div></div>
      <div class="panel"><header><h2>About ${esc(s.sym)}</h2><a class="sm" href="https://solscan.io/token/${s.mint}" target="_blank" rel="noopener">Solscan ${ICON.ext}</a></header><div class="pad">
        <p style="margin:0 0 12px">${esc(s.why || s.name + ', tokenized on Solana by ' + s.issuer + '.')}</p>
        <dl class="kv"><dt>Token</dt><dd>${esc(s.tok)} · issued by ${esc(s.issuer)}</dd><dt>Mint</dt><dd><a href="#" id="cpm" class="mono">${esc(short(s.mint))} ⧉</a></dd><dt>Program</dt><dd id="prog">—</dd></dl>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px" id="flags"></div>
        <div class="note w" style="margin-top:14px">${ICON.shield}<span>A tokenized stock tracks the share price but is not a share in your name. The issuer can pause or freeze it, and prices can drift while US markets are closed.</span></div></div></div>
      <div class="panel"><header><h2>Time & sales</h2><span class="pill" id="tsn"><span class="dot"></span> live</span></header><div class="flush" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Time</th><th>Side</th><th class="r">Price</th><th class="r hide-s">Amount</th><th class="r">Value</th><th></th></tr></thead><tbody id="ts"><tr><td colspan="6" class="empty2">Reading the latest fills\u2026</td></tr></tbody></table></div></div>
      <div class="panel"><header><h2>Where ${esc(s.sym)} trades</h2><span class="sm mut">pools on Solana</span></header><div class="flush"><table class="tbl"><thead><tr><th>Pool</th><th class="hide-s">Venue</th><th class="r">Liquidity</th><th class="r">24h volume</th></tr></thead><tbody id="pl"><tr><td colspan="4" class="empty2">Loading\u2026</td></tr></tbody></table></div></div>
      <div class="panel"><header><h2>${esc(s.name)} in the news</h2><span class="sm mut">Google News</span></header><div class="list" id="nw"><div class="empty2">Loading headlines\u2026</div></div></div>
    </div><div class="stack">
      <div class="panel ticket"><header><h2>Order ticket</h2><span class="seg buy" id="side"><button class="b ${side === 'buy' ? 'on' : ''}" data-v="buy">Buy</button><button class="s ${side === 'sell' ? 'on' : ''}" data-v="sell">Sell</button></span></header>
        <div class="pad"><label class="fld"><span id="lab"></span><div class="inrow"><input id="amt" inputmode="decimal" placeholder="0.00" autocomplete="off"><select id="pay"><option>SOL</option><option>USDC</option></select></div></label>
          <div class="presets" id="pre"></div><div class="sm mut" id="bal" style="margin-top:8px">—</div>
          <div class="est" id="est"><dl class="kv"><dt>You get</dt><dd>—</dd><dt>Price impact</dt><dd>—</dd><dt>Fees</dt><dd>—</dd><dt>Route</dt><dd>—</dd></dl></div>
          <button class="btn pri wide lg" id="rev" disabled>Review order</button><p class="xs mut" style="margin:10px 0 0">Quotes come from Jupiter Ultra and refresh as you type. Nothing moves until your wallet signs.</p></div></div>
      <div class="panel"><header><h2>Your position</h2></header><div class="pad" id="pos"><span class="mut sm">${ctx.S ? 'Loading…' : 'Sign in to see your position.'}</span></div></div>
      <div class="panel ticket"><header><h2>Buy the GTA VI basket</h2><span class="pill p">5 stocks · 1 signature</span></header><div class="pad">
        <p class="sm mut" style="margin:0 0 10px">One amount, split equally across ${BASKET.map(x => x.sym).join(', ')}.</p>
        <div class="inrow"><input id="bamt" inputmode="decimal" placeholder="0.00" autocomplete="off"><select id="bpay"><option>SOL</option><option>USDC</option></select></div>
        <div class="est" id="best"><span class="sm mut">Enter an amount to see the five orders.</span></div><button class="btn pink wide" id="bgo" disabled>Review basket order</button></div></div>
      <div class="panel"><header><h2>Coins priced in ${esc(s.sym)}</h2><a class="sm" href="#/app/launch/${s.sym}">Launch one</a></header><div class="list" id="cpi"><div class="empty2">Reading the chain…</div></div></div>
    </div></div>`;
  $$('.picks button', main).forEach(b => b.onclick = () => ctx.nav('trade/' + b.dataset.s + (side === 'sell' ? '/sell' : '')));
  $('#cpm', main).onclick = e => { e.preventDefault(); copy(s.mint); };
  const cv = $('#cv', main);
  const loadChart = async () => { $('#ce', main).hidden = false; $('#ce', main).textContent = 'Loading chart…'; try { const [a, g, l, long] = TF[tf]; const c = await candles(s.mint, a, g, l); if (c.length < 2) throw 0; $('#ce', main).hidden = true; redraw = area(cv, c, { long, mode, vol: true });
      const ch = (c[c.length - 1].c / c[0].c - 1) * 100, hi = Math.max(...c.map(x => x.h)), lo = Math.min(...c.map(x => x.l)); $('#rt', main).innerHTML = `<span class="mut">${tf} change</span> <b class="${tone(ch)}">${pct(ch)}</b> <span class="mut" style="margin-left:14px">High</span> <b class="num">${usd(hi)}</b> <span class="mut" style="margin-left:14px">Low</span> <b class="num">${usd(lo)}</b>`; } catch { redraw = () => {}; const g2 = cv.getContext('2d'); g2.clearRect(0, 0, cv.width, cv.height); $('#ce', main).textContent = 'No chart data for this token right now.'; } };
  $$('#tf button', main).forEach(b => b.onclick = () => { tf = b.dataset.k; $$('#tf button', main).forEach(x => x.classList.toggle('on', x === b)); loadChart(); });
  $$('#cmode button', main).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#cmode button', main).forEach(x => x.classList.toggle('on', x === b)); loadChart(); });
  const meta = async () => { const m = await tokens([s.mint, SOL, USDC]); T = m; const t = m[s.mint];
    if (t) { $('#px', main).textContent = usd(price(t)); const c = $('#ch', main); c.textContent = pct(chg24(t)) + ' today'; c.className = 'num ' + tone(chg24(t));
      $('#st', main).innerHTML = `<dt>24h volume</dt><dd>${usd(vol24(t), 0)}</dd><dt>Liquidity</dt><dd>${usd(t.liquidity, 0)}</dd><dt>Holders</dt><dd>${num(t.holderCount)}</dd><dt>Market cap</dt><dd>${usd(t.mcap)}</dd>`; } };
  controls(s.mint).then(c => { if (!c) return; $('#prog', main).textContent = c.program; $('#flags', main).innerHTML = c.flags.length ? c.flags.map(([t, k]) => `<span class="pill ${k}">${esc(t)}</span>`).join('') : '<span class="pill g">No issuer controls found</span>'; });
  const H = () => ctx.cached();
  const bal = () => { const h = H(); if (!h) return null; if (side === 'buy') return pay === 'SOL' ? Math.max(0, h.sol - .01) : ((h.cash.find(c => c.mint === USDC) || {}).ui || 0); const r = h.stocks.find(x => x.mint === s.mint); return r ? r.ui : 0; };
  const drawSide = () => {
    $('#lab', main).textContent = side === 'buy' ? 'You pay' : `You sell (${s.sym})`;
    $('#pay', main).style.display = side === 'buy' ? '' : 'none';
    $('#pre', main).innerHTML = (side === 'buy' ? (pay === 'SOL' ? ['0.1', '0.5', '1'] : ['10', '50', '100']).map(v => `<button data-v="${v}">${v} ${pay}</button>`) : []).concat(['25%', '50%', 'Max'].map(v => `<button data-p="${v}">${v}</button>`)).join('');
    $$('#pre button', main).forEach(b => b.onclick = () => { const B = bal(); if (b.dataset.v) $('#amt', main).value = b.dataset.v; else if (B != null) $('#amt', main).value = +(B * (b.dataset.p === 'Max' ? 1 : parseFloat(b.dataset.p) / 100)).toFixed(side === 'buy' && pay === 'SOL' ? 4 : 6); requote(); });
    const B = bal(); $('#bal', main).textContent = !ctx.S ? 'Sign in to trade from your balance.' : B == null ? 'Loading balance…' : `Available: ${num(B)} ${side === 'buy' ? pay : s.sym}`;
    const h = H(), r = h && h.stocks.find(x => x.mint === s.mint);
    if (ctx.S) $('#pos', main).innerHTML = h ? (r ? `<dl class="kv"><dt>Shares (tokens)</dt><dd>${num(r.ui)} ${s.sym}</dd><dt>Value</dt><dd>${usd(r.usd)}</dd><dt>Today</dt><dd class="${tone(r.chg)}">${pct(r.chg)}</dd></dl>` : `<span class="mut sm">You don’t hold ${s.sym} yet.</span>`) : '<span class="mut sm">Loading…</span>';
  };
  $$('#side button', main).forEach(b => b.onclick = () => { side = b.dataset.v; $$('#side button', main).forEach(x => x.classList.toggle('on', x === b)); $('#amt', main).value = ''; quote = null; drawSide(); requote(); });
  $('#pay', main).value = pay; $('#pay', main).onchange = e => { pay = e.target.value; drawSide(); requote(); };
  let qt = null, qn = 0;
  const requote = () => { clearTimeout(qt); qt = setTimeout(getQuote, 380); };
  async function getQuote() {
    const v = parseFloat($('#amt', main).value), n = ++qn, est = $('#est', main), btn = $('#rev', main); quote = null; btn.disabled = true;
    if (!(v > 0)) { est.innerHTML = `<dl class="kv"><dt>You get</dt><dd>—</dd><dt>Price impact</dt><dd>—</dd><dt>Fees</dt><dd>—</dd><dt>Route</dt><dd>—</dd></dl>`; return; }
    const sm = T && T[s.mint], dec = sm && sm.decimals != null ? sm.decimals : 8;
    const inp = side === 'buy' ? PAY[pay] : { mint: s.mint, dec, sym: s.sym }, out = side === 'buy' ? { mint: s.mint, dec, sym: s.sym } : PAY.SOL;
    est.innerHTML = '<div class="skel" style="height:90px"></div>';
    try {
      const p = { inputMint: inp.mint, outputMint: out.mint, amount: String(Math.floor(v * 10 ** inp.dec)) }; if (ctx.S) p.taker = ctx.S.address;
      const o = await order(p); if (n !== qn) return;
      const got = +o.outAmount / 10 ** out.dec, imp = o.priceImpactPct != null ? +o.priceImpactPct * (Math.abs(+o.priceImpactPct) < 1 ? 100 : 1) : null;
      const route = (o.routePlan || []).map(r => r.swapInfo && r.swapInfo.label).filter(Boolean); const fee = o.feeBps != null ? (o.feeBps / 100).toFixed(2) + '%' : '—';
      est.innerHTML = `<dl class="kv"><dt>You get</dt><dd>${num(got)} ${out.sym}</dd><dt>Value</dt><dd>${usd(o.outUsdValue != null ? +o.outUsdValue : null)}</dd><dt>Price impact</dt><dd class="${imp != null && Math.abs(imp) > 1 ? 'dn' : ''}">${imp != null ? imp.toFixed(2) + '%' : '—'}</dd><dt>Fees</dt><dd>${fee}</dd><dt>Route</dt><dd>${esc(route.length ? [...new Set(route)].join(' › ') : (o.router || 'Jupiter'))}</dd></dl>
        ${o.errorMessage ? `<div class="note r" style="margin-top:10px">${ICON.help}<span>${esc(o.errorMessage)}</span></div>` : ''}`;
      quote = { o, inp, out, v, got };
      btn.disabled = !(ctx.S && !ctx.S.demo ? o.transaction : true); btn.textContent = ctx.S ? 'Review order' : 'Sign in to place this order';
    } catch (e) { if (n !== qn) return; est.innerHTML = `<div class="note r">${ICON.help}<span>No quote right now: ${esc(e.message)}</span></div>`; }
  }
  $('#amt', main).oninput = requote;
  $('#rev', main).onclick = () => { if (!ctx.S) return ctx.actions.needSignIn('trade/' + s.sym); if (quote) review(quote); };
  function review(q) {
    const v = document.createElement('div'); v.className = 'veil';
    v.innerHTML = `<div class="modal"><header><h3>Review your order</h3><button class="x" data-c>${ICON.close}</button></header><div class="body">
      <dl class="kv"><dt>Order</dt><dd>${side === 'buy' ? 'Buy' : 'Sell'} ${esc(s.name)}</dd><dt>You pay</dt><dd>${num(q.v)} ${q.inp.sym}</dd><dt>You get (est.)</dt><dd>${num(q.got)} ${q.out.sym}</dd><dt>Account</dt><dd>${esc(short(ctx.S.address))}</dd></dl>
      <div class="note" style="margin-top:14px">${ICON.shield}<span>Your wallet will show this transaction. Check it there before you approve. The final amount can differ slightly from the estimate.</span></div><div id="ps" class="prog" style="margin-top:14px"></div></div>
      <footer><button class="btn ghost" data-c>Cancel</button><button class="btn pri" id="place">Place order</button></footer></div>`;
    document.body.appendChild(v);
    const close = () => v.remove(); $$('[data-c]', v).forEach(b => b.onclick = close);
    $('#place', v).onclick = async () => {
      const b = $('#place', v); b.disabled = true; b.innerHTML = '<span class="spin"></span> Waiting for your wallet';
      const ps = $('#ps', v); ps.innerHTML = '<div class="on"><i></i>Sign in your wallet</div><div><i></i>Jupiter lands it</div>';
      try {
        await ctx.wallet();
        const [signed] = await signAll([b64d(q.o.transaction)]);
        ps.innerHTML = `<div class="done"><i>${ICON.check}</i>Signed</div><div class="on"><i></i>Jupiter lands it</div>`; b.innerHTML = '<span class="spin"></span> Sending';
        const r = await execute(b64e(signed), q.o.requestId);
        if (r.status !== 'Success') throw new Error(r.error || 'The order did not go through.');
        ps.innerHTML = `<div class="done"><i>${ICON.check}</i>Signed</div><div class="done"><i>${ICON.check}</i>Done</div>`;
        addReceipt(ctx.S.address, { kind: side === 'buy' ? 'Bought' : 'Sold', text: `${side === 'buy' ? 'Bought' : 'Sold'} ${s.sym} for ${num(q.v)} ${q.inp.sym}`, sig: r.signature });
        $('.body', v).insertAdjacentHTML('beforeend', `<div class="note g" style="margin-top:12px">${ICON.check}<span>Order filled. <a href="${solscan(r.signature)}" target="_blank" rel="noopener">View on Solscan</a></span></div>`);
        b.textContent = 'Done'; b.onclick = close; b.disabled = false;
        ctx.hold(true).then(drawSide); toast('Order filled', 'ok');
      } catch (e) { b.disabled = false; b.textContent = 'Try again'; ps.insertAdjacentHTML('beforeend', `<div class="bad"><i></i>${esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message)}</div>`); }
    };
  }
  // the basket: five Ultra orders, signed in one wallet prompt
  let bq = null, bn = 0, bt = null;
  const bquote = async () => { const v = parseFloat($('#bamt', main).value), n = ++bn, P = PAY[$('#bpay', main).value], box = $('#best', main), go = $('#bgo', main); bq = null; go.disabled = true;
    if (!(v > 0)) { box.innerHTML = '<span class="sm mut">Enter an amount to see the five orders.</span>'; return; }
    box.innerHTML = '<div class="skel" style="height:96px"></div>';
    const each = String(Math.floor(v / BASKET.length * 10 ** P.dec)), M = await tokens(BASKET.map(x => x.mint));
    const R = await Promise.all(BASKET.map(x => order({ inputMint: P.mint, outputMint: x.mint, amount: each, ...(ctx.S ? { taker: ctx.S.address } : {}) }).then(o => ({ x, o })).catch(e => ({ x, err: e.message }))));
    if (n !== bn) return;
    box.innerHTML = `<dl class="kv">${R.map(r => { const d = M[r.x.mint] && M[r.x.mint].decimals != null ? M[r.x.mint].decimals : 8; return `<dt>${r.x.sym}</dt><dd>${r.o ? num(+r.o.outAmount / 10 ** d) + ' (' + usd(r.o.outUsdValue != null ? +r.o.outUsdValue : null) + ')' : '<span class="dn">no route</span>'}</dd>`; }).join('')}</dl>`;
    bq = { R, v, P }; go.disabled = !(ctx.S && !ctx.S.demo ? R.every(r => r.o && r.o.transaction) : R.every(r => r.o)); go.textContent = ctx.S ? 'Review basket order' : 'Sign in to buy the basket'; };
  $('#bamt', main).oninput = () => { clearTimeout(bt); bt = setTimeout(bquote, 450); }; $('#bpay', main).onchange = bquote;
  $('#bgo', main).onclick = async () => { if (!ctx.S) return ctx.actions.needSignIn('trade/' + s.sym); if (!bq) return; const go = $('#bgo', main); go.disabled = true; go.innerHTML = '<span class="spin"></span> Approve all five in your wallet';
    try { await ctx.wallet(); const signed = await signAll(bq.R.map(r => b64d(r.o.transaction))); let ok = 0;
      for (let i = 0; i < signed.length; i++) { go.innerHTML = `<span class="spin"></span> Filling ${i + 1} of ${signed.length}`; try { const r = await execute(b64e(signed[i]), bq.R[i].o.requestId); if (r.status === 'Success') { ok++; addReceipt(ctx.S.address, { kind: 'Bought', text: `Bought ${bq.R[i].x.sym} (basket)`, sig: r.signature }); } } catch {} }
      toast(`${ok} of ${signed.length} basket orders filled`, ok === signed.length ? 'ok' : 'err', 8000); go.textContent = 'Done'; ctx.hold(true).then(drawSide); }
    catch (e) { toast(esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message), 'err'); go.disabled = false; go.textContent = 'Review basket order'; } };
  stockzCoins().then(async L => { const mine = L.filter(c => c.quote === s.sym).slice(0, 8), el = $('#cpi', main); if (!el) return;
    if (!mine.length) { el.innerHTML = `<div class="empty2">No coins priced in ${esc(s.sym)} yet. <a href="#/app/launch/${s.sym}">Be the first</a></div>`; return; }
    const M = await tokens(mine.map(c => c.mint)); el.innerHTML = mine.map(c => { const t = M[c.mint]; return `<a class="it" href="#/app/coins/${c.mint}" style="color:inherit;text-decoration:none"><span class="tic">${t && t.icon ? `<img src="${esc(t.icon)}" alt="">` : '<span class="ph">NEW</span>'}<span><b>${esc(t ? t.name : short(c.mint))}</b><small>${t ? '$' + esc(t.symbol) : ''}</small></span></span><span class="num sm">${t ? usd(t.mcap) : '—'}</span></a>`; }).join(''); }).catch(() => { const el = $('#cpi', main); if (el) el.innerHTML = '<div class="empty2">Unavailable right now.</div>'; });
  // the tape of real fills, the pools behind them, the headlines
  let seen = new Set(), first = true;
  const tape = async () => { try { const L = (await trades(s.mint)).slice(0, 40), el = $('#ts', main); if (!el) return;
      el.innerHTML = L.length ? L.map(x => `<tr class="${!first && !seen.has(x.tx) ? (x.buy ? 'fu' : 'fd') : ''}"><td class="mut sm num">${new Date(x.t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td><td><span class="pill ${x.buy ? 'g' : 'r'}">${x.buy ? 'Buy' : 'Sell'}</span></td><td class="r num">${usd(x.px)}</td><td class="r num hide-s">${num(x.amt)}</td><td class="r num"><b>${usd(x.usd)}</b></td><td class="r"><a href="${solscan(x.tx)}" target="_blank" rel="noopener" class="sm">tx</a></td></tr>`).join('') : '<tr><td colspan="6" class="empty2">No fills in the last while.</td></tr>';
      L.forEach(x => seen.add(x.tx)); first = false; } catch { const el = $('#ts', main); if (el && first) el.innerHTML = '<tr><td colspan="6" class="empty2">The trade tape is unavailable right now.</td></tr>'; } };
  tape(); const tsT = setInterval(() => { if (!document.hidden) tape(); }, 15000);
  pools(s.mint).then(L => { const el = $('#pl', main); if (!el) return; el.innerHTML = L.slice(0, 6).map(p => `<tr><td><a href="https://www.geckoterminal.com/solana/pools/${p.id}" target="_blank" rel="noopener"><b>${esc(p.name)}</b></a></td><td class="hide-s mut sm">${esc((p.dex || '').replace(/[-_]/g, ' '))}</td><td class="r num">${usd(p.liq, 0)}</td><td class="r num">${usd(p.vol, 0)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty2">No pools found.</td></tr>'; }).catch(() => { const el = $('#pl', main); if (el) el.innerHTML = '<tr><td colspan="4" class="empty2">Unavailable right now.</td></tr>'; });
  news($('#nw', main), s.sym);
  drawSide(); meta().then(drawSide); loadChart(); if (ctx.S) ctx.hold(false).then(drawSide).catch(() => {});

  const ro = () => redraw(); addEventListener('resize', ro);
  const iv = setInterval(() => { if (!document.hidden) meta(); }, 30000);
  return () => { removeEventListener('resize', ro); clearInterval(iv); clearInterval(tsT); };
}
// headlines from Google News, through our news function
export async function news(el, q, n = 6) {
  if (!el) return;
  try { const d = await api('news?q=' + encodeURIComponent(q)), L = (d.items || []).slice(0, n);
    el.innerHTML = L.length ? L.map(x => `<a class="it" href="${esc(x.link)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;align-items:flex-start"><span><b style="font-weight:600;line-height:1.35;display:block">${esc(x.title)}</b><small class="mut">${esc(x.source)}${x.at ? ' \u00b7 ' + esc(Date.now() - x.at < 6048e5 ? ago(x.at) : new Date(x.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: new Date(x.at).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })) : ''}</small></span><span style="color:var(--mut);width:16px;height:16px;flex:none">${ICON.ext}</span></a>`).join('') : '<div class="empty2">No headlines right now.</div>'; }
  catch { el.innerHTML = '<div class="empty2">Headlines are unavailable right now.</div>'; }
}

export async function markets(main, ctx, rest) {
  let tab = rest[0] || 'gta', q = '', key = 'vol', dir = -1, M = {}, view = 'list';
  main.innerHTML = `<div class="ph1"><div><h1>Markets</h1><p>Live prices for every stock on STOCKZ. Click a row for the details.</p></div><div class="statusrow"><span class="seg" id="mvw"><button data-v="list" class="on">List</button><button data-v="heat">Heatmap</button></span><input class="inp" id="mq" placeholder="Filter by name or ticker" style="height:40px;width:220px"></div></div>
    <div class="panel"><div class="tabs" id="tb">${[['gta', 'GTA VI basket'], ['stock', 'All stocks'], ['etf', 'Funds']].map(([k, t]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="heat" id="hm" hidden></div><div class="flush" id="ml"><table class="tbl"><thead><tr><th>Stock</th>${[['px', 'Price'], ['chg', '24h'], ['vol', 'Volume'], ['liq', 'Liquidity'], ['hold', 'Holders']].map(([k, t]) => `<th class="r sort ${['vol', 'liq', 'hold'].includes(k) ? 'hide-s' : ''}" data-k="${k}">${t}</th>`).join('')}<th class="hide-s"></th></tr></thead><tbody id="mb"></tbody></table></div></div>
    <div class="panel" style="margin-top:20px"><header><h2>The GTA VI basket, last 7 days</h2><span class="sm mut">each stock rebased to 0%</span></header><div class="chartbox" style="height:280px"><canvas id="cmpc"></canvas><div class="empty" id="cmpe">Loading…</div></div><div class="legend2" id="cmpl"></div></div>`;
  const val = (s, k) => { const t = M[s.mint]; if (!t) return null; return k === 'px' ? price(t) : k === 'chg' ? chg24(t) : k === 'vol' ? vol24(t) : k === 'liq' ? +t.liquidity : +t.holderCount; };
  let draw = () => {
    const list = ALL.filter(s => (tab === 'gta' ? s.gta : tab === 'etf' ? s.kind === 'etf' : s.kind === 'stock') && (!q || (s.sym + ' ' + s.name).toLowerCase().includes(q)))
      .sort((a, b) => ((val(a, key) ?? -1e18) - (val(b, key) ?? -1e18)) * dir);
    $('#mb', main).innerHTML = list.map(s => { const t = M[s.mint]; return `<tr class="click" data-s="${s.sym}"><td><span class="tic">${logo(s)}<span><b>${esc(s.name)}</b><small>${s.sym}${s.gta ? ' · GTA VI' : ''}</small></span></span></td>
      <td class="r num"><b data-live-px="${s.mint}">${t ? usd(price(t)) : '—'}</b></td><td class="r num ${tone(t && chg24(t))}">${t ? pct(chg24(t)) : '—'}</td><td class="r num hide-s">${t ? usd(vol24(t), 0) : '—'}</td><td class="r num hide-s">${t ? usd(t.liquidity, 0) : '—'}</td><td class="r num hide-s">${t ? num(t.holderCount) : '—'}</td>
      <td class="r hide-s" style="white-space:nowrap"><button class="btn ghost sm" data-w="${s.sym}" title="Watch">${ICON.star}</button> <a class="btn pri sm" href="#/app/trade/${s.sym}">Trade</a></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty2">No matches.</td></tr>';
    $$('#mb tr[data-s]', main).forEach(tr => tr.onclick = e => { if (e.target.closest('a,button')) return; detail(bySym(tr.dataset.s), M[bySym(tr.dataset.s).mint], ctx); });
    $$('#mb [data-w]', main).forEach(b => { const on = watchList().includes(b.dataset.w); b.style.color = on ? 'var(--pink)' : ''; b.onclick = e => { e.stopPropagation(); toggleWatch(b.dataset.w); draw(); }; });
  };
  // the heatmap: area = liquidity, colour = today's move
  const heat = list => { const box = $('#hm', main); const W = box.clientWidth || 900, H = 460, items = list.map(s => ({ s, w: Math.max(1, +(M[s.mint] || {}).liquidity || 1), c: chg24(M[s.mint]) })).sort((a, b) => b.w - a.w);
    const out = []; const split = (L, x, y, w, h) => { if (!L.length) return; if (L.length === 1) { out.push({ ...L[0], x, y, w, h }); return; } const tot = L.reduce((a, b) => a + b.w, 0); let acc = 0, k = 0; while (k < L.length - 1 && acc + L[k].w < tot / 2) acc += L[k++].w; if (k === 0) { acc = L[0].w; k = 1; }
      const f = acc / tot; if (w >= h) { split(L.slice(0, k), x, y, w * f, h); split(L.slice(k), x + w * f, y, w * (1 - f), h); } else { split(L.slice(0, k), x, y, w, h * f); split(L.slice(k), x, y + h * f, w, h * (1 - f)); } };
    split(items, 0, 0, W, H); box.style.height = H + 'px';
    box.innerHTML = out.map(t => { const c = t.c == null ? 0 : Math.max(-6, Math.min(6, t.c)), a = .25 + Math.abs(c) / 6 * .7, bg = t.c == null ? '#8a93a6' : c >= 0 ? `rgba(11,138,73,${a.toFixed(2)})` : `rgba(196,43,59,${a.toFixed(2)})`, big = t.w > 0 && t.h > 54 && t.w > 80;
      return `<a href="#/app/trade/${t.s.sym}" style="left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px;background:${bg}"><b>${t.s.sym}</b>${big ? `<span>${usd(price(M[t.s.mint]))}</span>` : ''}<span>${t.c == null ? '—' : pct(t.c)}</span></a>`; }).join(''); };
  const draw0 = draw; draw = () => { draw0(); const list = ALL.filter(s => (tab === 'gta' ? s.gta : tab === 'etf' ? s.kind === 'etf' : s.kind === 'stock') && (!q || (s.sym + ' ' + s.name).toLowerCase().includes(q)));
    $('#hm', main).hidden = view !== 'heat'; $('#ml', main).hidden = view === 'heat'; if (view === 'heat') heat(list); };
  $$('#mvw button', main).forEach(b => b.onclick = () => { view = b.dataset.v; $$('#mvw button', main).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $$('#tb button', main).forEach(b => b.onclick = () => { tab = b.dataset.t; $$('#tb button', main).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $$('th.sort', main).forEach(th => th.onclick = () => { if (key === th.dataset.k) dir = -dir; else { key = th.dataset.k; dir = -1; } draw(); });
  $('#mq', main).oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  Promise.all(BASKET.map(x => candles(x.mint, 'hour', 1, 168).catch(() => []))).then(C => { const L = BASKET.map((x, i) => ({ name: x.sym, color: PALETTE[i], data: C[i] })), e = $('#cmpe', main); if (!e) return;
    if (!L.some(l => l.data.length > 2)) { e.textContent = 'Chart data is unavailable right now.'; return; } e.hidden = true; const rd = compare($('#cmpc', main), L);
    $('#cmpl', main).innerHTML = L.map(l => { const d = l.data, ch = d.length > 1 ? (d[d.length - 1].c / d[0].c - 1) * 100 : null; return `<span><i style="background:${l.color}"></i><b>${l.name}</b> <span class="${tone(ch)}">${pct(ch)}</span></span>`; }).join(''); addEventListener('resize', rd); });
  draw(); const load = async () => { M = await tokens(ALL.map(s => s.mint)); draw(); }; load();
  const iv = setInterval(() => { if (!document.hidden) load(); }, 30000); return () => clearInterval(iv);
}
function detail(s, t, ctx) {
  const v = document.createElement('div'); v.className = 'veil';
  v.innerHTML = `<div class="modal" style="width:min(640px,100%)"><header><span class="tic">${logo(s)}<span><b>${esc(s.name)}</b><small>${s.sym} · ${esc(s.tok)} by ${s.issuer}</small></span></span><button class="x" data-c>${ICON.close}</button></header>
    <div class="body"><div style="display:flex;gap:14px;align-items:baseline"><b style="font-size:28px;color:var(--head)" class="num">${t ? usd(price(t)) : '—'}</b><span class="num ${tone(t && chg24(t))}">${t ? pct(chg24(t)) : ''}</span></div>
      <div class="chartbox" style="height:200px;padding:6px 0"><canvas id="dc"></canvas><div class="empty" id="de">Loading chart…</div></div>
      <dl class="kv"><dt>24h volume</dt><dd>${t ? usd(vol24(t), 0) : '—'}</dd><dt>Liquidity</dt><dd>${t ? usd(t.liquidity, 0) : '—'}</dd><dt>Holders</dt><dd>${t ? num(t.holderCount) : '—'}</dd><dt>Mint</dt><dd class="mono">${esc(short(s.mint))}</dd></dl>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px" id="dfl"></div></div>
    <footer><a class="btn ghost" href="#/app/launch/${s.sym}" data-c>Launch a coin on it</a><a class="btn pri" href="#/app/trade/${s.sym}" data-c>Trade ${s.sym}</a></footer></div>`;
  document.body.appendChild(v); $$('[data-c]', v).forEach(b => b.addEventListener('click', () => v.remove())); v.onclick = e => { if (e.target === v) v.remove(); };
  candles(s.mint, 'hour', 1, 168).then(c => { if (c.length < 2) throw 0; $('#de', v).hidden = true; area($('#dc', v), c); }).catch(() => { $('#de', v).textContent = 'No chart data right now.'; });
  controls(s.mint).then(c => { if (c) $('#dfl', v).innerHTML = c.flags.map(([x, k]) => `<span class="pill ${k}">${esc(x)}</span>`).join(''); });
}

// watchlist and alerts live on this device; alerts check prices every 30 s while STOCKZ is open
export const watchList = () => store.get('watch', ['TTWO', 'NVDA']);
export const toggleWatch = sym => { const l = watchList(); store.set('watch', l.includes(sym) ? l.filter(x => x !== sym) : [...l, sym]); };
let alertTimer = null;
export function startAlerts() {
  if (alertTimer) return;
  const check = async () => {
    const al = store.get('alerts', []).filter(a => !a.done); if (!al.length) return;
    const M = await tokens([...new Set(al.map(a => bySym(a.sym) && bySym(a.sym).mint).filter(Boolean))], true);
    let changed = false;
    for (const a of al) { const s = bySym(a.sym), p = s && price(M[s.mint]); if (p == null) continue;
      if ((a.dir === 'above' && p >= a.px) || (a.dir === 'below' && p <= a.px)) { a.done = true; changed = true; const msg = `${a.sym} is ${a.dir} ${usd(a.px)}: now ${usd(p)}`;
        store.set('fired', [{ t: Date.now(), msg, seen: false }, ...store.get('fired', [])].slice(0, 50)); toast(esc(msg), 'ok', 9000);
        try { if ('Notification' in window && Notification.permission === 'granted') new Notification('STOCKZ price alert', { body: msg }); } catch {} } }
    if (changed) { const all = store.get('alerts', []); for (const a of all) { const m = al.find(x => x.id === a.id); if (m) a.done = m.done; } store.set('alerts', all); }
  };
  check(); alertTimer = setInterval(() => { if (!document.hidden) check(); }, 30000);
}
export async function watch(main) {
  const fired = store.get('fired', []); store.set('fired', fired.map(f => ({ ...f, seen: true })));
  main.innerHTML = `<div class="ph1"><div><h1>Watchlist & alerts</h1><p>Watch the stocks you care about and get alerted when they cross a price. Alerts run while STOCKZ is open in a tab.</p></div></div>
    <div class="cols"><div class="stack"><div class="panel"><header><h2>Watchlist</h2><a class="sm" href="#/app/markets">Add from Markets</a></header><div class="flush"><table class="tbl"><tbody id="wl"></tbody></table></div></div>
      <div class="panel"><header><h2>Alert history</h2></header><div class="list">${fired.length ? fired.map(f => `<div class="it"><span>${esc(f.msg)}</span><small class="mut">${esc(new Date(f.t).toLocaleString())}</small></div>`).join('') : '<div class="empty2">No alerts have fired yet.</div>'}</div></div></div>
    <div class="stack"><div class="panel"><header><h2>New price alert</h2></header><div class="pad"><label class="fld"><span>Stock</span><select class="inp" id="as">${ALL.map(s => `<option>${s.sym}</option>`).join('')}</select></label>
      <label class="fld"><span>When the price goes</span><select class="inp" id="ad"><option value="above">Above</option><option value="below">Below</option></select></label>
      <label class="fld"><span>Price (USD)</span><input class="inp" id="ap" inputmode="decimal" placeholder="0.00"></label><button class="btn pri wide" id="add">Create alert</button></div></div>
      <div class="panel"><header><h2>Active alerts</h2></header><div class="list" id="al"></div></div></div></div>`;
  const drawW = async () => { const l = watchList().map(bySym).filter(Boolean), M = await tokens(l.map(s => s.mint));
    $('#wl', main).innerHTML = l.length ? l.map(s => { const t = M[s.mint]; return `<tr><td><span class="tic">${logo(s)}<span><b>${esc(s.name)}</b><small>${s.sym}</small></span></span></td><td class="r num"><b data-live-px="${s.mint}">${usd(price(t))}</b></td><td class="r num ${tone(chg24(t))}">${pct(chg24(t))}</td><td class="r"><canvas class="spark" data-m="${s.mint}"></canvas></td><td class="r" style="white-space:nowrap"><a class="btn pri sm" href="#/app/trade/${s.sym}">Trade</a> <button class="btn ghost sm" data-rm="${s.sym}">Remove</button></td></tr>`; }).join('') : '<tr><td class="empty2">Your watchlist is empty.</td></tr>';
    $$('[data-rm]', main).forEach(b => b.onclick = () => { toggleWatch(b.dataset.rm); drawW(); });
    $$('#wl canvas', main).forEach(cv => candles(cv.dataset.m, 'hour', 1, 48).then(c => spark(cv, c.map(x => x.c))).catch(() => {})); };
  const drawA = () => { const al = store.get('alerts', []); $('#al', main).innerHTML = al.length ? al.map(a => `<div class="it"><span><b>${a.sym}</b> ${a.dir} ${usd(a.px)} ${a.done ? '<span class="pill g">Fired</span>' : '<span class="pill">Active</span>'}</span><button class="btn ghost sm" data-x="${a.id}">Delete</button></div>`).join('') : '<div class="empty2">No alerts yet.</div>';
    $$('[data-x]', main).forEach(b => b.onclick = () => { store.set('alerts', store.get('alerts', []).filter(a => a.id !== b.dataset.x)); drawA(); }); };
  $('#add', main).onclick = async () => { const px = parseFloat($('#ap', main).value); if (!(px > 0)) return toast('Enter a price above 0.', 'err');
    try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch {}
    store.set('alerts', [...store.get('alerts', []), { id: Math.random().toString(36).slice(2), sym: $('#as', main).value, dir: $('#ad', main).value, px, t: Date.now() }]); $('#ap', main).value = ''; drawA(); toast('Alert created', 'ok'); };
  drawW(); drawA();
}
