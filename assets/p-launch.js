// STOCKZ · the launchpad: a pump.fun coin whose curve is priced in a GTA stock, and every coin launched here
import { $, $$, esc, usd, num, pct, tone, short, ago, ICON, BASKET, SOL, CONFIG, bySym, toast, copy, solscan, usdp, ALL } from './core.js';
import { api, tokens, price, chg24, vol24, rpc, confirm, order, execute, candles, stockzCoins, searchTokens, trades, pools, startTicks } from './net.js';
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
// any coin on Solana, inside STOCKZ: its chart, the checks to make before buying, where it trades, and an order ticket
async function coinPage(main, ctx, mint) {
  main.innerHTML = '<div class="panel"><div class="pad"><div class="skel" style="height:22px;width:40%;margin-bottom:14px"></div><div class="skel" style="height:220px"></div></div></div>';
  const stock = ALL.find(x => x.mint === mint); if (stock) { location.hash = '#/app/trade/' + stock.sym; return; }   // GTA stocks have their own page
  const [M, L, S1] = await Promise.all([tokens([mint], true).catch(() => ({})), stockzCoins().catch(() => []), searchTokens(mint).catch(() => [])]);
  const t = M[mint] || S1.find(x => x.id === mint), c = L.find(x => x.mint === mint), q = c ? (bySym(c.quote) || SOLQ) : null;
  if (!t) { main.innerHTML = `<div class="ph1"><div><h1>No coin at this address</h1><p>${esc(short(mint))} isn't a coin that trades on Solana. If it's a wallet, you can send money to it.</p></div></div><div class="panel"><div class="pad" style="text-align:center;padding:36px"><a class="btn pri" href="#/app/transfer/to/${mint}">Send money to this wallet</a></div></div>`; return; }
  const st = t.stats24h || {}, a = t.audit || {}, ch = chg24(t), curve = t.bondingCurve != null ? +t.bondingCurve : null, sym = t.symbol || 'coin';
  const born = t.firstPool && t.firstPool.createdAt ? Date.parse(t.firstPool.createdAt) : c && c.t ? c.t : null;
  // the checks people make before buying a coin, from Jupiter's audit of the token
  const checks = [
    a.mintAuthorityDisabled == null ? null : [a.mintAuthorityDisabled, 'Mint authority', a.mintAuthorityDisabled ? 'Renounced. No one can print more.' : 'Active. The creator can still print more.'],
    a.freezeAuthorityDisabled == null ? null : [a.freezeAuthorityDisabled, 'Freeze authority', a.freezeAuthorityDisabled ? 'Renounced. No one can freeze your coins.' : 'Active. The creator can freeze wallets.'],
    a.topHoldersPercentage == null ? null : [a.topHoldersPercentage < 35, 'Top 10 holders', `Hold ${(+a.topHoldersPercentage).toFixed(1)}% of the supply.`],
    t.liquidity == null ? null : [t.liquidity >= 25000, 'Liquidity', t.liquidity >= 25000 ? `${usd(t.liquidity, 0)} in pools.` : `Only ${usd(t.liquidity, 0)}. Large orders move the price a lot.`],
    [!!t.isVerified, 'Jupiter', t.isVerified ? 'Verified token.' : 'Not verified by Jupiter.'],
    t.organicScore == null ? null : [t.organicScore >= 50, 'Organic activity', `Score ${Math.round(t.organicScore)} of 100${t.organicScoreLabel ? ' (' + esc(t.organicScoreLabel) + ')' : ''}.`],
  ].filter(Boolean);
  const pump = /pump$/.test(mint) || !!c, buys = st.numBuys, sells = st.numSells;
  main.innerHTML = `<div class="ph1"><div style="display:flex;gap:14px;align-items:center">${t.icon ? `<img src="${esc(t.icon)}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover">` : `<span class="ph" style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center">${esc(sym.slice(0, 4))}</span>`}
      <div><h1>${esc(t.name || sym)} <span class="mut" style="font-size:18px">$${esc(sym)}</span>${t.isVerified ? `<i class="vf" title="Verified on Jupiter">${ICON.check}</i>` : ''}</h1><p>${q ? 'Priced in ' + esc(q.sym) + ' · ' : ''}${c && c.t ? 'launched on STOCKZ ' + esc(ago(c.t)) : born ? 'Solana coin · first traded ' + esc(Date.now() - born > 60 * 864e5 ? new Date(born).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ago(born)) : 'Solana coin'}</p></div></div>
      <div class="statusrow"><button class="btn ghost sm" id="cca">${ICON.doc} Copy CA</button>${t.website ? `<a class="btn ghost sm" href="${esc(t.website)}" target="_blank" rel="noopener">Website</a>` : ''}${t.twitter ? `<a class="btn ghost sm" href="${esc(t.twitter)}" target="_blank" rel="noopener">X</a>` : ''}${pump ? `<a class="btn ghost sm" href="https://pump.fun/coin/${mint}" target="_blank" rel="noopener">pump.fun</a>` : ''}</div></div>
    <div class="cols"><div class="stack">
      <div class="panel"><div class="qhead"><span class="px" id="cpx" data-live-px="${mint}">${usdp(price(t))}</span><span class="num ${tone(ch)}" style="font-weight:700">${ch != null ? pct(ch) + ' today' : ''}</span>
          <span class="seg" id="ctf" style="margin-left:auto">${['1H', '1D', '1W', '1M'].map(k => `<button data-v="${k}" class="${k === '1D' ? 'on' : ''}">${k}</button>`).join('')}</span></div>
        <div class="chartbox"><canvas id="ccv"></canvas><div class="empty" id="cce">Loading chart…</div></div><div class="pad sm mut" id="crt" style="padding-top:0"></div></div>
      ${curve != null ? `<div class="panel"><header><h2>Bonding curve</h2><span class="num">${curve.toFixed(1)}%</span></header><div class="pad"><div class="meter"><i style="width:${Math.min(100, curve).toFixed(1)}%"></i></div><p class="sm mut" style="margin:10px 0 0">When the curve fills, the coin moves to a full pool on PumpSwap.</p></div></div>` : ''}
      <div class="panel"><header><h2>Time & sales</h2><span class="pill"><span class="dot"></span> live</span></header><div class="flush" style="max-height:380px;overflow:auto"><table class="tbl"><thead><tr><th>Time</th><th>Side</th><th class="r">Price</th><th class="r">Value</th></tr></thead><tbody id="cts"><tr><td colspan="4" class="empty2">Reading the latest trades…</td></tr></tbody></table></div></div>
      <div class="panel"><header><h2>Where $${esc(sym)} trades</h2><span class="sm mut">pools on Solana</span></header><div class="flush"><table class="tbl"><thead><tr><th>Pool</th><th class="hide-s">Venue</th><th class="r">Liquidity</th><th class="r">24h volume</th></tr></thead><tbody id="cpl"><tr><td colspan="4" class="empty2">Loading…</td></tr></tbody></table></div></div>
      ${q && q.mint !== SOL ? `<div class="panel"><header><h2>Priced in ${esc(q.sym)}</h2><a class="sm" href="#/app/trade/${q.sym}">Trade ${esc(q.sym)}</a></header><div class="pad sm">Buyers pay for this coin in ${esc(q.name)}. To buy it with SOL, STOCKZ routes your order through ${esc(q.sym)} automatically.</div></div>` : ''}
    </div><div class="stack">
      <div class="panel ticket" id="ctk"></div>
      <div class="panel"><header><h2>Before you buy</h2></header><div class="list checks">${checks.map(([okk, k, v]) => `<div class="it"><i class="ck ${okk ? 'g' : 'w'}">${okk ? ICON.check : '!'}</i><span><b>${k}</b><small class="mut" style="display:block">${v}</small></span></div>`).join('') || '<div class="empty2">No audit data for this coin yet.</div>'}</div></div>
      <div class="panel"><header><h2>Stats</h2></header><div class="pad"><dl class="kv"><dt>Price</dt><dd data-live-px="${mint}">${usdp(price(t))}</dd><dt>Market cap</dt><dd>${usd(t.mcap)}</dd><dt>Fully diluted</dt><dd>${usd(t.fdv)}</dd><dt>Liquidity</dt><dd>${usd(t.liquidity, 0)}</dd><dt>24h volume</dt><dd>${usd(vol24(t), 0)}</dd>${buys != null ? `<dt>24h buys / sells</dt><dd>${num(buys)} / ${num(sells)}</dd>` : ''}${st.numTraders != null ? `<dt>24h traders</dt><dd>${num(st.numTraders)}</dd>` : ''}<dt>Holders</dt><dd>${t.holderCount != null ? num(t.holderCount) : '—'}</dd><dt>Contract</dt><dd class="mono"><a href="#" id="cca2">${esc(short(mint))}</a></dd></dl></div></div>
    </div></div><button class="btn pri cfab" id="cfab">${ICON.chart} Buy $${esc(sym)}</button>`;
  const fab = $('#cfab', main); fab.onclick = () => $('#ctk', main).scrollIntoView({ behavior: 'smooth', block: 'center' });
  try { new IntersectionObserver(([e]) => fab.classList.toggle('hide', e.isIntersecting)).observe($('#ctk', main)); } catch {}
  $('#cca', main).onclick = () => copy(mint); $('#cca2', main).onclick = e => { e.preventDefault(); copy(mint); };
  coinTicket($('#ctk', main), ctx, t); startTicks([mint], () => {});
  // the chart, at four timeframes
  const TF = { '1H': ['minute', 1, 60], '1D': ['minute', 15, 96], '1W': ['hour', 1, 168], '1M': ['hour', 4, 180] };
  const chart = k => { const [tf, ag, li] = TF[k], e = $('#cce', main); if (e) { e.hidden = false; e.textContent = 'Loading chart…'; }
    candles(mint, tf, ag, li).then(cs => { if (!document.body.contains(main) || cs.length < 2) throw 0; $('#cce', main).hidden = true; area($('#ccv', main), cs, { mode: 'candles', vol: true, long: k === '1M' || k === '1W' });
      const hi = Math.max(...cs.map(x => x.h)), lo = Math.min(...cs.map(x => x.l)), d = (cs[cs.length - 1].c / cs[0].o - 1) * 100;
      const r = $('#crt', main); if (r) r.innerHTML = `${k} change <b class="${tone(d)}">${pct(d)}</b> · high <b>${usdp(hi)}</b> · low <b>${usdp(lo)}</b>`; })
      .catch(() => { const e2 = $('#cce', main); if (e2) e2.textContent = 'No chart yet. Charts appear after the first trades.'; }); };
  $$('#ctf button', main).forEach(b => b.onclick = () => { $$('#ctf button', main).forEach(x => x.classList.toggle('on', x === b)); chart(b.dataset.v); }); chart('1D');
  // the trade tape and the pools behind it
  let seen = new Set(), first = true;
  const tape = async () => { try { const R = (await trades(mint)).slice(0, 30), el = $('#cts', main); if (!el) return;
      el.innerHTML = R.length ? R.map(x => `<tr class="${!first && !seen.has(x.tx) ? (x.buy ? 'fu' : 'fd') : ''}"><td class="mut sm num">${new Date(x.t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td><td><span class="pill ${x.buy ? 'g' : 'r'}">${x.buy ? 'Buy' : 'Sell'}</span></td><td class="r num">${usdp(x.px)}</td><td class="r num"><b>${usd(x.usd)}</b></td></tr>`).join('') : '<tr><td colspan="4" class="empty2">No trades yet.</td></tr>';
      R.forEach(x => seen.add(x.tx)); first = false; } catch { const el = $('#cts', main); if (el && first) el.innerHTML = '<tr><td colspan="4" class="empty2">The trade tape is unavailable right now.</td></tr>'; } };
  tape(); const iv = setInterval(() => { if (!document.hidden) tape(); }, 15000);
  pools(mint).then(P => { const el = $('#cpl', main); if (!el) return; el.innerHTML = P.slice(0, 6).map(x => `<tr><td><b>${esc(x.name)}</b></td><td class="hide-s mut sm">${esc((x.dex || '').replace(/[-_]/g, ' '))}</td><td class="r num">${usd(x.liq, 0)}</td><td class="r num">${usd(x.vol, 0)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty2">No pools yet. This coin may still be on its bonding curve.</td></tr>'; })
    .catch(() => { const el = $('#cpl', main); if (el) el.innerHTML = '<tr><td colspan="4" class="empty2">Unavailable right now.</td></tr>'; });
  return () => clearInterval(iv);
}

// an order ticket for any coin: buy with SOL, sell back to SOL, through Jupiter Ultra
function coinTicket(box, ctx, t) {
  const mint = t.id, sym = t.symbol || 'coin', dec = t.decimals != null ? t.decimals : 6; let side = 'buy', o = null, n = 0, tm = null;
  box.innerHTML = `<header><h2>Trade $${esc(sym)}</h2><span class="seg buy" id="ks"><button class="b on" data-v="buy">Buy</button><button class="s" data-v="sell">Sell</button></span></header>
    <div class="pad"><label class="fld"><span id="kl">You pay</span><div class="inrow"><input id="ka" inputmode="decimal" placeholder="0.00" autocomplete="off"><span class="unit" id="ku">SOL</span></div></label>
      <div class="presets" id="kp"></div><div class="sm mut" id="kb" style="margin-top:8px">—</div>
      <div class="est" id="ke"><dl class="kv"><dt>You get</dt><dd>—</dd><dt>Price impact</dt><dd>—</dd><dt>Route</dt><dd>—</dd></dl></div>
      <button class="btn pri wide lg" id="kg" disabled>${ctx.S ? 'Review order' : 'Sign in to trade'}</button><p class="xs mut" style="margin:10px 0 0">Quotes come from Jupiter Ultra and refresh as you type. Nothing moves until your wallet signs.</p></div>`;
  const $k = s => box.querySelector(s), held = () => { const h = ctx.cached(); if (!h) return null; if (side === 'buy') return Math.max(0, h.sol - .01); const r = [...h.stocks, ...h.cash, ...h.other].find(x => x.mint === mint); return r ? r.ui : 0; };
  const draw = () => { $k('#kl').textContent = side === 'buy' ? 'You pay' : `You sell`; $k('#ku').textContent = side === 'buy' ? 'SOL' : '$' + sym;
    $k('#kp').innerHTML = (side === 'buy' ? ['0.1', '0.5', '1'].map(v => `<button data-v="${v}">${v} SOL</button>`) : []).concat(['25%', '50%', 'Max'].map(v => `<button data-p="${v}">${v}</button>`)).join('');
    box.querySelectorAll('#kp button').forEach(b => b.onclick = () => { const B = held(); if (b.dataset.v) $k('#ka').value = b.dataset.v; else if (B != null) $k('#ka').value = +(B * (b.dataset.p === 'Max' ? 1 : parseFloat(b.dataset.p) / 100)).toFixed(side === 'buy' ? 4 : Math.min(6, dec)); requote(); });
    const B = held(); $k('#kb').textContent = !ctx.S ? 'Sign in to trade from your balance.' : B == null ? 'Loading your balance…' : `Available: ${num(B)} ${side === 'buy' ? 'SOL' : '$' + sym}`; };
  const requote = () => { clearTimeout(tm); tm = setTimeout(async () => {
    const v = parseFloat($k('#ka').value), k = ++n, btn = $k('#kg'), est = $k('#ke'); o = null; btn.disabled = true; if (!(v > 0)) return;
    est.innerHTML = '<div class="skel" style="height:70px"></div>';
    try { const raw = side === 'buy' ? Math.floor(v * 1e9) : Math.floor(v * 10 ** dec), p = { inputMint: side === 'buy' ? SOL : mint, outputMint: side === 'buy' ? mint : SOL, amount: String(raw) }; if (ctx.S) p.taker = ctx.S.address;
      const r = await order(p); if (k !== n) return; o = { r, v };
      const got = side === 'buy' ? +r.outAmount / 10 ** dec : +r.outAmount / 1e9, imp = r.priceImpactPct != null ? +r.priceImpactPct * (Math.abs(+r.priceImpactPct) < 1 ? 100 : 1) : null;
      est.innerHTML = `<dl class="kv"><dt>You get</dt><dd>${num(got)} ${side === 'buy' ? '$' + esc(sym) : 'SOL'}</dd><dt>Value</dt><dd>${usd(r.outUsdValue != null ? +r.outUsdValue : null)}</dd><dt>Price impact</dt><dd class="${imp != null && Math.abs(imp) > 2 ? 'dn' : ''}">${imp != null ? imp.toFixed(2) + '%' : '—'}</dd><dt>Route</dt><dd>${esc(((r.routePlan || [])[0] || {}).swapInfo ? r.routePlan[0].swapInfo.label : 'Jupiter')}</dd></dl>${r.errorMessage ? `<div class="note r" style="margin-top:10px">${ICON.help}<span>${esc(r.errorMessage)}</span></div>` : ''}`;
      o.got = got; btn.disabled = !ctx.S ? false : !(ctx.S.demo || r.transaction); }
    catch (e) { if (k === n) est.innerHTML = `<div class="note r">${ICON.help}<span>No quote right now: ${esc(e.message)}</span></div>`; } }, 300); };
  box.querySelectorAll('#ks button').forEach(b => b.onclick = () => { side = b.dataset.v; box.querySelectorAll('#ks button').forEach(x => x.classList.toggle('on', x === b)); $k('#ka').value = ''; o = null; $k('#kg').disabled = true; draw(); });
  $k('#ka').oninput = requote;
  $k('#kg').onclick = () => {
    if (!ctx.S) return ctx.actions.needSignIn('coins/' + mint);
    if (!o) return; const { r, v, got } = o, m = document.createElement('div'); m.className = 'veil';
    m.innerHTML = `<div class="modal"><header><h3>Review order</h3><button class="x" data-c>${ICON.close}</button></header><div class="body"><dl class="kv"><dt>Order</dt><dd>${side === 'buy' ? 'Buy' : 'Sell'} $${esc(sym)}</dd><dt>You pay</dt><dd>${num(v)} ${side === 'buy' ? 'SOL' : '$' + esc(sym)}</dd><dt>You get (est.)</dt><dd>${num(got)} ${side === 'buy' ? '$' + esc(sym) : 'SOL'}</dd><dt>Route</dt><dd>Jupiter Ultra</dd></dl>
      ${t.isVerified ? '' : `<div class="note w" style="margin-top:12px">${ICON.shield}<span>This coin isn't verified by Jupiter. Check the contract address before you buy.</span></div>`}</div><footer><button class="btn ghost" data-c>Cancel</button><button class="btn pri" id="kc">Place order</button></footer></div>`;
    document.body.appendChild(m); m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => m.remove());
    m.querySelector('#kc').onclick = async () => { const b = m.querySelector('#kc'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Approve in your wallet';
      try { await ctx.wallet(); const [sg] = await signAll([b64d(r.transaction)]); b.innerHTML = '<span class="spin"></span> Sending'; const x = await execute(b64e(sg), r.requestId); if (x.status !== 'Success') throw new Error(x.error || 'The order was not filled.');
        addReceipt(ctx.S.address, { kind: side === 'buy' ? 'Bought' : 'Sold', text: `${side === 'buy' ? 'Bought' : 'Sold'} ${num(side === 'buy' ? got : v)} $${sym}`, sig: x.signature });
        m.remove(); toast(`${side === 'buy' ? 'Bought' : 'Sold'} $${esc(sym)}`, 'ok', 6000); $k('#ka').value = ''; ctx.hold(true).then(draw).catch(() => {}); }
      catch (e) { if (document.body.contains(m)) { b.disabled = false; b.textContent = 'Try again'; } toast(esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message), 'err', 8000); } };
  };
  draw(); if (ctx.S) ctx.hold(false).then(draw).catch(() => {});
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
