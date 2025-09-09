import { useEffect, useState } from "react";

const fmtNum = (n, d = 2) => { const v = Number(n); if (!isFinite(v)) return "-"; return v.toLocaleString(undefined, { maximumFractionDigits: d }); };
const fmtSignPct = (n, d = 2) => { const v = Number(n); if (!isFinite(v)) return null; const s = v >= 0 ? "+" : ""; return `${s}${v.toFixed(d)}%`; };

const SYMBOLS = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA","9983.T"];
const NAME_MAP = {
  WMT: "Walmart",
  TGT: "Target",
  ANF: "Abercrombie & Fitch",
  VSCO: "Victoria's Secret",
  KSS: "Kohl's",
  AMZN: "Amazon",
  BABA: "Alibaba",
  "9983.T": "Fast Retailing (Uniqlo)",
};

export default function EquityMonitor() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const out = await Promise.all(
          SYMBOLS.map(async (s) => {
            try {
              const r = await fetch(`/api/stocks?symbol=${encodeURIComponent(s)}`, { cache: "no-store" });
              const j = await r.json();
              if (!r.ok) throw new Error(j?.error || "stocks api error");
              const name = j.longName || NAME_MAP[s] || s;
              const price = j.regularMarketPrice ?? j.price ?? null;
              const prevClose = j.regularMarketPreviousClose ?? j.previousClose ?? null;
              let pct = null;
              if (isFinite(Number(j.changePercent))) {
                pct = Number(j.changePercent);
              } else if (isFinite(Number(price)) && isFinite(Number(prevClose)) && Number(prevClose) !== 0) {
                pct = ((Number(price) - Number(prevClose)) / Number(prevClose)) * 100;
              }
              return { symbol: s, name, price: isFinite(Number(price)) ? Number(price) : null, pct };
            } catch (e) {
              return { symbol: s, name: NAME_MAP[s] || s, price: null, pct: null, error: true };
            }
          })
        );
        setRows(out);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = rows.slice().sort((a, b) => {
    const av = (a.pct == null ? -Infinity : a.pct);
    const bv = (b.pct == null ? -Infinity : b.pct);
    return bv - av;
  });

  return (
    <section>
      {loading && <div>불러오는 중...</div>}
      {err && <div className="text-red-600">에러: {err}</div>}
      {!loading && !err && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((r) => {
            const pctStr = fmtSignPct(r.pct);
            return (
              <div key={r.symbol} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-slate-500">{r.name} <span className="text-slate-400">({r.symbol})</span></div>
                    <div className="mt-1 text-2xl font-extrabold">{r.price != null ? fmtNum(r.price, 2) : "-"}</div>
                    <div className={"text-xs font-extrabold " + (r.pct == null ? "text-slate-500" : (r.pct >= 0 ? "text-emerald-700" : "text-red-700"))}>
                      {pctStr || "-"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">변동률은 전일 종가 대비</div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg border border-slate-300 text-sm">
                      Yahoo
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
