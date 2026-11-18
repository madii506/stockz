// STOCKZ · launch a pump.fun coin priced in a GTA stock (or in SOL). This function only builds and simulates:
// the mint key is made in the visitor's browser, their wallet signs and pays, and no key ever reaches this server.
const { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, ComputeBudgetProgram } = require('@solana/web3.js');
const BN = require('bn.js');
const P = require('@pump-fun/pump-sdk');

const TAG = new PublicKey('BjDSwfUi6sWn4e42wNAjupmz8tsHqjQ69BkpdcVqzPME');
const MEMO = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const SOL = 'So11111111111111111111111111111111111111112';
const QUOTES = [
  ['TTWO', 'TTWofwAge91oFhZs7kpQdyrVRkmevgM88xijGvQFbKo'], ['MSFT', 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX'], ['AMD', 'XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF'],
  ['GME', 'Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc'], ['NVDA', 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'], ['SOL', SOL],
];
const RPC = () => process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
let conn = null; const C = () => conn || (conn = new Connection(RPC(), 'confirmed'));
const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let n = 0; for await (const c of req) { n += c.length; if (n > 4.5e6) throw new Error('too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
const pk = s => { try { return new PublicKey(String(s)); } catch { return null; } };
const toRaw = (ui, dec) => { const [a, b = ''] = String(ui).trim().split('.'); if (!/^\d+$/.test(a || '0') || !/^\d*$/.test(b)) throw new Error('bad amount'); return new BN((a || '0') + (b + '0'.repeat(dec)).slice(0, dec)); };
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
async function rpcRaw(method, params) {
  const r = await fetch(RPC(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await r.json(); if (j.error) throw new Error(j.error.message); return j.result;
}

let qcache = null, qat = 0;
async function quotes() {
  if (qcache && Date.now() - qat < 300000) return qcache;
  const sdk = new P.OnlinePumpSdk(C());
  const [g, list] = await Promise.all([sdk.fetchGlobal(), sdk.fetchSupportedQuoteMints()]);
  const ok = new Map(list.map(q => [q.mint.toBase58(), q]));
  qcache = {
    quotes: QUOTES.map(([sym, mint]) => { const q = ok.get(mint); return { sym, mint, ok: !!q, source: q ? q.source : null, ivqr: q ? q.initialVirtualQuoteReserves.toString() : null }; }),
    creatorFee: { configurable: !!g.creatorFeeConfigurable, maxBps: g.maxConfigurableCreatorFeeBps != null ? Number(g.maxConfigurableCreatorFeeBps.toString()) : 0 },
    holderReward: !!g.isHolderRewardEnabled, ivtr: g.initialVirtualTokenReserves.toString(), supply: g.tokenTotalSupply.toString(), listed: list.length,
    storage: !!process.env.BLOB_READ_WRITE_TOKEN,
  };
  qat = Date.now(); return qcache;
}

async function meta(b) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw Object.assign(new Error('Image storage is not connected yet.'), { code: 'storage' });
  const { put } = require('@vercel/blob');
  const name = clean(b.name, 32), symbol = clean(b.symbol, 10).toUpperCase().replace(/[^A-Z0-9$]/g, '');
  if (!name || !symbol) throw new Error('Name and ticker are required.');
  const m = /^data:(image\/(png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
  if (!m) throw new Error('Add a PNG, JPG, GIF or WEBP image.');
  const buf = Buffer.from(m[3], 'base64'); if (buf.length > 3e6) throw new Error('The image is over 3 MB.');
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  const img = await put(`stockz/i/${id}.${ext}`, buf, { access: 'public', contentType: m[1], addRandomSuffix: false });
  const site = /^https?:\/\//.test(b.website || '') ? clean(b.website, 120) : undefined, x = /^https?:\/\//.test(b.twitter || '') ? clean(b.twitter, 120) : undefined, tg = /^https?:\/\//.test(b.telegram || '') ? clean(b.telegram, 120) : undefined;
  const json = { name, symbol, description: clean(b.description, 500), image: img.url, showName: true, createdOn: 'STOCKZ', ...(site ? { website: site } : {}), ...(x ? { twitter: x } : {}), ...(tg ? { telegram: tg } : {}) };
  const j = await put(`stockz/m/${id}.json`, JSON.stringify(json), { access: 'public', contentType: 'application/json', addRandomSuffix: false });
  if (j.url.length > 200) throw new Error('Metadata link too long.');
  return { uri: j.url, image: img.url };
}

async function build(b) {
  const user = pk(b.user), mint = pk(b.mint), q = QUOTES.find(([, m]) => m === b.quote);
  if (!user || !mint) throw new Error('Bad wallet or mint address.');
  if (!q) throw new Error('Pick one of the listed quotes.');
  const name = clean(b.name, 32), symbol = clean(b.symbol, 10).toUpperCase(), uri = String(b.uri || '');
  if (!name || !symbol) throw new Error('Name and ticker are required.');
  if (!/^https:\/\//.test(uri) || uri.length > 200) throw new Error('Upload the image and metadata first.');
  const sdk = new P.OnlinePumpSdk(C()), isSol = q[1] === SOL, quoteMint = new PublicKey(q[1]);
  const [global, feeConfig] = await Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig().catch(() => null)]);
  const feeBps = +b.feeBps > 0 ? Math.round(+b.feeBps) : 0, holder = !!b.holder;
  let ixs, buyRaw = null;
  if (isSol) {
    if (+b.buy > 0) {
      const solAmount = toRaw(b.buy, 9); buyRaw = solAmount.toString();
      const amount = P.getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: solAmount, quoteMint: new PublicKey(SOL) });
      ixs = await P.PUMP_SDK.createV2AndBuyInstructions({ global, mint, name, symbol, uri, creator: user, user, amount, solAmount, mayhemMode: false });
    } else ixs = [await P.PUMP_SDK.createV2Instruction({ mint, name, symbol, uri, creator: user, user, mayhemMode: false })];
  } else {
    const [qc, rq, qtf] = await Promise.all([sdk.fetchQuoteControl(), sdk.resolveQuoteMint(quoteMint), sdk.fetchQuoteTransferFee(quoteMint).catch(() => null)]);
    const creatorFeeBps = feeBps ? new BN(feeBps) : undefined;
    if (+b.buy > 0) {
      const budget = toRaw(b.buy, rq.decimals); buyRaw = budget.toString();
      const amount = P.getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: budget, quoteMint, quoteControl: qc, creatorFeeBps, quoteTransferFee: qtf });
      ixs = await P.PUMP_SDK.createV2AndBuyV2Instructions({ global, mint, name, symbol, uri, creator: user, user, amount, quoteAmount: budget, mayhemMode: false, quoteMint, quoteTokenProgram: rq.quoteTokenProgram, creatorFeeBps, holderReward: holder, slippage: 3 });
    } else ixs = [await P.PUMP_SDK.createV2Instruction({ mint, name, symbol, uri, creator: user, user, mayhemMode: false, quoteMint, quoteTokenProgram: rq.quoteTokenProgram, creatorFeeBps, holderReward: holder })];
  }
  const bh = await C().getLatestBlockhash('confirmed');
  const memo = new TransactionInstruction({ programId: MEMO, keys: [{ pubkey: user, isSigner: true, isWritable: false }], data: Buffer.from(`stockz:launch:${mint.toBase58()}:${q[0]}`) });
  const tag = SystemProgram.transfer({ fromPubkey: user, toPubkey: TAG, lamports: 0 });
  const make = (list, cu) => { const t = new Transaction(); t.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cu }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 150000 })); t.add(...list); t.recentBlockhash = bh.blockhash; t.feePayer = user; return t; };
  const size = t => { try { return t.serialize({ requireAllSignatures: false, verifySignatures: false }).length; } catch { return 99999; } };
  // one transaction when it fits; otherwise the create (with the mint's signature) and then the first buy, in one wallet prompt
  let txs = [make([...ixs, memo, tag], isSol ? 350000 : 600000)];
  if (size(txs[0]) > 1232) {
    if (ixs.length < 2) throw new Error('The launch transaction is too large.');
    txs = [make([ixs[0], memo, tag], 300000), make(ixs.slice(1), isSol ? 200000 : 320000)];
    if (txs.some(t => size(t) > 1232)) throw new Error('The launch transaction is too large. Try a shorter name or no first buy.');
  }
  const b64 = txs.map(t => t.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'));
  let sim = null;
  try { const s = await rpcRaw('simulateTransaction', [b64[0], { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' }]); sim = { err: s.value.err, units: s.value.unitsConsumed, logs: (s.value.logs || []).slice(-14) }; }
  catch (e) { sim = { err: 'simulation unavailable: ' + e.message }; }
  return { txs: b64, tx: b64[0], split: b64.length > 1, sizes: txs.map(size), quote: q[0], buyRaw, sim, lastValidBlockHeight: bh.lastValidBlockHeight };
}

// creator fees: what a launcher has waiting, in SOL and in every stock, and the transactions that collect it all
const STOCK_MINTS = QUOTES.filter(([s]) => s !== 'SOL').map(([, m]) => new PublicKey(m));
let fcache = new Map();
async function fees(creator) {
  const c = pk(creator); if (!c) throw new Error('Bad wallet address.');
  const hit = fcache.get(c.toBase58()); if (hit && Date.now() - hit.at < 45000) return hit.v;
  const sdk = new P.OnlinePumpSdk(C());
  const list = await sdk.getCreatorVaultQuoteBalances(c, STOCK_MINTS);
  const v = { creator: c.toBase58(), balances: list.filter(b => !b.total.isZero()).map(b => ({ mint: b.mint.toBase58(), raw: b.total.toString(), source: b.source })) };
  fcache.set(c.toBase58(), { v, at: Date.now() }); return v;
}
async function claim(b) {
  const c = pk(b.creator); if (!c) throw new Error('Bad wallet address.');
  const sdk = new P.OnlinePumpSdk(C());
  const ixs = await sdk.collectCoinCreatorFeeAllQuotesInstructions(c, c, STOCK_MINTS);
  if (!ixs.length) throw new Error('Nothing to collect right now.');
  const bh = await C().getLatestBlockhash('confirmed'), txs = [];
  let cur = new Transaction();
  const fresh = () => { const t = new Transaction(); t.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 })); t.recentBlockhash = bh.blockhash; t.feePayer = c; return t; };
  cur = fresh();
  for (const ix of ixs) {
    const t2 = fresh(); cur.instructions.slice(2).forEach(i => t2.add(i)); t2.add(ix);
    let size = 9999; try { size = t2.serialize({ requireAllSignatures: false, verifySignatures: false }).length; } catch {}
    if (size > 1180 && cur.instructions.length > 2) { txs.push(cur); cur = fresh(); cur.add(ix); } else cur = t2;
  }
  if (cur.instructions.length > 2) txs.push(cur);
  if (txs.length > 8) throw new Error('Too many fee vaults to collect at once.');
  return { txs: txs.map(t => t.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')) };
}

module.exports = async (req, res) => {
  const a = new URL(req.url, 'http://x').searchParams.get('a');
  try {
    if (a === 'quotes') return send(res, 200, await quotes());
    if (a === 'fees') return send(res, 200, await fees(new URL(req.url, 'http://x').searchParams.get('creator')));
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    const b = await body(req);
    if (a === 'meta') return send(res, 200, await meta(b));
    if (a === 'build') return send(res, 200, await build(b));
    if (a === 'claim') return send(res, 200, await claim(b));
    return send(res, 404, { error: 'unknown action' });
  } catch (e) { return send(res, e.code === 'storage' ? 503 : 400, { error: String(e && e.message || e).slice(0, 300), code: e.code || null }); }
};
