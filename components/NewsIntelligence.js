import { useEffect, useState } from "react";

const FOREIGN_DOMAINS = process.env.NEXT_PUBLIC_FOREIGN_NEWS_DOMAINS || "businessoffashion.com,just-style.com";

export default function NewsIntelligence() {
  const [activeTab, setActiveTab] = useState("overseas");
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsErr, setNewsErr] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [summary, setSummary] = useState("");
  const [sumLoading, setSumLoading] = useState(false);

  async function load(tab = activeTab) {
    try {
      setNewsLoading(true); setNewsErr(""); setNewsItems([]);
      let url = "";
      if (tab === "overseas") {
        url = "/api/news?" + new URLSearchParams({ industry: "fashion|apparel|garment|textile", language: "en", days: "7", limit: "40", domains: FOREIGN_DOMAINS }).toString();
      } else {
        url = "/api/news-kr-rss?" + new URLSearchParams({ feeds: "http://www.ktnews.com/rss/allArticle.xml", days: "1", limit: "200" }).toString();
      }
      const r = await fetch(url, { cache: "no-store" });
      const arr = r.ok ? await r.json() : [];
      const items = (arr || []).map(n => ({
        title: n.title,
        url: n.url || n.link,
        source: (typeof n.source === "string" ? n.source : (n.source && (n.source.name || n.source.id) ? String(n.source.name || n.source.id) : "")) || "",
        publishedAt: n.published_at || n.publishedAt || n.pubDate || ""
      }));
      setNewsItems(items);
      setCollapsed(true);
    } catch (e) {
      setNewsErr(String(e.message || e));
    } finally {
      setNewsLoading(false);
    }
  }

  async function summarize() {
    try {
      setSumLoading(true); setSummary("");
      const items = newsItems.slice(0, 12).map(n => ({ title: n.title, url: n.url }));
      const r = await fetch("/api/ai-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block: "news", language: "ko", mode: "brief", data: { items } }) });
      const j = await r.json();
      if (r.ok) setSummary(j.summary || "");
      else setSummary("요약 실패");
    } catch (e) {
      setSummary("요약 오류: " + String(e.message || e));
    } finally {
      setSumLoading(false);
    }
  }

  useEffect(() => { load("overseas"); }, []);

  const rendered = (collapsed ? newsItems.slice(0,5) : newsItems);

  return (
    <section>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => { setActiveTab("overseas"); load("overseas"); }} className={"px-3 py-2 rounded-full border " + (activeTab==="overseas" ? "bg-indigo-600 text-white border-transparent" : "bg-white border-slate-300")}>해외뉴스</button>
          <button onClick={() => { setActiveTab("korea"); load("korea"); }} className={"px-3 py-2 rounded-full border " + (activeTab==="korea" ? "bg-indigo-600 text-white border-transparent" : "bg-white border-slate-300")}>국내뉴스</button>
          <button onClick={summarize} disabled={sumLoading} className="px-3 py-2 rounded-full border border-slate-300 bg-white">{sumLoading ? "요약 중..." : "AI 요약"}</button>
        </div>
        <div className="text-xs text-slate-500">뉴스출처: {FOREIGN_DOMAINS}, 한국섬유신문</div>
      </div>

      <div className="mt-3 border border-slate-200 rounded-xl bg-white">
        {newsLoading && <div className="p-3 text-slate-600">불러오는 중…</div>}
        {newsErr && <div className="p-3 text-red-600">에러: {newsErr}</div>}
        {!newsLoading && !newsErr && (
          <div className="p-3">
            {rendered.length === 0 ? (
              <div className="text-slate-600">관련 기사가 아직 없어요.</div>
            ) : (
              <ol className="pl-5">
                {rendered.map((it, i) => (
                  <li key={i} className="my-2">
                    <a href={it.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{it.title}</a>
                    {it.publishedAt ? <div className="text-xs text-slate-500">{it.publishedAt}</div> : null}
                    <div className="text-[11px] text-slate-400">{it.source}</div>
                  </li>
                ))}
              </ol>
            )}
            {newsItems.length > 5 && (
              <div className="mt-2">
                <button onClick={() => setCollapsed(v => !v)} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                  {collapsed ? "더보기" : "접기"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {summary && (
        <div className="mt-3 border border-slate-200 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-line">{summary}</div>
      )}
    </section>
  );
}
