import fs from "fs";
import path from "path";
import { geminiComplete } from "../../lib/gemini";
import { getOverseasNews } from "../../lib/newsClient";

const CACHE_FILE = path.join(process.cwd(), "public/data/news_overseas.json");
const MAX_AGE_HOURS = 24;

function bulletsFromItems(items, max = 8) {
  return (items || [])
    .slice(0, max)
    .map((n) => `• ${n.title || n.source || "뉴스"}${n?.source ? ` (${n.source})` : ""}`)
    .join("\n");
}

async function loadCache() {
  try {
    const raw = await fs.promises.readFile(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

async function saveCache(data) {
  await fs.promises.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.promises.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export default async function handler(req, res) {
  let items = [];
  let useCache = false;

  // 1. 캐시 확인
  const cache = await loadCache();
  if (cache && cache.generatedAt) {
    const ageHrs = (Date.now() - new Date(cache.generatedAt).getTime()) / 36e5;
    if (ageHrs < MAX_AGE_HOURS) {
      items = cache.items || [];
      useCache = true;
    }
  }

  // 2. 캐시 없거나 오래됐으면 새로 fetch
  if (!useCache) {
    try {
      const j = await getOverseasNews({ days: 1, limit: 40 });
      items = (j?.items || []).slice(0, 10).map((n) => ({
        title: n.title,
        link: n.link,
        pubDate: n.publishedAtISO || n.pubDate || null,
        source: n.source || n.sourceHost || ""
      }));
      await saveCache({ generatedAt: new Date().toISOString(), items });
    } catch (e) {
      if (cache) {
        items = cache.items || [];
      }
    }
  }

  // items가 항상 배열 보장
  if (!Array.isArray(items)) items = [];

  // 3. 요약 처리
  if (!process.env.GEMINI_API_KEY) {
    const summary = bulletsFromItems(items) || "• (로컬) 해외 산업 뉴스 없음";
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary,
      scope: "foreign",
      fallback: true
    });
  }

  try {
    const system =
      "당신은 당사 내부 실무진이 참조할 **컨설팅 수준**의 글로벌 뉴스 요약을 작성하는 시니어 전략가입니다. 한국어로 간결하고 실행가능하게 작성하세요. 과장/추정 금지.";

    const user = [
      `아래는 해외(영문) 패션/의류/가먼트/텍스타일 관련 최근 뉴스 ${items.length}건입니다.`,
      "",
      "출력(마크다운):",
      "### 전략 요약 (5개 불릿)",
      "- 수요/가격/재고/고객 변화 중심, 숫자·추세 포함",
      "",
      "### 당사 전략에 미치는 시사점 (3줄)",
      "",
      "### Actions (1~2주) (3개 불릿)",
      "- 구체적 실행",
      "",
      "### Risks & Assumptions (2줄)",
      "- 각 불릿/문장 끝에 관련 기사 번호를 [n] 형식으로 표기. 범위는 [2-3] 허용. 관련 기사 없으면 생략",
      "",
      "뉴스 목록:",
      ...items.map((it, idx) => `[${idx + 1}] ${it.title} (${it.source})`)
    ].join("\n");

    let summary = await geminiComplete({
      system,
      user,
      temperature: 0.3,
      maxOutputTokens: 1200
    });

    if (!summary || summary.trim().length < 5) {
      summary = bulletsFromItems(items) || "• (로컬) 해외 산업 뉴스 없음";
    }

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
      summary,
      scope: "foreign"
    });
  } catch (e) {
    const summary = bulletsFromItems(items) || "• (로컬) 해외 산업 뉴스 요약 실패";
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      count: items.length,
      items: items || [],
      summary,
      scope: "foreign",
      fallback: true,
      error: String(e?.message || e)
    });
  }
}
