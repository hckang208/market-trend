// pages/api/indicators.js
export default async function handler(req, res) {
  const FRED_KEY = process.env.FRED_API_KEY;
  if (!FRED_KEY) {
    return res.status(500).json({ error: "FRED_API_KEY not set" });
  }

  // Preferred series (Fed Funds = Target Upper by default)
  const series = {
    wti: "DCOILWTICO",        // FRED fallback
    usdkrw: "DEXKOUS",        // FRED fallback
    cpi: "CPIAUCSL",
    fedfunds: process.env.FEDFUNDS_SERIES || "DFEDTARU", // DFEDTARU (target upper) instead of EFFR
    t10y2y: "T10Y2Y",
    inventory_ratio: "ISRATIO",
    unemployment: "UNRATE",
  };

  async function fetchFred(id) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("FRED fetch error");
    const j = await r.json();
    const obs = (j.observations || []).filter((o) => o.value !== ".");
    const hist = obs.map((o) => Number(o.value)).filter((n) => isFinite(n));
    const last = hist.length ? hist[hist.length - 1] : null;
    const lastDate = obs.length ? obs[obs.length - 1].date : null;
    const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
    const changePercent = last != null && prev != null && prev !== 0 ? ((last - prev) / prev) * 100 : null;
    let yoyPercent = null;
    if (hist.length >= 13) {
      const yago = hist[hist.length - 13];
      if (isFinite(yago) && yago !== 0 && isFinite(last)) yoyPercent = ((last - yago) / yago) * 100;
    }
    return { value: last, history: hist, changePercent, lastDate, yoyPercent };
  }

  // Yahoo FX spot (server-side) for USDKRW
  async function fetchYahooFX(symbol = "USDKRW=X") {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const r = await fetch(url, { headers: { "User-Agent": "MarketTrend-Dashboard/1.0" }, cache: "no-store" });
    if (!r.ok) throw new Error("Yahoo FX error");
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta || {};
    const ts = meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0,10) : null;
    const price = meta?.regularMarketPrice ?? null;
    const result = j?.chart?.result?.[0];
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter(v => v != null && isFinite(v));
    const history = closes.slice(-30); // last ~30 days
    const last = history.length ? history[history.length-1] : price;
    const prev = history.length >= 2 ? history[history.length-2] : null;
    const changePercent = (last!=null && prev!=null && prev!==0) ? ((last-prev)/prev)*100 : null;
    return { value: last ?? price ?? null, history, changePercent, lastDate: ts, yoyPercent: null, source: "yahoo" };
  }

  // EIA WTI daily (needs API key). If missing, fallback to FRED
  async function fetchEIA() {
    const EIA_KEY = process.env.EIA_API_KEY;
    if (!EIA_KEY) throw new Error("no EIA key");
    const url = `https://api.eia.gov/series/?api_key=${EIA_KEY}&series_id=PET.RWTC.D`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("EIA error");
    const j = await r.json();
    const data = j?.series?.[0]?.data || [];
    const hist = data.slice().reverse().map(row => Number(row[1])).filter(v => isFinite(v));
    const lastDate = data.length ? data[0][0] : null;
    const last = hist.length ? hist[hist.length - 1] : null;
    const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
    const changePercent = last != null && prev != null && prev !== 0 ? ((last - prev) / prev) * 100 : null;
    return { value: last, history: hist, changePercent, lastDate, yoyPercent: null, source: "eia" };
  }

  // Optional: ISM Retail via CSV published to web (maintained manually)
  async function fetchIsmRetail() {
    const url = process.env.ISM_RETAIL_CSV_URL;
    if (!url) return null;
    const r = await fetch(url, { headers: { "User-Agent": "MarketTrend-Dashboard/1.0" }, cache: "no-store" });
    if (!r.ok) return null;
    const csv = await r.text();
    const rows = parseCSV(csv);
    if (!rows.length) return null;
    const row = rows.filter(Boolean).slice(-1)[0] || rows[0];
    const val = Number(String(row.value || row.index || row.ISM || "").replace(/,/g, ""));
    const v = isFinite(val) ? val : null;
    const date = row.date || row.period || null;
    return { value: v, history: [], changePercent: null, lastDate: date, yoyPercent: null };
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const header = splitCsvLine(lines[0]).map((h) => h.trim());
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      if (!cols.length) continue;
      const obj = {};
      header.forEach((h, idx) => (obj[h] = cols[idx]));
      out.push(obj);
    }
    return out;
  }
  function splitCsvLine(line) {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { out.push(cur); cur = ""; }
      else { cur += c; }
    }
    out.push(cur);
    return out;
  }

  try {
    const out = {};
    // Fetch FRED series first (fast parallel)
    const fredKeys = Object.keys(series);
    await Promise.all(fredKeys.map(async (k) => {
      try {
        out[k] = await fetchFred(series[k]);
      } catch { out[k] = { value: null, history: [], changePercent: null, lastDate: null, yoyPercent: null }; }
    }));

    // Improve freshness
    // FX: prefer Yahoo spot if enabled
    if ((process.env.USE_YAHOO_FX || "1") === "1") {
      try { out.usdkrw = await fetchYahooFX("USDKRW=X"); } catch {}
    }
    // WTI: prefer EIA if key provided
    try { const eia = await fetchEIA(); if (eia) out.wti = eia; } catch {}

    // ISM retail (optional)
    try { const ism = await fetchIsmRetail(); if (ism) out.ism_retail = ism; } catch {}

    out.lastUpdated = new Date().toISOString();
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
