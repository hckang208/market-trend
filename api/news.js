import axios from 'axios';

export default async function handler(req, res) {
  try {
    // 뉴스 API 예시 (실제 구현 시 NewsAPI 등 필요)
    const sample = [
      { title: "리테일 산업 뉴스1", source: "연합뉴스", date: "2025-08-20" },
      { title: "패션 트렌드 뉴스2", source: "한국경제", date: "2025-08-19" }
    ];
    res.status(200).json(sample);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}