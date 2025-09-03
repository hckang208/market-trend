// pages/api/news.js
function parseList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(parseList);
  const s = String(input);
  // | 또는 , 로 구분
  return s.split(/[|,]/).map(t => t.trim()).filter(Boolean);
}
function makeOrQuery(arr) {
  if (!arr || !arr.length) return "";
  return arr.map(v => `"${v.replace(/"/g, '\\"')}"`).join(" OR ");
}
function hostFromUrl(u) { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ""; } }

function buildQuery({ q, brandArr, industryArr, must }) {
  const brandQ = makeOrQuery(brandArr);
  const indQ = makeOrQuery(industryArr);
  if (q) return q;
  const mustSet = new Set(parseList(must));
  if (mustSet.has("brand") && mustSet.has("industry") && brandQ && indQ) {
    return `(${brandQ}) AND (${indQ})`;
  }
  if (brandQ && indQ) return `(${brandQ}) OR (${indQ})`;
  if (brandQ) return brandQ;
  if (indQ) return indQ;
  return "fashion OR apparel OR garment OR textile";
}

function compileRegex(arr) {
  if (!arr.length) return null;
  const pattern = arr.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(pattern, "i");
}

function scoreArticle(a, { brandRx, indRx, mustSet, excludeRx, domainBonusHosts }) {
  const title = (a.title || "") + " " + (a.source || a.source?.name || "");
  const desc = a.description || "";
  const txt = `${title} ${desc}`;
  if (excludeRx && excludeRx.test(txt)) return -999; // 즉시 제외

  const brandHitTitle = brandRx && brandRx.test(title) ? 1 : 0;
  const brandHitDesc  = brandRx && brandRx.test(desc) ? 1 : 0;
  const indHitTitle   = indRx && indRx.test(title) ? 1 : 0;
  const indHitDesc    = indRx && indRx.test(desc) ? 1 : 0;

  // MUST 조건
  if (mustSet.has("brand") && !(brandHitTitle || brandHitDesc)) return -999;
  if (mustSet.has("industry") && !(indHitTitle || indHitDesc)) return -999;

  // 점수: 제목 가중치↑, 도메인 보너스
  let score = 0;
  score += brandHitTitle * 2 + brandHitDesc * 1;
  score += indHitTitle * 1.5 + indHitDesc * 0.5;

  const host = hostFromUrl(a.url);
  if (domainBonusHosts && domainBonusHosts.has(host)) score += 0.5;

  return score;
}

export default async function handler(req, res) {
  try {
    const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI || "";
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";

    const {
      q = "",
      brand = "",
      industry = "",
      must = "",            // 예: "brand,industry" → (브랜드 AND 업계)
      language = "en",
      limit: rawLimit = "30",
      sortBy = "publishedAt",
      days: rawDays = "14", // 최근 N일
      domains = "",         // 포함 도메인 CSV
      excludeDomains = "",  // 제외 도메인 CSV
      exclude = "",         // 제외 키워드 CSV
      market = "",          // Bing fallback용 (예: "ko-KR")
    } = req.query;

    const limit = Math.min(Math.max(parseInt(String(rawLimit), 10) || 30, 1), 100);
    const days = Math.min(Math.max(parseInt(String(rawDays), 10) || 14, 1), 60);
    const fromISO = new Date(Date.now() - days * 86400e3).toISOString();

    const brandArr = parseList(brand);
    const industryArr = parseList(industry);
    const mustSet = new Set(parseList(must));
    const brandRx = compileRegex(brandArr);
    const indRx = compileRegex(industryArr);
    const excludeRx = compileRegex(parseList(exclude));

    const qExpr = buildQuery({ q, brandArr, industryArr, must });

    const domainBonusHosts = new Set(parseList(domains).map(s => s.trim()));

    // 1) NewsAPI 시도
    if (NEWS_API_KEY) {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", qExpr);
      url.searchParams.set("pageSize", String(limit));
      url.searchParams.set("language", language);
      url.searchParams.set("sortBy", sortBy);
      url.searchParams.set("from", fromISO);
      if (domains) url.searchParams.set("domains", domains);
      if (excludeDomains) url.searchParams.set("excludeDomains", excludeDomains);
      // 검색 범위: 제목+설명(가중치용은 내부에서)
      url.searchParams.set("searchIn", "title,description");

      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${NEWS_API_KEY}` } });
      const j = await r.json();

      if (!r.ok || j?.status === "error") {
        return await rapidFallback({
          qExpr, limit, market, domainBonusHosts, brandRx, indRx, mustSet, excludeRx,
          domains, excludeDomains
        }, res, RAPIDAPI_KEY);
      }

      let items = (j.articles || []).map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source?.name || "",
        description: a.description,
        image: a.urlToImage || "",
        publishedAt: a.publishedAt,
      }));

      // 2차 필터 + 스코어링
      const seen = new Set();
      items = items.filter(a => a?.url && !seen.has(a.url) && seen.add(a.url))
        .map(a => ({ a, s: scoreArticle(a, { brandRx, indRx, mustSet, excludeRx, domainBonusHosts }) }))
        .filter(x => x.s > 0) // 임계치
        .sort((x, y) => new Date(y.a.publishedAt||0) - new Date(x.a.publishedAt||0))
        .map(x => x.a);

      res.status(200).json(items);
      return;
    }

    // 2) RapidAPI(Bing News) 폴백
    return await rapidFallback({
      qExpr, limit, market, domainBonusHosts, brandRx, indRx, mustSet, excludeRx,
      domains, excludeDomains
    }, res, RAPIDAPI_KEY);

  } catch (e) {
    res.status(500).send(`news error: ${e.message || e}`);
  }
}

async function rapidFallback(opts, res, RAPIDAPI_KEY) {
  const { qExpr, limit, market, domainBonusHosts, brandRx, indRx, mustSet, excludeRx, domains, excludeDomains } = opts;
  if (!RAPIDAPI_KEY) { res.status(200).json([]); return; }

  // Bing News Search (RapidAPI)
  const host = "bing-news-search1.p.rapidapi.com";
  const url = new URL("https://bing-news-search1.p.rapidapi.com/news/search");
  url.searchParams.set("q", qExpr);
  url.searchParams.set("count", String(limit));
  url.searchParams.set("freshness", "Week");
  url.searchParams.set("textFormat", "Raw");
  url.searchParams.set("safeSearch", "Off");
  if (market) url.searchParams.set("mkt", market);

  try {
    const r = await fetch(url.toString(), {
      headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": host }
    });
    if (!r.ok) { res.status(200).json([]); return; }
    const j = await r.json();
    let items = (j.value || []).map((a) => ({
      title: a.name,
      url: a.url,
      source: a.provider?.[0]?.name || "",
      description: a.description,
      image: a.image?.thumbnail?.contentUrl || "",
      publishedAt: a.datePublished,
    }));

    // 도메인 필터 (가능 시)
    const allow = parseList(domains);
    const deny = parseList(excludeDomains);
    items = items.filter(it => {
      const h = hostFromUrl(it.url);
      if (allow.length && !allow.includes(h)) return false;
      if (deny.length && deny.includes(h)) return false;
      return true;
    });

    const seen = new Set();
    const scored = items.filter(a => a?.url && !seen.has(a.url) && seen.add(a.url))
      .map(a => ({ a, s: scoreArticle(a, { brandRx, indRx, mustSet, excludeRx, domainBonusHosts }) }))
      .filter(x => x.s > 0)
      .sort((x, y) => new Date(y.a.publishedAt||0) - new Date(x.a.publishedAt||0))
      .map(x => x.a);

    res.status(200).json(scored);
  } catch {
    res.status(200).json([]);
  }
}
