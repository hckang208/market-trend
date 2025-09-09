import { useEffect, useMemo, useState } from "react";
import AIBox from "./AIBox";

const fmtNum = (n, d = 2) => { const v = Number(n); if (!isFinite(v)) return "-"; return v.toLocaleString(undefined, { maximumFractionDigits: d }); };
const fmtSignPct = (n, d = 2) => { const v = Number(n); if (!isFinite(v)) return "0.00%"; const s = v >= 0 ? "+" : ""; return `${s}${v.toFixed(d)}%`; };

function Sparkline({ series = [], width = 110, height = 32 }) {
  if (!series || series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = width / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * height;
    return `${x},${y}`;
  }).join(" ");
  const up = series[series.length - 1] >= series[0];
  return (
    <svg width={width} height={height} className="block mt-1">
      <polyline fill="none" stroke={up ? "#065f46" : "#991b1b"} strokeWidth="2" points={pts} />
    </svg>
  );
}

export default function MarketIndicators() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/indicators", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "지표 API 오류");
        setState({ loading: false, data: j, error: "" });
        setLastUpdated(j.lastUpdated || j.updatedAt || j.ts || new Date().toISOString());
      } catch (e) {
        setState({ loading: false, data: null, error: String(e.message || e) });
      }
    })();
  }, []);

  const LINK = {
    wti: "https://fred.stlouisfed.org/series/DCOILWTICO",
    usdkrw: "https://fred.stlouisfed.org/series/DEXKOUS",
    cpi: "https://fred.stlouisfed.org/series/CPIAUCSL",
    fedfunds: "https://fred.stlouisfed.org/series/DFEDTARU",
    t10y2y: "https://fred.stlouisfed.org/series/T10Y2Y",
    inventory_ratio: "https://fred.stlouisfed.org/series/ISRATIO",
    unemployment: "https://fred.stlouisfed.org/series/UNRATE",
    ism_retail: "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/retail-trade/",
  };
  const curated = [
    { key: "wti", title: "WTI (USD/bbl)" },
    { key: "usdkrw", title: "USD/KRW" },
    { key: "cpi", title: "US CPI (Index)" },
    { key: "fedfunds", title: "미국 기준금리(%)" },
    { key: "t10y2y", title: "금리 스프레드(10Y–2Y, bp)" },
    { key: "inventory_ratio", title: "재고/판매 비율" },
    { key: "ism_retail", title: "ISM Retail(%)" },
    { key: "unemployment", title: "실업률(%)" },
  ];

  const payloadForAI = useMemo(() => {
    const d = state.data || {};
    const out = {};
    curated.forEach((c) => {
      out[c.key] = {
        value: d?.[c.key]?.value ?? null,
        changePercent: d?.[c.key]?.changePercent ?? null,
        yoyPercent: d?.[c.key]?.yoyPercent ?? null,
        lastDate: d?.[c.key]?.lastDate ?? null,
      };
    });
    return { indicators: out, lastUpdated };
  }, [state.data, lastUpdated]);

  return (
    <section>
      <h3 className="text-xl font-extrabold mb-2 text-slate-900">주요 지표</h3>
      {lastUpdated && <div className="text-xs text-slate-500 mb-2">전체 업데이트: {new Date(lastUpdated).toLocaleString("ko-KR")}</div>}
      {state.loading && <div>불러오는 중...</div>}
      {state.error && <div className="text-red-600">에러: {state.error}</div>}

      {!state.loading && !state.error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {curated.map((c) => {
              const node = state.data?.[c.key] || null;
              const v = node?.value ?? null;
              const s = node?.history || [];
              const deltaPct = node?.changePercent ?? null;
              const yoyPct = node?.yoyPercent ?? null;
              const href = LINK[c.key];
              const up = deltaPct != null ? deltaPct >= 0 : (s.length >= 2 ? s[s.length - 1] >= s[0] : true);
              const lastDate = node?.lastDate ? new Date(node.lastDate) : null;
              const lastDateStr = lastDate && isFinite(lastDate.getTime()) ? lastDate.toISOString().slice(0,10) : null;

              return (
                <a key={c.key} href={href} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white p-4 block no-underline text-slate-900" title="원본 데이터 열기">
                  <div className="text-xs text-slate-500">{c.title}</div>
                  <div className="mt-1 text-2xl font-extrabold">{v != null ? fmtNum(v) : "-"}</div>
                  <div className={"text-xs font-extrabold mt-1 " + (deltaPct == null ? "text-slate-500" : (up ? "text-emerald-700" : "text-red-700"))}>
                    {deltaPct == null ? "vs prev: -" : `vs prev: ${fmtSignPct(deltaPct)}`}
                  </div>
                  {yoyPct != null && (
                    <div className={"text-xs font-extrabold " + (yoyPct >= 0 ? "text-emerald-700" : "text-red-700")}>
                      YoY: {fmtSignPct(yoyPct)}
                    </div>
                  )}
                  <Sparkline series={s || []} />
                  {lastDateStr && <div className="text-[11px] text-slate-500 mt-1">업데이트: {lastDateStr}</div>}
                  <div className="text-[11px] text-slate-500 mt-1">원본 보기 ↗</div>
                </a>
              );
            })}
          </div>
          <div className="mt-3"><AIBox block="indicators" payload={payloadForAI} /></div>
        </>
      )}
    </section>
  );
}
