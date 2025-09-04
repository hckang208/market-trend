// pages/index.js
import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";

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
function AIBox({ block, payload }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
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
        setText(j.summary || "");
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [block, JSON.stringify(payload || {})]);

  return (
    <div style={styles.aiBox}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>🤖 AI 분석</div>
      {loading && <div style={{ color: "#6b7280" }}>분석 중…</div>}
      {err && <div style={{ color: "#b91c1c" }}>오류: {err}</div>}
      {!loading && !err && <div style={{ whiteSpace: "pre-wrap" }}>{text || "분석 결과가 없습니다."}</div>}
    </div>
  );
}

/* =========================
   헤더
========================= */
function HeaderBar() {
  return (
    <header style={styles.headerWrap}>
      <div style={styles.headerInner}>
        <div style={styles.brand}>
          <span>Hansoll Market Trend</span>
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
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 },
  };

  const [data, setData] = useState(defaultData);
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

  const save = () => { localStorage.setItem(LS_KEY, JSON.stringify(data)); setOpenEdit(false); };
  const reset = () => { localStorage.removeItem(LS_KEY); setData(defaultData); };

  const fmtCurrency = (value, currency = "USD") => {
    const num = Number(value || 0);
    try {
      if (currency === "KRW") {
        return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(num);
      }
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
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
            기간: <b>{data.periodLabel || "—"}</b> / 방식: <b>{data.period}</b> / 통화: <b>{data.currency}</b>
          </div>
        </div>
</div>

      <div style={styles.grid5}>
        <Card title="총 매출액" value={fmtCurrency(data.revenue, data.currency)} />
        <Card title="총 부자재매입액" value={fmtCurrency(data.materialSpend, data.currency)} />
        <div style={styles.card}>
          <div style={styles.cardTitle}>매출 대비 부자재 매입비중</div>
          <div style={styles.cardValue}>{fmtSignPct(ratio, 1)}</div>
          <div style={styles.progressWrap}><div style={{ ...styles.progressBar, width: `${ratio}%` }} /></div>
        </div>
        <Card title="총 오더수(스타일)" value={fmtNum(data.styles, 0)} />
        <Card title="총 발행 PO수" value={fmtNum(data.poCount, 0)} />
      </div>

      <div style={styles.innerBlock}>
        <div style={styles.blockTitle}>공급현황 (국내 / 3국 / 현지)</div>
        <div style={styles.stackBar}>
          <div style={{ ...styles.seg, background: "#111827", width: `${supply.domestic}%` }} title={`국내 ${fmtNum(supply.domestic, 1)}%`} />
          <div style={{ ...styles.seg, background: "#4B5563", width: `${supply.thirdCountry}%` }} title={`3국 ${fmtNum(supply.thirdCountry, 1)}%`} />
          <div style={{ ...styles.seg, background: "#9CA3AF", width: `${supply.local}%` }} title={`현지 ${fmtNum(supply.local, 1)}%`} />
        </div>
        <div style={styles.legend}>
          <span>국내 {fmtNum(supply.domestic, 1)}%</span>
          <span>3국 {fmtNum(supply.thirdCountry, 1)}%</span>
          <span>현지 {fmtNum(supply.local, 1)}%</span>
        </div>
      </div>

      <AIBox block="procurement" payload={{ ...data, ratio, supply }} />

      {openEdit && (
        <div style={styles.editBox}>
          <div style={styles.row}>
            <label>기간 표시</label>
            <input value={data.periodLabel || ""} onChange={(e) => setData(d => ({ ...d, periodLabel: e.target.value }))} placeholder="예: 2025-09" />
          </div>
          <div style={styles.row}>
            <label>방식</label>
            <input value={data.period || ""} onChange={(e) => setData(d => ({ ...d, period: e.target.value }))} placeholder="월간 / 주간 / 일간 등" />
          </div>
          <div style={styles.row}>
            <label>통화</label>
            <select value={data.currency} onChange={(e) => setData(d => ({ ...d, currency: e.target.value }))}>
              <option value="USD">USD</option><option value="KRW">KRW</option>
            </select>
          </div>
          <div style={styles.grid2}>
            <div style={styles.row}><label>총 매출액</label><input type="number" value={data.revenue} onChange={(e) => setData(d => ({ ...d, revenue: Number(e.target.value) }))} /></div>
            <div style={styles.row}><label>총 부자재매입액</label><input type="number" value={data.materialSpend} onChange={(e) => setData(d => ({ ...d, materialSpend: Number(e.target.value) }))} /></div>
          </div>
          <div style={styles.grid2}>
            <div style={styles.row}><label>총 오더수(스타일)</label><input type="number" value={data.styles} onChange={(e) => setData(d => ({ ...d, styles: Number(e.target.value) }))} /></div>
            <div style={styles.row}><label>총 발행 PO수</label><input type="number" value={data.poCount} onChange={(e) => setData(d => ({ ...d, poCount: Number(e.target.value) }))} /></div>
          </div>
          <div style={{ marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
            <div style={styles.blockTitle}>공급현황(%) — 합계 100 기준</div>
            <div style={styles.grid3}>
              <div style={styles.row}><label>국내(%)</label><input type="number" value={data.supplyBreakdown.domestic}
                onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, domestic: Number(e.target.value) } }))} /></div>
              <div style={styles.row}><label>3국(%)</label><input type="number" value={data.supplyBreakdown.thirdCountry}
                onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, thirdCountry: Number(e.target.value) } }))} /></div>
              <div style={styles.row}><label>현지(%)</label><input type="number" value={data.supplyBreakdown.local}
                onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, local: Number(e.target.value) } }))} /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={save} style={styles.btnBlue}>저장</button>
            <button onClick={() => setOpenEdit(false)} style={styles.btnGray}>닫기</button>
            <button onClick={reset} style={styles.btnDanger}>초기화</button>
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
   2) 주요지표 (스파크라인 + 이전대비 + YoY + 카드별 업데이트일)
========================= */
function Sparkline({ series = [], width = 110, height = 32 }) {
  if (!series || series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = width / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * height;
    return `${x},${y}`;
  }).join(" ");
  const up = series[series.length - 1] >= series[0];
  return (
    <svg width={width} height={height} style={{ display: "block", marginTop: 6 }}>
      <polyline fill="none" stroke={up ? "#065f46" : "#991b1b"} strokeWidth="2" points={pts} />
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
        setLastUpdated(j.lastUpdated || j.updatedAt || j.ts || new Date().toISOString());
      } catch (e) {
        setState({ loading: false, data: null, error: String(e) });
      }
    })();
  }, []);

  const LINK = {
    wti: "https://fred.stlouisfed.org/series/DCOILWTICO",
    usdkrw: "https://fred.stlouisfed.org/series/DEXKOUS",
    cpi: "https://fred.stlouisfed.org/series/CPIAUCSL",
    fedfunds: "https://fred.stlouisfed.org/series/FEDFUNDS",
    t10y2y: "https://fred.stlouisfed.org/series/T10Y2Y",
    inventory_ratio: "https://fred.stlouisfed.org/series/ISRATIO",
    unemployment: "https://fred.stlouisfed.org/series/UNRATE",
  };
  const curated = [
    { key: "wti", title: "WTI (USD/bbl)" },
    { key: "usdkrw", title: "USD/KRW" },
    { key: "cpi", title: "US CPI (Index)" },
    { key: "fedfunds", title: "미국 기준금리(%)" },
    { key: "t10y2y", title: "금리 스프레드(10Y–2Y, bp)" },
    { key: "inventory_ratio", title: "재고/판매 비율" },
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
    <section style={{ marginTop: 24 }}>
      <h3 style={styles.h3}>주요 지표</h3>
      {lastUpdated && (
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          전체 업데이트: {new Date(lastUpdated).toLocaleString("ko-KR")}
        </div>
      )}
      {state.loading && <div>불러오는 중...</div>}
      {state.error && <div style={styles.err}>에러: {state.error}</div>}

      {!state.loading && !state.error && (
        <>
          <div style={styles.grid4}>
            {curated.map((c) => {
              const node = state.data?.[c.key] || null;
              const v = node?.value ?? null;
              const s = node?.history || [];
              const deltaPct = node?.changePercent ?? null;
              const yoyPct = node?.yoyPercent ?? null;
              const href = LINK[c.key];
              const up = deltaPct != null ? deltaPct >= 0 : (s.length >= 2 ? s[s.length - 1] >= s[0] : true);
              const lastDate = node?.lastDate ? new Date(node.lastDate) : null;
              const lastDateStr = lastDate && isFinite(lastDate.getTime()) ? lastDate.toISOString().slice(0,10) : null;

              return (
                <a key={c.key} href={href} target="_blank" rel="noreferrer" style={{ ...styles.card, ...styles.cardLink }} title="원본 데이터 열기">
                  <div style={styles.cardTitle}>{c.title}</div>
                  <div style={styles.cardValue}>{v != null ? fmtNum(v) : "-"}</div>
                  <div style={{ ...styles.cardSub, fontWeight: 800, color: deltaPct == null ? "#6b7280" : (up ? "#065f46" : "#991b1b") }}>
                    {deltaPct == null ? "vs prev: -" : `vs prev: ${fmtSignPct(deltaPct)}`}
                  </div>
                  {yoyPct != null && (
                    <div style={{ ...styles.cardSub, fontWeight: 800, color: yoyPct >= 0 ? "#065f46" : "#991b1b" }}>
                      YoY: {fmtSignPct(yoyPct)}
                    </div>
                  )}
                  <Sparkline series={s || []} />
                  {lastDateStr && <div style={{ ...styles.cardSub, color: "#6b7280", marginTop: 4 }}>업데이트: {lastDateStr}</div>}
                  <div style={{ ...styles.cardSub, color: "#6b7280", marginTop: 4 }}>원본 보기 ↗</div>
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
   3) 일일 리테일러 주가 등락률 (전일 종가 대비) + 원본 링크
========================= */
const SYMBOLS = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA","9983.T"];
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

  
  // Inline AI summary state per symbol
  const [sumState, setSumState] = useState({}); 
  // --- Markdown-lite helpers for clear, scannable layout ---
  function parseSections(text="") {
    const lines = String(text).split(/\r?\n/);
    const sections = [];
    let title = null, buf = [];
    const push = () => { if (title || buf.length) { sections.push({ title: title || "", lines: buf.slice() }); } };
    for (const ln of lines) {
      if (/^###\s+/.test(ln)) {
        push(); title = ln.replace(/^###\s+/, "").trim(); buf = [];
      } else {
        buf.push(ln);
      }
    }
    push();
    return sections;
  }
  function renderSection(sec, idx) {
    const items = [];
    let inList = false, list = [];
    const flushList = () => { if (list.length) { items.push(<ul key={"ul"+items.length} style={{ margin: "6px 0 10px 18px" }}>{list.map((t,i)=><li key={i} style={{ lineHeight: 1.5 }}>{t}</li>)}</ul>); list = []; } };
    for (const raw of sec.lines) {
      const ln = raw.trim();
      if (!ln) { flushList(); continue; }
      if (/^[-•]\s+/.test(ln)) { inList = true; list.push(ln.replace(/^[-•]\s+/, "")); continue; }
      if (inList) { flushList(); inList = false; }
      items.push(<p key={"p"+items.length} style={{ margin: "6px 0", lineHeight: 1.6 }}>{ln}</p>);
    }
    flushList();
    const titleMap = {
      "Implications for Hansoll": "한솔섬유 전략에 미치는 시사점"
    };
    const title = titleMap[sec.title] || sec.title;
    return (
      <section key={idx} style={{ marginTop: idx===0?0:10 }}>
        {title ? <h3 style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px 0" }}>{title}</h3> : null}
        {items}
      </section>
    );
  }
  function renderSummaryBox(sym) {
    const st = sumState[sym] || {};
    const sections = parseSections(st.summary || "");
    const collapsed = st.expanded ? false : true;
    return (
      <div style={{
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
        padding: 12,
        borderRadius: 10,
        marginTop: 10,
        position: "relative",
        maxHeight: collapsed ? 240 : "none",
        overflow: "hidden"
      }}>
        {sections.map(renderSection)}
        {collapsed && <div style={{ position: "absolute", left:0, right:0, bottom:0, height: 48,
          background: "linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,1) 60%)"}} />}
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop: 6 }}>
          <button onClick={() => setSumState(s => ({ ...s, [sym]: { ...(s[sym]||{}), expanded: !s[sym]?.expanded } }))}
                  style={{ fontSize: 12, textDecoration:"underline", color:"#334155" }}>
            {collapsed ? "더보기" : "접기"}
          </button>
        </div>
      </div>
    );
  }
// { [symbol]: { open, loading, summary, error } }

  async function loadSummary(symbol) {
    setSumState(s => ({ ...s, [symbol]: { ...(s[symbol] || {}), open: true, loading: true, error: "", summary: "" } }));
    try {
      const r = await fetch(`/api/company-news-summary?symbol=${encodeURIComponent(symbol)}&limit=10&lang=ko`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to fetch summary");
      setSumState(s => ({ ...s, [symbol]: { ...(s[symbol] || {}), open: true, loading: false, summary: j.summary || "(요약 없음)", error: "" } }));
    } catch (e) {
      setSumState(s => ({ ...s, [symbol]: { ...(s[symbol] || {}), open: true, loading: false, summary: "", error: String(e) } }));
    }
  }

  function closeSummary(symbol) {
    setSumState(s => ({ ...s, [symbol]: { ...(s[symbol] || {}), open: false } }));
  }
useEffect(() => {
    (async () => {
      try {
        const out = await Promise.all(
          SYMBOLS.map(async (s) => {
            try {
              const r = await fetch(`/api/stocks?symbol=${encodeURIComponent(s)}`, { cache: "no-store" });
              const j = await r.json();
              if (!r.ok) throw new Error(j?.error || "stocks api error");
              const name = j.longName || j.name || NAME_MAP[s] || s;
              const price = j.regularMarketPrice ?? j.price ?? j.close ?? j.last ?? j.regular ?? null;
              const prevClose = j.regularMarketPreviousClose ?? j.previousClose ?? null;
              let pct = 0;
              if (isFinite(Number(price)) && isFinite(Number(prevClose)) && Number(prevClose) !== 0) {
                pct = ((Number(price) - Number(prevClose)) / Number(prevClose)) * 100;
              } else if (isFinite(Number(j.changePercent))) {
                pct = Number(j.changePercent);
              }
              return { symbol: s, name, price: isFinite(Number(price)) ? Number(price) : null, pct };
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
  const aiPayload = useMemo(() => ({ rows: sorted }), [JSON.stringify(sorted)]);

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={styles.h3}>일일 리테일러 주가 등락률 (전일 종가 대비)</h3>
      {loading && <div>불러오는 중...</div>}
      {err && <div style={styles.err}>에러: {err}</div>}
      {!loading && !err && (
        <>
          <div style={styles.grid4}>
            {sorted.map((r) => {
              const link = `https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`;
              return (
                
                <div key={r.symbol} style={{ ...styles.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ ...styles.cardTitle }}>
                        {r.name} <span style={{ color: "#6b7280" }}>({r.symbol})</span>
                      </div>
                      <div style={{ ...styles.cardValue }}>{r.price != null ? fmtNum(r.price, 2) : "-"}</div>
                      <div style={{ ...styles.cardSub, fontWeight: 900, color: r.pct >= 0 ? "#065f46" : "#991b1b" }}>
                        {fmtSignPct(r.pct)}
                      </div>
                      <div style={{ ...styles.cardSub, color: "#6b7280", marginTop: 4 }}>변동률은 전일 종가 대비</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`}
                         target="_blank" rel="noreferrer"
                         style={{ ...styles.btnTab }} title="Yahoo Finance 열기">
                        Yahoo
                      </a>
                      <a href={`/company/${encodeURIComponent(r.symbol)}`} style={{ ...styles.btnTab }} title="AI 요약 화면으로 이동">AI뉴스요약</a>
                    </div>
                  </div>

                  {sumState[r.symbol]?.open && (<div style={{ marginTop: 8 }}>{renderSummaryBox(r.symbol)}</div>)}
                </div>

              );
            })}
          </div>
          <AIBox block="stocks" payload={aiPayload} />
        </>
      )}
    </section>
  );
}

/* =========================
   4) 뉴스 탭 — 브랜드 / 산업 / 한국 (한국: 필터 없이 최근 2일)
========================= */
const BRAND_TERMS = [
  "Walmart","Victoria's Secret","Abercrombie","Carter's","Kohl's","Uniqlo","Fast Retailing",
  "Aerie","Duluth","Under Armour","Aritzia","Amazon","Alibaba"
];
const INDUSTRY_TERMS = ["fashion","textile","garment","apparel"];

function NewsTabsSection() {
  const [tab, setTab] = useState("brand"); // brand | industry | korea
  const [andStrict, setAndStrict] = useState(true); // 정확도 강화(AND)
  const [brandNews, setBrandNews] = useState([]);
  const [industryNews, setIndustryNews] = useState([]);
  const [krNews, setKrNews] = useState([]);
  const [busy, setBusy] = useState({ brand:false, industry:false, kr:false });
  const [err, setErr] = useState("");

  const DOMAINS = "reuters.com,fashionunited.com,wwd.com,businesswire.com,forbes.com,apnews.com,bloomberg.com,ft.com,cnbc.com";
  const EXCLUDE = "celebrity,lookbook,outfit,beauty,gossip,concert,fandom";

  const loadBrand = async () => {
    if (busy.brand) return;
    try {
      setBusy(s => ({ ...s, brand: true }));
      setErr("");
      const qs = new URLSearchParams({
        brand: BRAND_TERMS.join("|"),
        industry: INDUSTRY_TERMS.join("|"),
        must: andStrict ? "brand,industry" : "",
        language: "en",
        limit: "40",
        days: "14",
        domains: DOMAINS,
        exclude: EXCLUDE,
      });
      const r = await fetch(`/api/news?${qs.toString()}`, { cache: "no-store" });
      const arr = await r.json();
      setBrandNews(arr || []);
    } catch (e) { setErr(String(e)); }
    finally { setBusy(s => ({ ...s, brand: false })); }
  };

  const loadIndustry = async () => {
    if (busy.industry) return;
    try {
      setBusy(s => ({ ...s, industry: true }));
      setErr("");
      const qs = new URLSearchParams({
        industry: INDUSTRY_TERMS.join("|"),
        language: "en",
        limit: "40",
        days: "14",
        domains: DOMAINS,
        exclude: EXCLUDE,
      });
      const r = await fetch(`/api/news?${qs.toString()}`, { cache: "no-store" });
      const arr = await r.json();
      setIndustryNews(arr || []);
    } catch (e) { setErr(String(e)); }
    finally { setBusy(s => ({ ...s, industry: false })); }
  };

  const loadKorea = async () => {
    if (busy.kr) return;
    try {
      setBusy(s => ({ ...s, kr: true }));
      setErr("");
      const qs = new URLSearchParams({
        feeds: "http://www.ktnews.com/rss/allArticle.xml",
        days: "2",
        limit: "120"
      });
      const r = await fetch(`/api/news-kr-rss?${qs.toString()}`, { cache: "no-store" });
      const arr = await r.json();
      setKrNews(arr || []);
    } catch (e) { setErr(String(e)); }
    finally { setBusy(s => ({ ...s, kr: false })); }
  };

  useEffect(() => {
    loadBrand();
    loadIndustry();
    loadKorea();
  }, []);

  const Section = ({ title, items }) => (
    <div style={{ marginTop: 12 }}>
      <div style={styles.blockTitle}>{title}</div>
      {items.length === 0 ? <div style={{ color:"#6b7280" }}>관련 기사가 아직 없어요.</div> : (
        <div style={{ display:"grid", gap:12 }}>
          {items.map((a, idx) => (
            <a key={idx} href={a.url} target="_blank" rel="noreferrer" style={styles.newsItem}>
              <div style={{ fontWeight: 900 }}>{a.title || "(제목 없음)"}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {(a.source?.name || (a.url ? new URL(a.url).hostname : ""))}
                {a.publishedAt ? ` · ${new Date(a.publishedAt).toLocaleString()}` : ""}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const aiPayload = useMemo(() => ({
    brandCount: brandNews.length,
    industryCount: industryNews.length,
    koreaCount: krNews.length,
    brandTop: brandNews.slice(0, 5),
    industryTop: industryNews.slice(0, 5),
    koreaTop: krNews.slice(0, 5),
    andStrict,
  }), [JSON.stringify(brandNews), JSON.stringify(industryNews), JSON.stringify(krNews), andStrict]);

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setTab("brand")} style={{ ...styles.btnTab, ...(tab==="brand"?styles.btnTabActive:{}) }}>브랜드</button>
          <button onClick={() => setTab("industry")} style={{ ...styles.btnTab, ...(tab==="industry"?styles.btnTabActive:{}) }}>산업</button>
          <button onClick={() => setTab("korea")} style={{ ...styles.btnTab, ...(tab==="korea"?styles.btnTabActive:{}) }}>한국</button>
        </div>
        <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
          <input type="checkbox" checked={andStrict} onChange={(e)=>setAndStrict(e.target.checked)} />
          정확도 강화(AND: 고객사 ∩ 업계)
        </label>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={loadBrand} disabled={busy.brand} style={styles.btnGray}>{busy.brand?"브랜드 로딩…":"브랜드 새로고침"}</button>
          <button onClick={loadIndustry} disabled={busy.industry} style={styles.btnGray}>{busy.industry?"산업 로딩…":"산업 새로고침"}</button>
          <button onClick={loadKorea} disabled={busy.kr} style={styles.btnBlue}>{busy.kr?"한국 로딩…":"한국 새로고침"}</button>
        </div>
      </div>
      {err && <div style={styles.err}>&middot; 뉴스 오류: {err}</div>}

      {tab==="brand" && <Section title="브랜드 뉴스" items={brandNews} />}
      {tab==="industry" && <Section title="산업 동향 뉴스" items={industryNews} />}
      {tab==="korea" && <Section title="한국 뉴스" items={krNews} />}

      <AIBox block="news" payload={aiPayload} />
    </section>
  );
}

/* =========================
   페이지
========================= */

function LinkifyCitations(text="") {
  return String(text).replace(/\[(\d+(?:-\d+)?)\]/g, (m, grp) => {
    const id = String(grp).split('-')[0];
    return `<a href="#ref-${id}" style="text-decoration: underline;">[${grp}]</a>`;
  });
}
function splitSections(md="") {
  const lines = String(md).split(/\r?\n/);
  const out=[]; let title=null, buf=[];
  const push=()=>{ if(title||buf.length) out.push({title:title||"", body:buf.join("\n")}); };
  for(const ln of lines){
    if(/^###\s+/.test(ln)){ push(); title=ln.replace(/^###\s+/,"").trim(); buf=[]; }
    else buf.push(ln);
  } push(); return out;
}

function NewsAISummaryPanel({ title, endpoint }) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState("");

  async function load() {
    try {
      setLoading(true); setErr(""); setData(null);
      const r = await fetch(endpoint);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  const sections = React.useMemo(() => splitSections(data?.summary||""), [data?.summary]);

  return (
    <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:14, background:"#fff" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>{title}</h3>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={load} disabled={loading} style={{ ...styles.btnTab }}>{loading ? "요약 중..." : "다시 요약"}</button>
        </div>
      </div>

      {err && <div style={{ color:"crimson" }}>에러: {err}</div>}
      {!data && !loading && <div>요약을 불러오는 중…</div>}
      {data && (
        <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:12 }}>
          <div style={{ background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:10, padding:12 }}>
            {sections.map((sec, idx) => (
              <section key={idx} style={{ marginTop: idx===0?0:12 }}>
                {sec.title ? <h4 style={{ margin:"4px 0", fontSize:14, fontWeight:800 }}>{sec.title === "Implications for Hansoll" ? "한솔섬유 전략에 미치는 시사점" : sec.title}</h4> : null}
                <div
                  style={{ fontSize: 14, lineHeight:1.7 }}
                  dangerouslySetInnerHTML={{ __html: LinkifyCitations(sec.body).replace(/^-\s+/gm, "• ").replace(/\n/g, "<br/>") }}
                />
              </section>
            ))}
          </div>
          <aside style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:12 }}>
            <h4 style={{ margin:"0 0 6px 0", fontSize:14, fontWeight:800 }}>참조 뉴스</h4>
            <ol style={{ paddingLeft:18, margin:0 }}>
              {(data.items || []).slice(0, 20).map((it, i) => (
                <li id={`ref-${i+1}`} key={i} style={{ margin:"6px 0" }}>
                  <a href={it.link} target="_blank" rel="noreferrer" style={{ color:"#1d4ed8" }}>{it.title}</a>
                  {it.pubDate ? <div style={{ fontSize:12, color:"#6b7280" }}>{it.pubDate}</div> : null}
                  <div style={{ fontSize:11, color:"#94a3b8" }}>{it.source || ""}</div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}

function NewsAISummarySection() {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ ...styles.blockTitle }}>뉴스 AI 분석</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <NewsAISummaryPanel title="해외뉴스분석(AI)" endpoint="/api/ai-news-foreign" />
        <NewsAISummaryPanel title="국내뉴스분석(AI)" endpoint="/api/ai-news-korea" />
      </div>
    </div>
  );
}

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
        <NewsTabsSection />
        <NewsAISummarySection />
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
   스타일
========================= */
const styles = {
  headerWrap: { position:"sticky", top:0, zIndex:50, backdropFilter:"blur(6px)", background:"rgba(255,255,255,0.75)", borderBottom:"1px solid #e5e7eb" },
  headerInner: { maxWidth:1200, margin:"0 auto", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  brand: { display:"flex", alignItems:"center", gap:8, fontWeight:900, fontSize:18 },
  nav: { display:"flex", gap:16, fontSize:14, color:"#6b7280" },
  navLink: { color:"inherit", textDecoration:"none" },

  h2: { margin:"6px 0 2px", fontSize:20, fontWeight:900 },
  h3: { margin:"12px 0 10px", fontSize:18, fontWeight:900 },
  meta: { color:"#6b7280", fontSize:13 },
  err: { color:"#b91c1c", fontWeight:700 },

  blockWrap: { background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:16, marginTop:10 },
  headerRow: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" },
  tools: { display:"flex", gap:8, alignItems:"center" },

  grid5: { display:"grid", gridTemplateColumns:"repeat(5, minmax(0,1fr))", gap:12, marginTop:12 },
  grid4: { display:"grid", gridTemplateColumns:"repeat(4, minmax(0,1fr))", gap:12 },
  grid3: { display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:12 },
  grid2: { display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:12 },

  card: { border:"1px solid #e5e7eb", borderRadius:12, padding:"12px 12px" },
  cardLink: { textDecoration:"none", color:"#111" },
  cardTitle: { fontSize:12, color:"#6b7280", fontWeight:800, marginBottom:6 },
  cardValue: { fontSize:20, fontWeight:900 },
  cardSub: { fontSize:12, color:"#6b7280" },

  progressWrap: { background:"#f3f4f6", borderRadius:999, height:8, marginTop:8, overflow:"hidden" },
  progressBar: { background:"#111827", height:8 },

  innerBlock: { border:"1px dashed #e5e7eb", borderRadius:12, padding:12, marginTop:12 },
  blockTitle: { fontWeight:900, fontSize:13, marginBottom:8 },
  stackBar: { display:"flex", width:"100%", height:12, borderRadius:999, overflow:"hidden", background:"#f3f4f6" },
  seg: { height:"100%" },
  legend: { display:"flex", gap:16, marginTop:8, fontSize:12, color:"#374151" },

  editBox: { border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginTop:12, background:"#fafafa" },
  row: { display:"grid", gap:6 },

  ctaRow: { display:"flex", gap:8, marginTop:12, flexWrap:"wrap" },
  ctaDark: { background:"#111827", color:"#fff", textDecoration:"none", padding:"8px 12px", borderRadius:10, fontWeight:800, fontSize:13 },
  ctaLight: { border:"1px solid #111827", color:"#111827", textDecoration:"none", padding:"8px 12px", borderRadius:10, fontWeight:800, fontSize:13, background:"#fff" },

  btnGray: { background:"#f3f4f6", border:"1px solid #e5e7eb", padding:"8px 10px", borderRadius:10, fontWeight:700, fontSize:13, color:"#111" },
  btnBlue: { background:"#2563eb", border:"1px solid #1d4ed8", padding:"8px 12px", borderRadius:10, fontWeight:800, fontSize:13, color:"#fff", textDecoration:"none" },
  btnDanger: { background:"#fee2e2", border:"1px solid #fecaca", padding:"8px 10px", borderRadius:10, fontWeight:700, fontSize:13, color:"#991b1b" },

  newsItem: { display:"block", padding:12, border:"1px solid #e5e7eb", borderRadius:12, textDecoration:"none", color:"#111" },
  btnTab: { background:"#f3f4f6", border:"1px solid #e5e7eb", padding:"6px 10px", borderRadius:8, fontWeight:700, fontSize:13, color:"#111" },
  btnTabActive: { background:"#111827", color:"#fff", border:"1px solid #111827" },

  aiBox: { marginTop:10, padding:10, background:"#f9fafb", border:"1px dashed #d1d5db", borderRadius:8, fontSize:13, color:"#111" },

  footer: { borderTop:"1px solid #e5e7eb", marginTop:10, background:"#fff" },
};
