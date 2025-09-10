// pages/api/news-daily.js
// 하루 1회(한국시간 22:00 기준)만 외부 API를 호출해 캐시하고,
// 호출 결과 20개를 고정으로 반환합니다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 환경변수 키(둘 중 아무거나 사용 가능)
const NEWS_API_KEY = process.env.NEWSAPI || process.env.NEWS_API_KEY;

// 도메인 목록: BoF + Just-Style
const DOMAINS = (
  process.env.NEWS_DAILY_DOMAINS ||
  "businessoffashion.com,www.businessoffashion.com,just-style.com,www.just-style.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// 하루 제공 개수
const LIMIT = Number(process.env.NEWS_DAILY_LIMIT || 20);

// 전역 캐시 (Lambda 재사용 시 유지됨)
globalThis.__NEWS_DAILY_CACHE__ =
  globalThis.__NEWS_DAILY_CACHE__ || {
    anchorUtcMs: 0,     // 마지막으로 반영된 "KST 22:00 경계"의 UTC ms
    updatedAtKst: "",   // 한국시간 문자열
    items: [],          // 캐시된 뉴스 배열
    lastError: null,
  };

// ──────────────────────────────────────────────
// KST 22:00 기준 경계(anchor) 계산
// 지금 KST 기준으로 "가장 최근의 22:00" 타임스탬프(UTC ms)를 반환
function getLatestKst2200AnchorUtcMs(nowUtcMs = Date.now()) {
  const nowKstMs = nowUtcMs + KST_OFFSET_MS;
  const dayStartKstMs = Math.floor(nowKstMs / DAY_MS) * DAY_MS; // 00:00 KST
  let anchorKstMs = dayStartKstMs + 22 * 60 * 60 * 1000; // 22:00 KST
  if (nowKstMs < anchorKstMs) {
    // 아직 오늘 22:00 전이면, 어제 22:00가 마지막 경계
    anchorKstMs -= DAY_MS;
  }
  // KST → UTC로 환산
  return anchorKstMs - KST_OFFSET_MS;
}

function toKstString(utcMs) {
  return new Date(utcMs + KST_OFFSET_MS).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

// NewsAPI 호출 (도메인 필터, 최신순)
async function fetchFromNewsAPI() {
  if (!NEWS_API_KEY) {
    throw new Error(
      "뉴스 API Key가 없습니다. 환경변수 NEWSAPI 또는 NEWS_API_KEY를 설정하세요."
    );
  }

  // 여유 있게 더 받아 중복/정제 후 LIMIT에 맞춰 자름
  const pageSize = Math.min(100, Math.max(LIMIT * 2, LIMIT));

  const url =
    "https://newsapi.org/v2/everything?" +
    new URLSearchParams({
      language: "en",
      sortBy: "publishedAt",
      pageSize: String(pageSize),
      // 최근 30일만(안전장치)
      from: new Date(Date.now() - 30 * DAY_MS).toISOString(),
      domains: DOMAINS.join(","),
      apiKey: NEWS_API_KEY,
    }).toString();

  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));

  if (!r.ok || j.status !== "ok") {
    throw new Error(
      `NewsAPI error: ${j?.code || r.status} ${j?.message || ""}`.trim()
    );
  }

  const seen = new Set();
  const items = [];

  for (const a of j.articles || []) {
    const u = a.url || "";
    if (!u || seen.has(u)) continue;
    seen.add(u);

    let host = "";
    try {
      host = new URL(u).hostname.replace(/^www\./, "");
    } catch {}

    items.push({
      title: a.title || "",
      url: u,
      source: a.source?.name || host || "",
      publishedAt: a.publishedAt || a.published_at || "",
    });

    if (items.length >= LIMIT) break;
  }

  return items;
}

// ──────────────────────────────────────────────

export default async function handler(req, res) {
  try {
    // CORS / 메서드 가드 최소화 (필요시 확장)
    if (req.method && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const now = Date.now();
    const anchorUtcMs = getLatestKst2200AnchorUtcMs(now);
    const cache = globalThis.__NEWS_DAILY_CACHE__;

    // 강제 갱신 (옵션): ?force=1&secret=XXXX
    const allowForce =
      process.env.NEWS_DAILY_SECRET &&
      req.query?.secret === process.env.NEWS_DAILY_SECRET &&
      req.query?.force === "1";

    // 앵커가 바뀌었거나(하루 경계 넘어감) 강제 갱신이면 새로 가져옴
    if (allowForce || cache.anchorUtcMs !== anchorUtcMs) {
      const items = await fetchFromNewsAPI();

      cache.anchorUtcMs = anchorUtcMs;
      cache.updatedAtKst = toKstString(anchorUtcMs);
      cache.items = items;
      cache.lastError = null;
    }

    const nextRefreshUtc = anchorUtcMs + DAY_MS; // 다음 22:00(KST) 경계의 UTC
    const guide =
      "뉴스는 한국시간 매일 오후 10시(22:00) 기준으로 업데이트됩니다.";

    // 캐시 헤더(선택): 브라우저 캐시 짧게, CDN은 5분
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

    res.status(200).json({
      ok: true,
      guide,
      sourceDomains: DOMAINS,
      updatedAtKST: cache.updatedAtKst,
      nextRefreshKST: toKstString(nextRefreshUtc),
      limit: LIMIT,
      items: cache.items,
    });
  } catch (e) {
    // 캐시가 있으면 캐시라도 반환 (페일오버)
    const cache = globalThis.__NEWS_DAILY_CACHE__;
    if (cache.items?.length) {
      res.status(200).json({
        ok: true,
        guide:
          "뉴스는 한국시간 매일 오후 10시(22:00) 기준으로 업데이트됩니다.",
        sourceDomains: DOMAINS,
        updatedAtKST: cache.updatedAtKst,
        limit: LIMIT,
        items: cache.items,
        warning: String(e),
      });
      return;
    }
    res.status(500).json({ ok: false, error: String(e) });
  }
}
