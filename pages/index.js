// pages/index.js
import { useEffect, useState } from "react";
import Head from "next/head";
import KpiCard from "../components/KpiCard";

/* ========= 공용 헬퍼 ========= */
// 어떤 형태(value/price/index/rate/last/close/문자열)로 와도 숫자만 뽑기
const val = (x) => {
  if (x == null) return null;
  if (typeof x === "number") return isFinite(x) ? x : null;
  if (typeof x === "string") {
    const n = Number(x.replace(/[, ]/g, ""));
    return isFinite(n) ? n : null;
  }
  if (typeof x === "object") {
    const cand =
      x.value ?? x.price ?? x.index ?? x.rate ?? x.last ?? x.close ?? x.avg ?? x.level;
    if (cand != null) return val(cand);
  }
  return null;
};

// 지표 키 별칭(환경마다 키명이 다른 경우 대비)
const IND_ALIASES = {
  wti: ["wti", "WTI", "oil", "dcoilwtico", "brent"],
  usdkrw: ["usdkrw", "USDKRW", "usd_krw", "krw", "DEXKOUS"],
  cpi: ["cpi", "CPI", "cpiaucsl", "CPIAUCSL"],
  fedfunds: ["fedfunds", "FEDFUNDS", "policy_rate", "ffr"],
  t10y2y: ["t10y2y", "T10Y2Y", "spread_10y_2y", "yield_spread"],
  inventory_ratio: ["inventory_ratio", "ISRATIO", "isratio", "inventories_to_sales"],
  unemployment: ["unemployment", "UNRATE", "unrate", "jobless_rate"],
};
const getInd = (obj, key) => {
  if (!obj) return null;
  for (const k of IND_ALIASES[key] || [key]) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = val(obj[k]);
      if (v != null) return v;
    }
  }
  return null;
};

const pctChange = (price, prev) => {
  if (price == null || prev == null || prev === 0) return null;
  return ((price - prev) / prev) * 100;
};

/* ========= KPI 카드 전체 클릭 래퍼 ========= */
function Kpi({ href, ...props }) {
  const handle = (e) => {
    // 내부에 a 태그가 있으면 중복 오픈 막기
    if (e.target.closest("a")) return;
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };
  return (
    <div
      onClick={handle}
      role="button"
      title="원본 데이터 열기"
      className="cursor-pointer"
    >
      <KpiCard {...props} href={href} />
    </div>
  );
}

export default function Home() {
  const [ind, setInd] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // AI 요약
  const [insight, setInsight] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  // 뉴스
  const [deck, setDeck] = useState([]);
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsInsight, setNewsInsight] = useState("");
  const [newsAiBusy, setNewsAiBusy] = useState(false);

  const symbols = ["WMT", "TGT", "KSS", "VSCO", "ANF", "CRI", "9983.T", "AMZN", "BABA"];
  const NAME_MAP = {
    WMT: "Walmart Inc.",
    TGT: "Target Corporation",
    KSS: "Kohl's Corporation",
    VSCO: "Victoria's Secret & Co.",
    ANF: "Abercrombie & Fitch Co.",
    CRI: "Carter's, Inc.",
    "9983.T": "Fast Retailing Co., Ltd.",
    AMZN: "Amazon.com, Inc.",
    BABA: "Alibaba Group Holding Limited",
  };

  useEffect(() => {
    (async () => {
      try {
        const indRes = await fetch("/api/indicators?ts=" + Date.now(), { cache: "no-store" });
        if (indRes.ok) setInd(await indRes.json());

        const now = Date.now();
        const rows = await Promise.all(
          symbols.map(async (s, i) => {
            const resp = await fetch(`/api/stocks?symbol=${encodeURIComponent(s)}&ts=${now}_${i}`, { cache: "no-store" });
            const stock = resp.ok ? await resp.json() : null;
            return { symbol: s, stock, news: [] };
          })
        );
        setList(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function generateInsights() {
    try {
      setAiBusy(true);
      const body = JSON.stringify({ indicators: ind, retailers: list });
      const r = await fetch("/api/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!r.ok) return setInsight(`AI 분석 실패: ${await r.text()}`);
      const j = await r.json();
      setInsight(j.summary || "");
    } catch (e) {
      setInsight(`AI 분석 실패: ${e.message}`);
    } finally {
      setAiBusy(false);
    }
  }

  async function loadNewsDeck() {
    if (newsBusy) return;
    try {
      setNewsBusy(true);
      setNewsInsight("");
      const seen = new Set();
      const merged = [];
      for (const r of list) {
        const q = r?.stock?.longName || r.symbol;
        try {
          const res = await fetch(`/api/news?q=${encodeURIComponent(q)}&ts=${Date.now()}`, { cache: "no-store" });
          if (!res.ok) continue;
          const arr = await res.json();
          for (const n of (arr || []).slice(0, 3)) {
            const key = n?.url || n?.title;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push({
              symbol: r.symbol,
              name: NAME_MAP[r.symbol] || r?.stock?.longName || r.symbol,
              title: n?.title || n?.url || "(제목 없음)",
              url: n?.url || "#",
              source: n?.source || (n?.provider && (n.provider[0]?.name || n.provider?.name)) || "",
              published: n?.datePublished || n?.date || "",
            });
          }
          await new Promise((res) => setTimeout(res, 300)); // 429 완화
        } catch {}
      }
      merged.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
      setDeck(merged);
    } finally {
      setNewsBusy(false);
    }
  }

  async function loadCategoryNews(cats = "retail,fashion,textile") {
    if (newsBusy) return;
    try {
      setNewsBusy(true);
      setNewsInsight("");
      const r = await fetch(`/api/news?cat=${encodeURIComponent(cats)}&limit=30&ts=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      setDeck(await r.json());
    } catch {
      setDeck([]);
    } finally {
      setNewsBusy(false);
    }
  }

  async function generateNewsInsights() {
    if (!deck.length) {
      setNewsInsight("먼저 뉴스 목록을 로드하세요. (뉴스 모아보기 또는 카테고리 뉴스)");
      return;
    }
    try {
      setNewsAiBusy(true);
      const retailersForSummary = list.map((r) => {
        const news = deck.filter((d) => (d.symbol ? d.symbol === r.symbol : false)).map((d) => ({ title: d.title, url: d.url }));
        return { ...r, news };
      });
      const body = JSON.stringify({ indicators: ind, retailers: retailersForSummary, headlines: deck });
      const r = await fetch("/api/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!r.ok) return setNewsInsight(`AI 뉴스 요약 실패: ${await r.text()}`);
      const j = await r.json();
      setNewsInsight(j.summary || "");
    } catch (e) {
      setNewsInsight(`AI 뉴스 요약 실패: ${e.message}`);
    } finally {
      setNewsAiBusy(false);
    }
  }

  return (
    <div>
      <Head>
        <title>Hansol Purchasing — Market & Materials</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* ======= 헤더 ======= */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-line">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/hansoll-logo.svg" alt="Hansoll" className="h-7 w-auto" />
            <div className="font-black text-xl">Market Trend</div>
          </div>
          <nav className="text-sm text-slate-600 flex gap-4">
            <a href="#" className="hover:text-ink">Dashboard</a>
            <a href="/daily-report" className="hover:text-ink">AI Daily Report</a>
          </nav>
        </div>
      </header>

      <main className="container">
        <h1 className="text-2xl font-black mb-4">구매시황 Dashboard</h1>
        <p className="muted mb-6">미국 리테일러 OEM 관점의 핵심지표와 리테일러 주가 동향을 한눈에.</p>

        {/* ======= 1. 주요 지표 (카드 클릭 → 원본 데이터 새 탭) ======= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Kpi
            title="WTI (USD/bbl)"
            unit=""
            data={getInd(ind, "wti")}
            decimals={2}
            hint="원가측면(에너지) 압력"
            href="https://fred.stlouisfed.org/series/DCOILWTICO"
          />
          <Kpi
            title="USD/KRW"
            unit=""
            data={getInd(ind, "usdkrw")}
            decimals={2}
            hint="환리스크(결제/정산) 민감"
            href="https://fred.stlouisfed.org/series/DEXKOUS"
          />
          <Kpi
            title="US CPI (Index)"
            unit=""
            data={getInd(ind, "cpi")}
            decimals={2}
            hint="소비자 물가 레벨"
            href="https://fred.stlouisfed.org/series/CPIAUCSL"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          <Kpi
            title="미국 기준금리 (Fed Funds, %)"
            unit="%"
            data={getInd(ind, "fedfunds")}
            decimals={2}
            hint="금융여건(자금조달·재고) 압력"
            href="https://fred.stlouisfed.org/series/FEDFUNDS"
          />
          <Kpi
            title="금리 스프레드 (10Y–2Y, bp)"
            unit="bp"
            data={getInd(ind, "t10y2y")}
            decimals={0}
            hint="경기 사이클 선행 시그널"
            href="https://fred.stlouisfed.org/series/T10Y2Y"
          />
          <Kpi
            title="재고/판매 비율 (ISRATIO)"
            unit=""
            data={getInd(ind, "inventory_ratio")}
            decimals={2}
            hint="리테일러 재고부담"
            href="https://fred.stlouisfed.org/series/ISRATIO"
          />
          <Kpi
            title="실업률 (UNRATE, %)"
            unit="%"
            data={getInd(ind, "unemployment")}
            decimals={2}
            hint="수요 체력(고용시장)"
            href="https://fred.stlouisfed.org/series/UNRATE"
          />
        </div>

        {/* ======= 2. 일일 등락률 (카드 전체 클릭 → Yahoo Finance) ======= */}
        <RetailerCards list={list} NAME_MAP={NAME_MAP} />

        {/* ======= AI 인사이트 ======= */}
        <div className="card p-5 mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">AI 인사이트 (임원 보고용 요약)</h2>
            <button
              onClick={generateInsights}
              disabled={aiBusy}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {aiBusy ? "분석 중…" : "최신 인사이트 생성"}
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1">현재 표시된 지표·주가·헤드라인을 바탕으로 요약합니다.</p>
          <div className="mt-3 whitespace-pre-wrap">
            {insight || "버튼을 눌러 AI 분석을 생성하세요."}
          </div>
        </div>

        {/* ======= 3. 뉴스 모음 + 뉴스 AI 요약 ======= */}
        <NewsPanel
          list={list}
          deck={deck}
          newsBusy={newsBusy}
          newsAiBusy={newsAiBusy}
          loadNewsDeck={loadNewsDeck}
          loadCategoryNews={loadCategoryNews}
          generateNewsInsights={generateNewsInsights}
          setDeck={setDeck}
          newsInsight={newsInsight}
        />

        {loading && <div className="mt-8 text-slate-500">데이터 불러오는 중…</div>}
      </main>

      <footer className="mt-10 border-t border-line">
        <div className="container text-center text-sm text-slate-500 py-6">
          © Market Trend — internal pilot
        </div>
      </footer>
    </div>
  );
}

/* ======= 리테일러 카드/뉴스 패널 ======= */

function RetailerCards({ list, NAME_MAP }) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">2. 일일 주요 Retailer 주가 등락률</h2>
        <div className="text-sm text-slate-500">카드를 클릭하면 Yahoo Finance로 이동</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
        {list.map((r) => {
          const price =
            r.stock?.price ??
            r.stock?.regularMarketPrice ??
            r.stock?.close ?? null;
          const prev = r.stock?.previousClose ?? null;

          const pct =
            r.stock?.changePercent != null
              ? Number(r.stock.changePercent)
              : r.stock?.change != null && price != null && price - Number(r.stock.change) !== 0
              ? (Number(r.stock.change) / (price - Number(r.stock.change))) * 100
              : pctChange(price, prev);

          const color = pct == null ? "text-slate-500" : pct >= 0 ? "text-emerald-600" : "text-red-600";
          const sign = pct == null ? "" : pct >= 0 ? "▲ " : "▼ ";
          const pctText = pct == null ? "-" : `${sign}${Math.abs(pct).toFixed(2)}%`;
          const link = `https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`;

          const displayName =
            NAME_MAP[r.symbol] ||
            (r.stock?.symbol === r.symbol ? r.stock?.longName : null) ||
            r.stock?.longName ||
            r.symbol;

          return (
            <a
              key={`pct-${r.symbol}`}
              href={link}
              target="_blank"
              rel="noreferrer"
              title="원본 데이터(야후 파이낸스) 열기"
              className="block card p-4 hover:shadow-lg transition border border-line rounded-xl"
            >
              <div className="text-xs text-slate-500">{r.symbol}</div>
              <div className="text-sm font-semibold truncate">{displayName}</div>
              <div className="mt-2 text-lg font-extrabold">{price ?? "-"}</div>
              <div className={`text-sm ${color}`}>{pctText}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function NewsPanel({
  list,
  deck,
  newsBusy,
  newsAiBusy,
  loadNewsDeck,
  loadCategoryNews,
  generateNewsInsights,
  setDeck,
  newsInsight,
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">주요 Retailer 관련 뉴스 모음</h2>
        <div className="flex gap-2">
          <button onClick={loadNewsDeck} disabled={newsBusy} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">
            {newsBusy ? "뉴스 수집 중…" : "뉴스 모아보기(종목별)"}
          </button>
          <button onClick={() => loadCategoryNews()} disabled={newsBusy} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50">
            {newsBusy ? "뉴스 수집 중…" : "카테고리 뉴스(리테일/패션/텍스타일)"}
          </button>
          <button onClick={generateNewsInsights} disabled={newsAiBusy} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
            {newsAiBusy ? "요약 중…" : "뉴스 AI 요약"}
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500 mt-1">종목별 상위 뉴스 또는 카테고리 뉴스를 최신순으로 정리합니다. (중복 제거)</p>

      <div className="mt-3 space-y-3">
        {deck.length === 0 && !newsBusy && (
          <div className="text-slate-500 text-sm">아직 뉴스가 없습니다. 버튼을 눌러 로드하세요.</div>
        )}
        {deck.map((n, idx) => (
          <a
            key={idx}
            href={n.url}
            target="_blank"
            rel="noreferrer"
            className="block card p-4 hover:shadow-lg transition border border-line rounded-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs px-2 py-0.5 rounded-full border bg-white">
                {n.symbol || "NEWS"}
              </div>
              <div className="text-xs text-slate-500">
                {n.source || ""}
                {n.published ? ` · ${new Date(n.published).toLocaleString()}` : ""}
              </div>
            </div>
            <div className="mt-1 font-semibold">{n.title}</div>
            {n.name && <div className="text-xs text-slate-500 mt-0.5 truncate">{n.name}</div>}
          </a>
        ))}
      </div>

      {newsInsight && (
        <div className="card p-5 mt-4">
          <h3 className="text-lg font-bold">뉴스 기반 AI 요약</h3>
          <div className="mt-2 whitespace-pre-wrap">{newsInsight}</div>
        </div>
      )}
    </div>
  );
}
