import React from "react";
import Head from "next/head";
import KPI from "@/components/KPI";
import AICard from "@/components/AICard";
import NewsHeader from "@/components/NewsHeader";
import ProcurementForm from "@/components/ProcurementForm";

const fmt = (n, d=0) => {
  const v = Number(n); if (!isFinite(v)) return "-";
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
};

export default function Home(){
  // Procurement state
  const [openEdit, setOpenEdit] = React.useState(false);
  const [data, setData] = React.useState({
    periodLabel: "2025-09", period: "월간", currency: "KRW",
    revenue: 0, materialSpend: 0, costSave: 0, styles: 0, poCount: 0,
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 }
  });

  // Indicators & stocks
  const [ind, setInd] = React.useState({ items: [], generatedAt: null });
  const [stocks, setStocks] = React.useState({ items: [], generatedAt: null });

  React.useEffect(()=>{
    (async ()=>{
      try { const r = await fetch("/api/indicators"); setInd(await r.json()); } catch {}
      try { const r2 = await fetch("/api/retail-stocks"); setStocks(await r2.json()); } catch {}
    })();
  }, []);

  // News tabs
  const [newsTab, setNewsTab] = React.useState("korea");
  const [newsKo, setNewsKo] = React.useState({ items: [] });
  const [newsEn, setNewsEn] = React.useState({ items: [] });
  const [aiKo, setAiKo] = React.useState({ summary: "", generatedAt: null });
  const [aiEn, setAiEn] = React.useState({ summary: "", generatedAt: null });

  const loadNews = async (tab) => {
    try {
      if (tab === "korea") {
        const r = await fetch("/api/news-korea"); setNewsKo(await r.json());
      } else {
        const r = await fetch("/api/news-foreign"); setNewsEn(await r.json());
      }
    } catch {}
  };
  React.useEffect(()=>{ loadNews("korea"); loadNews("foreign"); }, []);

  const summarize = async () => {
    try {
      const payloadKo = { items: newsKo.items };
      const rko = await fetch("/api/ai-summary", { method:"POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payloadKo) });
      const jko = await rko.json(); setAiKo(jko);

      const payloadEn = { items: newsEn.items };
      const ren = await fetch("/api/ai-summary", { method:"POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payloadEn) });
      const jen = await ren.json(); setAiEn(jen);

      const anchor = document.getElementById("aiNewsSection");
      if (anchor) anchor.scrollIntoView({ behavior:"smooth", block:"start" });
    } catch (e) {}
  };

  const save = () => {/* TODO: persist to storage */};
  const reset = () => setData({
    periodLabel: "", period: "", currency: "KRW",
    revenue: 0, materialSpend: 0, costSave: 0, styles: 0, poCount: 0,
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 }
  });

  return (
    <>
      <Head>
        <title>Market Trend Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="hdr">Dashboard</h1>
          <div className="flex items-center gap-2">
            <span className="tag">{data.periodLabel} · {data.period}</span>
            <button className="btn btn-ghost text-xs" onClick={()=>setOpenEdit(true)}>수기입력</button>
          </div>
        </header>

        {/* KPI */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="총 매출액" value={`${fmt(data.revenue)} ${data.currency}`} />
          <KPI label="총 부자재매입액" value={`${fmt(data.materialSpend)} ${data.currency}`} />
          <KPI label="총 Cost Save" value={`${fmt(data.costSave)} ${data.currency}`} />
          <KPI label="총 오더수(스타일)" value={fmt(data.styles)} />
        </section>

        {/* AI 현황분석 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AICard title="AI 현황분석 — 지표" text={`• 매출/매입/Cost Save 추세 요약...
• YoY/전월대비 포인트...
• 리스크/기회…`} />
          <AICard title="AI 현황분석 — 공급현황" text={`• 국내 ${fmt(data.supplyBreakdown.domestic)}% · 3국 ${fmt(data.supplyBreakdown.thirdCountry)}% · 현지 ${fmt(data.supplyBreakdown.local)}%`} />
        </section>

        {/* 주요지표 */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="hdr">주요지표</div>
            <div className="text-xs text-sub" suppressHydrationWarning>업데이트: {ind.generatedAt ? new Date(ind.generatedAt).toLocaleString("ko-KR", { timeZone:"Asia/Seoul" }) : "-"}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ind.items.map((it, i)=>(
              <div key={i} className="card p-3">
                <div className="text-xs text-sub">{it.label}</div>
                <div className="kpi mono mt-1">{fmt(it.value, typeof it.value==="number" && it.value<10 ? 2 : 0)}</div>
                <div className="text-xs text-sub mt-1">MoM {it.mom>0?"+":""}{it.mom}% · YoY {it.yoy>0?"+":""}{it.yoy}%</div>
              </div>
            ))}
          </div>
        </section>

        {/* 리테일러 주가 등락률 */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="hdr">일일 리테일러 주가 등락률</div>
            <div className="text-xs text-sub" suppressHydrationWarning>업데이트: {stocks.generatedAt ? new Date(stocks.generatedAt).toLocaleString("ko-KR", { timeZone:"Asia/Seoul" }) : "-"}</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stocks.items.map((s, i)=>(
              <div key={i} className="card p-3 flex items-center justify-between">
                <div className="text-sm">{s.name} <span className="text-sub">({s.ticker})</span></div>
                <div className={"mono "+(s.chg>=0?"text-emerald-300":"text-rose-300")}>{s.chg>=0?"+":""}{s.chg}%</div>
              </div>
            ))}
          </div>
        </section>

        {/* 뉴스 */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="hdr">뉴스</div>
          </div>
          <NewsHeader
            active={newsTab}
            onTab={(t)=>{ setNewsTab(t); loadNews(t); }}
            onAISummary={summarize}
          />
          <div className="mt-2 grid gap-2">
            {(newsTab==="korea"?newsKo.items:newsEn.items).map((n,i)=>(
              <a key={i} className="card p-3 hover:bg-white/10 transition" href={n.link} target="_blank" rel="noreferrer">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="text-xs text-sub mt-0.5">{n.source}</div>
              </a>
            ))}
          </div>
        </section>

        {/* 뉴스 AI 요약 */}
        <section id="aiNewsSection" className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="hdr">해외뉴스 요약 · Just-Style & BoF</div>
              <div className="text-xs text-sub" suppressHydrationWarning>{aiEn.generatedAt ? `GEMINI 2.5 사용중 · ${new Date(aiEn.generatedAt).toLocaleString("ko-KR", { timeZone:"Asia/Seoul" })}` : "GEMINI 2.5 사용중"}</div>
            </div>
            <div className="prose prose-invert max-w-none text-sm leading-7" dangerouslySetInnerHTML={{ __html: aiEn.summary }}/>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="hdr">국내뉴스 요약 · 한국섬유신문</div>
              <div className="text-xs text-sub" suppressHydrationWarning>{aiKo.generatedAt ? `GEMINI 2.5 사용중 · ${new Date(aiKo.generatedAt).toLocaleString("ko-KR", { timeZone:"Asia/Seoul" })}` : "GEMINI 2.5 사용중"}</div>
            </div>
            <div className="prose prose-invert max-w-none text-sm leading-7" dangerouslySetInnerHTML={{ __html: aiKo.summary }}/>
          </div>
        </section>

        {/* 수기입력 패널 */}
        {openEdit && (
          <section className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="max-w-3xl w-full p-3">
              <ProcurementForm
                data={data}
                setData={setData}
                onSave={save}
                onClose={()=>setOpenEdit(false)}
                onReset={reset}
              />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
