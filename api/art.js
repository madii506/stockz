// STOCKZ brand photos: a few fixed prompts, made once with FLUX through Vercel's AI Gateway (OIDC). Temporary, keyed.
const KEY = '5a1be5226da89a55aa92e1ce';
const GAME = 'Grand Theft Auto VI style in-game screenshot, photoreal next-gen open world game graphics, ray traced reflections, cinematic wide shot, 35mm, sharp, no text, no letters, no numbers, no logos, no readable signs';
const P = {
  city: 'A wide night scene on a neon boulevard in a Vice City-like Miami: palm trees, art deco hotels with pink and cyan neon trims, a glowing glass office tower lobby full of screens with green and pink stock charts, a pink 1980s sports car at the curb, people on the sidewalk, wet asphalt reflecting the neon, deep purple night sky. ' + GAME,
  desk: 'Inside a high-rise trading office at night above a Vice City-like Miami: rows of monitors glowing with green and pink stock charts, a broker in a pastel suit leaning on a desk with his phone, floor-to-ceiling windows with the city lights, palm trees and the ocean behind, pink neon accent lighting. ' + GAME,
  beach: 'Ocean Drive at golden hour in a Vice City-like Miami: pastel art deco hotels, palm trees, a pink 1980s sports car, a giant outdoor screen on a building showing a green stock chart, people on roller skates, warm sunset light, ocean in the distance. ' + GAME,
  blur: 'A city street at night in a Vice City-like Miami seen from street level, many neon lights in pink, purple, cyan, teal and orange, car headlights and tail lights, palm trees, very colourful night lights. ' + GAME,
};
module.exports = async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.searchParams.get('k') !== KEY) { res.statusCode = 403; return res.end('no'); }
  const prompt = P[u.searchParams.get('id')]; if (!prompt) { res.statusCode = 404; return res.end('no such shot'); }
  const token = process.env.AI_GATEWAY_API_KEY || req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
  if (!token) { res.statusCode = 500; return res.end('no gateway token'); }
  const w = Math.min(2048, +u.searchParams.get('w') || 1536), h = Math.min(2048, +u.searchParams.get('h') || 512), seed = +u.searchParams.get('seed') || 7;
  try {
    const r = await fetch('https://ai-gateway.vercel.sh/v1/images/generations', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ model: u.searchParams.get('m') || 'bfl/flux-2-pro', prompt, n: 1, size: w + 'x' + h, response_format: 'b64_json', providerOptions: { blackForestLabs: { outputFormat: 'jpeg', safetyTolerance: 2, width: w, height: h, seed } } }) });
    const j = await r.json().catch(() => null), d = j && j.data && j.data[0];
    if (!d || !d.b64_json) { res.statusCode = 502; res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ status: r.status, error: j && j.error ? j.error : j })); }
    const buf = Buffer.from(d.b64_json, 'base64'); res.setHeader('content-type', 'image/jpeg'); res.setHeader('cache-control', 'public, max-age=31536000, immutable'); return res.end(buf);
  } catch (e) { res.statusCode = 500; return res.end(String(e && e.message)); }
};
