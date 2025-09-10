// pages/daily-report.js
import React, { useEffect, useState } from "react";
import Head from "next/head";

export default function DailyReport() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/daily-report", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "리포트 생성 오류");
        setState({ loading: false, error: "", data: j });
      } catch (e) {
        setState({ loading: false, error: String(e), data: null });
      }
    })();
  }, []);

  return (
    <>
      <Head>
        <title>AI Daily Report</title>
      </Head>
      <main className="s-pages-daily-report-js-auto1" style={{{rest}}}>
        <h1 className="s-pages-daily-report-js-auto2">
          🤖 Hansoll AI Daily Report
        </h1>
        {state.loading && <div>생성 중…</div>}
        {state.error && <div className="s-pages-daily-report-js-auto3">오류: {state.error}</div>}
        {state.data && (
          <>
            <div className="s-pages-daily-report-js-auto4">
              생성시각: {new Date(state.data.generatedAt).toLocaleString("ko-KR")}
              {state.data?.meta?.indicatorsUpdated
                ? ` · 지표 업데이트: ${new Date(
                    state.data.meta.indicatorsUpdated
                  ).toLocaleString("ko-KR")}`
                : ""}
            </div>
            <article
              className="s-pages-daily-report-js-article"
              dangerouslySetInnerHTML={{ __html: mdToHtml(state.data.narrative) }}
            />
          </>
        )}
      </main>
    </>
  );
}

// 아주 간단한 Markdown -> HTML (헤더•리스트만)
function mdToHtml(md) {
  let html = md || "";
  // 헤더
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // 리스트 아이템
  html = html.replace(/^\s*-\s+(.*)$/gm, "<li>$1</li>");
  // 연속된 <li> 그룹을 <ul>로 감싸기 (dotAll 없이 안전하게)
  html = html.replace(/(?:<li>[\s\S]*?<\/li>)+/g, (m) => `<ul>${m}</ul>`);
  // 개행 처리
  html = html.replace(/\n/g, "<br/>");
  return html;
}

const styles = {
  article: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 },
};
