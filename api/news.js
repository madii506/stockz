// STOCKZ · headlines: Google News search results for the GTA VI basket, as JSON. Titles and links only; the stories live with their publishers.
const Q = { gta: 'GTA VI', TTWO: 'Take-Two Interactive', MSFT: 'Microsoft Xbox', AMD: 'AMD stock', GME: 'GameStop', NVDA: 'Nvidia stock', SPY: 'S&P 500', QQQ: 'Nasdaq', TSLA: 'Tesla stock', AAPL: 'Apple stock', GOOGL: 'Alphabet stock', META: 'Meta stock', AMZN: 'Amazon stock', NFLX: 'Netflix stock', COIN: 'Coinbase stock', HOOD: 'Robinhood stock', tok: 'tokenized stocks Solana' };
const un = s => String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const tag = (x, t) => { const m = new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`).exec(x); return m ? un(m[1]) : ''; };
let cache = new Map();
module.exports = async (req, res) => {
  const q = new URL(req.url, 'http://x').searchParams.get('q'), key = Q[q] ? q : 'gta';
  res.setHeader('Content-Type', 'application/json');
  try {
    const hit = cache.get(key);
    if (!hit || Date.now() - hit.at > 600000) {
      const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(Q[key])}&hl=en-US&gl=US&ceid=US:en`, { headers: { 'user-agent': 'Mozilla/5.0 (STOCKZ news reader)' }, signal: AbortSignal.timeout(9000) });
      const xml = await r.text(), items = [];
      for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const x = m[1], source = tag(x, 'source'); let title = tag(x, 'title');
        if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
        const link = tag(x, 'link'), at = Date.parse(tag(x, 'pubDate')) || null;
        if (title && /^https:\/\//.test(link)) items.push({ title: title.slice(0, 180), link, source: source.slice(0, 60), at });
        if (items.length >= 14) break;
      }
      items.sort((a, b) => (b.at || 0) - (a.at || 0));
      cache.set(key, { v: { q: key, items }, at: Date.now() });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.end(JSON.stringify(cache.get(key).v));
  } catch (e) { res.statusCode = 502; res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ items: [], error: 'news unavailable' })); }
};
