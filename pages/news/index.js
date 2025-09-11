import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

function withinDays(iso, days = 5) {
  try {
    const d = new Date(iso || "");
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    return diff <= days && diff >= 0;
  } catch { return false; }
}

function Host({ url }) {
  try {
    const h = new URL(url || "").hostname.replace(/^www\./, "");
    return <span style={{ color:"#64748b" }}>{h}</span>;
  } catch {
    return <span style={{ color:"#64748b" }}>—</span>;
  }
}

export default function NewsIndex() {
  const router = useRouter();
  const qtab = typeof router.query?.tab === "string" ? router.query.tab : "overseas";
  const [tab, setTab] = useState(qtab);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [collapsed, setCollapsed] = useState(true);

  useEffect(()=>{ setTab(qtab); }, [qtab]);

  async function load(scope = tab) {
    try {
      setLoading(true); setErr(""); setList([]);
      let url = "";
      if (scope === "overseas") {
        url = "/api/news-daily"; // cached
      } else {
        url = "/api/news-kr-rss?" + new URLSearchParams({
          feeds: "http://www.ktnews.com/rss/allArticle.xml",
          days: "5",
          limit: "200",
        }).toString();
      }
      const r = await fetch(url, { cache:"no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "뉴스 로드 실패");

      let raw = [];
      if (scope === "overseas") {
        raw = (j?.items || []).map(n => ({
          title: n.title,
          url: n.url || n.link,
          publishedAt: n.publishedAt || n.pubDate || null,
          source: (n.source && typeof n.source === "string") ? n.source : (n.source?.name || "") || "",
          description: n.description || ""
        }));
      } else {
        const arr = Array.isArray(j) ? j : (j?.items || []);
        raw = arr.map(n => ({
          title: n.title,
          url: n.url || n.link,
          publishedAt: n.publishedAt || n.pubDate || n.date || null,
          source: (n.source && typeof n.source === "string") ? n.source : "",
          description: n.description || ""
        }));
      }

      const filtered = raw.filter(n => withinDays(n.publishedAt, 5))
        .sort((a,b)=> new Date(b.publishedAt||0) - new Date(a.publishedAt||0));
      setList(filtered);
      setCollapsed(true);
    } catch(e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(tab); }, [tab]);

  const shown = useMemo(()=> collapsed ? list.slice(0, 40) : list, [collapsed, list]);

  return (
    <main style={{ maxWidth:1100, margin:"24px auto", padding:"0 16px", fontFamily:"'SUIT Variable','Pretendard','Inter',system-ui,sans-serif" }}>
      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:900 }}>산업뉴스 전체보기 (최근 5일)</h1>
        <Link href="/" legacyBehavior><a style={{ color:"#111827", textDecoration:"underline" }}>← 대시보드</a></Link>
      </header>

      <div className="tab-nav" style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button
          className={"btn " + (tab==="overseas" ? "btn-primary" : "btn-ghost")}
          onClick={() => { setTab(t => t==="overseas" ? "overseas" : "overseas"); setCollapsed(true); }}
        >
          해외
        </button>
        <button
          className={"btn " + (tab==="korea" ? "btn-primary" : "btn-ghost")}
          onClick={() => { setTab(t => t==="korea" ? "korea" : "korea"); setCollapsed(true); }}
        >
          국내
        </button>
      </div>

      {loading && <div style={{ border:"1px dashed #cbd5e1", borderRadius:12, padding:14, background:"#f8fafc" }}>불러오는 중…</div>}
      {err && <div style={{ color:"#b91c1c", margin:"8px 0" }}>에러: {err}</div>}

      {!loading && !err && (
        <ol style={{ listStyle:"none", padding:0, margin:0, display:"grid", gap:10 }}>
          {shown.map((n, i)=>(
            <li key={i} style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
              <a href={n.url} target="_blank" rel="noreferrer" style={{ display:"block", padding:12, textDecoration:"none", color:"#0f172a" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:8 }}>
                  <div style={{ fontWeight:700, lineHeight:1.35 }}>{n.title}</div>
                  <div style={{ fontSize:12, whiteSpace:"nowrap", color:"#64748b" }}>
                    {n.publishedAt ? new Date(n.publishedAt).toLocaleString("ko-KR") : ""}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:4, fontSize:13 }}>
                  <Host url={n.url} /> {n.source ? <span>· {n.source}</span> : null}
                </div>
                {n.description ? <div style={{ marginTop:8, color:"#475569" }}>{n.description}</div> : null}
              </a>
            </li>
          ))}
        </ol>
      )}

      {!loading && !err && list.length > 40 && (
        <div style={{ marginTop:12 }}>
          <button className="btn btn-secondary" onClick={()=> setCollapsed(v=>!v)}>
            {collapsed ? `더보기 (${list.length - 40}개 더)` : "접기"}
          </button>
        </div>
      )}
    </main>
  );
}
