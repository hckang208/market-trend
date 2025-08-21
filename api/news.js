import fetch from "node-fetch";

export default async function handler(req, res) {
  console.log("📰 news.js API 호출!!");

  try {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error("NEWS_API_KEY 환경변수가 설정되지 않았습니다.");
    }

    const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ news.js 에러:", error);
    res.status(500).json({ error: "뉴스 데이터를 불러오는 데 실패했습니다." });
  }
}
