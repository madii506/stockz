// STOCKZ · the router: the public home at #/, online banking at #/app/<page>
import { $, sess, theme, DEMO } from './core.js';
document.documentElement.dataset.theme = theme.get();
import { restore, disconnect, W } from './wallet.js';
import { renderHome, openSignIn } from './home.js';

const root = $('#root');
let S = sess.get('session');
let view = '';
async function onSignedIn(s) { S = s; sess.set('session', s); const next = sess.get('next') || 'overview'; sess.del('next');
  try { await (await import('./home.js')).dive(); } catch {}
  location.hash = '#/app/' + next; }
async function signOut() { const d = S && S.demo; S = null; sess.del('session'); document.querySelector('.demobar')?.remove(); if (!d) await disconnect(); location.hash = '#/'; }
// demo mode: the whole terminal on a sample account; nothing in it can sign
async function startDemo() { S = { address: DEMO, wallet: 'Demo', at: Date.now(), signed: false, demo: true, last: null }; sess.set('session', S);
  try { await (await import('./home.js')).dive(); } catch {}
  location.hash = '#/app/overview'; }
function leaveDemo(toSignIn) { S = null; sess.del('session'); document.querySelector('.demobar')?.remove(); location.hash = toSignIn ? '#/signin' : '#/'; }
function needSignIn(page) { sess.set('next', page || 'overview'); location.hash = '#/signin'; }
async function route() {
  const h = location.hash || '#/';
  if (h.startsWith('#/app')) {
    const page = h.slice(6) || 'overview';
    const m = await import('./app.js');
    m.renderApp(root, page, S, { signOut, needSignIn, leaveDemo, fresh: view !== 'app' });
    view = 'app';
    return;
  }
  document.querySelector('.demobar')?.remove();
  if (view !== 'home' || !$('.live', root)) { renderHome(root, { onSignedIn, onDemo: startDemo }); view = 'home'; return; }
  if (h === '#/signin' && !$('#signin')) openSignIn({ onSignedIn });
}
addEventListener('hashchange', route);
route();
if (S && !S.demo) setTimeout(() => { if (!W.address) restore(); }, 400);
