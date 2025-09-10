// pages/api/news-daily.js
import fs from "fs";
const fsp = fs.promises;

/**
 * 뉴스는 매일 한국시간 22:00에 갱신되도록 설계.
 * - 캐시 파일: /tmp/news_daily_cache.json
 * - 소스: businessoffashion.com, just-style.com
 * - 최대 20개 병합/중복제거 후 최신순 반환
 */

const CACHE_PATH = "/tmp/news_daily_cache.json";
const GUIDE_TEXT = "뉴스는 매일 오후 10시(한국시간)에 갱신됩니다.";

// KST 유틸 (UTC+9)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const nowUTC = () => new Date();
const nowKST = () => new Date(Date.now() + KST_OFFSET_MS);
const fmtKST = (d) =>
  new Date(d).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

// 오늘 KST 기준 22:00(=UTC 13:00) 컷오프(UTC 시각) 계산
function todayCutoffUTC() {
  const kst = nowKST();
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  // 22:00 KST == 13:00 UTC
  return new Date(Date.UTC(y, m, d, 13, 0, 0, 0));
}

// 캐시 읽기/쓰기
async function readCache() {
  try {
    const buf = await fsp.readFile(CACHE_PATH, "utf8");
    return JSON.parse(buf);
  } catch {
    return null;
  }
}
async function writeCache(payload) {
  try {
    await fsp.writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");
  } catch {
    // 서버리스 환경에 따라 쓰기 실패할 수 있음(무시)
  }
}

// 현재 호스트 기준 내부 /api/news 호출 URL 생성
function buildInternalUrl(req, qsObj) {
  const proto =
    req.headers["x-forwarded-proto"] ||
    (process.env.VERCEL || process.env.NETLIFY ? "https" : "http");
  const host = req.headers.host || "localhost:3000";
  const base = `${proto}://${host}`;
  const qs = new URLSearchParams(qsObj).toString();
  return `${base}/api/news?${qs}`;
}

// /api/news를 도메인 단위로 호출 (실패해도 빈 배열 반환)
async function fetchDomain(req, domainsCSV, limit = 40, days = 14) {
  const url = buildInternalUrl(req, {
    language: "en",
    days: String(days),
    limit: String(limit),
    domains: domainsCSV,
  });
  try {
    const r = await fetch(url, { headers: { "x-internal": "1" } });
    if (!r.ok) {
      // 에러 메시지 추출 시도
      let msg = `${r.status}`;
      try {
        const j = await r.json();
        if (j?.error) msg = `${r.status} ${j.error}`;
      } catch {}
      throw new Error(msg);
    }
    const arr = await r.json();
    if (!Array.isArray(arr)) return [];
    return arr.map((n) => ({
      title: n.title,
      url: n.url || n.link || "",
      publishedAt: n.published_at || n.publishedAt || n.pubDate || "",
      source:
        typeof n.source === "string"
          ? n.source
          : n.source?.name || n.source?.id || "",
    }));
  } catch (e) {
    console.warn("[news-daily] fetchDomain error:", domainsCSV, String(e));
    return [];
  }
}

// 중복 제거(우선 url로, 없으면 제목으로)
function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key =
      (it.url && it.url.toLowerCase()) ||
      `t:${(it.title || "").trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// 날짜 내림차순
function sortByDateDesc(items) {
  return items
    .slice()
    .sort(
      (a, b) =>
        new Date(b.publishedAt || 0).getTime() -
        new Date(a.publishedAt || 0).getTime()
    );
}

// 호스트명 보정
function hostFromUrl(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  try {
    // 1) 캐시 읽기
    const cache = await readCache();

    // 2) 캐시 신선도 판단 (오늘 KST 22:00 이후로 갱신됐는지)
    let isFresh = false;
    if (cache?.updatedAtISO) {
      const updatedUTC = new Date(cache.updatedAtISO);
      const cutoffUTC = todayCutoffUTC();
      isFresh = updatedUTC >= cutoffUTC && (cache.items || []).length > 0;
    }

    // 3) 신선하면 캐시 그대로 반환
    if (isFresh) {
      return res.status(200).json({
        ok: true,
        guide: cache.guide || GUIDE_TEXT,
        updatedAt: cache.updatedAtISO,
        updatedAtKST: cache.updatedAtKST || fmtKST(cache.updatedAtISO),
        items: cache.items || [],
        stale: false,
      });
    }

    // 4) 갱신 필요 → BoF/Just-Style 각각 최소 호출로 수집
    const bof = await fetchDomain(
      req,
      "businessoffashion.com,www.businessoffashion.com",
      40,
      14
    );
    const js = await fetchDomain(
      req,
      "just-style.com,www.just-style.com",
      40,
      14
    );

    // 5) 병합/정제/정렬/상한
    let items = dedupe([...bof, ...js]).map((n) => {
      const host = hostFromUrl(n.url);
      return {
        title: n.title,
        url: n.url,
        publishedAt: n.publishedAt,
        source: n.source || host || "",
      };
    });
    items = sortByDateDesc(items).slice(0, 20);

    const now = nowUTC();
    const payload = {
      ok: true,
      guide: GUIDE_TEXT,
      updatedAtISO: now.toISOString(),
      updatedAtKST: fmtKST(now),
      items,
    };

    // 6) 캐시 저장 (성공/부분성공 모두 저장)
    if (items.length > 0) {
      await writeCache(payload);
    }

    // 7) 응답 (아이템이 하나도 없으면 캐시 폴백 시도)
    if (items.length === 0 && cache?.items?.length > 0) {
      return res.status(200).json({
        ok: true,
        guide: cache.guide || GUIDE_TEXT,
        updatedAt: cache.updatedAtISO,
        updatedAtKST: cache.updatedAtKST || fmtKST(cache.updatedAtISO),
        items: cache.items,
        stale: true,
        note: "신규 수집 실패로 캐시를 반환했습니다.",
      });
    }

    return res.status(200).json({
      ok: true,
      guide: GUIDE_TEXT,
      updatedAt: payload.updatedAtISO,
      updatedAtKST: payload.updatedAtKST,
      items,
      stale: false,
    });
  } catch (e) {
    // 최후: 캐시라도 내려주기
    const cache = await readCache();
    if (cache?.items?.length) {
      return res.status(200).json({
        ok: true,
        guide: cache.guide || GUIDE_TEXT,
        updatedAt: cache.updatedAtISO,
        updatedAtKST: cache.updatedAtKST || fmtKST(cache.updatedAtISO),
        items: cache.items,
        stale: true,
        note: "오류로 캐시를 반환했습니다.",
        error: String(e),
      });
    }
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

// CDN 캐시 힌트(선택)
export const config = {
  api: {
    bodyParser: true,
  },
};
