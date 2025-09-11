import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "data");
fs.mkdirSync(outDir, { recursive: true });
const now = () => new Date().toISOString();
const writeJson = (name, data) => {
  const p = path.join(outDir, name);
  const json = JSON.stringify(data, null, 2);
  if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== json) {
    fs.writeFileSync(p, json);
  }
};

const FRED_KEY = process.env.FRED_API_KEY || "";
async function fredSeries(id) {
  if (!FRED_KEY) return { id, last: null, lastDate: null, history: [] };
  const u = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${FRED_KEY}&file_type=json`;
  const r = await fetch(u);
  if (!r.ok) return { id, last: null, lastDate: null, history: [] };
  const j = await r.json();
  const obs = (j?.observations||[]).filter(o => o.value !== "." && o.value != null);
  const last = obs.at(-1);
  return { id, last: last ? Number(last.value) : null, lastDate: last?.date, history: obs.slice(-60) };
}
async function usdkrwSpot() {
  const u = "https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=5d";
  const r = await fetch(u, { headers: { "User-Agent": "Dashboard/1.0" } });
  if (!r.ok) return { price: null, ts: null };
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta || {};
  return { price: meta?.regularMarketPrice ?? null, ts: meta?.regularMarketTime ? new Date(meta.regularMarketTime*1000).toISOString() : null };
}
async function buildIndicators(){
  const ids = { wti:"DCOILWTICO", usdkrw:"DEXKOUS", cpi:"CPIAUCSL", fedfunds:"DFEDTARU", t10y2y:"T10Y2Y", inventory_ratio:"ISRATIO", unemployment:"UNRATE" };
  const [wti, usdkrwFred, cpi, ff, t10y2y, inv, unemp, usdkrwNow] = await Promise.all([
    fredSeries(ids.wti), fredSeries(ids.usdkrw), fredSeries(ids.cpi),
    fredSeries(ids.fedfunds), fredSeries(ids.t10y2y), fredSeries(ids.inventory_ratio),
    fredSeries(ids.unemployment), usdkrwSpot()
  ]);
  return { updatedAtISO: now(), wti, usdkrwFred, usdkrwNow, cpi, fedfunds: ff, t10y2y, inventory_ratio: inv, unemployment: unemp };
}

const SYMBOLS = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA","9983.T"];
async function yahooQuotes(symbols){
  const u = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
  const r = await fetch(u, { headers:{ "User-Agent":"Dashboard/1.0" }});
  if(!r.ok) return symbols.map(s=>({symbol:s,longName:s,regularMarketPrice:null,regularMarketPreviousClose:null,changePercent:null,currency:'USD',ts:null}));
  const j = await r.json();
  const quotes = j?.quoteResponse?.result||[];
  return quotes.map(q => ({
    symbol: q.symbol,
    longName: q.longName || q.shortName || q.symbol,
    regularMarketPrice: q.regularMarketPrice ?? null,
    regularMarketPreviousClose: q.regularMarketPreviousClose ?? null,
    changePercent: (q.regularMarketPrice != null && q.regularMarketPreviousClose != null)
      ? ((q.regularMarketPrice - q.regularMarketPreviousClose) / q.regularMarketPreviousClose * 100)
      : null,
    currency: q.currency || "USD",
    ts: q.regularMarketTime ? new Date(q.regularMarketTime*1000).toISOString() : null
  }));
}

async function fetchText(u, headers={}) {
  const r = await fetch(u, { headers, redirect: "follow" });
  return r.ok ? r.text() : "";
}
function parseRss(xml){
  const items = [];
  const re = /<item[\s\S]*?<\/item>/gi;
  for (const it of xml.match(re)||[]) {
    const g = (tag) => (it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"))||[])[1]?.replace(/<!\[CDATA\[|\]\]>/g,"")?.trim()||"";
    items.push({ title:g("title"), url:g("link"), publishedAt:g("pubDate")||g("dc:date")||null });
  }
  return items.filter(x=>x.title && x.url);
}
async function overseasNews(){
  const feeds = [
    "https://feeds.reuters.com/reuters/businessNews",
    "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml"
  ];
  const xmls = await Promise.all(feeds.map(f => fetchText(f, { "User-Agent":"Dashboard/1.0", "accept":"application/rss+xml,text/xml" })));
  const items = xmls.flatMap(parseRss);
  return { updatedAtISO: now(), count: items.length, items: items.slice(0, 60) };
}
async function koreaNews(){
  const feed = "https://www.ktnews.com/rss/allArticle.xml";
  const xml = await fetchText(feed, { "User-Agent":"Dashboard/1.0", "accept":"application/rss+xml,text/xml" });
  const items = parseRss(xml);
  return { updatedAtISO: now(), count: items.length, items: items.slice(0, 120) };
}

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
async function geminiSummarize(title, bullets){
  if(!GEMINI_KEY) return "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const system = `${title}를 불릿 6줄 내로, 과장 없이, 수치와 리스크/기회 위주로 한국어 요약.`;
  const user = bullets.map((b,i)=>`${i+1}. ${b}`).join("\n");
  const body = { systemInstruction:{ parts:[{text:system}] }, contents:[{ parts:[{ text:user }]}], generationConfig:{ temperature:0.3, maxOutputTokens:500 } };
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  return j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("").trim() || "";
}

const [ind, quotes, ov, kr] = await Promise.all([
  buildIndicators(), yahooQuotes(SYMBOLS), overseasNews(), koreaNews()
]);

const ai = {
  updatedAtISO: now(),
  overseas: await geminiSummarize("해외 산업/거시/리테일 동향 요약", ov.items.slice(0,12).map(x=>`${x.title}`)),
  korea: await geminiSummarize("국내 산업 뉴스 요약", kr.items.slice(0,12).map(x=>`${x.title}`))
};

const meta = { updatedAtISO: now(), timezone: "Asia/Seoul" };

// 저장
writeJson("indicators.json", ind);
writeJson("stocks.json", { updatedAtISO: now(), symbols: SYMBOLS, quotes });
writeJson("news_overseas.json", ov);
writeJson("news_korea.json", kr);
writeJson("ai_summary.json", ai);
writeJson("meta.json", meta);

console.log("Daily refresh done:", now());
