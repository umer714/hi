export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini is not connected yet. Add GEMINI_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy.' });
  }
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const template = typeof req.body?.template === 'string' ? req.body.template : 'business';
  if (prompt.length < 8) return res.status(400).json({ error: 'Please describe your website in at least 8 characters.' });
  if (prompt.length > 1800) return res.status(400).json({ error: 'Please keep your description under 1,800 characters.' });

  const instruction = `Create a polished website concept based on the user's brief. Return ONLY valid JSON with this exact shape:
{
  "siteName": "short brand name",
  "eyebrow": "short uppercase category label",
  "headline": "strong homepage headline, 3-9 words",
  "description": "clear 1-2 sentence homepage description",
  "cta": "short call to action",
  "navLinks": ["About", "Services", "Contact"],
  "sections": [
    {"title":"Section title","body":"Useful concise section copy"},
    {"title":"Section title","body":"Useful concise section copy"},
    {"title":"Section title","body":"Useful concise section copy"}
  ]
}
Make the copy specific to the brief, coherent, professional, and safe. Do not include markdown fences or code. Template category: ${template}. User brief: ${prompt}`;

  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: instruction }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 1800 }
      })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = result.error?.message || 'Gemini could not complete the request.';
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: message });
    }
    const raw = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!raw) return res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
    let website;
    try { website = JSON.parse(raw); }
    catch { return res.status(502).json({ error: 'Gemini returned an unreadable response. Please try again.' }); }
    if (!website || typeof website.headline !== 'string' || !Array.isArray(website.sections)) {
      return res.status(502).json({ error: 'Gemini returned an incomplete website. Please try again.' });
    }
    return res.status(200).json({ website });
  } catch {
    return res.status(502).json({ error: 'Could not reach Gemini right now. Please try again shortly.' });
  }
}
