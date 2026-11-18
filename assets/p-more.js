// STOCKZ · Transfers (send SOL or any token), the Security center and Help
import { $, $$, esc, usd, num, short, mask, ICON, BASKET, SOL, store, sess, toast, copy, solscan } from './core.js';
import { rpc, confirm } from './net.js';
import { signAll } from './wallet.js';
import { addReceipt } from './p-accounts.js';
import { controls } from './p-invest.js';

let web3p = null;
export function web3() {   // the Solana library, loaded only when a page builds a transaction
  if (window.solanaWeb3) return Promise.resolve(window.solanaWeb3);
  return web3p || (web3p = new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/assets/web3.min.js'; s.onload = () => ok(window.solanaWeb3); s.onerror = () => no(new Error('Could not load the transaction library.')); document.head.appendChild(s); }));
}
const ATA = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', MEMO = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const isAddr = s => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s || '');
export async function sendSigned(tx) {
  const [signed] = await signAll([tx.serialize({ requireAllSignatures: false, verifySignatures: false })]);
  let s = ''; for (let i = 0; i < signed.length; i += 0x8000) s += String.fromCharCode.apply(null, signed.subarray(i, i + 0x8000));
  const sig = await rpc('sendTransaction', [btoa(s), { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 3 }]);
  await confirm(sig); return sig;
}

export async function transfer(main, ctx, rest) {
  if (!ctx.S) { main.innerHTML = `<div class="ph1"><div><h1>Transfers</h1></div></div>` + ctx.guestPanel('send money'); return; }
  if (rest[0] === 'request') return request(main, ctx);
  main.innerHTML = `<div class="ph1"><div><h1>Transfers</h1><p>Send SOL, stablecoins, stocks or any token to another wallet. Like a wire, but it lands in seconds.</p></div></div>${TT('send')}
    <div class="cols"><div class="panel"><header><h2>Send money</h2></header><div class="pad">
      <label class="fld"><span>From account ${esc(mask(ctx.S.address))}</span><select class="inp" id="as"><option>Loading your balances…</option></select></label>
      <label class="fld"><span>To (wallet address)</span><input class="inp mono" id="to" placeholder="Recipient's Solana address" autocomplete="off" spellcheck="false"></label>
      <label class="fld"><span>Amount</span><div style="display:flex;gap:8px"><input class="inp num" id="am" inputmode="decimal" placeholder="0.00"><button class="btn ghost" id="max" type="button">Max</button></div></label>
      <label class="fld"><span>Note (optional, public on chain)</span><input class="inp" id="nt" maxlength="80" placeholder="e.g. rent, lunch, OTC settlement"></label>
      <div class="note w" style="margin-bottom:14px">${ICON.shield}<span>Transfers can’t be reversed. Check the address twice: STOCKZ can’t recover funds sent to the wrong wallet.</span></div>
      <button class="btn pri wide lg" id="rv">Review transfer</button></div></div>
      <div class="stack"><div class="panel"><header><h2>Recent recipients</h2></header><div class="list" id="rr"></div></div></div></div>`;
  const H = await ctx.hold(false).catch(() => null);
  const assets = H ? [{ sym: 'SOL', name: 'Solana', mint: SOL, ui: Math.max(0, H.sol - .002), dec: 9, prog: null, usd: H.solUsd }, ...H.cash, ...H.stocks, ...H.other].filter(a => a.ui > 0) : [];
  const sel = $('#as', main);
  sel.innerHTML = assets.length ? assets.map((a, i) => `<option value="${i}">${esc(a.sym)} · ${num(a.ui)} available${a.usd ? ' (' + usd(a.usd) + ')' : ''}</option>`).join('') : '<option>No balances to send</option>';
  if (rest[0]) { const i = assets.findIndex(a => a.mint === rest[0]); if (i >= 0) sel.value = i; }
  const recent = store.get('recips:' + ctx.S.address, []);
  $('#rr', main).innerHTML = recent.length ? recent.map(r => `<a class="it" href="#" data-a="${esc(r)}" style="color:inherit;text-decoration:none"><span class="mono">${esc(short(r))}</span><span class="pill">Use</span></a>`).join('') : '<div class="empty2">No transfers from this device yet.</div>';
  $$('#rr [data-a]', main).forEach(a => a.onclick = e => { e.preventDefault(); $('#to', main).value = a.dataset.a; });
  $('#max', main).onclick = () => { const a = assets[+sel.value]; if (a) $('#am', main).value = +a.ui.toFixed(Math.min(6, a.dec ?? 6)); };
  $('#rv', main).onclick = () => {
    const a = assets[+sel.value], to = $('#to', main).value.trim(), v = parseFloat($('#am', main).value), note = $('#nt', main).value.trim();
    if (!a) return toast('Pick something to send.', 'err'); if (!isAddr(to)) return toast('That is not a Solana address.', 'err');
    if (to === ctx.S.address) return toast('That is your own address.', 'err'); if (!(v > 0) || v > a.ui + 1e-12) return toast('Enter an amount you hold.', 'err');
    const m = document.createElement('div'); m.className = 'veil';
    m.innerHTML = `<div class="modal"><header><h3>Review transfer</h3><button class="x" data-c>${ICON.close}</button></header><div class="body">
      <dl class="kv"><dt>Send</dt><dd>${num(v)} ${esc(a.sym)}</dd><dt>From</dt><dd class="mono">${esc(short(ctx.S.address))}</dd><dt>To</dt><dd class="mono" style="word-break:break-all;white-space:normal">${esc(to)}</dd>${note ? `<dt>Note</dt><dd>${esc(note)}</dd>` : ''}<dt>Network fee</dt><dd>about 0.000005 SOL${a.mint !== SOL ? ', plus about 0.002 SOL if they have no account for it yet' : ''}</dd></dl>
      <div id="ps" class="prog" style="margin-top:14px"></div></div><footer><button class="btn ghost" data-c>Cancel</button><button class="btn pri" id="sd">Send now</button></footer></div>`;
    document.body.appendChild(m); $$('[data-c]', m).forEach(b => b.onclick = () => m.remove());
    $('#sd', m).onclick = async () => {
      const b = $('#sd', m); b.disabled = true; b.innerHTML = '<span class="spin"></span> Building';
      try {
        await ctx.wallet(); const W3 = await web3(), { PublicKey, Transaction, SystemProgram, TransactionInstruction } = W3;
        const me = new PublicKey(ctx.S.address), dest = new PublicKey(to), tx = new Transaction();
        if (a.mint === SOL) tx.add(SystemProgram.transfer({ fromPubkey: me, toPubkey: dest, lamports: Math.round(v * 1e9) }));
        else {
          const mint = new PublicKey(a.mint), prog = new PublicKey(a.prog), ataP = new PublicKey(ATA);
          const ataOf = o => PublicKey.findProgramAddressSync([o.toBuffer(), prog.toBuffer(), mint.toBuffer()], ataP)[0];
          const src = new PublicKey(a.account), dst = ataOf(dest), mult = a.raw && +a.raw > 0 ? a.ui / (+a.raw / 10 ** a.dec) : 1;
          const raw = BigInt(Math.floor(v / mult * 10 ** a.dec)), data = new Uint8Array(10); data[0] = 12; new DataView(data.buffer).setBigUint64(1, raw, true); data[9] = a.dec;
          tx.add(new TransactionInstruction({ programId: ataP, data: Uint8Array.of(1), keys: [{ pubkey: me, isSigner: true, isWritable: true }, { pubkey: dst, isSigner: false, isWritable: true }, { pubkey: dest, isSigner: false, isWritable: false }, { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: prog, isSigner: false, isWritable: false }] }));
          tx.add(new TransactionInstruction({ programId: prog, data, keys: [{ pubkey: src, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: dst, isSigner: false, isWritable: true }, { pubkey: me, isSigner: true, isWritable: false }] }));
        }
        if (note) tx.add(new TransactionInstruction({ programId: new PublicKey(MEMO), keys: [{ pubkey: me, isSigner: true, isWritable: false }], data: new TextEncoder().encode(note) }));
        const bh = await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }]); tx.recentBlockhash = bh.value.blockhash; tx.feePayer = me;
        const sim = await rpc('simulateTransaction', [btoaTx(tx), { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' }]);
        if (sim.value && sim.value.err) throw new Error('The network rejected this transfer in a dry run: ' + JSON.stringify(sim.value.err));
        b.innerHTML = '<span class="spin"></span> Approve in your wallet';
        const sig = await sendSigned(tx);
        store.set('recips:' + ctx.S.address, [to, ...recent.filter(r => r !== to)].slice(0, 8));
        addReceipt(ctx.S.address, { kind: 'Sent', text: `Sent ${num(v)} ${a.sym} to ${short(to)}`, sig });
        $('.body', m).insertAdjacentHTML('beforeend', `<div class="note g" style="margin-top:12px">${ICON.check}<span>Sent. <a href="${solscan(sig)}" target="_blank" rel="noopener">View on Solscan</a></span></div>`);
        b.textContent = 'Done'; b.disabled = false; b.onclick = () => { m.remove(); ctx.hold(true); ctx.nav('activity'); };
      } catch (e) { b.disabled = false; b.textContent = 'Try again'; toast(esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message), 'err', 8000); }
    };
  };
}
const TT = cur => `<div class="panel" style="margin-bottom:18px"><div class="tabs"><button onclick="location.hash='#/app/transfer'" class="${cur === 'send' ? 'on' : ''}">Send money</button><button onclick="location.hash='#/app/transfer/request'" class="${cur === 'request' ? 'on' : ''}">Request money</button></div></div>`;
let qrp = null;
const qrlib = () => window.qrcode ? Promise.resolve(window.qrcode) : qrp || (qrp = new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/assets/qrcode.min.js'; s.onload = () => ok(window.qrcode); s.onerror = () => no(new Error('QR code library failed to load')); document.head.appendChild(s); }));
// request money: a Solana Pay link and its QR code. Any Solana wallet that scans it fills in the payment to you.
async function request(main, ctx) {
  const A = [{ sym: 'SOL', mint: SOL, name: 'Solana' }, { sym: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin' }, ...BASKET];
  main.innerHTML = `<div class="ph1"><div><h1>Transfers</h1><p>Ask anyone to pay you. They scan the code with any Solana wallet, and the payment comes straight to your account.</p></div></div>${TT('request')}
    <div class="cols"><div class="panel"><header><h2>Request money</h2></header><div class="pad">
      <label class="fld"><span>Pay me in</span><select class="inp" id="ra">${A.map((a, i) => `<option value="${i}">${esc(a.sym)} · ${esc(a.name)}</option>`).join('')}</select></label>
      <label class="fld"><span>Amount (optional)</span><input class="inp num" id="rm" inputmode="decimal" placeholder="Let them choose"></label>
      <label class="fld"><span>What it’s for (optional, shown in their wallet)</span><input class="inp" id="rn" maxlength="60" placeholder="e.g. OTC settlement"></label>
      <div class="note">${ICON.shield}<span>The link only says where to pay and how much. Nobody can take money from you with it.</span></div></div></div>
      <div class="stack"><div class="panel"><header><h2>Your payment code</h2></header><div class="pad" style="text-align:center"><canvas id="qr" width="280" height="280" style="width:240px;height:240px;image-rendering:pixelated;border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff"></canvas>
        <div class="mono xs mut" id="rl" style="word-break:break-all;margin:12px 0"></div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn pri sm" id="rc">Copy link</button><button class="btn ghost sm" id="rs">Share</button><button class="btn ghost sm" id="rd">Save image</button></div></div></div></div></div>`;
  const draw = async () => {
    const a = A[+$('#ra', main).value], amt = $('#rm', main).value.trim(), note = $('#rn', main).value.trim(), p = new URLSearchParams();
    if (+amt > 0) p.set('amount', String(+amt)); if (a.mint !== SOL) p.set('spl-token', a.mint); p.set('label', 'STOCKZ'); if (note) p.set('message', note);
    const url = `solana:${ctx.S.address}?${p.toString()}`; $('#rl', main).textContent = url;
    try { const Q = await qrlib(), q = Q(0, 'M'); q.addData(url); q.make(); const n = q.getModuleCount(), cv = $('#qr', main), g = cv.getContext('2d'), cell = Math.floor(280 / (n + 2)), off = Math.floor((280 - cell * n) / 2);
      g.fillStyle = '#fff'; g.fillRect(0, 0, 280, 280); g.fillStyle = '#0a1f44'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(off + c * cell, off + r * cell, cell, cell); } catch (e) { toast(esc(e.message), 'err'); }
    $('#rc', main).onclick = () => copy(url);
    $('#rs', main).onclick = async () => { try { if (navigator.share) await navigator.share({ title: 'Pay me on STOCKZ', text: url }); else copy(url); } catch {} };
    $('#rd', main).onclick = () => { const l = document.createElement('a'); l.href = $('#qr', main).toDataURL('image/png'); l.download = 'stockz-payment-request.png'; l.click(); };
  };
  ['ra', 'rm', 'rn'].forEach(i => $('#' + i, main).addEventListener('input', draw)); draw();
}
export function btoaTx(tx) { const u = tx.serialize({ requireAllSignatures: false, verifySignatures: false }); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }

export async function security(main, ctx) {
  const S = ctx.S;
  main.innerHTML = `<div class="ph1"><div><h1>Security center</h1><p>How STOCKZ keeps your account safe, and what you can check yourself.</p></div></div>
    <div class="cols"><div class="stack">
      <div class="panel"><header><h2>This session</h2>${S ? '<button class="btn ghost sm" id="so">Sign out</button>' : ''}</header><div class="pad">${S ? `<dl class="kv"><dt>Account</dt><dd>${esc(mask(S.address))}</dd><dt>Wallet</dt><dd>${esc(S.wallet)}</dd><dt>Address</dt><dd class="mono"><a href="#" id="cp">${esc(short(S.address))} ⧉</a></dd><dt>Signed in</dt><dd>${esc(new Date(S.at).toLocaleString())}</dd><dt>Sign-in message</dt><dd>${S.signed ? 'Signed by your wallet' : 'Your wallet has no message signing; connected only'}</dd><dt>Session ends</dt><dd>When you close this tab or sign out</dd></dl>` : '<span class="mut">You are browsing as a guest.</span>'}</div></div>
      <div class="panel"><header><h2>Token approvals</h2><span class="sm mut">wallets you allowed to move your tokens</span></header><div class="list" id="dl">${S ? '<div class="empty2">Scanning your token accounts…</div>' : '<div class="empty2">Sign in to check your approvals.</div>'}</div></div>
      <div class="panel"><header><h2>Issuer controls on the GTA VI basket</h2></header><div class="flush"><table class="tbl"><thead><tr><th>Stock</th><th>Program</th><th>What the issuer can do</th></tr></thead><tbody id="ic">${BASKET.map(s => `<tr data-m="${s.mint}"><td><b>${s.sym}</b> <span class="mut sm">${esc(s.issuer)}</span></td><td class="pg mut sm">—</td><td class="fl"><span class="skel">loading</span></td></tr>`).join('')}</tbody></table></div></div>
    </div><div class="stack">
      <div class="panel"><header><h2>How we protect you</h2></header><div class="list">${[['lock', 'No passwords', 'You sign in by signing a message. There is no password to phish or leak.'], ['wallet', 'No custody', 'STOCKZ never holds funds or keys, and can’t move anything without your signature.'], ['check', 'Dry runs', 'Launches and transfers are simulated before your wallet sees them.'], ['shield', 'Plain receipts', 'Every action links to its transaction on Solscan.']].map(([i, t, d]) => `<div class="it" style="align-items:flex-start;justify-content:flex-start;gap:12px"><span style="color:var(--up);width:22px;height:22px">${ICON[i]}</span><span><b>${t}</b><small class="mut" style="display:block">${d}</small></span></div>`).join('')}</div></div>
      <div class="panel"><header><h2>Your checklist</h2></header><div class="pad sm"><ol style="margin:0;padding-left:18px;display:grid;gap:8px"><li>Never type your seed phrase into any website, STOCKZ included. We will never ask for it.</li><li>Read every transaction in your wallet before you approve it.</li><li>Bookmark the real STOCKZ address and use the bookmark.</li><li>Use a separate wallet for launches and new coins.</li></ol></div></div>
      <div class="panel"><header><h2>Data on this device</h2></header><div class="pad"><p class="sm mut" style="margin-top:0">Your watchlist, alerts and receipts are kept in this browser only. Nothing is sent to a STOCKZ server.</p><button class="btn ghost sm" id="clr">Clear STOCKZ data on this device</button></div></div></div></div>`;
  if (S) { $('#so', main).onclick = () => ctx.actions.signOut(); $('#cp', main).onclick = e => { e.preventDefault(); copy(S.address); }; }
  $('#clr', main).onclick = () => { try { Object.keys(localStorage).filter(k => k.startsWith('stockz:')).forEach(k => localStorage.removeItem(k)); } catch {} toast('Cleared', 'ok'); };
  if (S) ctx.hold(true).then(h => { const all = [...h.cash, ...h.stocks, ...h.other].filter(r => r.delegate), box = $('#dl', main); if (!box) return;
    box.innerHTML = all.length ? all.map((r, i) => `<div class="it"><span><b>${esc(r.sym)}</b> <span class="pill w">approved</span><small class="mut" style="display:block">${esc(short(r.delegate))} can move up to ${num(r.delegated)} ${esc(r.sym)}</small></span><button class="btn ghost sm" data-rv="${i}">Revoke</button></div>`).join('') : '<div class="empty2">No approvals. No other wallet can move your tokens.</div>';
    $$('[data-rv]', box).forEach(b => b.onclick = async () => { const r = all[+b.dataset.rv]; b.disabled = true; b.innerHTML = '<span class="spin"></span>';
      try { await ctx.wallet(); const W3 = await web3(), me = new W3.PublicKey(S.address), tx = new W3.Transaction();
        tx.add(new W3.TransactionInstruction({ programId: new W3.PublicKey(r.prog), data: Uint8Array.of(5), keys: [{ pubkey: new W3.PublicKey(r.account), isSigner: false, isWritable: true }, { pubkey: me, isSigner: true, isWritable: false }] }));
        const bh = await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }]); tx.recentBlockhash = bh.value.blockhash; tx.feePayer = me;
        const sig = await sendSigned(tx); addReceipt(S.address, { kind: 'Revoked', text: `Revoked the ${r.sym} approval for ${short(r.delegate)}`, sig }); toast('Approval revoked', 'ok'); b.closest('.it').remove(); }
      catch (e) { b.disabled = false; b.textContent = 'Revoke'; toast(esc(/reject|denied|cancel/i.test(e.message) ? 'You cancelled in your wallet.' : e.message), 'err'); } }); }).catch(() => { const box = $('#dl', main); if (box) box.innerHTML = '<div class="empty2">Your token accounts could not be read right now.</div>'; });
  for (const tr of $$('#ic tr', main)) controls(tr.dataset.m).then(c => { $('.pg', tr).textContent = c ? c.program : '—'; $('.fl', tr).innerHTML = c ? (c.flags.length ? c.flags.map(([t, k]) => `<span class="pill ${k}" style="margin:2px">${esc(t)}</span>`).join('') : '<span class="pill g">None found</span>') : '<span class="mut sm">Unavailable</span>'; });
}

const HELP = [
  ['Getting started', [['How do I open an account?', 'Install a Solana wallet (Phantom, Solflare or Backpack), add a little SOL, then press Sign in on the home page and approve the message in your wallet.'], ['Why do I sign a message to log in?', 'It proves you control the wallet without a password. It costs nothing and moves nothing.']]],
  ['Trading', [['What am I buying?', 'Tokenized stocks: tokens that track a share price, issued by xStocks (Backed) or Backpack. They are not shares in your name.'], ['Why can the price move when the market is closed?', 'The tokens trade 24/7 while the shares trade on US market hours, so token prices can drift from the last close.'], ['What fees do I pay?', 'Jupiter’s routing fee and the pools’ fees, shown on the ticket before you sign, plus the Solana network fee. STOCKZ adds nothing on trades.']]],
  ['Launching', [['What does "priced in a stock" mean?', 'Your coin’s pump.fun bonding curve uses a stock token as its quote, so buyers pay in that stock and the curve fills in it.'], ['Who gets the creator fees?', 'You do, in the quote token, unless you switch on holder rewards: then pump.fun pays the creator fees to your coin’s holders.'], ['Which stocks can I pick?', 'The ones pump.fun accepts right now. STOCKZ reads the list live and greys out the rest.']]],
  ['OTC desk', [['How is a swap safe without escrow?', 'Both legs are in one transaction. It settles fully when both wallets sign, or not at all.'], ['Can I cancel an offer?', 'Yes. Cancelling advances the nonce on chain, which voids any signed ticket.']]],
];
export async function help(main) {
  main.innerHTML = `<div class="ph1"><div><h1>Help</h1><p>Answers to the common questions. Everything here can be checked on chain.</p></div></div>
    <div class="cols"><div class="stack">${HELP.map(([h, qs]) => `<div class="panel"><header><h2>${h}</h2></header><div class="pad faq">${qs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div>`).join('')}</div>
    <div class="stack"><div class="panel"><header><h2>Glossary</h2></header><div class="pad sm"><dl class="kv" style="grid-template-columns:auto 1fr;text-align:left">${[['Mint', 'A token’s address'], ['Quote', 'What a coin is priced in'], ['Curve', 'pump.fun’s price formula before a pool'], ['Slippage', 'How far the price may move before your order lands'], ['Nonce', 'A one-time number that makes a signed OTC ticket single-use']].map(([k, v]) => `<dt>${k}</dt><dd style="text-align:left;font-weight:500">${v}</dd>`).join('')}</dl></div></div>
      <div class="panel"><header><h2>Disclosures</h2></header><div class="pad xs mut" style="line-height:1.6"><p style="margin-top:0">STOCKZ is not a bank, a broker or an investment adviser, and nothing here is financial advice. STOCKZ never holds your funds or keys: every transaction is built for your wallet, shown to you and signed by you.</p><p>Tokenized stocks are tokens issued by third parties (xStocks by Backed; Backpack) that track a share price. They are not shares registered in your name, may not be available where you live, and their issuers can pause, freeze or move them. Memecoins and tokenized stocks are volatile and you can lose everything you put in.</p><p style="margin-bottom:0">STOCKZ is independent and not affiliated with, endorsed by or connected to Rockstar Games, Take-Two Interactive, Microsoft, AMD, GameStop, Nvidia, Backed, Backpack, pump.fun or Jupiter. All trademarks belong to their owners.</p></div></div>
      <div class="panel"><header><h2>Still stuck?</h2></header><div class="pad sm">Every receipt links to Solscan, where you can see exactly what happened. For anything else, reach STOCKZ on X.</div></div></div></div>`;
}
