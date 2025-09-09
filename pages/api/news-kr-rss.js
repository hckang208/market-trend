export const config = { runtime: 'nodejs' };

function stripTags(s=''){ return s.replace(/<[^>]*>/g,'').trim(); }

async function fetchFeed(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'HansolDashboard/1.0' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xml = await res.text();
    const items = [];
    const itemRegex = /<item[\s\S]*?<\/item>/g;
    const titleRe = /<title>([\s\S]*?)<\/title>/i;
    const linkRe = /<link>([\s\S]*?)<\/link>/i;
    const dateRe = /<pubDate>([\s\S]*?)<\/pubDate>/i;
    const matches = xml.match(itemRegex) || [];
    for (const block of matches.slice(0, 30)) {
      const t = (block.match(titleRe) || [,''])[1];
      const l = (block.match(linkRe) || [,''])[1];
      const d = (block.match(dateRe) || [,''])[1];
      items.push({ title: stripTags(t), link: stripTags(l), pubDate: stripTags(d), source: "한국섬유신문" });
    }
    return items;
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  const { feeds } = req.query;
  const list = (feeds && String(feeds).split(',').map(s=>s.trim()).filter(Boolean)) ||
               [ 'http://www.ktnews.com/rss/allArticle.xml' ];
  const results = [];
  for (const u of list) {
    const items = await fetchFeed(u);
    results.push(...items);
  }
  res.status(200).json(results);
}
