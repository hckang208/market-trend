export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const url = process.env.PROCURE_API_URL;
  if (url) {
    try {
      const r = await fetch(url);
      const j = await r.json();
      return res.status(200).json({ ok: true, data: j });
    } catch (e) {
      return res.status(200).json({ ok: false, data: null, warning: 'PROCURE_API_URL fetch failed: ' + String(e.message || e) });
    }
  }
  // graceful fallback
  return res.status(200).json({ ok: false, data: null });
}
