import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { getOverseasNews, getKoreaNews } from "../../lib/newsClient";

function NewsTabsSection() {
  const [activeTab, setActiveTab] = useState("overseas"); // overseas | korea
  const [newsOpen, setNewsOpen] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsErr, setNewsErr] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [guideMsg, setGuideMsg] = useState("");

  const toKst = (iso) => {
    try {
      return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    } catch { return ""; }
  };

  async function load(tab = activeTab) {
    try {
      setNewsLoading(true);
      setNewsErr("");
      setNewsItems([]);

      const data = tab === "overseas" ? await getOverseasNews() : await getKoreaNews();
      const raw = Array.isArray(data) ? data : (data?.items || []);

      const items = raw.map((n) => {
        const host = (() => {
          try {
            const u = new URL(n.url || n.link || "");
            return u.host.replace(/^www\./, "");
          } catch { return ""; }
        })();
        return {
          title: n.title || "",
          url: n.url || n.link || "",
          source:
            (typeof n.source === "string" && n.source) ||
            (n.source && (n.source.name || n.source.id)) ||
            host || (tab === "overseas" ? "" : "한국섬유산업신문"),
          publishedAt: n.published_at || n.publishedAt || n.publishedAtISO || n.pubDate || n.date || "",
        };
      }).filter((n) => n.title && n.url);

      items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      setNewsItems(items);
      setGuideMsg((Array.isArray(data) ? "" : (data?.sources || data?.guide || "")) || "");
      setLastUpdated((Array.isArray(data) ? "" : data?.updatedAtISO) || "");
      setCollapsed(true);
    } catch (e) {
      setNewsErr(String(e));
    } finally {
      setNewsLoading(false);
    }
  }

  const defaultLimit = activeTab === "overseas" ? 15 : 10;
  const rendered = collapsed ? newsItems.slice(0, defaultLimit) : newsItems;

  const sourceLine = useMemo(() => {
    const base =
      activeTab === "overseas"
        ? "출처: businessoffashion.com, just-style.com"
        : "출처: 한국섬유산업신문 외";
    const guide = " · 갱신: 매일 오전 9시(한국시간)";
    const last = lastUpdated ? ` · 마지막 빌드: ${toKst(lastUpdated)}` : "";
    return base + guide + last;
  }, [activeTab, lastUpdated]);

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">산업뉴스</h2>
          <p className="section-subtitle">{sourceLine}</p>
        </div>
        <div>
          <button
            onClick={()=>setNewsOpen(o=>!o)}
            className="btn btn-outline"
            style={{ marginLeft: 8 }}
          >
            {newsOpen ? "접기" : "자세히보기"}
          </button>
        </div>
      </div>

      {newsOpen && (
        <>
          <div className="tab-nav">
            <button
              onClick={() => {
                if (activeTab === "overseas") { setCollapsed(v=>!v); return; }
                setActiveTab("overseas");
                setCollapsed(true);
                load("overseas");
              }}
              className={`tab-btn ${activeTab === "overseas" ? "active" : ""}`}
            >
              해외뉴스
            </button>
            <button
              onClick={() => {
                if (activeTab === "korea") { setCollapsed(v=>!v); return; }
                setActiveTab("korea");
                setCollapsed(true);
                load("korea");
              }}
              className={`tab-btn ${activeTab === "korea" ? "active" : ""}`}
            >
              국내뉴스
            </button>
            <a href="/ai/foreign" className="btn btn-secondary" style={{ marginLeft: 8 }}>해외뉴스AI요약</a>
            <a href="/ai/korea" className="btn btn-ghost" style={{ marginLeft: 8 }}>국내뉴스AI요약</a>
          </div>

          <div className="card">
            {newsLoading && <div className="muted">불러오는 중…</div>}
            {newsErr && <div className="text-danger">에러: {newsErr}</div>}
            {!newsLoading && !newsErr && (
              <>
                {rendered.length === 0 ? (
                  <div className="muted">관련 기사가 아직 없어요.</div>
                ) : (
                  <ol className="news-list">
                    {rendered.map((it, i) => (
                      <li key={i} className="news-item">
                        <a href={it.url} target="_blank" rel="noreferrer" className="news-title">
                          {it.title}
                        </a>
                        {it.publishedAt ? <div className="news-meta">{it.publishedAt}</div> : null}
                        <div className="news-meta source">{it.source}</div>
                      </li>
                    ))}
                  </ol>
                )}

                {newsItems.length > defaultLimit && (
                  <div className="actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCollapsed((v) => !v)}
                    >
                      {collapsed ? `더보기 (${newsItems.length - defaultLimit}개 더)` : "접기"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}


export default function NewsPageWrapper() {
  return (
    <>
      <Head>
        <title>산업뉴스 | Hansoll Market Intelligence</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="main-container">
        <NewsTabsSection />
      </main>
    </>
  );
}
