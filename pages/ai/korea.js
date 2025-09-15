// pages/ai/korea.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import LoadingOverlay from "../../components/LoadingOverlay";
import { getKoreaNews } from "../../lib/newsClient";

/* 재사용 유틸 */
const EN_STOP = new Set(["the","a","an","and","or","but","with","of","for","to","in","on","at","by","as","is","are","was","were","be","been","from","that","this","these","those","it","its","they","their","we","our","you","your","i","me","my","us"]);
const KO_STOP = new Set(["및","그리고","또는","등","관련","지난","이번","대해","으로","으로서","에서","에게","으로부터","수","등등","보다","보다도","이다","한다","했다","되는","위해","에서의","하는","한","것","때문","중"]);
function tokenizeForSuggest(text){const tokens=String(text||"").replace(/[\u200B-\u200D\uFEFF]/g,"").split(/[^0-9A-Za-z\u3131-\uD79D]+/g).map(t=>t.trim()).filter(Boolean);const counts=new Map();for(const tRaw of tokens){const t=tRaw.toLowerCase();if(t.length<2)continue;const isEN=/^[a-z0-9]+$/.test(t);if((isEN&&EN_STOP.has(t))||(!isEN&&KO_STOP.has(tRaw)))continue;counts.set(t,(counts.get(t)||0)+1);}return counts;}
function topKeywordsFromData({summary,items},n=8){const pools=[];if(summary)pools.push(summary);if(Array.isArray(items))pools.push(items.map(i=>i.title).join(" "));const merged=tokenizeForSuggest(pools.join(" "));return[...merged.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([w])=>w);}
function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function clearHighlights(root){if(!root)return;const marks=root.querySelectorAll('mark[data-hl="1"]');marks.forEach(mark=>{const parent=mark.parentNode;if(!parent)return;parent.replaceChild(document.createTextNode(mark.textContent||""),mark);parent.normalize();});}
function highlightInNode(root,terms){if(!root||!terms.length)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!node.nodeValue||!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;if(node.parentElement&&node.parentElement.closest('mark[data-hl="1"]'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;},});const regexes=terms.map(t=>new RegExp(escapeRegex(t),"gi"));const toProcess=[];while(walker.nextNode())toProcess.push(walker.currentNode);for(const textNode of toProcess){let currentNode=textNode;for(const re of regexes){if(!currentNode?.nodeValue||!re.test(currentNode.nodeValue))continue;re.lastIndex=0;const frag=document.createDocumentFragment();let lastIdx=0;const str=currentNode.nodeValue;let m;while((m=re.exec(str))!==null){const start=m.index,end=start+m[0].length;if(start>lastIdx)frag.appendChild(document.createTextNode(str.slice(lastIdx,start)));const mark=document.createElement("mark");mark.setAttribute("data-hl","1");mark.appendChild(document.createTextNode(str.slice(start,end)));frag.appendChild(mark);lastIdx=end;}if(lastIdx<str.length)frag.appendChild(document.createTextNode(str.slice(lastIdx)));currentNode.replaceWith(frag);currentNode=frag.lastChild&&frag.lastChild.nodeType===3?frag.lastChild:null;if(!currentNode)break;}if(textNode.parentNode)textNode.parentNode.normalize();}}
function linkifyCitations(markdown){const text=String(markdown||"");return text.replace(/\[(\d+(?:-\d+)?)\]/g,(m,grp)=>{const id=String(grp).split("-")[0];return `<a href="#ref-${id}" style="text-decoration: underline;">[${grp}]</a>`;});}
function parseSections(md=""){const lines=String(md).split(/\r?\n/);const secs=[];let title=null,buf=[];const push=()=>{if(title||buf.length)secs.push({title:title||"",body:buf.join("\n")});};for(const ln of lines){if(/^###\s+/.test(ln)){push();title=ln.replace(/^###\s+/,"").trim();buf=[];}else buf.push(ln);}push();return secs;}
async function fetchJSON(url,init){const res=await fetch(url,{...init,headers:{Accept:"application/json",...(init?.headers||{})}});const ct=res.headers.get("content-type")||"";if(!ct.includes("application/json")){const body=await res.text();throw new Error(`API did not return JSON (status ${res.status}). body: ${body.slice(0,200)}...`);}return res.json();}
function deriveBulletsFromSummary(text,max=6){const t=String(text||"").trim();if(!t)return[];const lines=t.split(/\n+/).map(x=>x.trim()).filter(Boolean);const bullets=lines.filter(ln=>/^[-•\*]\s+/.test(ln)).map(ln=>ln.replace(/^[-•\*]\s+/,""));if(bullets.length)return bullets.slice(0,max);const sentences=t.split(/(?<=[.!?…])\s+/).filter(s=>s.length>10);return sentences.slice(0,max);}

export default function IndustryAIKoreaPage() {
  const router = useRouter();
  const qDays  = useMemo(() => Number(router.query.days ?? 7), [router.query.days]);
  const qLimit = useMemo(() => Number(router.query.limit ?? 30), [router.query.limit]);

  const [days, setDays]   = useState(qDays);
  const [limit, setLimit] = useState(qLimit);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [summary, setSummary]   = useState("");
  const [bullets, setBullets]   = useState([]);
  const [model, setModel]       = useState(null);
  const [articlesUsed, setArticlesUsed] = useState(0);

  const [items, setItems] = useState([]);
  const [kwInput, setKwInput] = useState("");
  const [kwSelected, setKwSelected] = useState([]);
  const [kwSuggest, setKwSuggest] = useState([]);
  const [hlRefs, setHlRefs] = useState(true);

  const summaryRef = useRef(null);
  const refsRef    = useRef(null);

  useEffect(() => { load(days, limit); /* eslint-disable-next-line */ }, [qDays, qLimit]);

  async function load(d = days, l = limit) {
    try {
      setLoading(true); setError("");
      setSummary(""); setBullets([]); setItems([]);

      const [aiData, newsData] = await Promise.all([
        fetchJSON(`/api/ai-news-korea?days=${d}&limit=${l}`),
        (async () => {
          const data = await getKoreaNews();
          const raw = Array.isArray(data) ? data : (data?.items || []);
          const mapped = raw.map((n) => ({
            title: n.title || "",
            url: n.url || n.link || "",
            source: (typeof n.source === "string" && n.source) || (n.source && (n.source.name || n.source.id)) || "한국섬유산업신문",
            publishedAt: n.published_at || n.publishedAt || n.publishedAtISO || n.pubDate || n.date || "",
          })).filter((n) => n.title && n.url);
          mapped.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
          return mapped.slice(0, l);
        })(),
      ]);

      if (!aiData || typeof aiData !== "object") {
        setError("AI 요약 데이터 없음");
        return;
      }

      const sum = typeof aiData?.summary === "string" ? aiData.summary : "";
      const blt = Array.isArray(aiData?.bullets) && aiData.bullets.length
        ? aiData.bullets
        : deriveBulletsFromSummary(sum);

      setSummary(sum || "");
      setBullets(blt || []);
      setModel(aiData?.model || "unknown");
      setArticlesUsed(aiData?.articlesUsed || 0);
      setItems(Array.isArray(newsData) ? newsData : []);

      setKwSuggest(topKeywordsFromData({ summary: sum, items: newsData }));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(() => parseSections(summary || ""), [summary]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const terms = kwSelected.map((t) => String(t || "").trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
    if (summaryRef.current) { clearHighlights(summaryRef.current); if (terms.length) highlightInNode(summaryRef.current, terms); }
    if (refsRef.current) { clearHighlights(refsRef.current); if (hlRefs && terms.length) highlightInNode(refsRef.current, terms); }
  }, [kwSelected, sections, hlRefs, items]);

  function applyInputKeywords(){const fromInput=kwInput.split(/[,\s]+/g).map(s=>s.trim()).filter(Boolean);const merged=Array.from(new Set([...kwSelected,...fromInput]));setKwSelected(merged);setKwInput("");}
  function toggleChip(w){const x=String(w||"").trim();if(!x)return;setKwSelected(prev=>prev.includes(x)?prev.filter(v=>v!==x):[...prev,x]);}
  function removeActive(w){setKwSelected(prev=>prev.filter(v=>v!==w));}
  function clearAll(){setKwSelected([]);setKwInput("");}

  const generatedAtLocal = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  return (
    <>
      <SiteHeader />
      {loading && <LoadingOverlay text="AI Analysis • GEMINI 2.5 분석중입니다" />}

      <div className="container">
        <div className="company-header">
          <div>
            <h1 className="company-title">산업뉴스 AI 분석 <span className="company-title-sub">(국내)</span></h1>
            <div className="meta">{articlesUsed ? `${articlesUsed}개 기사 · ` : ""}{generatedAtLocal}</div>
          </div>
          <div className="header-actions">
            <a href="/" className="ghost-link">← 대시보드</a>
            <button onClick={() => load(days, limit)} disabled={loading} className="btn">
              {loading ? "AI 분석 중..." : "AI 분석 다시 시도"}
            </button>
          </div>
        </div>

        <div className="controls">
          <label className="ctrl">
            <span>개수</span>
            <input type="number" min={3} max={50} value={limit} onChange={(e)=>setLimit(Number(e.target.value))} />
          </label>
          <label className="ctrl">
            <span>일수</span>
            <input type="number" min={3} max={60} value={days} onChange={(e)=>setDays(Number(e.target.value))} />
          </label>
          <button
            onClick={() => { router.replace(`/ai/korea?days=${days}&limit=${limit}`); load(days, limit); }}
            disabled={loading}
            className="apply-btn"
          >
            {loading ? "적용 중…" : "적용"}
          </button>
        </div>

        <div className="hl-bar">
          <div className="hl-left">
            <div className="hl-title">키워드 하이라이트</div>
            <div className="hl-inputs">
              <input value={kwInput} onChange={(e)=>setKwInput(e.target.value)} placeholder="쉼표(,)로 여러 키워드 입력 (예: 수주, 원가, 재고)" />
              <button onClick={applyInputKeywords} className="hl-btn">추가</button>
              <button onClick={clearAll} className="hl-btn ghost">지우기</button>
              <label className="hl-check">
                <input type="checkbox" checked={hlRefs} onChange={(e)=>setHlRefs(e.target.checked)} />
                참조 뉴스에도 적용
              </label>
            </div>
          </div>
          {!!kwSuggest.length && (
            <div className="hl-suggest">
              {kwSuggest.map((w,i)=>(<button key={i} onClick={()=>toggleChip(w)} className={`chip ${kwSelected.includes(w)?"active":""}`}>{w}</button>))}
            </div>
          )}
        </div>

        {!!kwSelected.length && (
          <div className="hl-active">
            {kwSelected.map((w,i)=>(<span key={i} className="chip active removable" onClick={()=>removeActive(w)}>{w} <b>×</b></span>))}
          </div>
        )}

        {error && <div className="error">에러: {error}</div>}
        {!summary && !loading && <div className="muted">요약을 불러오려면 잠시 기다려 주세요…</div>}

        {(summary || items.length > 0) && (
          <div className="grid">
            <div className="summary" ref={summaryRef}>
              {sections.length === 0 ? (
                <div
                  className="summary-body"
                  dangerouslySetInnerHTML={{ __html: linkifyCitations(summary || "").replace(/\n/g, "<br/>") }}
                />
              ) : (
                sections.map((sec,idx)=>(
                  <section key={idx} className="section-block">
                    {sec.title && <h3 className="h3">{sec.title}</h3>}
                    <div className="summary-body" dangerouslySetInnerHTML={{ __html: linkifyCitations(sec.body).replace(/^-\s+/gm,"• ").replace(/\n/g,"<br/>") }} />
                  </section>
                ))
              )}
            </div>

            <aside className="refs-card" ref={refsRef}>
              <div className="refs-title">참조 뉴스</div>
              <ol className="refs-list">
                {(items || []).map((it, idx)=>(
                  <li id={`ref-${idx+1}`} key={idx} className="refs-item">
                    <a href={it.url} target="_blank" rel="noreferrer" className="link">{it.title || "제목 없음"}</a>
                    {it.publishedAt ? <div className="refs-meta">{it.publishedAt}</div> : null}
                    <div className="refs-source">{it.source || ""}</div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        )}
      </div>

      <SiteFooter />

      <style jsx>{`
        .container { max-width: 1200px; margin: 32px auto; padding: 0 24px; }
        .meta { font-size: 13px; color: #6b7280; }
        .h3 { font-size: 15px; font-weight: 800; margin: 10px 0 6px; }
        .link { color: #1d4ed8; text-decoration: none; }
        /* ... 기존 스타일 그대로 유지 ... */
      `}</style>
    </>
  );
}
