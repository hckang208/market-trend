// components/AnalysisPanel.js
import React from "react";

/**
 * Unified Analysis UI panel
 * Props:
 *  - title: string
 *  - loading: boolean
 *  - error: string
 *  - summary: string
 *  - onBack: function (optional)
 *  - updatedAt: string (ISO, optional)
 */
export default function AnalysisPanel({
  title = "AI 분석",
  loading = false,
  error = "",
  summary = "",
  onBack = null,
  updatedAt = "",
}) {
  return (
    <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-black text-white">AI</div>
          <h2 className="text-[15px] font-extrabold tracking-tight m-0">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt ? (
            <span className="text-[11px] text-slate-500">
              {new Date(updatedAt).toLocaleString()}
            </span>
          ) : null}
          {onBack ? (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onBack?.();
              }}
              className="text-[12px] text-slate-600 underline"
            >
              뒤로
            </a>
          ) : null}
        </div>
      </div>

      {loading && <div className="text-[13px] text-slate-600">요약을 불러오는 중…</div>}
      {!loading && error && <div className="text-[13px] text-red-600">에러: {error}</div>}
      {!loading && !error && (
        <div className="whitespace-pre-wrap break-words leading-7 text-[14px] tracking-[0.1px]">
          {summary || "—"}
        </div>
      )}
    </div>
  );
}
