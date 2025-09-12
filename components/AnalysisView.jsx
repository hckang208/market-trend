// components/AnalysisView.jsx
import React from "react";
import Head from "next/head";

export default function AnalysisView({
  pageTitle = "AI Analysis — Hansol MI",
  title,
  subtitle,
  bullets = [],
  summary = "",
  meta = {},           // { model, lastUpdated, articlesUsed, note }
  backHref = null,     // 예: "/"
  rightSlot = null,    // 우측 상단 custom 버튼/slot
  footerSlot = null,   // 하단 custom 영역
}) {
  const lines =
    typeof summary === "string"
      ? summary.split(/\n+/).map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {meta?.model && (
                <span className="text-xs px-2 py-1 rounded border">
                  model: {meta.model}
                </span>
              )}
              {meta?.articlesUsed != null && (
                <span className="text-xs px-2 py-1 rounded border">
                  articles: {meta.articlesUsed}
                </span>
              )}
              {meta?.lastUpdated && (
                <span className="text-xs px-2 py-1 rounded border">
                  updated: {meta.lastUpdated}
                </span>
              )}
              {meta?.note && (
                <span className="text-xs px-2 py-1 rounded border">
                  {meta.note}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rightSlot}
            {backHref && (
              <a
                href={backHref}
                className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
              >
                ← Back
              </a>
            )}
          </div>
        </div>

        {/* Body: 2 columns on wide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bullets */}
          <section className="border rounded-lg p-4">
            <h2 className="font-medium mb-3">핵심 요약</h2>
            {bullets?.length ? (
              <ul className="list-disc pl-5 space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="text-sm leading-6">{b}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">요약 항목이 없습니다.</p>
            )}
          </section>

          {/* Summary */}
          <section className="border rounded-lg p-4">
            <h2 className="font-medium mb-3">요약 전문</h2>
            {lines.length ? (
              <div className="space-y-2">
                {lines.map((ln, i) => (
                  <p key={i} className="text-sm leading-6">{ln}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                표시할 텍스트 요약이 없습니다.
              </p>
            )}
          </section>
        </div>

        {/* Footer slot */}
        {footerSlot && <div className="mt-6">{footerSlot}</div>}
      </div>

      {/* 기본 유틸 클래스 (Tailwind 없을 경우 대비용) */}
      <style jsx global>{`
        .max-w-5xl { max-width: 64rem; }
        @media (min-width: 768px) {
          .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </>
  );
}
