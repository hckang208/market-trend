import fetch from "node-fetch";

export default async function handler(req, res) {
  console.log("📊 fred.js API 호출!!");

  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) {
      throw new Error("FRED_API_KEY 환경변수가 설정되지 않았습니다.");
    }

    const seriesId = "GDP"; // 테스트용 (필요 시 수정)
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;

    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ fred.js 에러:", error);
    res.status(500).json({ error: "FRED 데이터를 불러오는 데 실패했습니다." });
  }
}
