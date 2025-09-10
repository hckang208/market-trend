// /netlify/functions/fetch-news-daily.js
import fetch from "node-fetch";
import { set } from "@netlify/blobs";

/**
 * Netlify Scheduled Function
 * - 매일 실행되어 뉴스API에서 해외 뉴스 20개를 가져와 캐싱
 * - 저장 위치: Netlify Blobs ("news-cache/daily.json")
 */
export default async (req, context) => {
  try {
    const API_KEY = process.env.NEWSAPI || process.env.NEWS_API_KEY;
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Missing NEWSAPI key" }), {
        status: 500,
      });
    }

    // NewsAPI 요청 URL
    const url =
      "https://newsapi.org/v2/everything?" +
      new URLSearchParams({
        q: "fashion OR apparel OR garment OR textile",
        language: "en",
        sortBy: "publishedAt",
        pageSize: "20", // 하루 최대 20개 기사
        domains:
          "businessoffashion.com,just-style.com,www.businessoffashion.com,www.just-style.com",
      });

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const j = await r.json();

    if (!r.ok || j.status !== "ok") {
      throw new Error("NewsAPI error: " + JSON.stringify(j));
    }

    // 필요한 필드만 추출
    const items = (j.articles || []).map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source?.name || "",
      publishedAt: a.publishedAt,
    }));

    // Netlify Blobs에 저장 (키: news-cache/daily.json)
    await set("news-cache", "daily.json", JSON.stringify(items), {
      contentType: "application/json",
    });

    return new Response(
      JSON.stringify({ ok: true, count: items.length }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
    });
  }
};

// 스케줄 설정 (예: 한국시간 22시 → UTC 13시)
export const config = {
  schedule: "@daily", // 매일 UTC 00시 실행
  // 필요하다면 "0 13 * * *" (UTC 13시 → 한국시간 22시) 같은 cron 표현식 가능
};
