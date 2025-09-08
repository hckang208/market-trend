import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import NewsHeader from "../components/news/NewsHeader";
import ProcurementForm from "../components/procurement/ProcurementForm";

// ==============================
// 숫자/시계열 유틸
// ==============================
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

// 공통: AI 분석 카드
function AICard({ title, text }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { setNow(new Date()); }, []);
  const ts = useMemo(() => {
    const z = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
    return z;
  }, [now]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>GEMINI 2.5 사용중 · {ts}</div>
      </div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{text || "데이터 수집 중..."}</div>
    </div>
  );
}

// 상단 KPI 카드
function KPI({ label, value, sub }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// 메인 페이지
export default function Home() {
  // 수기입력용 상태 (간단 기본값)
  const [openEdit, setOpenEdit] = useState(false);
  const [data, setData] = useState({
    periodLabel: "2025-09",
    period: "월간",
    currency: "KRW",
    revenue: 0,
    materialSpend: 0,
    costSave: 0,
    styles: 0,
    poCount: 0,
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 },
  });

  const save = () => {/* TODO: persist */};
  const reset = () => setData({
    periodLabel: "", period: "", currency: "KRW",
    revenue: 0, materialSpend: 0, costSave: 0, styles: 0, poCount: 0,
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 }
  });

  // 뉴스 탭
  const [newsTab, setNewsTab] = useState("korea");
  const goAISummary = () => { window.location.href = "/ai-summary"; };

  return (
    <>
      <Head>
        <title>Market Trend Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        {/* 헤더 */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Dashboard</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setOpenEdit(true)} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}>수기입력</button>
          </div>
        </header>

        {/* 1) KPI */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
          <KPI label="총 매출액" value={`${fmtNum(data.revenue, 0)} ${data.currency}`} />
          <KPI label="총 부자재매입액" value={`${fmtNum(data.materialSpend, 0)} ${data.currency}`} />
          <KPI label="총 Cost Save" value={`${fmtNum(data.costSave, 0)} ${data.currency}`} />
          <KPI label="총 오더수(스타일)" value={fmtNum(data.styles, 0)} />
        </section>

        {/* 2) AI 현황분석 */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <AICard title="AI 현황분석 — 지표" text={`• 매출/매입/Cost Save 추세 요약...
• YoY/전월대비 포인트...
• 리스크/기회…`} />
          <AICard title="AI 현황분석 — 공급현황" text={`• 국내 ${fmtNum(data.supplyBreakdown.domestic)}% · 3국 ${fmtNum(data.supplyBreakdown.thirdCountry)}% · 현지 ${fmtNum(data.supplyBreakdown.local)}%`} />
        </section>

        {/* 3) 뉴스 */}
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff", marginBottom: 16 }}>
          <div style={{ marginBottom: 6, fontWeight: 800 }}>뉴스</div>
          <NewsHeader
            active={newsTab}
            onTab={setNewsTab}
            onAISummary={goAISummary}
          />
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {newsTab === "korea" ? "국내 뉴스 목록 로드..." : "해외 뉴스 목록 로드..."}
          </div>
        </section>

        {/* 수기입력 폼 */}
        {openEdit && (
          <div style={{ marginTop: 12 }}>
            <ProcurementForm
              data={data}
              setData={setData}
              onSave={save}
              onClose={() => setOpenEdit(false)}
              onReset={reset}
            />
          </div>
        )}
      </main>
    </>
  );
}
