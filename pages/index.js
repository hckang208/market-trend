import React from "react";
import KPI from "@/components/KPI";
import AICard from "@/components/AICard";
import NewsHeader from "@/components/NewsHeader";
import ProcurementForm from "@/components/ProcurementForm";

export default function Home() {
  const [tab, setTab] = React.useState("korea");
  const [newsKo, setNewsKo] = React.useState({ items: [] });
  const [newsGl, setNewsGl] = React.useState({ items: [] });
  const [aiKo, setAiKo] = React.useState(null);
  const [aiGl, setAiGl] = React.useState(null);
  const [loadingAI, setLoadingAI] = React.useState(false);

  React.useEffect(()=>{ loadNews("korea"); loadNews("global"); }, []);

  async function loadNews(which) {
    try {
      const r = await fetch(`/api/news?src=${which}`);
      const j = await r.json();
      if (which === "korea") setNewsKo(j);
      else setNewsGl(j);
    } catch (e) {
      if (which === "korea") setNewsKo({ items: [] });
      else setNewsGl({ items: [] });
    }
  }

  async function summarize() {
    try {
      setLoadingAI(true);
      const [rko, rgl] = await Promise.all([
        fetch("/api/ai-summary", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items: newsKo.items })}),
        fetch("/api/ai-summary", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items: newsGl.items })})
      ]);
      setAiKo(await rko.json());
      setAiGl(await rgl.json());
      document.getElementById("aiSection")?.scrollIntoView({ behavior:"smooth", block:"start" });
    } finally {
      setLoadingAI(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-5 md:p-8">
      {/* header */}
      <section className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black">Hansol Market Trend</h1>
          <div className="text-sm text-sub">⚡ Beta</div>
        </div>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="USD/KRW" value="-" sub="환율" />
        <KPI label="WTI" value="-" sub="유가" />
        <KPI label="Cotton" value="-" sub="면화" />
        <KPI label="SCFI" value="-" sub="해상운임" />
      </section>

      {/* Controls */}
      <section className="mb-6">
        <ProcurementForm onSubmit={()=>{/* no-op placeholder */}} />
      </section>

      {/* News */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="hdr">뉴스</div>
          <NewsHeader active={tab} onTab={setTab} onAISummary={summarize} loading={loadingAI} />
        </div>

        {tab === "korea" ? <NewsList data={newsKo} /> : <NewsList data={newsGl} />}
      </section>

      {/* AI Summary */}
      <section id="aiSection" className="grid md:grid-cols-2 gap-4">
        <AICard title="국내 뉴스 — AI 요약" html={aiKo?.summary} />
        <AICard title="해외 뉴스 — AI 요약" html={aiGl?.summary} />
      </section>

      <footer className="text-center text-xs text-sub mt-10">© {new Date().getFullYear()} Hansol Textile (Internal Beta)</footer>
    </main>
  );
}

function NewsList({ data }) {
  const items = data?.items || [];
  if (!items.length) return <div className="card p-5 text-sub">관련 기사가 아직 없습니다.</div>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.slice(0,10).map((n, i)=> (
        <article key={i} className="card p-4">
          <div className="text-sm text-sub">{n.source || "-"}</div>
          <a className="font-semibold block mt-1 hover:underline" href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
          <div className="text-xs text-sub mt-1">{n.publishedAt ? new Date(n.publishedAt).toLocaleString() : ""}</div>
        </article>
      ))}
    </div>
  );
}
