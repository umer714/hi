const allowedTemplates = new Set(['business', 'portfolio', 'restaurant', 'saas', 'store']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Gemini is not connected yet. Add GEMINI_API_KEY in Vercel Environment Variables, then redeploy.' });
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const template = allowedTemplates.has(req.body?.template) ? req.body.template : 'business';
  const mode = req.body?.mode === 'edit' ? 'edit' : 'generate';
  const existingWebsite = req.body?.existingWebsite;
  if (prompt.length < 8) return res.status(400).json({ error: 'Please enter at least 8 characters.' });
  if (prompt.length > 1800) return res.status(400).json({ error: 'Please keep your instruction under 1,800 characters.' });
  if (mode === 'edit' && (!existingWebsite || typeof existingWebsite !== 'object')) return res.status(400).json({ error: 'There is no generated website to edit yet.' });

  const schema = {
    type: 'OBJECT',
    properties: {
      siteName: { type: 'STRING' }, tagline: { type: 'STRING' }, eyebrow: { type: 'STRING' },
      headline: { type: 'STRING' }, description: { type: 'STRING' }, cta: { type: 'STRING' },
      contactHeadline: { type: 'STRING' }, footerText: { type: 'STRING' },
      navLinks: { type: 'ARRAY', items: { type: 'STRING' } },
      theme: { type: 'OBJECT', properties: { accent: { type: 'STRING' }, background: { type: 'STRING' }, foreground: { type: 'STRING' } }, required: ['accent', 'background', 'foreground'] },
      sections: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        eyebrow: { type: 'STRING' }, title: { type: 'STRING' }, body: { type: 'STRING' },
        items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, description: { type: 'STRING' } }, required: ['title', 'description'] } }
      }, required: ['title', 'body'] } }
    },
    required: ['siteName', 'eyebrow', 'headline', 'description', 'cta', 'navLinks', 'theme', 'sections']
  };
  const base = mode === 'edit'
    ? 'Edit this existing website JSON. Apply the requested changes and preserve unrelated content: ' + JSON.stringify(existingWebsite).slice(0, 12000)
    : 'Create a complete polished responsive website content plan. Include 4 to 6 meaningful sections. Each section needs useful copy and, where appropriate, 2 to 4 feature items.';
  const instruction = base + '\nCategory: ' + template + '\nUser instruction: ' + prompt + '\nReturn a complete website object matching the JSON schema. Use professional colors. Do not include external scripts, image URLs, or fake customer reviews.';
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: instruction }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.65, maxOutputTokens: 5000 } })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status === 429 ? 429 : 502).json({ error: result.error?.message || 'Gemini could not complete the request.' });
    const raw = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!raw) return res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
    let website;
    try { website = JSON.parse(raw); } catch { return res.status(502).json({ error: 'Gemini returned an unreadable response. Please try again.' }); }
    if (!website || typeof website.headline !== 'string' || !Array.isArray(website.sections) || !website.theme) return res.status(502).json({ error: 'Gemini returned an incomplete website. Please try again.' });
    website.sections = website.sections.slice(0, 7).map(section => ({
      eyebrow: String(section.eyebrow || '').slice(0, 80), title: String(section.title || '').slice(0, 120),
      body: String(section.body || '').slice(0, 600),
      items: (Array.isArray(section.items) ? section.items : []).slice(0, 4).map(item => ({ title: String(item.title || '').slice(0, 100), description: String(item.description || '').slice(0, 300) }))
    }));
    website.navLinks = (Array.isArray(website.navLinks) ? website.navLinks : ['About', 'Services', 'Contact']).slice(0, 5).map(x => String(x).slice(0, 30));
    return res.status(200).json({ website });
  } catch { return res.status(502).json({ error: 'Could not reach Gemini right now. Please try again shortly.' }); }
}
