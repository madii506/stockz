// STOCKZ · shared helpers, the config block and the stock list
export const CONFIG = {
  ca: '',            // the $STOCKZ mint once it is live (adds the Buy / Chart pill)
  x: '',             // the X account, e.g. 'https://x.com/...'
  gta: '2026-11-19T00:00:00',   // GTA VI release day, midnight local time
  tag: 'BjDSwfUi6sWn4e42wNAjupmz8tsHqjQ69BkpdcVqzPME',   // every STOCKZ launch pings this key, so the chain lists them all
};
export const SOL = 'So11111111111111111111111111111111111111112';
export const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const XL = t => `https://xstocks-metadata.backed.fi/logos/tokens/${t}.png`;
// the GTA VI basket: the publisher, the consoles' chips and platform, the store and the graphics
export const BASKET = [
  { sym: 'TTWO', name: 'Take-Two Interactive', tok: 'TTWO', mint: 'TTWofwAge91oFhZs7kpQdyrVRkmevgM88xijGvQFbKo', issuer: 'Backpack', why: 'The publisher behind GTA VI and Rockstar Games.' },
  { sym: 'MSFT', name: 'Microsoft', tok: 'MSFTx', mint: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', issuer: 'xStocks', logo: XL('MSFTx'), why: 'Xbox: one of the two consoles GTA VI ships on.' },
  { sym: 'AMD', name: 'AMD', tok: 'AMDx', mint: 'XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF', issuer: 'xStocks', logo: XL('AMDx'), why: 'The chips inside both the PS5 and the Xbox Series X.' },
  { sym: 'GME', name: 'GameStop', tok: 'GMEx', mint: 'Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc', issuer: 'xStocks', logo: XL('GMEx'), why: 'The game store, and the trenches’ favourite stock.' },
  { sym: 'NVDA', name: 'Nvidia', tok: 'NVDAx', mint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', issuer: 'xStocks', logo: XL('NVDAx'), why: 'The graphics behind every frame of modern gaming.' },
];
// more tokenized stocks and funds anyone can trade here
export const MORE = [
  ['SPY', 'S&P 500', 'SPYx', 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W', 'etf'], ['QQQ', 'Nasdaq-100', 'QQQx', 'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ', 'etf'],
  ['TSLA', 'Tesla', 'TSLAx', 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB'], ['AAPL', 'Apple', 'AAPLx', 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'],
  ['GOOGL', 'Alphabet', 'GOOGLx', 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'], ['META', 'Meta', 'METAx', 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu'],
  ['AMZN', 'Amazon', 'AMZNx', 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg'], ['NFLX', 'Netflix', 'NFLXx', 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL'],
  ['COIN', 'Coinbase', 'COINx', 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu'], ['HOOD', 'Robinhood', 'HOODx', 'XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg'],
].map(([sym, name, tok, mint, kind]) => ({ sym, name, tok, mint, issuer: 'xStocks', logo: XL(tok), kind: kind || 'stock' }));
export const ALL = [...BASKET.map(s => ({ ...s, gta: true, kind: 'stock' })), ...MORE];
export const bySym = s => ALL.find(x => x.sym === s);
export const byMint = m => ALL.find(x => x.mint === m);

const BUS = new Map();
export const on = (e, f) => { (BUS.get(e) || BUS.set(e, []).get(e)).push(f); };
export const emit = (e, v) => (BUS.get(e) || []).forEach(f => { try { f(v); } catch (err) { console.error(err); } });
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem('stockz:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stockz:' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('stockz:' + k); } catch {} },
};
export const sess = {
  get(k, d = null) { try { const v = sessionStorage.getItem('stockz:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem('stockz:' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { sessionStorage.removeItem('stockz:' + k); } catch {} },
};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
export const mask = a => a ? '••••' + a.slice(-4) : '••••';
export const ok = v => v != null && isFinite(v);
export const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
export function usd(v, d) {
  if (!ok(v)) return '—';
  const a = Math.abs(v), sg = v < 0 ? '-' : '';
  if (a >= 1e9) return sg + '$' + (a / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return sg + '$' + (a / 1e6).toFixed(2) + 'M';
  if (a > 0 && a < .01) return sg + '<$0.01';
  return sg + '$' + a.toLocaleString('en-US', { minimumFractionDigits: d ?? 2, maximumFractionDigits: d ?? 2 });
}
export function num(v, d = 4) {
  if (!ok(v)) return '—'; const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (a >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (a >= 1) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a === 0) return '0';
  return (+v.toPrecision(d)).toString();
}
export const pct = (v, d = 2) => !ok(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(d) + '%';
export const tone = v => !ok(v) || v === 0 ? '' : v > 0 ? 'up' : 'dn';
export const solscan = (x, kind = 'tx') => `https://solscan.io/${kind}/${x}`;
export const ago = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? Math.floor(s) + 's ago' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
export const when = t => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export function toast(msg, kind = '', ms = 5000) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg; box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}
export async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied to clipboard', 'ok', 2200); } catch { toast('Copy failed. Select it by hand.', 'err'); } }
// New York market hours (the tokens trade 24/7; the stocks behind them do not)
export function nyse(now = new Date()) {
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })), d = ny.getDay(), m = ny.getHours() * 60 + ny.getMinutes();
  const open = d > 0 && d < 6 && m >= 570 && m < 960;
  return { open, label: open ? 'US market open' : (d > 0 && d < 6 && m >= 240 && m < 570) ? 'Pre-market' : (d > 0 && d < 6 && m >= 960 && m < 1200) ? 'After hours' : 'US market closed' };
}
export function gtaLeft() {
  const t = new Date(CONFIG.gta).getTime() - Date.now();
  if (t <= 0) return { out: true, day: Math.floor(-t / 864e5) + 1, text: 'GTA VI is out' };
  const d = Math.floor(t / 864e5), h = Math.floor(t / 36e5) % 24, mi = Math.floor(t / 6e4) % 60, s = Math.floor(t / 1e3) % 60;
  return { out: false, d, h, m: mi, s, text: (d ? d + 'd ' : '') + h + 'h ' + String(mi).padStart(2, '0') + 'm' };
}
export const logoOf = (s, t) => (t && t.icon) || (s && s.logo) || '';
export const ICON = {
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l7.5 3v5.6c0 4.6-3.1 8.4-7.5 9.8-4.4-1.4-7.5-5.2-7.5-9.8V5.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 19.5h17M6 16l4.2-5 3.3 3 5-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7.5h3.5V11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 4.2c2.7-.9 5-.7 6.1-.1.6 1.1.8 3.4-.1 6.1-.9 2.6-3.1 5.2-6.3 7.1l-3-3-3-3c1.9-3.2 4.5-5.4 7.1-6.3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="15.6" cy="8.4" r="1.6" fill="currentColor"/><path d="M7.5 13.5l-3 .8 2.2-3.6M10.5 16.5l-.8 3 3.6-2.2M5.2 18.8l2.2-2.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5L20.5 4l-6.8 16.5-2.6-6.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11.1 13.6L20.5 4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3h7.5l4.5 4.5V21h-12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13.5 3v5h5M9 13h6M9 16.5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20.5a2.2 2.2 0 004 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h14.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 18V6.5A1.5 1.5 0 015.5 5H17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="13.5" r="1.4" fill="currentColor"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5h11M9 12h11M9 17.5h11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="4.8" cy="6.5" r="1.3" fill="currentColor"/><circle cx="4.8" cy="12" r="1.3" fill="currentColor"/><circle cx="4.8" cy="17.5" r="1.3" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16.8l-5.4 3 1.2-6.1-4.5-4.2 6.1-.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.4 9.4a2.7 2.7 0 015.2.9c0 1.9-2.6 2.2-2.6 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.2" fill="currentColor"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.2V12l3.2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.2 15.2l5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  ext: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10v10M19 5L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.7 5.3L17 7M7 17l-1.7 1.7M18.7 18.7L17 17M7 7L5.3 5.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5H6.5A1.5 1.5 0 005 6v12a1.5 1.5 0 001.5 1.5H14M10.5 12H20m-3.5-3.5L20 12l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  desk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5h17v3h-17zM5.5 12.5V20M18.5 12.5V20M8 9.5V6.5a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  pie: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15 3.9A8.5 8.5 0 0 1 20.1 9H15z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  coins: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="9" cy="7" rx="5.5" ry="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 7v4.5c0 1.4 2.5 2.6 5.5 2.6M3.5 11.5V16c0 1.4 2.5 2.6 5.5 2.6M14.5 7v2" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="15" cy="13.5" rx="5.5" ry="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 13.5V18c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};
// the STOCKZ emblem: a pink tile with a rising candle line, and the wordmark next to it
export const EMBLEM = '<svg viewBox="0 0 40 40" class="emb" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="9" fill="#e8247a"/><path d="M9 27l7-7 5 4 9.5-11" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24.5 12.5h6.5V19" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const LOGO = `<span class="logo">${EMBLEM}<b class="wm">STOCKZ</b></span>`;

// day or night: the terminal starts at night; the choice is remembered on this device
export const theme = { get: () => store.get('theme') || 'dark', set(t) { store.set('theme', t); document.documentElement.dataset.theme = t; emit('theme', t); } };
