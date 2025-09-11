// pages/index.js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";

const FOREIGN_DOMAINS =
  process.env.NEXT_PUBLIC_FOREIGN_NEWS_DOMAINS ||
  "businessoffashion.com,just-style.com";

/* =========================
   숫자/시계열 유틸
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

/* =========================
   공통: AI 분석 박스
========================= */
function redactForbidden(s) {
  try {
    return String(s ?? "");
  } catch {
    return "";
  }
}
function AIBox({ block, payload }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ts, setTs] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!payload) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block,
            language: "ko",
            mode: "brief",
            data: payload,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "AI 요약 실패");
        let s = j.summary || "";
        s = s
          .replace(/^(?:##\s*)?(?:한솔섬유)?\s*(?:임원보고)?\s*$/gim, "")
          .replace(/(전략기획부|임원)[^\n]*\n?/g, "");
        setText(s);
        setTs(new Date().toISOString());
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [block, JSON.stringify(payload || {})]);

  return (
    <div className="ai-box">
      <div className="ai-header">
        <div className="ai-badge">
          <span className="pulse small" />
          AI Analysis • GEMINI 2.5
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost">
          {open ? "접기" : "AI 요약"}
        </button>
      </div>

      {open && (
        <>
          <div className="ai-meta" suppressHydrationWarning>
            {ts
              ? `GEMINI 2.5 · ${new Date(ts).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}`
              : "GEMINI 2.5"}
          </div>
          {loading && <div className="muted">분석 중…</div>}
          {err && <div className="text-danger">오류: {err}</div>}
          {!loading && !err && (
            <div className="ai-content">
              {redactForbidden(text) || "분석 결과가 없습니다."}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* =========================
   헤더
========================= */
function HeaderBar() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <div className="logo-mark">H</div>
          <div>
            <div className="logo-text">Hansoll Market Intelligence</div>
            <div className="logo-subtitle">Executive Dashboard</div>
          </div>
        </div>
        <div className="live-status">
          <span className="pulse" />
          <span className="live-label">Live Data</span>
        </div>
      </div>
    </header>
  );
}

/* =========================
   1) 부자재구매현황 (수기입력)
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
    costSave: 0,
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 },
  };

  const [data, setData] = useState(defaultData);
  const [openEdit, setOpenEdit] = useState(false);

  // Load from Google Sheet via API (fallback to localStorage if fails)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/procure-sheet", { cache: "no-store" });
        const j = await r.json();
        if (j?.ok && j.data) {
          setData((prev) => ({ ...prev, ...j.data }));
          return;
        }
      } catch {}
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setData((prev) => ({ ...prev, ...JSON.parse(raw) }));
      } catch {}
    })();
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

  const Card = ({ title, value, sub, children }) => (
    <div className="card metric-card">
      <div className="metric-label">{title}</div>
      <div className="metric-value">{value}</div>
      {sub ? <div className="muted">{sub}</div> : null}
      {children}
    </div>
  );

  // 팔레트
  const SUPPLY_COLORS = {
    domestic: "linear-gradient(90deg,#6366f1,#8b5cf6)",
    third: "linear-gradient(90deg,#10b981,#34d399)",
    local: "linear-gradient(90deg,#f59e0b,#f97316)",
  };

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">부자재구매현황 DASHBOARD</h2>
          <p className="section-subtitle">
            기간: <b>{data.periodLabel || "—"}</b> / 방식: <b>{data.period}</b>{" "}
            / 통화: <b>{data.currency}</b>
          </p>
        </div>
        <button onClick={() => setOpenEdit((o) => !o)} className="btn btn-secondary">
          {openEdit ? "입력 닫기" : "수기 입력"}
        </button>
      </div>

      <div className="card card-premium">
        <div className="grid grid-5">
          <Card title="총 매출액" value={fmtCurrency(data.revenue, data.currency)} />
          <Card
            title="총 부자재매입액"
            value={fmtCurrency(data.materialSpend, data.currency)}
          />
          <Card title="매출 대비 부자재 매입비중" value={fmtSignPct(ratio, 1)}>
            <div className="progress">
              <div
                className="progress-fill"
                style={{ width: `${ratio}%` }}
                aria-label="부자재 매입 비중"
              />
            </div>
          </Card>
          <Card
            title="총 Cost Save"
            value={fmtCurrency(data.costSave || 0, data.currency)}
          />
          <Card title="총 발행 PO수" value={fmtNum(data.poCount, 0)} />
        </div>

        <div className="subsection">
          <h3 className="subsection-title">공급현황 분석</h3>
          <div className="stack-bar" role="img" aria-label="공급현황(국내/3국/현지)">
            <div
              className="stack-segment seg-domestic"
              title={`국내 ${fmtNum(supply.domestic, 1)}%`}
              style={{ width: `${supply.domestic}%`, background: SUPPLY_COLORS.domestic }}
            />
            <div
              className="stack-segment seg-third"
              title={`3국 ${fmtNum(supply.thirdCountry, 1)}%`}
              style={{ width: `${supply.thirdCountry}%`, background: SUPPLY_COLORS.third }}
            />
            <div
              className="stack-segment seg-local"
              title={`현지 ${fmtNum(supply.local, 1)}%`}
              style={{ width: `${supply.local}%`, background: SUPPLY_COLORS.local }}
            />
          </div>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot dot-domestic" style={{ background: SUPPLY_COLORS.domestic }} />
              <span>국내 {fmtNum(supply.domestic, 1)}%</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-third" style={{ background: SUPPLY_COLORS.third }} />
              <span>3국 {fmtNum(supply.thirdCountry, 1)}%</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-local" style={{ background: SUPPLY_COLORS.local }} />
              <span>현지 {fmtNum(supply.local, 1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <AIBox block="procurement" payload={{ ...data, ratio, supply }} />

      {openEdit && (
        <div className="edit-box">
          <div className="form-row">
            <label className="form-label">기간 표시</label>
            <input
              className="form-input"
              value={data.periodLabel || ""}
              onChange={(e) =>
                setData((d) => ({ ...d, periodLabel: e.target.value }))
              }
              placeholder="예: 2025-09"
            />
          </div>
          <div className="form-row">
            <label className="form-label">방식</label>
            <input
              className="form-input"
              value={data.period || ""}
              onChange={(e) => setData((d) => ({ ...d, period: e.target.value }))}
              placeholder="월간 / 주간 / 일간 등"
            />
          </div>
          <div className="form-row">
            <label className="form-label">통화</label>
            <select
              className="form-input"
              value={data.currency}
              onChange={(e) => setData((d) => ({ ...d, currency: e.target.value }))}
            >
              <option value="USD">USD</option>
              <option value="KRW">KRW</option>
            </select>
          </div>

          <div className="grid grid-2">
            <div className="form-row">
              <label className="form-label">총 매출액</label>
              <input
                className="form-input"
                type="number"
                value={data.revenue}
                onChange={(e) =>
                  setData((d) => ({ ...d, revenue: Number(e.target.value) }))
                }
              />
            </div>
            <div className="form-row">
              <label className="form-label">총 부자재매입액</label>
              <input
                className="form-input"
                type="number"
                value={data.materialSpend}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    materialSpend: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="form-row">
              <label className="form-label">총 Cost Save</label>
              <input
                className="form-input"
                type="number"
                value={data.costSave}
                onChange={(e) =>
                  setData((d) => ({ ...d, costSave: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="subedit">
            <div className="subsection-title">공급현황(%) — 합계 100 기준</div>
            <div className="grid grid-3">
              <div className="form-row">
                <label className="form-label">국내(%)</label>
                <input
                  className="form-input"
                  type="number"
                  value={data.supplyBreakdown.domestic}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      supplyBreakdown: {
                        ...d.supplyBreakdown,
                        domestic: Number(e.target.value),
                      },
                    }))
                  }
                />
              </div>
              <div className="form-row">
                <label className="form-label">3국(%)</label>
                <input
                  className="form-input"
                  type="number"
                  value={data.supplyBreakdown.thirdCountry}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d.supplyBreakdown,
                      thirdCountry: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="form-row">
                <label className="form-label">현지(%)</label>
                <input
                  className="form-input"
                  type="number"
                  value={data.supplyBreakdown.local}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d.supplyBreakdown,
                      local: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button onClick={save} className="btn btn-primary">
              저장
            </button>
            <button onClick={() => setOpenEdit(false)} className="btn btn-secondary">
              닫기
            </button>
            <button onClick={reset} className="btn btn-danger">
              초기화
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================
   2) 주요지표
========================= */
function Sparkline({ series = [], width = 110, height = 32 }) {
  if (!series || series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = width / (series.length - 1);
  const pts = series
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const up = series[series.length - 1] >= series[0];

  return (
    <svg
      width={width}
      height={height}
      className={`sparkline ${up ? "up" : "down"}`}
      aria-hidden="true"
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts} />
    </svg>
  );
}

function IndicatorsSection() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/indicators", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "지표 API 오류");
        setState({ loading: false, data: j, error: "" });
        setLastUpdated(
          j.lastUpdated || j.updatedAt || j.ts || new Date().toISOString()
        );
      } catch (e) {
        setState({ loading: false, data: null, error: String(e) });
      }
    })();
  }, []);

  const LINK = {
    wti: "https://fred.stlouisfed.org/series/DCOILWTICO",
    usdkrw: "https://fred.stlouisfed.org/series/DEXKOUS",
    cpi: "https://fred.stlouisfed.org/series/CPIAUCSL",
    fedfunds: "https://fred.stlouisfed.org/series/DFEDTARU",
    t10y2y: "https://fred.stlouisfed.org/series/T10Y2Y",
    inventory_ratio: "https://fred.stlouisfed.org/series/ISRATIO",
    unemployment: "https://fred.stlouisfed.org/series/UNRATE",
    ism_retail:
      "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/retail-trade/",
  };
  const curated = [
    { key: "wti", title: "WTI (USD/bbl)" },
    { key: "usdkrw", title: "USD/KRW" },
    { key: "cpi", title: "US CPI (Index)" },
    { key: "fedfunds", title: "미국 기준금리(%)" },
    { key: "t10y2y", title: "금리 스프레드(10Y–2Y, bp)" },
    { key: "inventory_ratio", title: "재고/판매 비율" },
    { key: "ism_retail", title: "ISM Retail(%)" },
    { key: "unemployment", title: "실업률(%)" },
  ];

  const payloadForAI = useMemo(() => {
    const d = state.data || {};
    const out = {};
    curated.forEach((c) => {
      out[c.key] = {
        value: d?.[c.key]?.value ?? null,
        changePercent: d?.[c.key]?.changePercent ?? null,
        yoyPercent: d?.[c.key]?.yoyPercent ?? null,
        lastDate: d?.[c.key]?.lastDate ?? null,
      };
    });
    return { indicators: out, lastUpdated };
  }, [state.data, lastUpdated]);

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">주요 지표</h2>
          {lastUpdated && (
            <p className="section-subtitle">
              전체 업데이트: {new Date(lastUpdated).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      </div>

      {state.loading && <div>불러오는 중...</div>}
      {state.error && <div className="text-danger">에러: {state.error}</div>}

      {!state.loading && !state.error && (
        <>
          <div className="grid grid-4">
            {curated.map((c) => {
              const node = state.data?.[c.key] || null;
              const v = node?.value ?? null;
              const s = node?.history || [];
              const deltaPct = node?.changePercent ?? null;
              const yoyPct = node?.yoyPercent ?? null;
              const href = LINK[c.key];
              const up =
                deltaPct != null
                  ? deltaPct >= 0
                  : s.length >= 2
                  ? s[s.length - 1] >= s[0]
                  : true;
              const lastDate = node?.lastDate ? new Date(node.lastDate) : null;
              const lastDateStr =
                lastDate && isFinite(lastDate.getTime())
                  ? lastDate.toISOString().slice(0, 10)
                  : null;

              return (
                <a
                  key={c.key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="card link-card"
                  title="원본 데이터 열기"
                >
                  <div className="metric-label">{c.title}</div>
                  <div className="metric-value">{v != null ? fmtNum(v) : "-"}</div>

                  <div
                    className={`metric-change ${
                      deltaPct == null ? "" : up ? "positive" : "negative"
                    }`}
                  >
                    {deltaPct == null ? "vs prev: -" : `vs prev: ${fmtSignPct(deltaPct)}`}
                  </div>

                  {yoyPct != null && (
                    <div
                      className={`metric-change ${
                        yoyPct >= 0 ? "positive" : "negative"
                      }`}
                    >
                      YoY: {fmtSignPct(yoyPct)}
                    </div>
                  )}

                  <Sparkline series={s || []} />
                  {lastDateStr && (
                    <div className="meta small">업데이트: {lastDateStr}</div>
                  )}
                  <div className="meta small">원본 보기 ↗</div>
                </a>
              );
            })}
          </div>

          <AIBox block="indicators" payload={payloadForAI} />
        </>
      )}
    </section>
  );
}

/* =========================
   3) 일일 리테일러 주가 등락률
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
              const r = await fetch(`/api/stocks?symbol=${encodeURIComponent(s)}`, {
                cache: "no-store",
              });
              const j = await r.json();
              if (!r.ok) throw new Error(j?.error || "stocks api error");
              const name = j.longName || j.name || NAME_MAP[s] || s;
              const price =
                j.regularMarketPrice ?? j.price ?? j.close ?? j.last ?? j.regular ?? null;
              const prevClose = j.regularMarketPreviousClose ?? j.previousClose ?? null;
              let pct = 0;
              if (
                isFinite(Number(price)) &&
                isFinite(Number(prevClose)) &&
                Number(prevClose) !== 0
              ) {
                pct = ((Number(price) - Number(prevClose)) / Number(prevClose)) * 100;
              } else if (isFinite(Number(j.changePercent))) {
                pct = Number(j.changePercent);
              }
              return {
                symbol: s,
                name,
                price: isFinite(Number(price)) ? Number(price) : null,
                pct,
              };
            } catch (e) {
              return { symbol: s, name: NAME_MAP[s] || s, price: null, pct: 0, error: true };
            }
          })
        );
        setRows(out);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = rows.slice().sort((a, b) => b.pct - a.pct);
  const aiPayload = useMemo(
    () => ({ rows: sorted.filter((r) => Math.abs(r.pct) >= 4) }),
    [JSON.stringify(sorted)]
  );

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">일일 리테일러 주가 등락률</h2>
          <p className="section-subtitle">전일 종가 대비 변동률</p>
        </div>
      </div>

      {loading && <div>불러오는 중...</div>}
      {err && <div className="text-danger">에러: {err}</div>}

      {!loading && !err && (
        <>
          <div className="grid grid-4">
            {sorted.map((r) => (
              <div key={r.symbol} className="card stock-card" style={{ lineHeight: 1.6 }}>
                <div className="stock-header">
                  <div>
                    <div className="stock-name">{r.name}</div>
                    <div className="stock-symbol">{r.symbol}</div>
                  </div>
                  <div className="stock-links">
                    <a
                      href={`https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="stock-link"
                    >
                      Yahoo
                    </a>
                    {/* AI 분석은 별도 페이지에서 확인 */}
                    <a
                      href={`/company/${encodeURIComponent(r.symbol)}`}
                      className="stock-link ai"
                      title="AI 분석 페이지로 이동"
                    >
                      AI 분석
                    </a>
                  </div>
                </div>
                <div className="stock-price">{r.price != null ? fmtNum(r.price, 2) : "-"}</div>
                <div className={`metric-change ${r.pct >= 0 ? "positive" : "negative"}`}>
                  {fmtSignPct(r.pct)}
                </div>
                <div className="meta small">변동률은 전일 종가 대비</div>
              </div>
            ))}
          </div>

          {/* 큰 변동 종목 요약은 유지(카드 내 요약 버튼은 제거됨) */}
          <AIBox block="stocks" payload={aiPayload} />
        </>
      )}
    </section>
  );
}

/* =========================
   4) 뉴스 탭 — 해외 / 국내 / AI 요약
========================= */
function NewsTabsSection() {
  function withinDays(iso, days = 5) {
    try {
      const d = new Date(iso || "");
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= days && diff >= 0;
    } catch { return false; }
  }

  const [activeTab, setActiveTab] = useState("overseas");
  const [newsOpen, setNewsOpen] = useState(false); // overseas | korea
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsErr, setNewsErr] = useState("");
  const [collapsed, setCollapsed] = useState(true);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [aiForeign, setAiForeign] = useState(null);
  const [aiKorea, setAiKorea] = useState(null);

  const [lastUpdated, setLastUpdated] = useState("");
  const [guideMsg, setGuideMsg] = useState("");

  async function loadAISummary() {
    try {
      setAiLoading(true);
      setAiErr("");
      setAiForeign(null);
      setAiKorea(null);
      setAiOpen(true);
      const [rf, rk] = await Promise.all([fetch("/api/ai-news-foreign"), fetch("/api/ai-news-korea")]);
      const jf = await rf.json();
      const jk = await rk.json();
      if (!rf.ok) throw new Error(jf?.error || "AI 해외요약 실패");
      if (!rk.ok) throw new Error(jk?.error || "AI 국내요약 실패");
      setAiForeign(jf);
      setAiKorea(jk);
    } catch (e) {
      setAiErr(String(e));
    } finally {
      setAiLoading(false);
    }
  }

  async function load(tab = activeTab) {
    try {
      setNewsLoading(true);
      setNewsErr("");
      setNewsItems([]);
      let url = "";
      if (tab === "overseas") {
        // ✅ 캐시된 해외 뉴스 읽기 (매일 22:00 KST 갱신)
        url = "/api/news-daily";
      } else {
        url = "/api/news-kr-rss?" + new URLSearchParams({ feeds: "http://www.ktnews.com/rss/allArticle.xml", days: "5", limit: "200" }).toString();
      }
      const r = await fetch(url, { cache: "no-store" });
      const data = r.ok ? await r.json() : null;

      if (tab === "overseas") {
        if (!r.ok) throw new Error(data?.error || "해외 뉴스 캐시 로드 실패");
        const items = (data.items || []).filter(n => withinDays(n.publishedAt || n.pubDate)).map((n) => {
          const urlStr = n.url || n.link || "";
          let host = "";
          try {
            host = new URL(urlStr).hostname.replace(/^www\./, "");
          } catch {}
          return {
            title: n.title,
            url: urlStr,
            source: n.source || host || "businessoffashion.com / just-style.com",
            publishedAt: n.publishedAt || n.pubDate || "",
          };
        });
        setNewsItems(items);
        setLastUpdated(data.updatedAtKST || ""); // ← KST 문자열 그대로 사용
        setGuideMsg(data.guide || "뉴스는 매일 오후 10시(한국시간)에 갱신됩니다.");
      } else {
        const arr = Array.isArray(data) ? data : (data && data.items ? data.items : []);
        setLastUpdated(new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }));
        setGuideMsg("실시간 RSS 읽기");
        const items = (arr || []).filter(n => withinDays(n.publishedAt || n.pubDate || n.date)).map((n) => {
          const urlStr = n.url || n.link || "";
          let host = "";
          try {
            host = new URL(urlStr).hostname.replace(/^www\./, "");
          } catch {}
          return {
            title: n.title,
            url: urlStr,
            source:
              (typeof n.source === "string"
                ? n.source
                : n.source && (n.source.name || n.source.id)
                ? String(n.source.name || n.source.id)
                : "") || host || "한국섬유산업신문",
            publishedAt: n.published_at || n.publishedAt || n.pubDate || n.date || "",
          };
        });
        setNewsItems(items);
        /* 국내도 캐시 안내/시간 표시 */
      }

      setCollapsed(true);
    } catch (e) {
      setNewsErr(String(e));
    } finally {
      setNewsLoading(false);
    }
  }

  useEffect(() => {
    load("overseas");
  }, []);

  const defaultLimit = activeTab === "overseas" ? 15 : 10;
  const rendered = collapsed ? newsItems.slice(0, defaultLimit) : newsItems;

  // 동적 출처 라인 + 업데이트 안내
  const sourceLine = useMemo(() => {
    const base =
      activeTab === "overseas"
        ? "출처: businessoffashion.com, just-style.com"
        : "출처: 한국섬유산업신문 외";
    const guide = guideMsg ? ` · ${guideMsg}` : " · 뉴스는 매일 오후 10시(한국시간)에 갱신됩니다.";
    const last =
      activeTab === "overseas" && lastUpdated
        ? ` · 마지막 갱신: ${lastUpdated}`
        : "";
    return base + guide + last;
  }, [activeTab, lastUpdated, guideMsg]);

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">산업뉴스</h2>
          <p className="section-subtitle">{sourceLine}</p>
        </div>
        {newsOpen && (
          <div className="tab-nav">
          <button
            onClick={() => {
              if (activeTab === "overseas") { setCollapsed(v=>!v); return; }
              setActiveTab("overseas");
              setCollapsed(true);
              load("overseas");
            }}
            className={`tab-btn ${activeTab === "overseas" ? "active" : ""}`}
          >
            해외뉴스
          </button>
          <button
            onClick={() => {
              if (activeTab === "korea") { setCollapsed(v=>!v); return; }
              setActiveTab("korea");
              setCollapsed(true);
              load("korea");
            }}
            className={`tab-btn ${activeTab === "korea" ? "active" : ""}`}
          >
            국내뉴스
          </button>
          <a href="/ai/foreign" className="btn btn-secondary" style={{ marginLeft: 8 }}>해외뉴스AI요약</a>
          <a href="/ai/korea" className="btn btn-ghost" style={{ marginLeft: 8 }}>국내뉴스AI요약</a>
              <button onClick={()=>setNewsOpen(o=>!o className="btn btn-outline" style={{ marginLeft: 8 }}>
                {newsOpen ? "접기" : "자세히보기"}
              </button>
          </div>
      </div>

      <div className="card">
        {newsLoading && <div className="muted">불러오는 중…</div>}
        {newsErr && <div className="text-danger">에러: {newsErr}</div>}
        {!newsLoading && !newsErr && (
          <>
            {rendered.length === 0 ? (
              <div className="muted">관련 기사가 아직 없어요.</div>
            ) : (
              <ol className="news-list">
                {rendered.map((it, i) => (
                  <li key={i} className="news-item">
                    <a href={it.url} target="_blank" rel="noreferrer" className="news-title">
                      {it.title}
                    </a>
                    {it.publishedAt ? <div className="news-meta">{it.publishedAt}</div> : null}
                    <div className="news-meta source">{it.source}</div>
                  </li>
                ))}
              </ol>
            )}
            {newsItems.length > defaultLimit && (
              <div className="more-row">
                <button onClick={() => setCollapsed((v) => !v)} className="btn btn-ghost">
                  {collapsed ? "더보기" : "접기"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {aiOpen && (
        <div id="aiNewsSection" className="ai-panel">
          <div className="ai-panel-header">
            <h3>뉴스 AI 분석</h3>
            <div className="ai-panel-actions">
              <div className="ai-meta">
                {aiForeign?.generatedAt
                  ? `GEMINI 2.5 · ${new Date(aiForeign.generatedAt).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}`
                  : "GEMINI 2.5"}
              </div>
              <div className="btn-group" style={{display:"flex", gap:8}}>
                <button onClick={() => setAiOpen(o=>!o)} className="btn btn-secondary">{aiOpen ? "접기" : "펼치기"}</button>
                <button onClick={loadAISummary} disabled={aiLoading} className="btn btn-ghost">
                  {aiLoading ? "요약 중..." : "다시 요약"}
                </button>
              </div>
            </div>
          </div>

          {aiErr && <div className="text-danger">에러: {aiErr}</div>}
          {!aiErr && aiOpen && (
            <div className="grid grid-2">
              <AISummaryColumn title="해외뉴스분석(AI)" data={aiForeign} />
              <AISummaryColumn title="국내뉴스분석(AI)" data={aiKorea} />
            </div>
          )}
        </div>
      )}
    </)}
section>
  );
}

function LinkifyCitations(text = "") {
  return String(text).replace(/\[(\d+(?:-\d+)?)\]/g, (m, grp) => {
    const id = String(grp).split("-")[0];
    return `<a href="#ref-${id}" class="ref">[${grp}]</a>`;
  });
}
function splitSections(md = "") {
  const lines = String(md).split(/\r?\n/);
  const out = [];
  let title = null,
    buf = [];
  const push = () => {
    if (title || buf.length) out.push({ title: title || "", body: buf.join("\n") });
  };
  for (const ln of lines) {
    if (/^###\s+/.test(ln)) {
      push();
      title = ln.replace(/^###\s+/, "").trim();
      buf = [];
    } else buf.push(ln);
  }
  push();
  return out;
}
function AISummaryColumn({ title, data }) {
  const sections = React.useMemo(() => splitSections(data?.summary || ""), [data?.summary]);
  return (
    <div className="card">
      <h4 className="ai-col-title">{title}</h4>
      {!data ? (
        <div className="muted">요약을 불러오는 중…</div>
      ) : (
        <div className="ai-col">
          <div className="ai-col-body">
            {sections.map((sec, idx) => (
              <section key={idx} className="ai-col-section">
                {sec.title ? (
                  <h5 className="ai-col-section-title">
                    {sec.title === "Implications for Hansoll"
                      ? "한솔섬유 전략에 미치는 시사점"
                      : sec.title}
                  </h5>
                ) : null}
                <div
                  className="ai-col-section-text"
                  dangerouslySetInnerHTML={{
                    __html: LinkifyCitations(sec.body)
                      .replace(/^-\s+/gm, "• ")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              </section>
            ))}
          </div>
          <aside className="ai-col-aside">
            <h5 className="ai-col-aside-title">참조 뉴스</h5>
            <ol className="ai-col-refs">
              {(data.items || []).slice(0, 20).map((it, i) => (
                <li id={`ref-${i + 1}`} key={i} className="ai-col-ref">
                  <a href={it.link} target="_blank" rel="noreferrer" className="news-title">
                    {it.title}
                  </a>
                  {it.pubDate ? <div className="news-meta">{it.pubDate}</div> : null}
                  <div className="news-meta source">{it.source || ""}</div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}

/* =========================
   페이지
========================= */
export default function Home() {
  return (
    <>
      <Head>
        <title>Hansoll Market Intelligence | Executive Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+KR:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <HeaderBar />

      <main className="main-container">
        <ProcurementTopBlock />
        <IndicatorsSection />
        <StocksSection />
        <NewsTabsSection />
      </main>

      <footer className="footer">
        <p className="footer-text">© Hansoll Textile — Market Intelligence Dashboard</p>
      </footer>
    </>
  );
}
