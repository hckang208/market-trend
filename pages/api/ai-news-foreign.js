// pages/api/ai-news-foreign.js
import { geminiComplete } from "../../lib/gemini";

const FEEDS = [
  "https://news.google.com/rss/search?q=site:businessoffashion.com&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=site:just-style.com&hl=en-US&gl=US&ceid=US:en",
];
const ALLOWED = new Set(["businessoffashion.com","www.businessoffashion.com","just-style.com","www.just-style.com"]);

function hostOf(u) { try { return new URL(u).host; } catch { return ""; } }
function norm(h) { return (h||"").replace(/^www\./,""); }
function pick(block, tag) { const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i")); return m ? m[1].trim() : null; }
function attr(block, tag, name) { const m = block.match(new RegExp(`<${tag}([^>]*)>`, "i")); if (!m) return ""; const a = m[1]||""; const mm=a.match(new RegExp(name+`="([^"]+)"`,"i")); return mm?mm[1]:""; }
function unescapeXml(s) { if (!s) return s; return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs,"$1").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#039;/g,"'"); }
function extractOriginalUrl(gn) { try { const u = new URL(gn); const url = u.searchParams.get("url"); return url || gn; } catch { return gn; } }
async function fetchText(url) { try { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) return null; return await r.text(); } catch { return null; } }
function parseFeed(xml) {
  if (!xml) return [];
  const chunks = xml.match(new RegExp("<item[\\s\\S]*?</item>","gi")) || xml.match(new RegExp("<entry[\\s\\S]*?</entry>","gi")) || [];
  const out = [];
  for (const c of chunks) {
    const title = unescapeXml(pick(c,"title")||"");
    let link = pick(c,"link") || pick(c,"guid") || "";
    const linkAttr = (c.match(new RegExp('<link[^>]*href="([^"]+)"',"i"))||[])[1]||"";
    if (!/^https?:/i.test(link)) link = linkAttr || link;
    if (!link) continue;
    if (link.includes("news.google.com")) link = extractOriginalUrl(link);
    const host = norm(hostOf(link));
    if (!ALLOWED.has(host)) continue;
    const pub = pick(c,"pubDate") || pick(c,"published") || pick(c,"updated") || "";
    let publishedAtISO = null; try { publishedAtISO = new Date(pub).toISOString(); } catch {}
    out.push({ title, link, source: host, publishedAtISO });
  }
  return out.sort((a,b)=> (new Date(b.publishedAtISO||0)) - (new Date(a.publishedAtISO||0)));
}

export default async function handler(req, res) {
  try {
    // 1) Try internal API first (if it fails/HTML, fallback to direct feed)
    let items = [];
    try {
      const base = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
      const r = await fetch(`${base}/api/news-foreign-industry?days=7&limit=30`, { cache: "no-store" });
      const txt = await r.text();
      let j = null;
      try { j = txt ? JSON.parse(txt) : null; } catch { j = null; }
      const arr = Array.isArray(j) ? j : (j?.items || []);
      if (Array.isArray(arr) && arr.length) {
        items = arr.map(n => ({ title: n.title||"", link: n.link||n.url||"", source: n.source||n.sourceHost||n.linkHost||"", publishedAtISO: n.publishedAtISO||n.pubDate||n.date||null }));
      }
    } catch { /* ignore, fallback */ }

    // 2) Fallback: fetch Google News RSS directly
    if (!items.length) {
      for (const u of FEEDS) {
        const xml = await fetchText(u);
        const parsed = parseFeed(xml);
        items.push(...parsed);
      }
      // Dedup by link
      const seen = new Set(); items = items.filter(x => (x.link && !seen.has(x.link) && seen.add(x.link)));
    }

    const top = items.slice(0, 12);
    let summary = "";
    try {
      const prompt = `너는 패션/리테일 산업 애널리스트다. 아래 Business of Fashion / Just-Style 기사만 요약해 핵심 인사이트 5개를 bullet로:\n\n${top.map((n,i)=>`(${i+1}) [${n.source}] ${n.title}`).join("\n")}`;
      summary = await geminiComplete(prompt, 1100);
    } catch (e) {
      summary = top.map(n => `• ${n.title} (${n.source})`).join("\n");
    }

    return res.status(200).json({ generatedAt: new Date().toISOString(), count: top.length, items: top, summary, scope: "overseas" });
  } catch (e) {
    const payload = { error: String(e), items: [], summary: "", generatedAt: new Date().toISOString(), scope: "overseas" };
    try { return res.status(200).json(payload); } catch { return res.end(JSON.stringify(payload)); }
  }
}
