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
              style={{ width: `${supply.domestic}%` }}
            />
            <div
              className="stack-segment seg-third"
              title={`3국 ${fmtNum(supply.thirdCountry, 1)}%`}
              style={{ width: `${supply.thirdCountry}%` }}
            />
            <div
              className="stack-segment seg-local"
              title={`현지 ${fmtNum(supply.local, 1)}%`}
              style={{ width: `${supply.local}%` }}
            />
          </div>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot dot-domestic" />
              <span>국내 {fmtNum(supply.domestic, 1)}%</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-third" />
              <span>3국 {fmtNum(supply.thirdCountry, 1)}%</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-local" />
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
                      ...d,
                      supplyBreakdown: {
                        ...d.supplyBreakdown,
                        thirdCountry: Number(e.target.value),
                      },
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
                      ...d,
                      supplyBreakdown: {
                        ...d.supplyBreakdown,
                        local: Number(e.target.value),
                      },
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

export default function Home() {
  return (
    <>
      <Head>
        <title>Hansoll Market Intelligence | Executive Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
