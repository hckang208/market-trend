// pages/api/news-kr-rss.js
// 한국 매체(RSS) 전용: 기본은 한국섬유신문 전체기사 RSS.
// brand / industry 키워드 AND 필터(must=brand,industry)와 제외 키워드(exclude) 지원.
// 여러 RSS를 쉼표(,)나 | 로 전달 가능: ?feeds=http://...xml|http://...xml

function parseList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(parseList);
  return String(input).split(/[|,]/).map(s => s.trim()).filter(Boolean);
}
function compileRegex(arr) {
  if (!arr.length) return null;
  const pattern = arr.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(pattern, "i");
}
function hostFromUrl(u) { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ""; } }
function decodeHTMLEntities(str="") {
  // 최소한의 엔티티 디코드
  return str.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
            .replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}
function pickTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeHTMLEntities(m[1].trim()) : "";
}
function parseRSS(xml, sourceHost) {
  // 매우 단순한 RSS 파서 (의존성 없이 동작)
  const items = [];
  const re = /<item[\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const itemXml = m[0];
    const title = pickTag(itemXml, "title");
    const url = pickTag(itemXml, "link") || pickTag(itemXml, "guid");
    const description = pickTag(itemXml, "description");
    const pubDateRaw = pickTag(itemXml, "pubDate") || pickTag(itemXml, "dc:date");
    const publishedAt = pubDateRaw ? new Date(pubDateRaw).toISOString() : "";
    items.push({
      title,
      url,
      source: sourceHost || hostFromUrl(url) || "ktnews.com",
      description,
      image: "", // RSS에 이미지가 없으면 공란
      publishedAt,
    });
  }
  return items;
}

function scoreArticle(a, { brandRx, indRx, mustSet, excludeRx, domainBonusHosts }) {
  const title = (a.title || "") + " " + (a.source || "");
  const desc = a.description || "";
  const txt = `${title} ${desc}`;
  if (excludeRx && excludeRx.test(txt)) return -999;

  const brandHitTitle = brandRx && brandRx.test(title) ? 1 : 0;
  const brandHitDesc  = brandRx && brandRx.test(desc) ? 1 : 0;
  const indHitTitle   = indRx   && indRx.test(title)   ? 1 : 0;
  const indHitDesc    = indRx   && indRx.test(desc)    ? 1 : 0;

  if (mustSet.has("brand") && !(brandHitTitle || brandHitDesc)) return -999;
  if (mustSet.has("industry") && !(indHitTitle || indHitDesc)) return -999;

  let score = 0;
  score += brandHitTitle * 2 + brandHitDesc * 1;
  score += indHitTitle * 1.5 + indHitDesc * 0.5;

  const host = hostFromUrl(a.url);
  if (domainBonusHosts && domainBonusHosts.has(host)) score += 0.5;

  return score;
}

export default async function handler(req, res) {
  try {
    const {
      feeds: feedsRaw = "http://www.ktnews.com/rss/allArticle.xml",
      brand = "",                 // 예: "월마트|유니클로|아마존|알리바바|Walmart|Uniqlo|Amazon|Alibaba"
      industry = "",              // 예: "패션|의류|섬유|의복|apparel|textile|garment|fashion"
      must = "brand,industry",    // 둘 다 만족(AND) 기본값
      exclude = "연예,룩북,화보,뷰티,가십,콘서트,팬덤,스포츠",
      limit: rawLimit = "40",
      days: rawDays = "30",       // 최근 N일만
    } = req.query;

    const limit = Math.min(Math.max(parseInt(String(rawLimit), 10) || 40, 1), 100);
    const days = Math.min(Math.max(parseInt(String(rawDays), 10) || 30, 1), 120);
    const fromTime = Date.now() - days * 86400e3;

    const feedList = parseList(feedsRaw);
    const brandArr = parseList(brand);
    const industryArr = parseList(industry);
    const mustSet = new Set(parseList(must));
    const brandRx = compileRegex(brandArr);
    const indRx = compileRegex(industryArr);
    const excludeRx = compileRegex(parseList(exclude));
    const domainBonusHosts = new Set(["ktnews.com"]); // 가중치 부여

    // 여러 RSS 병렬 fetch
    const results = await Promise.allSettled(feedList.map(async (u) => {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (RSS Fetcher)" } });
      const xml = await r.text();
      return parseRSS(xml, hostFromUrl(u));
    }));

    // 합치고 필터 + 스코어링 + 중복 제거
    let items = [];
    for (const rr of results) if (rr.status === "fulfilled" && Array.isArray(rr.value)) items.push(...rr.value);

    // 날짜 필터
    items = items.filter(a => {
      if (!a.publishedAt) return true; // 날짜가 없으면 일단 허용
      const t = Date.parse(a.publishedAt);
      return isFinite(t) ? t >= fromTime : true;
    });

    // 중복 제거
    const seen = new Set();
    items = items.filter(a => a.url && !seen.has(a.url) && seen.add(a.url));

    // 점수화 후 임계치 적용
    const scored = items.map(a => ({ a, s: scoreArticle(a, { brandRx, indRx, mustSet, excludeRx, domainBonusHosts }) }))
      .filter(x => x.s > 0)
      .sort((x, y) => new Date(y.a.publishedAt || 0) - new Date(x.a.publishedAt || 0))
      .slice(0, limit)
      .map(x => x.a);

    // 캐시 헤더(플랫폼별 honor될 수도, 아닐 수도)
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=1200");
    res.status(200).json(scored);
  } catch (e) {
    res.status(200).json([]);
  }
}
