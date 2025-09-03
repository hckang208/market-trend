// pages/index.js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";

/* =========================
   유틸
========================= */
const fmtNum = (n, d = 2) => {
  const v = Number(n);
  if (!isFinite(v)) return "-";
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
};
const fmtSignPct = (n, d = 2) => {
  const v = Number(n);
  if (!isFinite(v)) return "0.00%";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(d)}%`;
};
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/* 숫자 안전 추출: value/price/index/rate/last/close/문자열 모두 커버 */
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

/* (지표 키별 별칭) API 마다 키명이 달라도 매핑되게 */
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

/* =========================
   상단 헤더 (추가)
========================= */
function HeaderBar() {
  return (
    <header style={styles.headerWrap}>
      <div style={styles.headerInner}>
        <div style={styles.brand}>
          <img src="/hansoll-logo.svg" alt="Hansoll" style={{ height: 24 }} />
          <span>Market Trend</span>
        </div>
        <nav style={styles.nav}>
          <a href="/" style={styles.navLink}>Dashboard</a>
          <a href="/daily-report" style={styles.navLink}>AI Daily Report</a>
        </nav>
      </div>
    </header>
  );
}

/* =========================
   1) 부자재구매현황 DASHBOARD (수기입력)
========================= */
function ProcurementTopBlock() {
  const LS_KEY = "procure.dashboard.v1";
  const defaultData = {
    currency: "USD",
    period: "월간",
    periodLabel: "",
    revenue: 0,
    materialSpend: 0,
    styles: 0,
    poCount: 0,
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 },
  };

  const [data, setData] = useState(defaultData);
  const [openEdit, setOpenEdit] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setData({ ...defaultData, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const ratio = useMemo(() => {
    const r = Number(data.revenue || 0);
    const m = Number(data.materialSpend || 0);
    if (r <= 0) return 0;
    return clamp((m / r) * 100, 0, 100);
  }, [data]);

  const supply = useMemo(() => {
    const d = Number(data.supplyBreakdown.domestic || 0);
    const t = Number(data.supplyBreakdown.thirdCountry || 0);
    const l = Number(data.supplyBreakdown.local || 0);
    const sum = d + t + l || 1;
    return {
      domestic: clamp((d / sum) * 100),
      thirdCountry: clamp((t / sum) * 100),
      local: clamp((l / sum) * 100),
    };
  }, [data]);

  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    setOpenEdit(false);
  };
  const reset = () => {
    localStorage.removeItem(LS_KEY);
    setData(defaultData);
  };

  const fmtCurrency = (value, currency = "USD") => {
    const num = Number(value || 0);
    try {
      if (currency === "KRW") {
        return new Intl.NumberFormat("ko-KR", {
          style: "currency",
          currency: "KRW",
          maximumFractionDigits: 0,
        }).format(num);
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return (currency === "KRW" ? "₩" : "$") + num.toLocaleString();
    }
  };

  const Card = ({ title, value, sub }) => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      {sub ? <div style={styles.cardSub}>{sub}</div> : null}
    </div>
  );

  return (
    <section style={styles.blockWrap}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.h2}>부자재구매현황 DASHBOARD</h2>
          <div style={styles.meta}>
            기간: <b>{data.periodLabel || "—"}</b> / 방식: <b>{data.period}</b>{" "}
            / 통화: <b>{data.currency}</b>
          </div>
        </div>
        <div style={styles.tools}>
          <button onClick={() => setOpenEdit((v) => !v)} style={styles.btnGray}>
            ✏️ 편집
          </button>
          <a href="/daily-report" style={styles.btnBlue}>
            🤖 AI Daily Report
          </a>
        </div>
      </div>

      <div style={styles.grid5}>
        <Card title="총 매출액" value={fmtCurrency(data.revenue, data.currency)} />
        <Card title="총 부자재매입액" value={fmtCurrency(data.materialSpend, data.currency)} />
        <div style={styles.card}>
          <div style={styles.cardTitle}>매출 대비 부자재 매입비중</div>
          <div style={styles.cardValue}>{fmtSignPct(ratio, 1)}</div>
          <div style={styles.progressWrap}>
            <div style={{ ...styles.progressBar, width: `${ratio}%` }} />
          </div>
        </div>
        <Card title="총 오더수(스타일)" value={fmtNum(data.styles, 0)} />
        <Card title="총 발행 PO수" value={fmtNum(data.poCount, 0)} />
      </div>

      <div style={styles.innerBlock}>
        <div style={styles.blockTitle}>공급현황 (국내 / 3국 / 현지)</div>
        <div style={styles.stackBar}>
          <div
            style={{ ...styles.seg, background: "#111827", width: `${supply.domestic}%` }}
            title={`국내 ${fmtNum(supply.domestic, 1)}%`}
          />
          <div
            style={{ ...styles.seg, background: "#4B5563", width: `${supply.thirdCountry}%` }}
            title={`3국 ${fmtNum(supply.thirdCountry, 1)}%`}
          />
          <div
            style={{ ...styles.seg, background: "#9CA3AF", width: `${supply.local}%` }}
            title={`현지 ${fmtNum(supply.local, 1)}%`}
          />
        </div>
        <div style={styles.legend}>
          <span>국내 {fmtNum(supply.domestic, 1)}%</span>
          <span>3국 {fmtNum(supply.thirdCountry, 1)}%</span>
          <span>현지 {fmtNum(supply.local, 1)}%</span>
        </div>
      </div>

      {openEdit && (
        <div style={styles.editBox}>
          <div style={styles.row}>
            <label>기간 표시</label>
            <input
              value={data.periodLabel || ""}
              onChange={(e) => setData((d) => ({ ...d, periodLabel: e.target.value }))}
              placeholder="예: 2025-09"
            />
          </div>
          <div style={styles.row}>
            <label>방식</label>
            <input
              value={data.period || ""}
              onChange={(e) => setData((d) => ({ ...d, period: e.target.value }))}
              placeholder="월간 / 주간 / 일간 등"
            />
          </div>
          <div style={styles.row}>
            <label>통화</label>
            <select
              value={data.currency}
              onChange={(e) => setData((d) => ({ ...d, currency: e.target.value }))}
            >
              <option value="USD">USD</option>
              <option value="KRW">KRW</option>
            </select>
          </div>

          <div style={styles.grid2}>
            <div style={styles.row}>
              <label>총 매출액</label>
              <input
                type="number"
                value={data.revenue}
                onChange={(e) => setData((d) => ({ ...d, revenue: Number(e.target.value) }))}
              />
            </div>
            <div style={styles.row}>
              <label>총 부자재매입액</label>
              <input
                type="number"
                value={data.materialSpend}
                onChange={(e) => setData((d) => ({ ...d, materialSpend: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.row}>
              <label>총 오더수(스타일)</label>
              <input
                type="number"
                value={data.styles}
                onChange={(e) => setData((d) => ({ ...d, styles: Number(e.target.value) }))}
              />
            </div>
            <div style={styles.row}>
              <label>총 발행 PO수</label>
              <input
                type="number"
                value={data.poCount}
                onChange={(e) => setData((d) => ({ ...d, poCount: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
            <div style={styles.blockTitle}>공급현황(%) — 합계 100 기준</div>
            <div style={styles.grid3}>
              <div style={styles.row}>
                <label>국내(%)</label>
                <input
                  type="number"
                  value={data.supplyBreakdown.domestic}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      supplyBreakdown: { ...d.supplyBreakdown, domestic: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div style={styles.row}>
                <label>3국(%)</label>
                <input
                  type="number"
                  value={data.supplyBreakdown.thirdCountry}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      supplyBreakdown: {
                        ...d.supplyBreakdown,
                        thirdCountry: Number(e.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div style={styles.row}>
                <label>현지(%)</label>
                <input
                  type="number"
                  value={data.supplyBreakdown.local}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      supplyBreakdown: { ...d.supplyBreakdown, local: Number(e.target.value) },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={save} style={styles.btnBlue}>
              저장
            </button>
            <button onClick={() => setOpenEdit(false)} style={styles.btnGray}>
              닫기
            </button>
            <button onClick={reset} style={styles.btnDanger}>
              초기화
            </button>
          </div>
        </div>
      )}

      <div style={styles.ctaRow}>
        <a href="#incidents" style={styles.ctaDark}>부자재 관련사고</a>
        <a href="#materials" style={styles.ctaDark}>부자재 관련 자료</a>
        <a href="/chatbot" style={styles.ctaLight}>AI Chatbot (한솔부자재)</a>
      </div>
    </section>
  );
}

/* =========================
   2) 주요지표 섹션 (클릭 → 원본 데이터)
========================= */
function IndicatorsSection() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/indicators", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error("지표 API 오류");
        setState({ loading: false, data: j, error: "" });
      } catch (e) {
        setState({ loading: false, data: null, error: String(e) });
      }
    })();
  }, []);

  /* 원본 링크 맵 */
  const LINK = {
    wti: "https://fred.stlouisfed.org/series/DCOILWTICO",
    usdkrw: "https://fred.stlouisfed.org/series/DEXKOUS",
    cpi: "https://fred.stlouisfed.org/series/CPIAUCSL",
    fedfunds: "https://fred.stlouisfed.org/series/FEDFUNDS",
    t10y2y: "https://fred.stlouisfed.org/series/T10Y2Y",
    inventory_ratio: "https://fred.stlouisfed.org/series/ISRATIO",
    unemployment: "https://fred.stlouisfed.org/series/UNRATE",
  };

  /* 큐레이티드 핵심 카드 (항상 위에 고정 노출) */
  const curated = [
    { key: "wti", title: "WTI (USD/bbl)" },
    { key: "usdkrw", title: "USD/KRW" },
    { key: "cpi", title: "US CPI (Index)" },
    { key: "fedfunds", title: "미국 기준금리(%)" },
    { key: "t10y2y", title: "금리 스프레드(10Y–2Y, bp)" },
    { key: "inventory_ratio", title: "재고/판매 비율" },
    { key: "unemployment", title: "실업률(%)" },
  ];

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={styles.h3}>주요 지표</h3>
      {state.loading && <div>불러오는 중...</div>}
      {state.error && <div style={styles.err}>에러: {state.error}</div>}

      {!state.loading && !state.error && (
        <>
          {/* 2-1. 큐레이티드 핵심 지표 (클릭 → 원본) */}
          <div style={styles.grid4}>
            {curated.map((c) => {
              const v = getInd(state.data, c.key);
              const href = LINK[c.key];
              return (
                <a
                  key={c.key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...styles.card, ...styles.cardLink }}
                  title="원본 데이터 열기"
                >
                  <div style={styles.cardTitle}>{c.title}</div>
                  <div style={styles.cardValue}>{v != null ? fmtNum(v) : "-"}</div>
                  <div style={{ ...styles.cardSub, color: "#6b7280" }}>원본 보기 ↗</div>
                </a>
              );
            })}
          </div>

          {/* 2-2. 기타 지표 (API 응답 상위 12개, 있으면 노출 / 알려진 키는 링크 제공) */}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...styles.blockTitle, marginBottom: 8 }}>기타 지표</div>
            <div style={styles.grid4}>
              {Object.entries(state.data || {})
                .slice(0, 12)
                .map(([k, obj]) => {
                  // 값/변화율 안전 추출
                  let value = "-";
                  let sub = "";
                  if (obj && typeof obj === "object") {
                    const maybeVal = val(obj);
                    const maybeChg =
                      obj.changePercent ?? obj.change_percentage ?? obj.percent ?? obj.change ?? obj.delta;
                    value = maybeVal != null ? fmtNum(maybeVal) : "-";
                    if (isFinite(Number(maybeChg))) sub = fmtSignPct(Number(maybeChg));
                  } else if (isFinite(Number(obj))) {
                    value = fmtNum(obj);
                  } else if (obj != null) {
                    value = String(obj);
                  }

                  // 알려진 키면 원본 링크
                  const linkKey = Object.keys(IND_ALIASES).find((std) =>
                    (IND_ALIASES[std] || []).includes(k)
                  );
                  const href = linkKey ? LINK[linkKey] : null;

                  const cardInner = (
                    <>
                      <div style={styles.cardTitle}>{k}</div>
                      <div style={styles.cardValue}>{value}</div>
                      {sub ? (
                        <div
                          style={{
                            ...styles.cardSub,
                            color: Number(sub.replace(/[+%]/g, "")) >= 0 ? "#065f46" : "#991b1b",
                            fontWeight: 800,
                          }}
                        >
                          {sub}
                        </div>
                      ) : null}
                    </>
                  );

                  return href ? (
                    <a
                      key={k}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...styles.card, ...styles.cardLink }}
                      title="원본 데이터 열기"
                    >
                      {cardInner}
                    </a>
                  ) : (
                    <div key={k} style={styles.card}>
                      {cardInner}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* =========================
   3) 일일 리테일러 주가 등락률 (/api/stocks)
========================= */
const SYMBOLS = ["WMT", "TGT", "ANF", "VSCO", "KSS", "AMZN", "BABA", "9983.T"];
const NAME_MAP = {
  WMT: "Walmart",
  TGT: "Target",
  ANF: "Abercrombie & Fitch",
  VSCO: "Victoria's Secret",
  KSS: "Kohl's",
  AMZN: "Amazon",
  BABA: "Alibaba",
  "9983.T": "Fast Retailing (Uniqlo)",
};

function StocksSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const out = await Promise.all(
          SYMBOLS.map(async (s) => {
            try {
              const r = await fetch(`/api/stocks?symbol=${encodeURIComponent(s)}`, { cache: "no-store" });
              const j = await r.json();
              const name = j.longName || j.name || NAME_MAP[s] || s;
              const price =
                j.regularMarketPrice ?? j.price ?? j.close ?? j.last ?? j.regular ?? null;
              const pct =
                j.changePercent ?? j.percent ?? j.change_percentage ?? j.deltaPct ?? null;
              return {
                symbol: s,
                name,
                price: isFinite(Number(price)) ? Number(price) : null,
                pct: isFinite(Number(pct)) ? Number(pct) : 0,
              };
            } catch {
              return { symbol: s, name: NAME_MAP[s] || s, price: null, pct: 0, error: true };
            }
          })
        );
        setRows(out);
        setLoading(false);
      } catch (e) {
        setErr(String(e));
        setLoading(false);
      }
    })();
  }, []);

  const sorted = rows.slice().sort((a, b) => b.pct - a.pct);

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={styles.h3}>일일 리테일러 주가 등락률</h3>
      {loading && <div>불러오는 중...</div>}
      {err && <div style={styles.err}>에러: {err}</div>}
      {!loading && !err && (
        <div style={styles.grid4}>
          {sorted.map((r) => {
            const link = `https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`;
            return (
              <a
                key={r.symbol}
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{ ...styles.card, ...styles.cardLink }}
                title="원본 데이터(야후 파이낸스) 열기"
              >
                <div style={styles.cardTitle}>
                  {r.name} <span style={{ color: "#6b7280" }}>({r.symbol})</span>
                </div>
                <div style={styles.cardValue}>
                  {r.price != null ? fmtNum(r.price, 2) : "-"}
                </div>
                <div
                  style={{
                    ...styles.cardSub,
                    fontWeight: 900,
                    color: r.pct >= 0 ? "#065f46" : "#991b1b",
                  }}
                >
                  {fmtSignPct(r.pct)}
                </div>
                <div style={{ ...styles.cardSub, color: "#6b7280", marginTop: 4 }}>원본 보기 ↗</div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* =========================
   4) 뉴스 모음 (/api/news)
========================= */
function NewsSection() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/news?cat=retail,fashion,textile", { cache: "no-store" });
        const j = await r.json();
        const arr = Array.isArray(j) ? j : j.articles || j.items || [];
        setArticles(arr.slice(0, 20));
        setLoading(false);
      } catch (e) {
        setErr(String(e));
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={styles.h3}>주요 Retailer / Fashion 뉴스</h3>
      {loading && <div>불러오는 중...</div>}
      {err && <div style={styles.err}>에러: {err}</div>}
      {!loading && !err && (
        <div style={{ display: "grid", gap: 12 }}>
          {articles.map((a, idx) => {
            const title = a.title || a.headline || "(제목 없음)";
            const url = a.url || a.link || "#";
            const source = a.source?.name || a.source || a.publisher || "";
            const time = a.publishedAt || a.pubDate || a.date || "";
            return (
              <a key={idx} href={url} target="_blank" rel="noreferrer" style={styles.newsItem}>
                <div style={{ fontWeight: 900 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {source ? `${source} · ` : ""}{time}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* =========================
   페이지 컴포넌트 (default export)
========================= */
export default function Home() {
  return (
    <>
      <Head>
        <title>Hansol Purchasing — Market & Materials</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <HeaderBar />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <ProcurementTopBlock />
        <IndicatorsSection />
        <StocksSection />
        <NewsSection />
      </main>

      <footer style={styles.footer}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px", color: "#6b7280", fontSize: 12 }}>
          © Market Trend — internal pilot
        </div>
      </footer>
    </>
  );
}

/* =========================
   인라인 스타일
========================= */
const styles = {
  /* 헤더 */
  headerWrap: {
    position: "sticky", top: 0, zIndex: 50,
    backdropFilter: "blur(6px)",
    background: "rgba(255,255,255,0.75)",
    borderBottom: "1px solid #e5e7eb",
  },
  headerInner: {
    maxWidth: 1200, margin: "0 auto", padding: "10px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 18 },
  nav: { display: "flex", gap: 16, fontSize: 14, color: "#6b7280" },
  navLink: { color: "inherit", textDecoration: "none" },

  /* 컨텐츠 */
  h2: { margin: "6px 0 2px", fontSize: 20, fontWeight: 900 },
  h3: { margin: "12px 0 10px", fontSize: 18, fontWeight: 900 },
  meta: { color: "#6b7280", fontSize: 13 },
  err: { color: "#b91c1c", fontWeight: 700 },

  blockWrap: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, marginTop: 10 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  tools: { display: "flex", gap: 8, alignItems: "center" },

  grid5: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12, marginTop: 12 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 },

  card: { border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 12px" },
  cardLink: { textDecoration: "none", color: "#111" },
  cardTitle: { fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: 900 },
  cardSub: { fontSize: 12, color: "#6b7280" },

  progressWrap: { background: "#f3f4f6", borderRadius: 999, height: 8, marginTop: 8, overflow: "hidden" },
  progressBar: { background: "#111827", height: 8 },

  innerBlock: { border: "1px dashed #e5e7eb", borderRadius: 12, padding: 12, marginTop: 12 },
  blockTitle: { fontWeight: 900, fontSize: 13, marginBottom: 8 },
  stackBar: { display: "flex", width: "100%", height: 12, borderRadius: 999, overflow: "hidden", background: "#f3f4f6" },
  seg: { height: "100%" },
  legend: { display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#374151" },

  editBox: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginTop: 12, background: "#fafafa" },
  row: { display: "grid", gap: 6 },

  ctaRow: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  ctaDark: { background: "#111827", color: "#fff", textDecoration: "none", padding: "8px 12px", borderRadius: 10, fontWeight: 800, fontSize: 13 },
  ctaLight: { border: "1px solid #111827", color: "#111827", textDecoration: "none", padding: "8px 12px", borderRadius: 10, fontWeight: 800, fontSize: 13, background: "#fff" },

  btnGray: { background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "8px 10px", borderRadius: 10, fontWeight: 700, fontSize: 13, color: "#111" },
  btnBlue: { background: "#2563eb", border: "1px solid #1d4ed8", padding: "8px 12px", borderRadius: 10, fontWeight: 800, fontSize: 13, color: "#fff", textDecoration: "none" },
  btnDanger: { background: "#fee2e2", border: "1px solid #fecaca", padding: "8px 10px", borderRadius: 10, fontWeight: 700, fontSize: 13, color: "#991b1b" },

  newsItem: { display: "block", padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, textDecoration: "none", color: "#111" },

  footer: { borderTop: "1px solid #e5e7eb", marginTop: 10, background: "#fff" },
};
