// STOCKZ · the network: Solana through our relay (/api/rpc), prices and trades through Jupiter, candles from GeckoTerminal
import { SOL, USDC, USDT, ALL, byMint, CONFIG } from './core.js';
let id = 0;
export async function rpc(method, params = [], ms = 25000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }), signal: c.signal });
    const d = await r.json().catch(() => null);
    if (!d) throw new Error('Network: HTTP ' + r.status);
    if (d.error) { const e = new Error(d.error.message || 'RPC error'); e.data = d.error.data; throw e; }
    return d.result;
  } catch (e) { if (e.name === 'AbortError') throw new Error('The network is slow right now. Try again.'); throw e; }
  finally { clearTimeout(t); }
}
export async function j(url, opt = {}, ms = 15000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: c.signal }); const d = await r.json().catch(() => null); if (!r.ok) { const e = new Error((d && (d.error || d.message)) || 'HTTP ' + r.status); e.status = r.status; e.body = d; throw e; } return d; }
  catch (e) { if (e.name === 'AbortError') throw new Error('Timed out. Try again.'); throw e; }
  finally { clearTimeout(t); }
}
export const api = (path, body) => j('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}, 45000);

const JUP = 'https://lite-api.jup.ag', GT = 'https://api.geckoterminal.com/api/v2/networks/solana';
// Jupiter's token list: symbol, icon, price, 24h change, liquidity, holders. Cached for 20 s.
const TOK = new Map();
export async function tokens(mints, fresh = false) {
  const out = {}, need = [];
  for (const m of new Set(mints)) { const c = TOK.get(m); if (c && !fresh && Date.now() - c.at < 20000) out[m] = c.t; else need.push(m); }
  for (let i = 0; i < need.length; i += 40) {
    const part = need.slice(i, i + 40);
    try { const d = await j(`${JUP}/tokens/v2/search?query=${part.join(',')}`); for (const t of d || []) { TOK.set(t.id, { t, at: Date.now() }); out[t.id] = t; } } catch {}
  }
  hydrate();
  return out;
}
export const price = t => t && t.usdPrice != null ? +t.usdPrice : null;
export const chg24 = t => t && t.stats24h && t.stats24h.priceChange != null ? +t.stats24h.priceChange : null;
export const vol24 = t => t && t.stats24h ? (+t.stats24h.buyVolume || 0) + (+t.stats24h.sellVolume || 0) : null;
// a quote and a signed swap through Jupiter Ultra: Jupiter builds it, your wallet signs it, Jupiter lands it
export const order = p => j(`${JUP}/ultra/v1/order?` + new URLSearchParams(p).toString());
export const execute = (signedTransaction, requestId) => j(`${JUP}/ultra/v1/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signedTransaction, requestId }) }, 60000);
// candles: the token's deepest pool on GeckoTerminal
const POOLS = new Map();
export async function pools(mint) {
  const c = POOLS.get(mint); if (c && Date.now() - c.at < 300000) return c.v;
  const d = await j(`${GT}/tokens/${mint}/pools?page=1`);
  const v = (d.data || []).map(x => ({ id: x.attributes.address, liq: +x.attributes.reserve_in_usd || 0, name: x.attributes.name, vol: x.attributes.volume_usd ? +x.attributes.volume_usd.h24 || 0 : 0,
    dex: ((x.relationships || {}).dex || {}).data ? x.relationships.dex.data.id : '', ch: x.attributes.price_change_percentage ? +x.attributes.price_change_percentage.h24 : null })).sort((a, b) => b.liq - a.liq);
  POOLS.set(mint, { v, at: Date.now() }); return v;
}
export const pool = async mint => (await pools(mint))[0] || null;
export async function trades(mint) {
  const p = await pool(mint); if (!p) return [];
  const d = await j(`${GT}/pools/${p.id}/trades`);
  return (d.data || []).map(x => { const a = x.attributes, k = a.kind === 'buy', ours = (k ? a.to_token_address : a.from_token_address) === mint, buy = ours ? k : !k;
    // GeckoTerminal names the side from the pool's base token: flip it when our stock is the quote side
    const px = ours ? (k ? a.price_to_in_usd : a.price_from_in_usd) : (k ? a.price_from_in_usd : a.price_to_in_usd), amt = ours ? (k ? a.to_token_amount : a.from_token_amount) : (k ? a.from_token_amount : a.to_token_amount);
    return { t: Date.parse(a.block_timestamp), buy, usd: +a.volume_in_usd || 0, px: +px || null, amt: +amt || 0, tx: a.tx_hash }; }).filter(x => x.t && x.tx).sort((a, b) => b.t - a.t);
}
// live ticks: Jupiter's price feed every few seconds for every stock on the page, so numbers move as the market does
const LIVE = new Map(); let tickT = null;
export function startTicks(mints, emit) {
  mints.forEach(m => LIVE.set(m, LIVE.get(m) ?? null));
  if (tickT) return;
  const run = async () => {
    if (document.hidden) return;
    const ids = [...LIVE.keys()];
    for (let i = 0; i < ids.length; i += 50) {
      try { const d = await j(`${JUP}/price/v3?ids=${ids.slice(i, i + 50).join(',')}`, {}, 8000), out = {};
        for (const [m, v] of Object.entries(d || {})) { if (!v || v.usdPrice == null) continue; const p = +v.usdPrice, old = LIVE.get(m); LIVE.set(m, p); out[m] = { p, old };
          const c = TOK.get(m); if (c && c.t) c.t.usdPrice = p; }
        emit(out);
      } catch {}
    }
  };
  run(); tickT = setInterval(run, 6000);
}
export const livePx = m => LIVE.get(m);
const CND = new Map();
export async function candles(mint, tf = 'hour', agg = 1, limit = 168) {
  const key = [mint, tf, agg, limit].join(':'), c = CND.get(key); if (c && Date.now() - c.at < 180000) return c.v;
  const v = await candles0(mint, tf, agg, limit); CND.set(key, { v, at: Date.now() }); return v;
}
// the GTA VI Index: the five stocks, equal weight, rebased to 100 a week ago
export async function gtaIndex(mints) {
  const all = (await Promise.all(mints.map(m => candles(m, 'hour', 1, 168).catch(() => [])))).filter(a => a.length > 24);
  if (!all.length) return [];
  const hour = t => Math.floor(t / 36e5), maps = all.map(a => new Map(a.map(x => [hour(x.t), x.c]))), base = all.map(a => a[0].c);
  const hours = [...new Set(all.flatMap(a => a.map(x => hour(x.t))))].sort((x, y) => x - y), last = base.slice(), out = [];
  for (const h of hours) { let sum = 0; maps.forEach((m, i) => { if (m.has(h)) last[i] = m.get(h); sum += last[i] / base[i]; }); out.push({ t: h * 36e5, c: sum / maps.length * 100 }); }
  return out;
}
async function candles0(mint, tf, agg, limit) {
  const p = await pool(mint); if (!p) return [];
  const d = await j(`${GT}/pools/${p.id}/ohlcv/${tf}?aggregate=${agg}&limit=${limit}&currency=usd&token=${mint}`);
  return ((d.data && d.data.attributes && d.data.attributes.ohlcv_list) || []).map(c => ({ t: c[0] * 1000, o: +c[1], h: +c[2], l: +c[3], c: +c[4], v: +c[5] })).reverse();
}
// your wallet as a bank would show it: cash (SOL, USDC, USDT), the GTA stocks, everything else
const T22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export async function holdings(owner) {
  const [bal, a, b] = await Promise.all([
    rpc('getBalance', [owner, { commitment: 'confirmed' }]),
    rpc('getTokenAccountsByOwner', [owner, { programId: TOKEN }, { encoding: 'jsonParsed', commitment: 'confirmed' }]),
    rpc('getTokenAccountsByOwner', [owner, { programId: T22 }, { encoding: 'jsonParsed', commitment: 'confirmed' }]).catch(() => ({ value: [] })),
  ]);
  const rows = [];
  for (const [list, prog] of [[a.value || [], TOKEN], [b.value || [], T22]]) for (const x of list) {
    const info = x.account.data.parsed.info, ta = info.tokenAmount; let ui = +ta.uiAmountString || 0;
    if (!(+ta.amount > 0)) continue;
    const ext = (info.extensions || []).find(e => e.extension === 'scaledUiAmountConfig');
    if (ext && ext.state && ext.state.multiplier) ui = +ta.amount / 10 ** ta.decimals * +ext.state.multiplier;
    rows.push({ mint: info.mint, account: x.pubkey, raw: ta.amount, dec: ta.decimals, ui, prog, frozen: info.state === 'frozen', delegate: info.delegate || null, delegated: info.delegatedAmount ? +info.delegatedAmount.uiAmountString : 0 });
  }
  const meta = await tokens([SOL, ...rows.map(r => r.mint)]);
  const solPx = price(meta[SOL]), sol = (bal && bal.value || 0) / 1e9;
  const out = { sol, solUsd: solPx != null ? sol * solPx : null, solPx, cash: [], stocks: [], other: [], at: Date.now() };
  for (const r of rows) {
    const t = meta[r.mint], s = byMint(r.mint), px = price(t);
    const row = { ...r, sym: s ? s.sym : (t && t.symbol) || r.mint.slice(0, 4), name: s ? s.name : (t && t.name) || 'Unknown token', icon: (t && t.icon) || (s && s.logo) || '', px, usd: px != null ? r.ui * px : null, chg: chg24(t), stock: s || null };
    if (r.mint === USDC || r.mint === USDT) out.cash.push(row); else if (s) out.stocks.push(row); else out.other.push(row);
  }
  const sum = l => l.reduce((a, r) => a + (r.usd || 0), 0);
  out.cashUsd = sum(out.cash); out.stocksUsd = sum(out.stocks); out.otherUsd = sum(out.other);
  out.total = (out.solUsd || 0) + out.cashUsd + out.stocksUsd + out.otherUsd;
  const day = l => l.reduce((a, r) => a + (r.usd != null && r.chg != null ? r.usd - r.usd / (1 + r.chg / 100) : 0), 0);
  out.dayUsd = day(out.stocks) + day(out.other) + (out.solUsd != null && chg24(meta[SOL]) != null ? out.solUsd - out.solUsd / (1 + chg24(meta[SOL]) / 100) : 0);
  out.other.sort((x, y) => (y.usd || 0) - (x.usd || 0)); out.stocks.sort((x, y) => (y.usd || 0) - (x.usd || 0));
  return out;
}
// the last transactions that touched an address (the chain is the statement)
export const history = (addr, limit = 25, before) => rpc('getSignaturesForAddress', [addr, { limit, ...(before ? { before } : {}), commitment: 'confirmed' }]);
export async function confirm(sig, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await rpc('getSignatureStatuses', [[sig], { searchTransactionHistory: false }]); const s = r && r.value && r.value[0];
      if (s && s.err) throw new Error('The transaction failed on chain.'); if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return s; } catch (e) { if (/failed on chain/.test(e.message)) throw e; }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('Not confirmed yet. Check the transaction on Solscan.');
}
export const MINTS = { SOL, USDC, USDT, ALL };

// letter placeholders carry their mint; once Jupiter has an icon for it, the real logo replaces the letters
export function hydrate(root = document) {
  for (const el of root.querySelectorAll('.ph[data-mint]')) { const c = TOK.get(el.dataset.mint), ic = c && c.t && c.t.icon; if (!ic) continue;
    const im = new Image(); im.src = ic; im.alt = ''; im.className = el.className.replace('ph', '').trim(); im.style.cssText = el.style.cssText; im.onerror = () => im.replaceWith(el); el.replaceWith(im); }
}
export const iconFor = m => { const c = TOK.get(m); return c && c.t && c.t.icon || ''; };

// every coin launched on STOCKZ: the launch memo names the mint and the stock it is priced in
let SC = null, SCat = 0;
export async function stockzCoins() {
  if (SC && Date.now() - SCat < 60000) return SC;
  const sigs = await rpc('getSignaturesForAddress', [CONFIG.tag, { limit: 200, commitment: 'confirmed' }]), seen = new Map();
  for (const s of sigs || []) { if (s.err || !s.memo) continue; const m = /stockz:launch:([1-9A-HJ-NP-Za-km-z]{32,44}):([A-Z]{2,6})/.exec(s.memo); if (m && !seen.has(m[1])) seen.set(m[1], { mint: m[1], quote: m[2], t: (s.blockTime || 0) * 1000, sig: s.signature }); }
  SC = [...seen.values()]; SCat = Date.now(); return SC;
}
