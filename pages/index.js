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

/* =========================
   1) 부자재구매현황 DASHBOARD (수기입력)
   - LocalStorage 저장
   - 매입비중 자동계산
   - 공급현황 스택바
   - CTA + AI Daily Report 링크
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
        <Card
          title="총 부자재매입액"
          value={fmtCurrency(data.materialSpend, data.currency)}
        />
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
                onChange={(e) =>
                  setData((d) => ({ ...d, materialSpend: Number(e.target.value) }))
                }
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

      {/* CTA 더미 링크 */}
      <div style={styles.ctaRow}>
        <a href="#incidents" style={styles.ctaDark}>
          부자재 관련사고
        </a>
        <a href="#materials" style={styles.ctaDark}>
          부자재 관련 자료
        </a>
        <a href="/chatbot" style={styles.ctaLight}>
          AI Chatbot (한솔부자재)
        </a>
      </div>
    </section>
  );
}

/* =========================
   2) 주요지표 섹션 (/api/indicators)
   - 키가 무엇이든 안전하게 표시
========================= */
function IndicatorsSection() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/indicators");
        const j = await r.json();
        if (!r.ok) throw new Error("지표 API 오류");
        setState({ loading: false, data: j, error: "" });
      } catch (e) {
        setState({ loading: false, data: null, error: String(e) });
      }
    })();
  }, []);

  const entries = useMemo(() => {
    if (!state.data) return [];
    // 객체이면 [key, value]로 변환
    if (typeof state.data === "object" && !Array.isArray(state.data)) {
      return Object.entries(state.data);
    }
    return [];
  }, [state.data]);

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={styles.h3}>주요 지표</h3>
      {state.loading && <div>불러오는 중...</div>}
      {state.error && <div style={styles.err}>에러: {state.error}</div>}
      {!state.loading && !state.error && (
        <div style={styles.grid4}>
          {entries.slice(0, 12).map(([k, v]) => {
            let value = "-";
            let sub = "";
            if (v && typeof v === "object") {
              const maybeVal = v.value ?? v.price ?? v.index ?? v.last ?? v.rate;
              const maybeChg =
                v.changePercent ?? v.change_percentage ?? v.percent ?? v.change ?? v.delta;
              value = fmtNum(maybeVal);
              if (isFinite(Number(maybeChg))) sub = fmtSignPct(Number(maybeChg));
            } else if (isFinite(Number(v))) {
              value = fmtNum(v);
            } else if (v != null) {
              value = String(v);
            }
            return (
              <div key={k} style={styles.card}>
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
              </div>
            );
          })}
        </div>
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
  BABA: "A
