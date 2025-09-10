// pages/api/procure-sheet.js
// Read procurement snapshot from a Google Sheet (published CSV)
// ENV: PROCURE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/.../pub?gid=0&single=true&output=csv"
export default async function handler(req, res) {
  try {
    const url = process.env.PROCURE_SHEET_CSV_URL;
    if (!url) return res.status(400).json({ error: "PROCURE_SHEET_CSV_URL not set" });

    const r = await fetch(url, { headers: { "User-Agent": "MarketTrend-Dashboard/1.0" }, cache: "no-store" });
    if (!r.ok) throw new Error(`CSV fetch error: ${r.status}`);
    const csv = await r.text();
    const rows = parseCSV(csv);
    if (!rows.length) return res.status(200).json({ ok: true, data: null });

    // take the last non-empty row
    const row = rows.filter(Boolean).slice(-1)[0] || rows[0];
    const num = (v) => {
      const n = Number(String(v || "").replace(/,/g, ""));
      return isFinite(n) ? n : 0;
    };
    const data = {
      period: row.period || "—",
      periodLabel: row.periodLabel || row.period || "—",
      currency: row.currency || "KRW",
      revenue: num(row.revenue),
      materialSpend: num(row.materialSpend),
      styles: num(row.styles),
      poCount: num(row.poCount),
      costSave: num(row.costSave),
      supplyBreakdown: {
        domestic: num(row.domestic),
        thirdCountry: num(row.thirdCountry),
        local: num(row.local),
      },
      notes: row.notes || ""
    };

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

function parseCSV(text) {
  // simple CSV parser (comma, double-quote)
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
    if (c === '"' ) {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}
