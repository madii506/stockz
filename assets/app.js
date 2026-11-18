// STOCKZ · online banking: the top bar, the side menu and the pages
import { $, $$, esc, short, mask, ICON, EMBLEM, ALL, CONFIG, gtaLeft, nyse, store, toast, usd, on, emit, copy, theme } from './core.js';
import { W, connect } from './wallet.js';
import { holdings, tokens, price, chg24, startTicks } from './net.js';

const NAV = [
  ['Accounts', [['overview', 'home', 'Overview'], ['portfolio', 'wallet', 'Portfolio'], ['activity', 'list', 'Activity'], ['statements', 'doc', 'Statements']]],
  ['Invest', [['trade', 'chart', 'Trade'], ['markets', 'coins', 'Markets'], ['watch', 'star', 'Watchlist & alerts']]],
  ['Create', [['launch', 'rocket', 'Launch a coin'], ['coins', 'coins', 'Coins on STOCKZ']]],
  ['Move money', [['otc', 'desk', 'OTC desk'], ['transfer', 'send', 'Transfers']]],
  ['Settings', [['security', 'shield', 'Security center'], ['help', 'help', 'Help']]],
];
const LOAD = {
  overview: () => import('./p-accounts.js').then(m => m.overview), portfolio: () => import('./p-accounts.js').then(m => m.portfolio),
  activity: () => import('./p-accounts.js').then(m => m.activity), statements: () => import('./p-accounts.js').then(m => m.statements),
  trade: () => import('./p-invest.js').then(m => m.trade), markets: () => import('./p-invest.js').then(m => m.markets), watch: () => import('./p-invest.js').then(m => m.watch),
  launch: () => import('./p-launch.js').then(m => m.launch), coins: () => import('./p-launch.js').then(m => m.coins),
  otc: () => import('./p-otc.js').then(m => m.otc), transfer: () => import('./p-more.js').then(m => m.transfer),
  security: () => import('./p-more.js').then(m => m.security), help: () => import('./p-more.js').then(m => m.help),
};
let shell = null, cleanup = null, H = null, Hat = 0, Hp = null;
export const ctx = {
  S: null, actions: null,
  // your balances, refreshed at most every 20 s unless asked
  async hold(force = false) {
    const a = ctx.S && ctx.S.address; if (!a) return null;
    if (!force && H && H.owner === a && Date.now() - Hat < 20000) return H;
    if (Hp) return Hp;
    Hp = holdings(a).then(h => { H = { ...h, owner: a }; Hat = Date.now(); emit('hold', H); return H; }).finally(() => { Hp = null; });
    return Hp;
  },
  cached: () => (H && ctx.S && H.owner === ctx.S.address ? H : null),
  nav: p => { location.hash = '#/app/' + p; },
  // make sure the wallet is connected before anything that signs
  async wallet() {
    if (!ctx.S) { ctx.actions.needSignIn(location.hash.slice(6)); throw new Error('Sign in first.'); }
    if (W.address === ctx.S.address) return W.address;
    const a = await connect(ctx.S.wallet);
    if (a !== ctx.S.address) toast('Your wallet switched accounts. Signed in as ' + esc(short(a)) + '.', '', 6000);
    ctx.S = { ...ctx.S, address: a }; return a;
  },
  guestPanel(what) { return `<div class="panel"><div class="pad" style="text-align:center;padding:40px 20px"><div style="width:54px;height:54px;border-radius:50%;background:var(--pinkbg);color:var(--pink2);display:grid;place-items:center;margin:0 auto 14px">${ICON.lock}</div>
    <h2 style="margin:0 0 6px;color:var(--head)">Sign in to ${esc(what)}</h2><p class="mut" style="margin:0 0 18px">You are browsing as a guest. Sign in with your wallet to see your own accounts.</p>
    <button class="btn pri" data-signin>Sign in</button></div></div>`; },
};
on('wallet', () => { if (ctx.S && W.address && W.address !== ctx.S.address) { ctx.S = { ...ctx.S, address: W.address }; H = null; } });

export async function renderApp(root, route, S, actions) {
  ctx.S = S; ctx.actions = actions;
  const [page, ...rest] = route.split('/'); const name = LOAD[page] ? page : 'overview';
  if (!shell || !document.body.contains(shell)) { root.innerHTML = frame(); shell = $('.app', root); wire(root); }
  $$('.side a, .bnav a', shell).forEach(a => a.classList.toggle('on', a.dataset.p === name));
  $('.side', shell).classList.remove('open');
  const main = $('#main', shell);
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  main.innerHTML = '<div class="panel"><div class="pad"><div class="skel" style="height:22px;width:40%;margin-bottom:12px"></div><div class="skel" style="height:120px"></div></div></div>';
  window.scrollTo(0, 0);
  try {
    const fn = await LOAD[name]();
    const c = await fn(main, ctx, rest);
    cleanup = typeof c === 'function' ? c : null;
    main.classList.remove('pin'); void main.offsetWidth; main.classList.add('pin');
  } catch (e) { console.error(e); main.innerHTML = `<div class="note r">${ICON.help}<span>This page could not load: ${esc(e.message)}</span></div>`; }
  $$('[data-signin]', main).forEach(b => b.addEventListener('click', () => actions.needSignIn(route)));
  document.title = (name === 'overview' ? 'Accounts' : $(`.side a[data-p="${name}"]`, shell)?.textContent.trim() || 'STOCKZ') + ' · STOCKZ';
}

function frame() {
  const S = ctx.S, g = gtaLeft(), m = nyse();
  return `<div class="app">
    <div class="atop"><button class="ibtn mbar" id="burger" aria-label="Menu">${ICON.list}</button>
      <a class="logo" href="#/app/overview">${EMBLEM}<b class="wm">STOCKZ</b></a>
      <div class="srch">${ICON.search}<input id="q" placeholder="Search stocks, coins or addresses" autocomplete="off" aria-label="Search"><div class="res" id="qres"></div></div>
      <div class="chips"><span class="pill ${m.open ? '' : 'cl'}" id="mchip"><span class="dot"></span>${esc(m.label)}</span><span class="pill" id="gchip2">${ICON.clock} ${g.out ? 'GTA VI is out' : 'GTA VI in ' + esc(g.text)}</span>
        <button class="ibtn" id="thm" aria-label="Day or night" title="Day or night">${theme.get() === 'dark' ? ICON.sun : ICON.moon}</button><button class="ibtn" id="eye" aria-label="Hide balances" title="Hide balances">${ICON.eye}</button><button class="ibtn" id="bell" aria-label="Alerts">${ICON.bell}<span class="bd" id="bdot" hidden></span></button>
        ${S ? `<button class="me" id="me"><span class="av">${esc(S.address.slice(0, 2).toUpperCase())}</span><b>${esc(short(S.address))}</b></button>` : `<button class="btn pink sm" data-signin>Sign in</button>`}</div></div>
    <div class="tape" aria-label="Live prices"><div class="tr" id="tape">${ALL.map(x => `<a href="#/app/trade/${x.sym}" data-m="${x.mint}"><b>${x.sym}</b><span class="p">\u2014</span><span class="c"></span></a>`).join('')}</div></div>
    <aside class="side">${NAV.map(([h, items]) => `<h6>${h}</h6>` + items.map(([p, i, t]) => `<a href="#/app/${p}" data-p="${p}">${ICON[i]}${t}</a>`).join('')).join('')}
      <div class="ca">${CONFIG.ca ? `<b style="color:var(--head)">$STOCKZ</b><div style="word-break:break-all;margin:4px 0 8px">${esc(CONFIG.ca)}</div><button class="btn ghost sm" id="cacopy">Copy CA</button>` : `<b style="color:var(--head)">STOCKZ Online</b><div>Every action is a transaction your wallet signs. STOCKZ never holds funds.</div>`}</div></aside>
    <main class="main" id="main"></main>
    <nav class="bnav">${[['overview', 'home', 'Accounts'], ['trade', 'chart', 'Trade'], ['launch', 'rocket', 'Launch'], ['otc', 'desk', 'OTC']].map(([p, i, t]) => `<a href="#/app/${p}" data-p="${p}">${ICON[i]}<span>${t}</span></a>`).join('')}<button id="bmore">${ICON.list}<span>More</span></button></nav></div>`;
}

function wire(root) {
  const S = ctx.S;
  $('#burger', root).onclick = () => $('.side', root).classList.toggle('open');
  $$('[data-signin]', root).forEach(b => b.addEventListener('click', () => ctx.actions.needSignIn(location.hash.slice(6))));
  const cc = $('#cacopy', root); if (cc) cc.onclick = () => copy(CONFIG.ca);
  // the account menu
  const me = $('#me', root);
  if (me) me.onclick = e => {
    e.stopPropagation(); const old = $('.menu', root); if (old) return old.remove();
    const m = document.createElement('div'); m.className = 'menu';
    const last = S.last ? new Date(S.last).toLocaleString() : 'First sign-in';
    m.innerHTML = `<div class="who"><b>Account ${esc(mask(S.address))}</b><small>${esc(S.wallet)} · Last sign-in: ${esc(last)}</small></div>
      <button data-a="copy">${ICON.doc} Copy wallet address</button><a href="https://solscan.io/account/${S.address}" target="_blank" rel="noopener">${ICON.ext} View on Solscan</a>
      <a href="#/app/security">${ICON.shield} Security center</a><hr><button data-a="out">${ICON.out} Sign out</button>`;
    m.onclick = ev => { const a = ev.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'copy') copy(S.address); if (a.dataset.a === 'out') ctx.actions.signOut(); m.remove(); };
    $('.app', root).appendChild(m);
    setTimeout(() => document.addEventListener('click', function f(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', f); } }), 0);
  };
  $('#bell', root).onclick = e => { e.stopPropagation(); bellMenu(root); };
  $('#bmore', root).onclick = () => $('.side', root).classList.toggle('open');
  $('#thm', root).onclick = () => { const t = theme.get() === 'dark' ? 'light' : 'dark'; theme.set(t); $('#thm', root).innerHTML = t === 'dark' ? ICON.sun : ICON.moon; const r = location.hash; setTimeout(() => window.dispatchEvent(new Event('resize')), 30); };
  const priv = on => { document.body.classList.toggle('privacy', on); store.set('privacy', on); $('#eye', root).style.background = on ? 'rgba(232,36,122,.5)' : ''; };
  priv(!!store.get('privacy')); $('#eye', root).onclick = () => priv(!document.body.classList.contains('privacy'));
  // the tape: every stock, live, scrolling
  const tape = $('#tape', root); tape.innerHTML += tape.innerHTML;
  const paintTape = async () => { const M = await tokens(ALL.map(x => x.mint));
    for (const a of $$('a[data-m]', tape)) { const t = M[a.dataset.m]; if (!t) continue; const c = chg24(t); $('.p', a).textContent = usd(price(t)); const e = $('.c', a); e.textContent = (c > 0 ? '\u25b2 ' : c < 0 ? '\u25bc ' : '') + (c != null ? Math.abs(c).toFixed(2) + '%' : ''); e.className = 'c ' + (c > 0 ? 'up' : c < 0 ? 'dn' : ''); } };
  paintTape(); const tt = setInterval(() => { if (!document.body.contains(tape)) return clearInterval(tt); if (!document.hidden) paintTape(); }, 30000);
  // live ticks: every price on screen that carries data-live-px moves and flashes as the feed updates
  startTicks(ALL.map(x => x.mint).concat('So11111111111111111111111111111111111111112'), out => {
    emit('tick', out);
    for (const el of document.querySelectorAll('[data-live-px], #tape a[data-m] .p')) {
      const m = el.dataset.livePx || (el.parentElement && el.parentElement.dataset.m), t = m && out[m]; if (!t) continue;
      const txt = usd(t.p); if (el.textContent === txt) continue; el.textContent = txt;
      if (t.old != null && t.old !== t.p) { el.classList.remove('fu', 'fd'); void el.offsetWidth; el.classList.add(t.p > t.old ? 'fu' : 'fd'); }
    }
  });
  // Ctrl/Cmd+K: jump anywhere
  addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && document.body.contains(root.querySelector('.app'))) { e.preventDefault(); palette(); } });
  // single keys, like a trading terminal: / search, B buy, S sell, T trade, M markets, O overview, ? the list
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || !document.body.contains(root.querySelector('.app')) || document.querySelector('.veil')) return;
    const tg = e.target, typing = tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)); if (typing) return;
    const k = e.key.toLowerCase(), side = v => { const b = document.querySelector(`#side button[data-v="${v}"]`); if (!b) return false; b.click(); const a = document.querySelector('#amt'); if (a) a.focus(); return true; };
    if (k === '/') { e.preventDefault(); const qq = $('#q', root); if (qq && qq.offsetParent) qq.focus(); else palette(); }
    else if (k === 'b') { if (!side('buy')) location.hash = '#/app/trade/TTWO'; }
    else if (k === 's') { if (!side('sell')) location.hash = '#/app/trade/TTWO/sell'; }
    else if (k === 't') location.hash = '#/app/trade';
    else if (k === 'm') location.hash = '#/app/markets';
    else if (k === 'o') location.hash = '#/app/overview';
    else if (e.key === '?') keysHelp();
  });
  // search: stocks by name or ticker, a mint or wallet address
  const q = $('#q', root), res = $('#qres', root);
  q.oninput = () => {
    const s = q.value.trim().toLowerCase(); if (!s) { res.classList.remove('on'); return; }
    const hits = ALL.filter(x => x.sym.toLowerCase().includes(s) || x.name.toLowerCase().includes(s)).slice(0, 7);
    let html = hits.map(x => `<a href="#/app/trade/${x.sym}"><span class="tic">${x.logo ? `<img src="${x.logo}" alt="">` : `<span class="ph" data-mint="${x.mint}">${x.sym}</span>`}<span><b>${esc(x.name)}</b><small>${x.sym}</small></span></span><span class="pill">Trade</span></a>`).join('');
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q.value.trim())) html += `<a href="https://solscan.io/account/${q.value.trim()}" target="_blank" rel="noopener"><span>Open ${esc(short(q.value.trim()))} on Solscan</span>${ICON.ext}</a>`;
    res.innerHTML = html || '<div class="empty2">No matches</div>'; res.classList.add('on');
  };
  q.onblur = () => setTimeout(() => res.classList.remove('on'), 180);
  res.onclick = () => { q.value = ''; res.classList.remove('on'); };
  // clocks
  const t = setInterval(() => {
    if (!document.body.contains(root.querySelector('.app'))) return clearInterval(t);
    const g = gtaLeft(), m = nyse(), a = $('#gchip2', root), b = $('#mchip', root);
    if (a) a.innerHTML = `${ICON.clock} ${g.out ? 'GTA VI is out' : 'GTA VI in ' + esc(g.text)}`;
    if (b) { b.innerHTML = `<span class="dot"></span>${esc(m.label)}`; b.className = 'pill ' + (m.open ? '' : 'cl'); }
    const fired = store.get('fired', []); $('#bdot', root).hidden = !fired.some(f => !f.seen);
  }, 1000);
  // price alerts keep running on every page while STOCKZ is open
  import('./p-invest.js').then(m => m.startAlerts && m.startAlerts());
}
export { usd };

// the command palette: pages, stocks and actions in one search box
function palette() {
  if (document.querySelector('.pal')) return;
  const items = [...NAV.flatMap(([h, l]) => l.map(([p, i, t]) => ({ t, sub: h, href: '#/app/' + p, i }))), ...ALL.map(x => ({ t: 'Trade ' + x.sym, sub: x.name, href: '#/app/trade/' + x.sym, i: 'chart' })),
    ...ALL.filter(x => x.gta).map(x => ({ t: 'Launch a coin priced in ' + x.sym, sub: 'Launchpad', href: '#/app/launch/' + x.sym, i: 'rocket' })), { t: 'Post an OTC offer', sub: 'OTC desk', href: '#/app/otc/new', i: 'desk' }, { t: 'Request money', sub: 'Transfers', href: '#/app/transfer/request', i: 'send' }];
  const v = document.createElement('div'); v.className = 'veil pal'; v.style.placeItems = 'start center'; v.style.paddingTop = '12vh';
  v.innerHTML = `<div class="modal" style="width:min(620px,100%)"><div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line)"><span style="color:var(--mut);width:18px;height:18px">${ICON.search}</span><input class="inp" id="pq" placeholder="Search pages, stocks and actions" style="border:0;box-shadow:none;height:40px;padding:0"><span class="pill">Esc</span></div><div class="list" id="pl" style="max-height:52vh;overflow:auto"></div></div>`;
  document.body.appendChild(v); const q = $('#pq', v), L = $('#pl', v); let sel = 0, hits = items;
  const draw = () => { L.innerHTML = hits.slice(0, 40).map((x, k) => `<a class="it" href="${x.href}" data-k="${k}" style="color:inherit;text-decoration:none;${k === sel ? 'background:var(--bg2)' : ''}"><span class="tic"><span style="width:20px;height:20px;color:var(--navy3)">${ICON[x.i] || ''}</span><span><b>${esc(x.t)}</b><small>${esc(x.sub)}</small></span></span><span class="xs mut">\u21b5</span></a>`).join('') || '<div class="empty2">No matches</div>'; };
  const close = () => v.remove();
  q.oninput = () => { const s = q.value.trim().toLowerCase(); hits = !s ? items : items.filter(x => (x.t + ' ' + x.sub).toLowerCase().includes(s)); sel = 0; draw(); };
  q.onkeydown = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); } if (e.key === 'Enter' && hits[sel]) { location.hash = hits[sel].href; close(); } };
  v.onclick = e => { if (e.target === v || e.target.closest('a')) close(); };
  draw(); q.focus();
}
// the bell: alerts that fired and the last receipts
function bellMenu(root) {
  const old = $('.menu.bell', root); if (old) return old.remove();
  const fired = store.get('fired', []), rc = ctx.S ? store.get('receipts:' + ctx.S.address, []) : [];
  const m = document.createElement('div'); m.className = 'menu bell'; m.style.width = '340px';
  m.innerHTML = `<div class="who"><b>Notifications</b><small>Price alerts and your STOCKZ receipts</small></div>${fired.slice(0, 5).map(f => `<a href="#/app/watch">${ICON.bell}<span>${esc(f.msg)}</span></a>`).join('')}${rc.slice(0, 5).map(r => `<a href="${r.sig ? 'https://solscan.io/tx/' + r.sig : '#/app/activity'}" ${r.sig ? 'target="_blank" rel="noopener"' : ''}>${ICON.check}<span>${esc(r.text)}</span></a>`).join('') || ''}${!fired.length && !rc.length ? '<div class="empty2">Nothing yet. Set a price alert or make a trade.</div>' : ''}<hr><a href="#/app/watch">${ICON.star} Watchlist & alerts</a>`;
  store.set('fired', fired.map(f => ({ ...f, seen: true })));
  $('.app', root).appendChild(m);
  setTimeout(() => document.addEventListener('click', function f(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', f); } }), 0);
}

function keysHelp() {
  if (document.querySelector('.veil')) return;
  const v = document.createElement('div'); v.className = 'veil';
  const K = [['/', 'Search stocks, coins or addresses'], ['B', 'Buy (on a stock: the order ticket)'], ['S', 'Sell'], ['T', 'Trade'], ['M', 'Markets'], ['O', 'Overview'], ['Ctrl K', 'Jump to any page'], ['?', 'This list']];
  v.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" style="max-width:420px"><header><h3>Keyboard shortcuts</h3><button class="x" aria-label="Close">${ICON.close}</button></header><div class="body"><div class="keys">${K.map(([a, b]) => `<div><kbd>${a}</kbd><span>${b}</span></div>`).join('')}</div></div></div>`;
  const close = () => { v.remove(); removeEventListener('keydown', esc1); }, esc1 = e => { if (e.key === 'Escape') close(); };
  v.addEventListener('click', e => { if (e.target === v || e.target.closest('.x')) close(); }); addEventListener('keydown', esc1); document.body.appendChild(v);
}
