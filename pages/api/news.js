// pages/api/news.js
// 지원:
//   /api/news?q=Walmart
//   /api/news?cat=retail,fashion,textile&limit=30
// 반환: [{ title, url, source, datePublished }]

export default async function handler(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const cat = (req.query.cat || "").trim(); // 'retail,fashion,textile'
    const limit = Math.min(Number(req.query.limit || 20), 50);

    if (!q && !cat) {
      return res.status(400).json({ error: 'q or cat required' });
    }

    const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI;
    const RAPID = process.env.RAPIDAPI_KEY;

    const COMMON_HEADERS = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Referer": "https://www.bing.com/",
    };

    const withTimeout = async (p, ms = 6000) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort("timeout"), ms);
      try { return await p(ctrl.signal); } finally { clearTimeout(t); }
    };

    const normItem = (title, url, source, date) => ({
      title: title || url || '(no title)',
      url,
      source: source || '',
      datePublished: date || ''
    });

    // ---- Provider 1: NewsAPI (everything)
    async function fromNewsAPI(query) {
      if (!NEWS_API_KEY) throw new Error('NEWS_API_KEY missing');
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${limit}`;
      const r = await fetch(url, { headers: { ...COMMON_HEADERS, 'X-Api-Key': NEWS_API_KEY } });
      if (!r.ok) throw new Error(`newsapi ${r.status}`);
      const j = await r.json();
      const arr = (j?.articles || []).map(a =>
        normItem(a.title, a.url, a.source?.name, a.publishedAt)
      );
      return arr;
    }

    // ---- Provider 2: Bing News (RapidAPI)
    async function fromBing(query) {
      if (!RAPID) throw new Error('RAPIDAPI_KEY missing');
      const url = `https://bing-news-search1.p.rapidapi.com/news/search?q=${encodeURIComponent(query)}&freshness=Week&count=${limit}&originalImg=true&textFormat=Raw&safeSearch=Off`;
      const r = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          'x-rapidapi-key': RAPID,
          'x-rapidapi-host': 'bing-news-search1.p.rapidapi.com'
        }
      });
      if (!r.ok) throw new Error(`bing ${r.status}`);
      const j = await r.json();
      const arr = (j?.value || []).map(v =>
        normItem(v.name, v.url, v.provider?.[0]?.name, v.datePublished)
      );
      return arr;
    }

    // 카테고리 → 쿼리 매핑
    const CAT_QUERIES = {
      retail:  '(retail OR "big-box" OR "department store" OR "specialty retail") AND (US OR United States)',
      fashion: '(fashion OR apparel OR clothing) AND (retailer OR brand)',
      textile: '(textile OR garment OR fabric OR yarn OR cotton OR polyester) AND (supply chain OR manufacturer OR OEM)'
    };

    // 실제 질의 목록 구성
    let queries = [];
    if (q) {
      queries = [q];
    } else {
      const cats = cat.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      queries = cats.map(c => CAT_QUERIES[c] || c);
    }

    // 순차 수집(429 완화), provider 폴백
    const merged = [];
    const seen = new Set();

    const tryProviders = async (query) => {
      for (const fn of [
        (sig) => withTimeout(() => fromNewsAPI(query), 6000),
        (sig) => withTimeout(() => fromBing(query), 6000),
      ]) {
        try {
          const items = await fn();
          if (items?.length) return items;
        } catch (e) {
          // 다음 provider로
        }
      }
      return [];
    };

    for (const query of queries) {
      const items = await tryProviders(query);
      for (const it of items) {
        const key = it.url || it.title;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(it);
      }
      // rate-limit 방지
      await new Promise(r => setTimeout(r, 300));
    }

    merged.sort((a, b) => new Date(b.datePublished || 0) - new Date(a.datePublished || 0));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json(merged.slice(0, limit));
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
