import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.NEWS_API_KEY; // https://newsapi.org 에서 발급
    const url = `https://newsapi.org/v2/everything?q=(fashion OR retail OR textile OR apparel)&language=ko&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;
    const resp = await fetch(url);
    const json = await resp.json();

    const articles = json.articles.map(a => ({
      title: a.title,
      source: a.source.name,
      date: a.publishedAt.split("T")[0],
      url: a.url
    }));

    res.status(200).json({ data: articles });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "News API error" });
  }
}
