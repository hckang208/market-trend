// scripts/fetch_news_daily.mjs  (Node18+, ESM)
import fs from "node:fs/promises";

const FEEDS_OVERSEAS = [
  // 구글뉴스 RSS로 BoF/Just-Style를 안정적으로 프록시
  "https://news.google.com/rss/search?q=site:businessoffashion.com&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=site:just-style.com&hl=en-US&gl=US&ceid=US:en",
];
const FEEDS_KR = [
  "http://www.ktnews.com/rss/allArticle.xml",
  "https://www.ktnews.com/rss/allArticle.xml",
];

const TIMEOUT = 8000;
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

async function fetchText(url){
  const ctrl = new AbortController();
  const id = setTimeout(()=>ctrl.abort(), TIMEOUT);
  try{
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent":"MarketTrend/1.0 (+netlify build prefetch)" }});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = (r.headers.get("content-type")||"").toLowerCase();
    if(ct.includes("text/html")) throw new Error("HTML error page");
    return await r.text();
  } finally { clearTimeout(id); }
}

function pick(tag, block){
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,"i"));
  return m ? m[1].replace(/^<!\\[CDATA\\[(.*)\\]\\]>$/s, "$1").trim() : null;
}
function parseRSS(xml, sourceLabel){
  const items=[];
  const blocks = xml.split(/<item[\\s>]/i).slice(1).map(b=>"<item"+b.split("</item>")[0]+"</item>");
  for(const it of blocks){
    const title = pick("title", it) || "";
    const link = (pick("link", it) || "").trim();
    const pubDate = pick("pubDate", it) || pick("updated", it) || "";
    items.push({ title, url: link, publishedAt: pubDate, source: sourceLabel || "" });
  }
  return items;
}
function dedupeByTitle(arr){
  const seen = new Set();
  return arr.filter(o=>{ const k=(o.title||"").toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
}
async function pullMany(feeds, labelFn){
  const out=[]; const errs=[];
  for(const f of feeds){
    try{
      const xml = await fetchText(f);
      out.push(...parseRSS(xml, labelFn?labelFn(f):""));
      await sleep(150);
    }catch(e){ errs.push(`${f}: ${e.message||e}`); }
  }
  return { items: dedupeByTitle(out), errors: errs };
}
function nowISO(){ return new Date().toISOString(); }

async function main(){
  // Overseas
  const ov = await pullMany(FEEDS_OVERSEAS, (u)=>/businessoffashion/.test(u)?"Business of Fashion":"Just-Style");
  const overseas = {
    updatedAtISO: nowISO(),
    items: ov.items.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,100),
    sources: "BoF, Just-Style (via Google News RSS)"
  };

  // Korea
  const kr = await pullMany(FEEDS_KR, ()=>"KTNews");
  const korea = {
    updatedAtISO: nowISO(),
    items: kr.items.sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,200),
    sources: "KTNews RSS"
  };

  await fs.mkdir("public/data", { recursive:true });
  await fs.writeFile("public/data/news_overseas.json", JSON.stringify(overseas, null, 2));
  await fs.writeFile("public/data/news_korea.json", JSON.stringify(korea, null, 2));
  console.log("Wrote public/data/news_overseas.json & news_korea.json");
}
main().catch(e=>{ console.error(e); process.exit(1); });
