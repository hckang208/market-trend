export default async function handler(req, res) {
  try {
    const NEWSAPI = process.env.NEWSAPI;
    const domains = process.env.NEXT_PUBLIC_KOREA_NEWS_DOMAINS || "ktnews.com,hankyung.com,biz.chosun.com";
    let items = [];
    if (NEWSAPI) {
      const url = `https://newsapi.org/v2/everything?q=%EC%84%AC%EC%9C%A0%20OR%20%EC%9D%98%EB%A5%98&language=ko&domains=${encodeURIComponent(domains)}&pageSize=12&sortBy=publishedAt&apiKey=${NEWSAPI}`;
      const r = await fetch(url);
      const j = await r.json();
      items = (j.articles||[]).map(a => ({ title: a.title, link: a.url, source: a.source?.name }));
    }
    res.status(200).json({ items, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ items: [], generatedAt: new Date().toISOString() });
  }
}