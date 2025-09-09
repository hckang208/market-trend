import { useEffect, useState } from "react";

const DEFAULT_TICKERS = ["MCD","COST","HD","WMT","TGT"];

export default function EquityMonitor({ tickers = DEFAULT_TICKERS }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const out = [];
        for (const t of tickers) {
          try {
            const res = await fetch(`/api/stocks?symbol=${encodeURIComponent(t)}`);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const json = await res.json();
            out.push({ symbol: t, ...json });
          } catch (e) {
            out.push({ symbol: t, error: String(e.message || e) });
          }
        }
        setRows(out);
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, [tickers]);

  if (error) return <div className="text-sm text-red-600">주가 로딩 실패: {error}</div>;
  if (!rows.length) return <div className="text-sm text-slate-500">주가를 불러오는 중...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((r, idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{r.symbol}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{r?.price ?? "-"}</div>
          {r?.change && (
            <div className={"mt-1 text-xs " + (r.change >= 0 ? "text-red-600" : "text-emerald-600")}>
              {r.change >= 0 ? "▲" : "▼"} {Math.abs(r.change)}%
            </div>
          )}
          {r?.error && <div className="mt-1 text-xs text-red-500">{r.error}</div>}
        </div>
      ))}
    </div>
  );
}
