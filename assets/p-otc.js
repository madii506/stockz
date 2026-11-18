// STOCKZ · the OTC desk (the d3sk engine): swap a bag for a stock wallet to wallet, one transaction, two signatures
import { $, $$, esc, usd, pct, num, short, ago, ICON, BASKET, SOL, USDC, bySym, toast, copy, solscan } from './core.js';
import { tokens, price } from './net.js';
import { signAll, signMessage } from './wallet.js';

const get = async (a, q = '') => { const r = await fetch('/api/otc?a=' + a + q); const j = await r.json().catch(() => ({ error: 'bad response' })); if (!r.ok || j.error) throw new Error(j.error || r.statusText); return j; };
const post = async (a, b) => { const r = await fetch('/api/otc?a=' + a, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); const j = await r.json().catch(() => ({ error: 'bad response' })); if (!r.ok || j.error) throw new Error(j.error || r.statusText); return j; };
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const signTxs = async list => (await signAll(list.map(unb64))).map(b64);
const signMsg = async text => { const s = await signMessage(text); if (!s) throw new Error('Your wallet can’t sign messages. Try Phantom, Solflare or Backpack.'); return b64(new Uint8Array(s)); };
const TL = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/';
const CASH = [{ sym: 'SOL', name: 'Solana', mint: SOL, logo: TL + SOL + '/logo.png' }, { sym: 'USDC', name: 'USD Coin', mint: USDC, logo: TL + USDC + '/logo.png' }];
const tlogo = (icon, sym, n = 34) => icon ? `<img src="${esc(icon)}" alt="" width="${n}" height="${n}" style="border-radius:50%;flex:none" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${esc((sym || '?').slice(0, 4))}'}))">` : `<span class="ph" style="width:${n}px;height:${n}px">${esc((sym || '?').slice(0, 4))}</span>`;
const iconOf = (mint, M) => (M && M[mint] && M[mint].icon) || ((BASKET.find(s => s.mint === mint) || CASH.find(s => s.mint === mint) || {}).logo) || '';
const left = t => { const s = (t - Date.now()) / 1000; return s <= 0 ? 'expired' : s < 3600 ? Math.ceil(s / 60) + ' min left' : s < 86400 ? Math.ceil(s / 3600) + ' h left' : Math.ceil(s / 86400) + ' days left'; };
const TABS = [['book', 'The book'], ['new', 'New offer'], ['private', 'Private deal'], ['inbox', 'Inbox'], ['settled', 'Settled']];
const head = (cur, ctx) => `<div class="ph1"><div><h1>OTC desk</h1><p>Swap a bag for a stock, wallet to wallet. One transaction, two signatures, no pool and no slippage.</p></div><a class="btn pink sm" href="#/app/otc/new">${ICON.swap} Post an offer</a></div>
  <div class="panel" style="margin-bottom:18px"><div class="tabs">${TABS.map(([k, t]) => `<button data-go="${k}" class="${k === cur ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
const wireTabs = (main, ctx) => $$('[data-go]', main).forEach(b => b.onclick = () => ctx.nav('otc' + (b.dataset.go === 'book' ? '' : '/' + b.dataset.go)));

// start a trade: the wallet that starts signs first against its nonce; the other wallet's signature settles it
async function startTrade(ctx, payload, st) {
  const me = await ctx.wallet(); st('Building the trade…');
  let r = await post('buildTicket', { wallet: me, ...payload });
  if (r.needsNonce) { st(`First time on the desk: one setup transaction creates your trade slot (${num(r.rentSol, 4)} SOL rent, refundable).`); await post('send', { txs: await signTxs(r.txs) }); st('Building the trade…'); r = await post('buildTicket', { wallet: me, ...payload }); if (r.needsNonce) throw new Error('Your trade slot is still being created. Try again in a moment.'); }
  st(`Sign the trade: you give ${num(r.give.ui)} ${esc(r.give.symbol)} and get ${num(r.get.ui)} ${esc(r.get.symbol)}${r.feeSol ? `, desk fee ${num(r.feeSol, 5)} SOL` : ''}.`);
  const [signed] = await signTxs(r.txs); st('Saving your signed trade…');
  return post('submitTicket', { tx: signed, offerId: r.offerId || payload.offerId || null, note: payload.note || '' });
}
const offerRow = (o, M, me) => { const prem = o.wantUsd != null && o.giveUsd ? (o.wantUsd / o.giveUsd - 1) * 100 : null, mine = me && o.maker === me;
  return `<tr class="click" data-o="${o.id}"><td><span class="tic">${tlogo(iconOf(o.give.mint, M), o.give.symbol)}<span><b>${num(o.give.ui)} ${esc(o.give.symbol)}</b><small>${usd(o.giveUsd)}</small></span></span></td>
    <td style="color:var(--mut)">${ICON.swap}</td><td><span class="tic">${tlogo(iconOf(o.want.mint, M), o.want.symbol)}<span><b>${num(o.want.ui)} ${esc(o.want.symbol)}</b><small>${usd(o.wantUsd)}</small></span></span></td>
    <td class="r hide-s num ${prem == null ? '' : prem >= 0 ? 'up' : 'dn'}">${prem == null ? '—' : pct(prem, 1)}</td><td class="hide-s"><span class="mono sm">${esc(short(o.maker))}</span><small class="mut" style="display:block">${o.status === 'open' ? esc(left(o.expires)) : esc(o.status)}</small></td>
    <td class="r">${mine ? '<span class="pill">Yours</span>' : o.status === 'open' ? `<button class="btn pri sm" data-take="${o.id}">Take</button>` : `<span class="pill">${esc(o.status)}</span>`}</td></tr>`; };

export async function otc(main, ctx, rest) {
  const [view, id] = rest;
  if (view === 'new' || view === 'private') return newOffer(main, ctx, view === 'private');
  if (view === 'inbox') return inbox(main, ctx);
  if (view === 'settled') return settled(main, ctx);
  if (view === 'o' && id) return offerPage(main, ctx, id);
  if (view === 't' && id) return ticketPage(main, ctx, id);
  return book(main, ctx);
}

async function book(main, ctx) {
  let f = 'all', q = '', L = [], M = {};
  main.innerHTML = head('book', ctx) + `<div class="cols"><div class="panel"><header><h2>Open offers</h2><div class="rt"><span class="seg" id="bf">${[['all', 'All'], ['stock', 'For stocks'], ['cash', 'For SOL / USDC'], ['mine', 'Mine']].map(([k, t]) => `<button data-k="${k}" class="${k === f ? 'on' : ''}">${t}</button>`).join('')}</span></div></header>
    <div class="pad" style="padding-bottom:0"><input class="inp" id="bq" placeholder="Filter by symbol" style="height:40px;max-width:260px"></div>
    <div class="flush"><table class="tbl"><thead><tr><th>They give</th><th></th><th>They want</th><th class="r hide-s">vs market</th><th class="hide-s">Maker</th><th></th></tr></thead><tbody id="bl"><tr><td colspan="6" class="empty2">Reading the desk…</td></tr></tbody></table></div></div>
    <div class="stack"><div class="panel"><header><h2>How a desk trade settles</h2></header><div class="pad"><div class="steps"><div class="step"><div><h4>Post or take</h4><p>Posting is free: you sign a message and nothing moves.</p></div></div><div class="step"><div><h4>The taker signs first</h4><p>Against a one-time nonce, so the signature stays valid until it settles.</p></div></div><div class="step"><div><h4>The maker settles</h4><p>Both legs land in one transaction, or nothing moves at all.</p></div></div></div></div></div>
      <div class="panel"><header><h2>Desk stats</h2></header><div class="pad"><dl class="kv" id="ds"><dt>Open offers</dt><dd>—</dd><dt>Settled trades</dt><dd>—</dd><dt>Volume</dt><dd>—</dd><dt>Desk fee</dt><dd>—</dd></dl></div></div></div></div>`;
  wireTabs(main, ctx);
  const isStock = m => !!BASKET.find(s => s.mint === m) || !!bySym((Object.values(M).find(t => t.id === m) || {}).symbol || ''), isCash = m => m === SOL || m === USDC;
  const draw = () => { const me = ctx.S && ctx.S.address; let R = L.filter(o => f === 'mine' ? o.maker === me : o.status === 'open' && (!o.private || o.private === me || o.maker === me));
    if (f === 'stock') R = R.filter(o => isStock(o.give.mint) || isStock(o.want.mint)); if (f === 'cash') R = R.filter(o => isCash(o.give.mint) || isCash(o.want.mint));
    if (q) R = R.filter(o => (o.give.symbol + ' ' + o.want.symbol).toLowerCase().includes(q));
    $('#bl', main).innerHTML = R.length ? R.map(o => offerRow(o, M, me)).join('') : `<tr><td colspan="6" class="empty2">${f === 'mine' ? 'You have no offers yet.' : 'No open offers here yet.'} <a href="#/app/otc/new">Post the first one</a></td></tr>`;
    $$('#bl tr[data-o]', main).forEach(tr => tr.onclick = e => { if (e.target.closest('[data-take]')) return; ctx.nav('otc/o/' + tr.dataset.o); });
    $$('[data-take]', main).forEach(b => b.onclick = e => { e.stopPropagation(); take(ctx, b.dataset.take, b); }); };
  $$('#bf button', main).forEach(b => b.onclick = () => { f = b.dataset.k; $$('#bf button', main).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#bq', main).oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  try { L = (await get('offers')).offers || []; M = await tokens([...new Set(L.flatMap(o => [o.give.mint, o.want.mint]))]); draw(); }
  catch (e) { $('#bl', main).innerHTML = `<tr><td colspan="6"><div class="note r">${ICON.help}<span>The desk is unavailable: ${esc(e.message)}</span></div></td></tr>`; }
  get('stats').then(s => { $('#ds', main).innerHTML = `<dt>Open offers</dt><dd>${num(s.openOffers)}</dd><dt>Settled trades</dt><dd>${num(s.trades)}</dd><dt>Volume</dt><dd>${usd(s.volumeUsd, 0)}</dd><dt>Desk fee</dt><dd>${s.feeBps ? (s.feeBps / 100).toFixed(2) + '% in SOL' : 'None'}</dd>`; }).catch(() => {});
}
async function take(ctx, id, btn) {
  if (!ctx.S) return ctx.actions.needSignIn('otc');
  const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  try { const s = await startTrade(ctx, { offerId: id }, m => toast(m, '', 6000)); toast('Signed. The maker’s signature settles it.', 'ok'); ctx.nav('otc/t/' + s.id); }
  catch (e) { toast(esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message), 'err', 8000); btn.disabled = false; btn.innerHTML = old; }
}

async function newOffer(main, ctx, priv) {
  const NT = { give: null, get: BASKET[0].mint, ga: '', wa: '', to: '', hours: 72, note: '' };
  main.innerHTML = head(priv ? 'private' : 'new', ctx) + `<div class="cols"><div class="panel"><header><h2>${priv ? 'A private deal with one wallet' : 'Post a public offer'}</h2></header><div class="pad">
      <label class="fld"><span>You give</span><select class="inp" id="gv"><option value="">${ctx.S ? 'Loading your balances…' : 'Sign in to pick from your wallet'}</option></select></label>
      <div style="display:flex;gap:8px;margin:-6px 0 14px"><input class="inp num" id="ga" inputmode="decimal" placeholder="Amount"><button class="btn ghost" id="mx" type="button">Max</button></div>
      <label class="fld"><span>You want</span><select class="inp" id="wt">${[...BASKET.map(s => [s.mint, s.sym + ' · ' + s.name]), [USDC, 'USDC · USD Coin'], [SOL, 'SOL · Solana'], ['custom', 'Another token (paste its mint)']].map(([m, t]) => `<option value="${m}">${esc(t)}</option>`).join('')}</select></label>
      <input class="inp mono" id="cm" placeholder="Token mint address" style="display:none;margin:-6px 0 14px">
      <div style="display:flex;gap:8px;margin:-6px 0 14px"><input class="inp num" id="wa" inputmode="decimal" placeholder="Amount you want"><button class="btn ghost" id="fair" type="button">At market</button></div>
      ${priv ? `<label class="fld"><span>Their wallet (only they can settle)</span><input class="inp mono" id="to" placeholder="Solana address"></label>` : `<label class="fld"><span>Open for</span><select class="inp" id="hr">${[[24, '1 day'], [72, '3 days'], [168, '7 days'], [720, '30 days']].map(([h, t]) => `<option value="${h}" ${h === 72 ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`}
      <label class="fld"><span>Note (optional)</span><input class="inp" id="nt" maxlength="140" placeholder="e.g. partial is fine, DM me"></label></div></div>
    <div class="stack"><div class="panel"><header><h2>Summary</h2></header><div class="pad"><dl class="kv" id="sm"></dl><div class="note g" style="margin:14px 0">${ICON.shield}<span>${priv ? 'You sign the trade now. It waits for their wallet, and only theirs. You can cancel any time before they sign.' : 'Posting is free: you sign a message and nothing moves. When someone takes it, they sign first and your signature settles it.'}</span></div>
      <button class="btn pri wide lg" id="go">${priv ? 'Sign the deal' : 'Sign and post the offer'}</button><div class="sm mut" id="st" style="margin-top:10px"></div></div></div></div></div>`;
  wireTabs(main, ctx);
  const H = ctx.S ? await ctx.hold(false).catch(() => null) : null;
  const assets = H ? [{ sym: 'SOL', mint: SOL, ui: Math.max(0, H.sol - .02), usd: H.solUsd, px: H.solPx }, ...H.cash, ...H.stocks, ...H.other].filter(a => a.ui > 0) : [];
  if (ctx.S) $('#gv', main).innerHTML = assets.length ? assets.map(a => `<option value="${a.mint}">${esc(a.sym)} · ${num(a.ui)} in your wallet</option>`).join('') : '<option value="">Your wallet is empty</option>';
  NT.give = assets[0] ? assets[0].mint : null;
  let M = await tokens([...new Set([...assets.map(a => a.mint), ...BASKET.map(s => s.mint), USDC, SOL])]);
  const pxOf = m => price(M[m]), symOf = m => (assets.find(a => a.mint === m) || BASKET.find(s => s.mint === m) || CASH.find(c => c.mint === m) || {}).sym || (M[m] && M[m].symbol) || short(m);
  const sum = () => { const ga = +NT.ga, wa = +NT.wa, vA = pxOf(NT.give) != null && ga > 0 ? ga * pxOf(NT.give) : null, vB = pxOf(NT.get) != null && wa > 0 ? wa * pxOf(NT.get) : null, prem = vA && vB ? (vB / vA - 1) * 100 : null, have = (assets.find(a => a.mint === NT.give) || {}).ui;
    $('#sm', main).innerHTML = `<dt>You give</dt><dd>${ga > 0 ? num(ga) + ' ' + esc(symOf(NT.give)) : '—'}</dd><dt>Value</dt><dd>${usd(vA)}</dd><dt>You get</dt><dd>${wa > 0 && NT.get ? num(wa) + ' ' + esc(symOf(NT.get)) : '—'}</dd><dt>Value</dt><dd>${usd(vB)}</dd><dt>vs market</dt><dd class="${prem == null ? '' : prem >= 0 ? 'up' : 'dn'}">${prem == null ? '—' : pct(prem, 1)}</dd>`
      + (have != null && ga > have ? `<dt></dt><dd class="dn">You hold ${num(have)}</dd>` : ''); };
  $('#gv', main).onchange = e => { NT.give = e.target.value; sum(); };
  $('#ga', main).oninput = e => { NT.ga = e.target.value; sum(); }; $('#wa', main).oninput = e => { NT.wa = e.target.value; sum(); };
  $('#mx', main).onclick = () => { const a = assets.find(x => x.mint === NT.give); if (a) { NT.ga = String(+a.ui.toFixed(6)); $('#ga', main).value = NT.ga; sum(); } };
  $('#wt', main).onchange = e => { const v = e.target.value; $('#cm', main).style.display = v === 'custom' ? '' : 'none'; NT.get = v === 'custom' ? ($('#cm', main).value.trim() || null) : v; sum(); };
  $('#cm', main).oninput = async e => { const m = e.target.value.trim(); if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m)) { NT.get = m; M = { ...M, ...(await tokens([m])) }; sum(); } };
  $('#fair', main).onclick = () => { const a = pxOf(NT.give), b = pxOf(NT.get); if (a == null || b == null || !(+NT.ga > 0)) return toast('Pick both tokens and an amount first.', 'err'); NT.wa = String(+(NT.ga * a / b).toPrecision(6)); $('#wa', main).value = NT.wa; sum(); };
  const to = $('#to', main); if (to) to.oninput = e => { NT.to = e.target.value.trim(); }; const hr = $('#hr', main); if (hr) hr.onchange = e => { NT.hours = +e.target.value; };
  $('#nt', main).oninput = e => { NT.note = e.target.value; };
  sum();
  $('#go', main).onclick = async () => {
    if (!ctx.S) return ctx.actions.needSignIn('otc/' + (priv ? 'private' : 'new'));
    const st = m => { $('#st', main).innerHTML = m; }, b = $('#go', main);
    if (!NT.give || !(+NT.ga > 0) || !NT.get || !(+NT.wa > 0)) return toast('Fill in both sides of the trade.', 'err');
    if (priv && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(NT.to)) return toast('Paste their wallet address.', 'err');
    b.disabled = true;
    try {
      if (priv) { const s = await startTrade(ctx, { counterparty: NT.to, give: { mint: NT.give, amount: +NT.ga }, get: { mint: NT.get, amount: +NT.wa }, note: NT.note }, st); toast('Signed. Send them the link: their signature settles it.', 'ok', 8000); ctx.nav('otc/t/' + s.id); return; }
      const me = await ctx.wallet(); st('Preparing your offer…');
      const p = await post('prepareOffer', { wallet: me, give: { mint: NT.give, amount: +NT.ga }, get: { mint: NT.get, amount: +NT.wa }, hours: NT.hours, note: NT.note });
      st('Sign the message in your wallet. It’s free and nothing moves.'); const sig = await signMsg(p.message);
      st('Posting…'); const r = await post('postOffer', { offer: p.offer, sig, enc: 'base64' }); toast('Your offer is on the desk.', 'ok'); try { localStorage.setItem('stockz:otc:posted:' + me, 'true'); } catch {} ctx.nav('otc/o/' + r.id);
    } catch (e) { st(`<span class="dn">${esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message)}</span>`); b.disabled = false; }
  };
}

async function offerPage(main, ctx, id) {
  main.innerHTML = head('book', ctx) + '<div class="panel"><div class="pad"><div class="skel" style="height:140px"></div></div></div>'; wireTabs(main, ctx);
  let o; try { o = (await get('offer', '&id=' + encodeURIComponent(id))).offer; } catch (e) { main.innerHTML = head('book', ctx) + `<div class="note r">${ICON.help}<span>${esc(e.message)}</span></div>`; wireTabs(main, ctx); return; }
  const M = await tokens([o.give.mint, o.want.mint]), me = ctx.S && ctx.S.address, mine = me === o.maker, prem = o.wantUsd != null && o.giveUsd ? (o.wantUsd / o.giveUsd - 1) * 100 : null;
  main.innerHTML = head('book', ctx) + `<div class="cols"><div class="stack"><div class="panel"><header><h2>Offer ${esc(o.id)}</h2><span class="pill ${o.status === 'open' ? 'g' : ''}">${esc(o.status)}</span></header><div class="pad">
      <div class="grid2" style="gap:14px;align-items:center"><div class="card" style="padding:16px"><div class="sm mut">The maker gives</div><div class="tic" style="margin-top:8px">${tlogo(iconOf(o.give.mint, M), o.give.symbol, 42)}<span><b style="font-size:18px">${num(o.give.ui)} ${esc(o.give.symbol)}</b><small>${usd(o.giveUsd)}</small></span></div><div style="margin-top:8px">${o.funded === false ? '<span class="pill r">Not in their wallet right now</span>' : o.funded ? '<span class="pill g">In their wallet now</span>' : ''}</div></div>
        <div class="card" style="padding:16px"><div class="sm mut">The taker gives</div><div class="tic" style="margin-top:8px">${tlogo(iconOf(o.want.mint, M), o.want.symbol, 42)}<span><b style="font-size:18px">${num(o.want.ui)} ${esc(o.want.symbol)}</b><small>${usd(o.wantUsd)}</small></span></div><div class="sm ${prem == null ? 'mut' : prem >= 0 ? 'up' : 'dn'}" style="margin-top:8px">${prem == null ? 'Unpriced' : pct(prem, 1) + ' vs market'}</div></div></div>
      <dl class="kv" style="margin-top:16px"><dt>Maker</dt><dd class="mono">${esc(short(o.maker))}</dd><dt>Posted</dt><dd>${esc(ago(o.created))}</dd><dt>Expires</dt><dd>${o.status === 'open' ? esc(left(o.expires)) : '—'}</dd>${o.private ? `<dt>Private to</dt><dd class="mono">${esc(short(o.private))}</dd>` : ''}${o.note ? `<dt>Note</dt><dd>“${esc(o.note)}”</dd>` : ''}</dl>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">${o.status === 'open' && !mine ? `<button class="btn pri" id="tk">Take this offer</button>` : ''}${mine && o.status === 'open' ? '<button class="btn ghost" id="cx">Cancel offer</button>' : ''}<button class="btn ghost" id="cp">Copy link</button></div><div class="sm mut" id="st" style="margin-top:10px"></div></div></div></div>
    <div class="stack"><div class="panel"><header><h2>${mine ? 'Takers waiting for you' : 'Takers'}</h2></header><div class="list">${(o.pending || []).length ? o.pending.map(p => `<a class="it" href="#/app/otc/t/${p.id}" style="color:inherit;text-decoration:none"><span><b class="mono">${esc(short(p.taker))}</b><small class="mut" style="display:block">signed ${esc(ago(p.created))}</small></span><span class="btn sm ${mine ? 'pri' : 'ghost'}">${mine ? 'Review and sign' : 'View'}</span></a>`).join('') : `<div class="empty2">${o.fill ? `Filled by ${esc(short(o.fill.taker))} · <a href="${solscan(o.fill.sig)}" target="_blank" rel="noopener">Solscan</a>` : 'Nobody has signed this one yet.'}</div>`}</div></div></div></div>`;
  wireTabs(main, ctx);
  $('#cp', main).onclick = () => copy(location.href);
  const tk = $('#tk', main); if (tk) tk.onclick = () => take(ctx, o.id, tk);
  const cx = $('#cx', main); if (cx) cx.onclick = async () => { const st = m => $('#st', main).innerHTML = m;
    try { const p = await post('prepareCancelOffer', { wallet: ctx.S.address, id: o.id }); st('Sign the message…'); const sig = await signMsg(p.message); await post('cancelOffer', { id: o.id, sig, enc: 'base64' }); toast('Offer cancelled', 'ok'); offerPage(main, ctx, id); } catch (e) { st(`<span class="dn">${esc(e.message)}</span>`); } };
}

async function ticketPage(main, ctx, id) {
  main.innerHTML = head('inbox', ctx) + '<div class="panel"><div class="pad"><div class="skel" style="height:160px"></div></div></div>'; wireTabs(main, ctx);
  let d; try { d = await get('ticket', '&id=' + encodeURIComponent(id)); } catch (e) { main.innerHTML = head('inbox', ctx) + `<div class="note r">${ICON.help}<span>${esc(e.message)}</span></div>`; wireTabs(main, ctx); return; }
  const t = d.ticket, s = d.status, me = ctx.S && ctx.S.address, isA = me === t.a, isB = me === t.b, A = d.tokens.a, B = d.tokens.b;
  const title = { open: isB ? 'Waiting for your signature' : 'Waiting for the other wallet', settled: 'Settled in one transaction', void: 'Cancelled', failed: 'This trade failed' }[s] || s;
  const warn = [...(A.warn || []).map(w => A.symbol + ': ' + w), ...(B.warn || []).map(w => B.symbol + ': ' + w)];
  main.innerHTML = head('inbox', ctx) + `<div class="panel"><header><h2>${esc(title)}</h2><span class="pill ${s === 'settled' ? 'g' : s === 'open' ? 'p' : 'r'}">${esc(s)}</span></header><div class="pad">
    <div class="grid2" style="gap:14px"><div class="card" style="padding:16px"><div class="sm mut">${isA ? 'You give' : 'They give'} · ${esc(short(t.a))}</div><div class="tic" style="margin-top:8px">${tlogo(A.icon, A.symbol, 42)}<span><b style="font-size:18px">${num(t.legA.ui)} ${esc(A.symbol)}</b><small>${usd(d.values.a)}</small></span></div><div class="sm up" style="margin-top:8px">${ICON.check} Signed first</div></div>
      <div class="card" style="padding:16px"><div class="sm mut">${isB ? 'You give' : 'They give'} · ${esc(short(t.b))}</div><div class="tic" style="margin-top:8px">${tlogo(B.icon, B.symbol, 42)}<span><b style="font-size:18px">${num(t.legB.ui)} ${esc(B.symbol)}</b><small>${usd(d.values.b)}</small></span></div><div class="sm ${s === 'settled' ? 'up' : 'mut'}" style="margin-top:8px">${s === 'settled' ? 'Signed and settled' : s === 'open' ? 'Their signature settles it' : '—'}</div></div></div>
    ${t.note ? `<div class="note" style="margin-top:14px">“${esc(t.note)}”</div>` : ''}${warn.length ? `<div class="note w" style="margin-top:14px">${ICON.shield}<span>${warn.map(esc).join('<br>')}</span></div>` : ''}
    ${s === 'open' && d.sim ? (d.sim.ok ? `<div class="note g" style="margin-top:14px">${ICON.check}<span>Simulated just now on Solana: both legs go through.</span></div>` : `<div class="note r" style="margin-top:14px">${ICON.help}<span>Simulated just now: it would fail. One side may not hold enough right now.</span></div>`) : ''}
    <dl class="kv" style="margin-top:14px"><dt>Desk fee</dt><dd>${t.feeLamports ? num(t.feeLamports / 1e9, 6) + ' SOL, paid by the starter' : 'None'}</dd><dt>Nonce</dt><dd class="mono">${esc(short(t.nonceAccount))} (slot ${t.slot})</dd>${s === 'settled' && t.sig ? `<dt>Transaction</dt><dd><a href="${solscan(t.sig)}" target="_blank" rel="noopener">${esc(short(t.sig))}</a></dd>` : ''}</dl>
    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">${s === 'open' && isB ? '<button class="btn pri" id="sg">Sign and settle</button>' : ''}${s === 'open' && !me ? '<button class="btn pri" data-signin>Sign in to sign</button>' : ''}${s === 'open' && isA ? '<button class="btn ghost" id="cx">Cancel trade</button>' : ''}<button class="btn ghost" id="cp">Copy link</button></div><div class="sm mut" id="st" style="margin-top:10px"></div></div></div>`;
  wireTabs(main, ctx); $$('[data-signin]', main).forEach(b => b.onclick = () => ctx.actions.needSignIn('otc/t/' + id));
  $('#cp', main).onclick = () => copy(location.href);
  const st = m => $('#st', main).innerHTML = m;
  const sg = $('#sg', main); if (sg) sg.onclick = async () => { sg.disabled = true; try { await ctx.wallet(); st('Check your wallet…'); const [signed] = await signTxs([t.tx]); st('Sending…'); const r = await post('send', { txs: [signed] }); toast('Settled in one transaction', 'ok'); st(`Settled. <a href="${solscan(r.sigs[0])}" target="_blank" rel="noopener">Solscan</a>`); ctx.hold(true); setTimeout(() => ticketPage(main, ctx, id), 2500); } catch (e) { st(`<span class="dn">${esc(e.message)}</span>`); sg.disabled = false; } };
  const cx = $('#cx', main); if (cx) cx.onclick = async () => { try { await ctx.wallet(); const r = await post('buildCancel', { wallet: ctx.S.address, id: t.id }); st('Check your wallet…'); await post('send', { txs: await signTxs(r.txs) }); st('Cancelled: this trade can never settle now.'); setTimeout(() => ticketPage(main, ctx, id), 1500); } catch (e) { st(`<span class="dn">${esc(e.message)}</span>`); } };
}

async function inbox(main, ctx) {
  main.innerHTML = head('inbox', ctx) + (ctx.S ? '<div id="ib"><div class="panel"><div class="pad"><div class="skel" style="height:120px"></div></div></div></div>' : ctx.guestPanel('see your trades')); wireTabs(main, ctx);
  if (!ctx.S) return;
  const me = ctx.S.address;
  try {
    const [T, O] = await Promise.all([get('tickets', '&wallet=' + me).then(r => r.tickets || []), get('offers').then(r => (r.offers || []).filter(o => o.maker === me)).catch(() => [])]);
    const M = await tokens([...new Set(T.flatMap(t => [t.legA.mint, t.legB.mint]))]);
    const row = t => { const mineA = t.role === 'started', g = mineA ? t.legA : t.legB, w = mineA ? t.legB : t.legA; return `<a class="it" href="#/app/otc/t/${t.id}" style="color:inherit;text-decoration:none"><span class="tic">${tlogo(iconOf(g.mint, M), g.symbol)}<span><b>${num(g.ui)} ${esc(g.symbol)} → ${num(w.ui)} ${esc(w.symbol)}</b><small>with ${esc(short(mineA ? t.b : t.a))} · ${esc(ago(t.created))}</small></span></span><span class="pill ${t.status === 'settled' ? 'g' : t.status === 'open' ? 'p' : 'r'}">${t.status === 'open' && t.role === 'counterparty' ? 'Sign now' : esc(t.status)}</span></a>`; };
    const need = T.filter(t => t.role === 'counterparty' && t.status === 'open'), wait = T.filter(t => t.role === 'started' && t.status === 'open'), done = T.filter(t => t.status !== 'open');
    $('#ib', main).innerHTML = `<div class="cols"><div class="stack">${[['Needs your signature', need], ['Waiting on them', wait], ['History', done.slice(0, 30)]].map(([h, l]) => `<div class="panel"><header><h2>${h}</h2><span class="pill">${l.length}</span></header><div class="list">${l.map(row).join('') || '<div class="empty2">Nothing here.</div>'}</div></div>`).join('')}</div>
      <div class="stack"><div class="panel"><header><h2>Your offers</h2><span class="pill">${O.length}</span></header><div class="list">${O.map(o => `<a class="it" href="#/app/otc/o/${o.id}" style="color:inherit;text-decoration:none"><span><b>${num(o.give.ui)} ${esc(o.give.symbol)} for ${num(o.want.ui)} ${esc(o.want.symbol)}</b><small class="mut" style="display:block">${esc(o.status)}${o.status === 'open' ? ' · ' + esc(left(o.expires)) : ''}</small></span><span class="pill">${(o.pending || []).length} waiting</span></a>`).join('') || '<div class="empty2">No offers yet. <a href="#/app/otc/new">Post one</a></div>'}</div></div>
      <div class="panel"><header><h2>Trade slots</h2></header><div class="pad" id="ns"><span class="mut sm">Reading…</span></div></div></div></div>`;
    get('nonces', '&wallet=' + me).then(r => { const N = r.nonces || [], ex = N.filter(n => n.exists);
      $('#ns', main).innerHTML = `<p class="sm mut" style="margin:0 0 10px">Each trade you start uses one slot, so your signature stays valid until it settles or you cancel. You have ${ex.length} of 8, holding ${num(ex.reduce((a, n) => a + n.lamports, 0) / 1e9, 5)} SOL of rent.</p><div style="display:flex;flex-wrap:wrap;gap:6px">${N.map(n => `<span class="pill ${n.busy ? 'p' : n.exists ? 'g' : ''}">Slot ${n.slot} · ${n.busy ? 'in use' : n.exists ? 'free' : 'none'}</span>`).join('')}</div>${ex.some(n => !n.busy) ? '<button class="btn ghost sm" id="nr" style="margin-top:12px">Close free slots and refund</button>' : ''}`;
      const nr = $('#nr', main); if (nr) nr.onclick = async () => { try { await ctx.wallet(); const b = await post('buildNonceRefund', { wallet: me }); await post('send', { txs: await signTxs(b.txs) }); toast(`Refunded ${num(b.sol, 5)} SOL`, 'ok'); inbox(main, ctx); } catch (e) { toast(esc(e.message), 'err'); } }; }).catch(e => { $('#ns', main).innerHTML = `<span class="mut sm">${esc(e.message)}</span>`; });
  } catch (e) { $('#ib', main).innerHTML = `<div class="note r">${ICON.help}<span>Your trades are unavailable: ${esc(e.message)}</span></div>`; }
}

async function settled(main, ctx) {
  main.innerHTML = head('settled', ctx) + `<div class="panel"><header><h2>Every settled desk trade</h2><span class="sm mut">Read from the chain: each one pays 0 SOL to one fixed address</span></header><div class="flush"><table class="tbl"><thead><tr><th>Leg A</th><th></th><th>Leg B</th><th class="r hide-s">Value</th><th class="r hide-s">When</th><th></th></tr></thead><tbody id="sl"><tr><td colspan="6" class="empty2">Reading the chain…</td></tr></tbody></table></div></div>`;
  wireTabs(main, ctx);
  try { const d = await get('settled'); const L = d.trades || [];
    $('#sl', main).innerHTML = L.length ? L.map(r => r.legA ? `<tr><td><span class="tic">${tlogo(r.legA.icon, r.legA.symbol)}<span><b>${num(r.legA.ui)} ${esc(r.legA.symbol)}</b></span></span></td><td style="color:var(--mut)">${ICON.swap}</td><td><span class="tic">${tlogo(r.legB.icon, r.legB.symbol)}<span><b>${num(r.legB.ui)} ${esc(r.legB.symbol)}</b></span></span></td><td class="r hide-s num">${usd(r.usd)}</td><td class="r hide-s mut sm">${r.at ? esc(ago(r.at * 1000)) : '—'}</td><td class="r"><a class="btn ghost sm" href="${solscan(r.sig)}" target="_blank" rel="noopener">Solscan</a></td></tr>` : '').join('') : '<tr><td colspan="6" class="empty2">No settled trades yet. The first one shows up here the moment it lands.</td></tr>';
  } catch (e) { $('#sl', main).innerHTML = `<tr><td colspan="6"><div class="note r">${ICON.help}<span>${esc(e.message)}</span></div></td></tr>`; }
}
