// pages/api/indicators.js
export default async function handler(req, res) {
  const FRED_KEY = process.env.FRED_API_KEY;
  if (!FRED_KEY) {
    return res.status(500).json({ error: "FRED_API_KEY not set" });
  }

  const series = {
    wti: "DCOILWTICO",
    usdkrw: "DEXKOUS",
    cpi: "CPIAUCSL",
    fedfunds: "FEDFUNDS",
    t10y2y: "T10Y2Y",
    inventory_ratio: "ISRATIO",
    unemployment: "UNRATE",
  };

  const toISO = (d) => d.toISOString().slice(0, 10);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);

  async function fetchFred(id) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json&observation_start=${toISO(start)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`FRED fail ${id}`);
    const j = await r.json();
    const obs = Array.isArray(j.observations) ? j.observations : [];
    const nums = obs
      .map((o) => {
        const v = Number(String(o.value).replace(",", ""));
        return isFinite(v) ? v : null;
      })
      .filter((v) => v != null);
    const last = nums.at(-1) ?? null;
    const prev = nums.at(-2) ?? null;
    const hist = nums.slice(-24);
    const changePercent =
      last != null && prev != null && prev !== 0 ? ((last - prev) / prev) * 100 : null;
    return { value: last, history: hist, changePercent };
  }

  try {
    const out = {};
    const entries = Object.entries(series);
    await Promise.all(
      entries.map(async ([k, id]) => {
        try {
          out[k] = await fetchFred(id);
        } catch {
          out[k] = { value: null, history: [], changePercent: null };
        }
      })
    );
    out.lastUpdated = new Date().toISOString();
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
