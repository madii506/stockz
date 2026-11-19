// STOCKZ · the launchpad: a pump.fun coin whose curve is priced in a GTA stock, and every coin launched here
import { $, $$, esc, usd, num, pct, tone, short, ago, ICON, BASKET, SOL, CONFIG, bySym, toast, copy, solscan } from './core.js';
import { api, tokens, price, chg24, vol24, rpc, confirm, order, execute, candles, stockzCoins } from './net.js';
import { area } from './chart.js';
import { signAll } from './wallet.js';
import { web3 } from './p-more.js';
import { addReceipt } from './p-accounts.js';

const SOLQ = { sym: 'SOL', name: 'Solana', mint: SOL, logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' };
const logo = s => s.logo ? `<img src="${s.logo}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${s.sym}'}))">` : `<span class="ph" data-mint="${s.mint}">${s.sym}</span>`;
const b64e = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export async function launch(main, ctx, rest) {
  let pick = (rest[0] && bySym(rest[0].toUpperCase())) ? rest[0].toUpperCase() : 'TTWO', Q = null, img = null, holder = false;
  main.innerHTML = `<div class="ph1"><div><h1>Launch a coin</h1><p>A pump.fun coin whose bonding curve is priced in a GTA stock. Buyers pay in the stock you pick.</p></div><span class="pill" id="qs"><span class="dot"></span> Reading pump.fun’s list</span></div>
    <div class="cols"><div class="stack"><div class="panel"><header><h2>1 · Price it in</h2></header><div class="pad"><div class="picks" id="qp">${[...BASKET, SOLQ].map(s => `<button data-s="${s.sym}" class="${s.sym === pick ? 'on' : ''}">${logo(s)}${s.sym}<small>checking</small></button>`).join('')}</div>
        <p class="sm mut" style="margin:12px 0 0" id="qn">STOCKZ reads pump.fun’s quote list live. A stock it doesn’t accept yet is greyed out.</p></div></div>
      <div class="panel"><header><h2>2 · Your coin</h2></header><div class="pad">
        <div class="grid2" style="gap:14px"><label class="fld"><span>Name</span><input class="inp" id="nm" maxlength="32" placeholder="e.g. Vice Money"></label><label class="fld"><span>Ticker</span><input class="inp" id="tk" maxlength="10" placeholder="e.g. VMONEY" style="text-transform:uppercase"></label></div>
        <label class="fld"><span>Description</span><textarea class="inp" id="ds" maxlength="500" placeholder="What is your coin about?"></textarea></label>
        <label class="fld"><span>Image</span><div class="drop" id="dp"><div class="th" id="th">${ICON.rocket}</div><div><b>Upload an image</b><div class="sm mut">PNG, JPG, GIF or WEBP, square works best, up to 3 MB</div></div><input type="file" id="fi" accept="image/png,image/jpeg,image/gif,image/webp" hidden></div></label>
        <div class="grid3" style="gap:12px"><label class="fld"><span>Website</span><input class="inp" id="ws" placeholder="https://"></label><label class="fld"><span>X</span><input class="inp" id="xx" placeholder="https://x.com/..."></label><label class="fld"><span>Telegram</span><input class="inp" id="tg" placeholder="https://t.me/..."></label></div></div></div>
      <div class="panel"><header><h2>3 · Launch options</h2></header><div class="pad">
        <label class="fld"><span>First buy (optional), paid in <b id="qsym">${pick}</b></span><div style="display:flex;gap:8px"><input class="inp num" id="fb" inputmode="decimal" placeholder="0"><span class="pill" id="fbb" style="height:46px;border-radius:8px">—</span></div></label>
        <div id="opt"></div>
        <div class="note" style="margin-top:6px">${ICON.shield}<span>Create and the first buy go out in one transaction, so nobody can buy before you. STOCKZ simulates it first and shows you the result.</span></div></div></div></div>
    <div class="stack"><div class="panel"><header><h2>Preview</h2></header><div class="prev"><div class="art" id="pa">Your image</div>
        <div><b style="font-size:20px;color:var(--head)" id="pn">Your coin</b><div class="mut" id="pt">$TICKER</div></div>
        <div class="coincard" style="padding:0;max-width:none;margin:0"><div class="pair" id="pp"></div></div>
        <dl class="kv" id="pk"><dt>Starting market cap</dt><dd>—</dd><dt>Creator fees go to</dt><dd>You</dd><dt>Network</dt><dd>pump.fun on Solana</dd></dl>
        <button class="btn pink wide lg" id="go">${ICON.rocket} Launch coin</button><div id="ps" class="prog"></div></div></div></div></div>`;
  const quoteOf = sym => sym === 'SOL' ? SOLQ : bySym(sym);
  const preview = () => {
    const s = quoteOf(pick), nm = $('#nm', main).value.trim() || 'Your coin', tk = ($('#tk', main).value.trim() || 'TICKER').toUpperCase();
    $('#pn', main).textContent = nm; $('#pt', main).textContent = '$' + tk + ' · priced in ' + s.sym; $('#qsym', main).textContent = s.sym;
    $('#pp', main).innerHTML = `${logo(s)}<div><b>Priced in ${s.sym}</b><div class="mut sm">${esc(s.name)}${s.issuer ? ', tokenized by ' + esc(s.issuer) : ''}</div></div>`;
    const q = Q && Q.quotes.find(x => x.sym === pick), T = Q && Q.T && Q.T[s.mint];
    let mc = '—';
    if (q && q.ivqr && Q.ivtr && T && T.decimals != null && price(T) != null) { const m = (+q.ivqr / 10 ** T.decimals) / (+Q.ivtr / 1e6) * (+Q.supply / 1e6) * price(T); mc = usd(m, 0); }
    $('#pk', main).innerHTML = `<dt>Starting market cap</dt><dd>${mc}</dd><dt>Creator fees go to</dt><dd>${holder ? 'Your holders' : 'You'}, in ${s.sym}</dd><dt>Network</dt><dd>pump.fun on Solana</dd>`;
    const h = ctx.cached(); let bal = null;
    if (h) bal = s.sym === 'SOL' ? h.sol : ((h.stocks.find(r => r.mint === s.mint) || {}).ui || 0);
    $('#fbb', main).textContent = bal == null ? (ctx.S ? '…' : 'Sign in') : 'You have ' + num(bal) + ' ' + s.sym;
  };
  const opts = () => {
    const q = Q && Q.quotes.find(x => x.sym === pick), qc = q && q.source === 'quoteControl';
    $('#opt', main).innerHTML = (Q && Q.creatorFee.configurable && qc && Q.creatorFee.maxBps > 0 ? `<label class="fld"><span>Creator fee: <b id="fv">0.30%</b> of every trade (max ${(Q.creatorFee.maxBps / 100).toFixed(2)}%)</span><input type="range" id="fee" min="5" max="${Q.creatorFee.maxBps}" step="5" value="${Math.min(30, Q.creatorFee.maxBps)}" style="width:100%"></label>` : '')
      + (Q && Q.holderReward && pick !== 'SOL' ? `<label class="chk" style="margin:4px 0 12px"><input type="checkbox" id="hr" ${holder ? 'checked' : ''}> Holder rewards: pay my creator fees to my coin’s holders (permanent)</label>` : '');
    const f = $('#fee', main); if (f) f.oninput = () => { $('#fv', main).textContent = (f.value / 100).toFixed(2) + '%'; };
    const hr = $('#hr', main); if (hr) hr.onchange = () => { holder = hr.checked; preview(); };
  };
  $$('#qp button', main).forEach(b => b.onclick = () => { if (b.disabled) return; pick = b.dataset.s; $$('#qp button', main).forEach(x => x.classList.toggle('on', x === b)); opts(); preview(); });
  ['nm', 'tk', 'ds'].forEach(i => $('#' + i, main).oninput = preview);
  const fi = $('#fi', main); $('#dp', main).onclick = () => fi.click();
  fi.onchange = () => { const f = fi.files[0]; if (!f) return; if (f.size > 3e6) return toast('That image is over 3 MB.', 'err');
    const r = new FileReader(); r.onload = () => { img = r.result; $('#th', main).innerHTML = `<img src="${img}" alt="">`; $('#pa', main).innerHTML = `<img src="${img}" alt="">`; }; r.readAsDataURL(f); };
  // pump.fun's live quote list
  api('launch?a=quotes').then(async q => { Q = q; Q.T = await tokens([...BASKET.map(s => s.mint), SOL]);
    for (const b of $$('#qp button', main)) { const x = q.quotes.find(z => z.sym === b.dataset.s), sm = $('small', b); b.disabled = !(x && x.ok); sm.textContent = x && x.ok ? (x.sym === 'SOL' ? 'classic' : 'accepted') : 'not listed yet'; }
    if (!(q.quotes.find(z => z.sym === pick) || {}).ok) { const first = q.quotes.find(z => z.ok); if (first) { pick = first.sym; $$('#qp button', main).forEach(x => x.classList.toggle('on', x.dataset.s === pick)); } }
    const n = q.quotes.filter(z => z.ok && z.sym !== 'SOL').length; $('#qs', main).className = 'pill ' + (n ? 'g' : 'w'); $('#qs', main).innerHTML = `<span class="dot"></span> ${n} of ${BASKET.length} GTA stocks accepted`;
    $('#qn', main).textContent = `pump.fun accepts ${q.listed} quote assets right now. ${n ? 'Pick one of the GTA stocks it accepts.' : 'None of the GTA stocks are on its list at the moment.'}`;
    if (!q.storage) $('#ps', main).innerHTML = `<div class="note w">${ICON.help}<span>Image storage isn’t switched on for this site yet, so launches are paused. Everything else works.</span></div>`;
    opts(); preview(); }).catch(e => { $('#qs', main).className = 'pill r'; $('#qs', main).innerHTML = '<span class="dot"></span> Quote list unavailable'; $('#qn', main).textContent = 'Could not read pump.fun’s list: ' + e.message; });
  if (ctx.S) ctx.hold(false).then(preview).catch(() => {});
  preview();
  $('#go', main).onclick = async () => {
    if (!ctx.S) return ctx.actions.needSignIn('launch/' + pick);
    const name = $('#nm', main).value.trim(), symbol = $('#tk', main).value.trim().toUpperCase(), buy = $('#fb', main).value.trim();
    if (!name || !symbol) return toast('Add a name and a ticker.', 'err'); if (!img) return toast('Add an image.', 'err');
    if (buy && !(+buy >= 0)) return toast('The first buy must be a number.', 'err');
    const q = Q && Q.quotes.find(x => x.sym === pick); if (!q || !q.ok) return toast('Pick a quote pump.fun accepts.', 'err');
    const b = $('#go', main), ps = $('#ps', main); b.disabled = true;
    const steps = ['Upload image and metadata', 'Build and simulate', 'Sign in your wallet', 'Send and confirm'];
    const show = (k, bad) => { ps.innerHTML = steps.map((t, i) => `<div class="${i < k ? 'done' : i === k ? (bad ? 'bad' : 'on') : ''}"><i>${i < k ? ICON.check : ''}</i>${t}${i === k && bad ? ': ' + esc(bad) : ''}</div>`).join(''); };
    let k = 0;
    try {
      show(0); const me = await ctx.wallet(); const W3 = await web3();
      const m = await api('launch?a=meta', { name, symbol, description: $('#ds', main).value, image: img, website: $('#ws', main).value.trim(), twitter: $('#xx', main).value.trim(), telegram: $('#tg', main).value.trim() });
      k = 1; show(1);
      const kp = W3.Keypair.generate(), fee = $('#fee', main);
      const r = await api('launch?a=build', { user: me, mint: kp.publicKey.toBase58(), name, symbol, uri: m.uri, quote: q.mint, buy: buy || 0, feeBps: fee ? +fee.value : 0, holder });
      if (r.sim && r.sim.err) { const why = (r.sim.logs || []).filter(l => /Error|failed|insufficient/i.test(l)).slice(-2).join(' ') || JSON.stringify(r.sim.err); throw new Error('The dry run failed: ' + why); }
      k = 2; show(2);
      // the wallet signs first (one prompt, even when the first buy rides in a second transaction);
      // then the mint key, made in this browser, signs the exact create the wallet approved
      const list = (r.txs || [r.tx]).map(t => W3.Transaction.from(b64d(t)));
      const signed = await signAll(list.map(t => t.serialize({ requireAllSignatures: false, verifySignatures: false })));
      const create = W3.Transaction.from(signed[0]); create.partialSign(kp);
      k = 3; show(3);
      const sig = await rpc('sendTransaction', [b64e(create.serialize()), { encoding: 'base64', skipPreflight: true, maxRetries: 5 }]); await confirm(sig, 90000);
      if (signed[1]) { try { const s2 = await rpc('sendTransaction', [b64e(signed[1]), { encoding: 'base64', skipPreflight: false, maxRetries: 5 }]); await confirm(s2, 60000); } catch (e) { toast('Your coin is live, but the first buy did not go through: ' + esc(e.message), 'err', 9000); } }
      show(4); const mint = kp.publicKey.toBase58();
      addReceipt(me, { kind: 'Launched', text: `Launched $${symbol}, priced in ${q.sym}`, sig });
      ps.insertAdjacentHTML('beforeend', `<div class="note g" style="margin-top:8px">${ICON.check}<span>$${esc(symbol)} is live. <a href="https://pump.fun/coin/${mint}" target="_blank" rel="noopener">Open on pump.fun</a> · <a href="${solscan(sig)}" target="_blank" rel="noopener">Solscan</a> · <a href="#" id="cpm">Copy CA</a></span></div>`);
      $('#cpm', main).onclick = e => { e.preventDefault(); copy(mint); }; toast('Your coin is live', 'ok'); b.textContent = 'Launched'; ctx.hold(true);
    } catch (e) { show(k, /reject|denied|cancel/i.test(e.message) ? 'cancelled in your wallet' : e.message); b.disabled = false; }
  };
}

// every coin launched on STOCKZ, read from the chain: each launch carries a memo and pings the STOCKZ tag
export async function coins(main, ctx, rest = []) {
  if (rest[0] && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(rest[0])) return coinPage(main, ctx, rest[0]);
  setTimeout(() => ctx.S && feesPanel(main, ctx), 0);
  main.innerHTML = `<div class="ph1"><div><h1>Coins on STOCKZ</h1><p>Every coin launched here, priced in a GTA stock. Read straight from the chain.</p></div><a class="btn pink sm" href="#/app/launch">${ICON.rocket} Launch a coin</a></div>
    ${ctx.S ? `<div class="panel" style="margin-bottom:18px"><header><h2>Your creator fees</h2><button class="btn pri sm" id="clm" disabled>Collect all</button></header><div class="pad" id="fe"><span class="mut sm">Reading your fee vaults\u2026</span></div></div>` : ''}
    <div class="panel"><div class="flush"><table class="tbl"><thead><tr><th>Coin</th><th>Priced in</th><th class="r">Price</th><th class="r hide-s">Market cap</th><th class="r hide-s">Launched</th><th></th></tr></thead><tbody id="cl"><tr><td colspan="6" class="empty2">Reading the chain…</td></tr></tbody></table></div></div>`;
  try {
    const list = await stockzCoins();
    if (!list.length) { $('#cl', main).innerHTML = '<tr><td colspan="6" class="empty2">No coins yet. Be the first to launch one priced in a GTA stock.</td></tr>'; return; }
    const M = await tokens(list.map(c => c.mint));
    $('#cl', main).innerHTML = list.map(c => { const t = M[c.mint], s = bySym(c.quote) || SOLQ; return `<tr><td><a class="tic" href="#/app/coins/${c.mint}" style="color:inherit;text-decoration:none">${t && t.icon ? `<img src="${esc(t.icon)}" alt="">` : '<span class="ph">NEW</span>'}<span><b>${esc(t ? t.name : short(c.mint))}</b><small>${t ? '$' + esc(t.symbol) : esc(short(c.mint))}</small></span></a></td>
      <td><span class="tic">${logo(s)}<span><b>${esc(c.quote)}</b></span></span></td><td class="r num">${t ? usd(price(t)) : '—'}</td><td class="r num hide-s">${t ? usd(t.mcap) : '—'}</td><td class="r hide-s mut sm">${c.t ? esc(ago(c.t)) : '—'}</td>
      <td class="r" style="white-space:nowrap"><button class="btn pri sm" data-buy="${c.mint}" data-sym="${esc(t ? t.symbol : 'coin')}">Buy</button> <a class="btn ghost sm" href="https://pump.fun/coin/${c.mint}" target="_blank" rel="noopener">pump.fun</a></td></tr>`; }).join('');
    $$('[data-buy]', main).forEach(b => b.onclick = () => quickBuy(ctx, b.dataset.buy, b.dataset.sym));
  } catch (e) { $('#cl', main).innerHTML = `<tr><td colspan="6"><div class="note r">${ICON.help}<span>The coin list is unavailable: ${esc(e.message)}</span></div></td></tr>`; }
}

// creator fees waiting in pump.fun's vaults, in SOL and in each stock, collected in as few transactions as possible
async function feesPanel(main, ctx) {
  const box = $('#fe', main), btn = $('#clm', main); if (!box) return;
  try { const f = await api('launch?a=fees&creator=' + ctx.S.address), L = f.balances || [];
    if (!L.length) { box.innerHTML = '<span class="mut sm">Nothing waiting. Fees build up as people trade coins you launched.</span>'; return; }
    const M = await tokens(L.map(b => b.mint));
    box.innerHTML = `<dl class="kv">${L.map(b => { const t = M[b.mint], d = b.mint === SOL ? 9 : t && t.decimals != null ? t.decimals : 8, ui = +b.raw / 10 ** d, px = price(t); return `<dt>${esc(b.mint === SOL ? 'SOL' : t ? t.symbol : short(b.mint))}</dt><dd>${num(ui)}${px != null ? ' (' + usd(ui * px) + ')' : ''}</dd>`; }).join('')}</dl>`;
    btn.disabled = false;
    btn.onclick = async () => { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Building';
      try { await ctx.wallet(); const r = await api('launch?a=claim', { creator: ctx.S.address }); btn.innerHTML = '<span class="spin"></span> Approve in your wallet';
        const signed = await signAll(r.txs.map(b64d)); let last = null;
        for (const sg of signed) { last = await rpc('sendTransaction', [b64e(sg), { encoding: 'base64', skipPreflight: false, maxRetries: 3 }]); await confirm(last); }
        addReceipt(ctx.S.address, { kind: 'Collected', text: 'Collected creator fees', sig: last }); toast('Creator fees collected', 'ok'); btn.textContent = 'Collected'; ctx.hold(true); }
      catch (e) { btn.disabled = false; btn.textContent = 'Collect all'; toast(esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message), 'err', 8000); } };
  } catch (e) { box.innerHTML = `<span class="mut sm">Fee vaults are unavailable right now: ${esc(e.message)}</span>`; }
}

// one coin: its price, curve and chart, priced in the stock it was launched on
async function coinPage(main, ctx, mint) {
  main.innerHTML = '<div class="panel"><div class="pad"><div class="skel" style="height:180px"></div></div></div>';
  const [M, L] = await Promise.all([tokens([mint], true), stockzCoins().catch(() => [])]), t = M[mint], c = L.find(x => x.mint === mint), q = c ? (bySym(c.quote) || SOLQ) : null;
  const curve = t && (t.bondingCurve != null ? +t.bondingCurve : null);
  main.innerHTML = `<div class="ph1"><div style="display:flex;gap:14px;align-items:center">${t && t.icon ? `<img src="${esc(t.icon)}" alt="" style="width:56px;height:56px;border-radius:14px">` : '<span class="ph" style="width:56px;height:56px;border-radius:14px;display:grid;place-items:center;background:var(--bg3)">NEW</span>'}
      <div><h1>${esc(t ? t.name : short(mint))} <span class="mut" style="font-size:18px">${t ? '$' + esc(t.symbol) : ''}</span></h1><p>${q ? 'Priced in ' + esc(q.sym) + ' \u00b7 ' : ''}${c && c.t ? 'launched on STOCKZ ' + esc(ago(c.t)) : 'Solana token'}</p></div></div>
      <div class="statusrow"><button class="btn ghost sm" id="cca">Copy CA</button><a class="btn ghost sm" href="https://pump.fun/coin/${mint}" target="_blank" rel="noopener">pump.fun ${ICON.ext}</a><button class="btn pri sm" id="cbuy">Buy</button></div></div>
    <div class="cols"><div class="stack"><div class="panel"><div class="qhead"><span class="px" id="cpx">${t ? usd(price(t)) : '\u2014'}</span><span class="num ${tone(t && chg24(t))}" style="font-weight:700">${t ? pct(chg24(t)) + ' today' : ''}</span></div>
        <div class="chartbox"><canvas id="ccv"></canvas><div class="empty" id="cce">Loading chart\u2026</div></div></div>
      ${curve != null ? `<div class="panel"><header><h2>Bonding curve</h2><span class="num">${curve.toFixed(1)}%</span></header><div class="pad"><div class="meter"><i style="width:${Math.min(100, curve).toFixed(1)}%"></i></div><p class="sm mut" style="margin:10px 0 0">When the curve fills, pump.fun moves the coin into its own pool${q ? ', still paired with ' + esc(q.sym) : ''}.</p></div></div>` : ''}</div>
      <div class="stack"><div class="panel"><header><h2>Stats</h2></header><div class="pad"><dl class="kv"><dt>Market cap</dt><dd>${t ? usd(t.mcap) : '\u2014'}</dd><dt>Liquidity</dt><dd>${t ? usd(t.liquidity, 0) : '\u2014'}</dd><dt>24h volume</dt><dd>${t ? usd(vol24(t), 0) : '\u2014'}</dd><dt>Holders</dt><dd>${t ? num(t.holderCount) : '\u2014'}</dd><dt>Mint</dt><dd class="mono">${esc(short(mint))}</dd>${c ? `<dt>Launch tx</dt><dd><a href="${solscan(c.sig)}" target="_blank" rel="noopener">${esc(short(c.sig))}</a></dd>` : ''}</dl></div></div>
        ${q && q.mint !== SOL ? `<div class="panel"><header><h2>Priced in ${esc(q.sym)}</h2><a class="sm" href="#/app/trade/${q.sym}">Trade ${esc(q.sym)}</a></header><div class="pad sm">Buyers pay for this coin in ${esc(q.name)}. To buy it with SOL, STOCKZ routes your order through Jupiter in one transaction.</div></div>` : ''}</div></div>`;
  $('#cca', main).onclick = () => copy(mint); $('#cbuy', main).onclick = () => quickBuy(ctx, mint, t ? t.symbol : 'coin');
  candles(mint, 'minute', 15, 96).then(cs => { if (cs.length < 2) throw 0; $('#cce', main).hidden = true; area($('#ccv', main), cs, { mode: 'candles', vol: true }); }).catch(() => { const e = $('#cce', main); if (e) e.textContent = 'No chart yet. Charts appear after the first trades.'; });
}

// buy any coin with SOL through Jupiter Ultra (it routes pump.fun curves too)
export function quickBuy(ctx, mint, sym) {
  if (!ctx.S) return ctx.actions.needSignIn('coins');
  const v = document.createElement('div'); v.className = 'veil';
  v.innerHTML = `<div class="modal"><header><h3>Buy $${esc(sym)}</h3><button class="x" data-c>${ICON.close}</button></header><div class="body"><label class="fld"><span>Pay with SOL</span><input class="inp num" id="qa" inputmode="decimal" value="0.1"></label><div class="est" id="qe" style="padding:12px;border-radius:10px;background:var(--bg2)">—</div></div>
    <footer><button class="btn ghost" data-c>Cancel</button><button class="btn pri" id="qb" disabled>Buy</button></footer></div>`;
  document.body.appendChild(v); $$('[data-c]', v).forEach(b => b.onclick = () => v.remove());
  let o = null, n = 0, t = null;
  const q = async () => { const a = parseFloat($('#qa', v).value), k = ++n; o = null; $('#qb', v).disabled = true; if (!(a > 0)) return;
    try { const r = await order({ inputMint: SOL, outputMint: mint, amount: String(Math.floor(a * 1e9)), taker: ctx.S.address }); if (k !== n) return; o = r;
      $('#qe', v).innerHTML = `<dl class="kv"><dt>You get (est.)</dt><dd>${r.outUsdValue != null ? usd(+r.outUsdValue) : '—'} of $${esc(sym)}</dd><dt>Route</dt><dd>${esc(((r.routePlan || [])[0] || {}).swapInfo ? r.routePlan[0].swapInfo.label : 'Jupiter')}</dd></dl>${r.errorMessage ? `<div class="note r" style="margin-top:8px">${esc(r.errorMessage)}</div>` : ''}`;
      $('#qb', v).disabled = !(r.transaction || (ctx.S && ctx.S.demo)); } catch (e) { $('#qe', v).textContent = 'No quote: ' + e.message; } };
  $('#qa', v).oninput = () => { clearTimeout(t); t = setTimeout(q, 350); }; q();
  $('#qb', v).onclick = async () => { const b = $('#qb', v); b.disabled = true; b.innerHTML = '<span class="spin"></span> Approve in wallet';
    try { await ctx.wallet(); const [s] = await signAll([b64d(o.transaction)]); const r = await execute(b64e(s), o.requestId); if (r.status !== 'Success') throw new Error(r.error || 'Not filled');
      addReceipt(ctx.S.address, { kind: 'Bought', text: `Bought $${sym}`, sig: r.signature }); toast(`Bought $${esc(sym)}. <a href="${solscan(r.signature)}" target="_blank" rel="noopener">Solscan</a>`, 'ok', 8000); v.remove(); ctx.hold(true); }
    catch (e) { b.disabled = false; b.textContent = 'Try again'; toast(esc(e.message), 'err'); } };
}
