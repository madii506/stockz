// STOCKZ · the router: the public home at #/, online banking at #/app/<page>
import { $, sess, theme } from './core.js';
document.documentElement.dataset.theme = theme.get();
import { restore, disconnect, W } from './wallet.js';
import { renderHome, openSignIn } from './home.js';

const root = $('#root');
let S = sess.get('session');
let view = '';
async function onSignedIn(s) { S = s; sess.set('session', s); const next = sess.get('next') || 'overview'; sess.del('next');
  try { await (await import('./home.js')).dive(); } catch {}
  location.hash = '#/app/' + next; }
async function signOut() { S = null; sess.del('session'); await disconnect(); location.hash = '#/'; }
function needSignIn(page) { sess.set('next', page || 'overview'); location.hash = '#/signin'; }
async function route() {
  const h = location.hash || '#/';
  if (h.startsWith('#/app')) {
    const page = h.slice(6) || 'overview';
    const m = await import('./app.js');
    m.renderApp(root, page, S, { signOut, needSignIn, fresh: view !== 'app' });
    view = 'app';
    return;
  }
  if (view !== 'home' || !$('.live', root)) { renderHome(root, { onSignedIn }); view = 'home'; return; }
  if (h === '#/signin' && !$('#signin')) openSignIn({ onSignedIn });
}
addEventListener('hashchange', route);
route();
if (S) setTimeout(() => { if (!W.address) restore(); }, 400);
