import React from "react";
import clsx from "clsx";

export default function NewsHeader({ active, onTab, onAISummary, loading=false }) {
  const tab = (t) => clsx("btn", active===t ? "btn-primary" : "btn-ghost");
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button className={tab("foreign")} onClick={()=>onTab && onTab("foreign")}>해외뉴스</button>
      <button className={tab("korea")} onClick={()=>onTab && onTab("korea")}>국내뉴스</button>
      <button className="btn btn-primary" onClick={()=>onAISummary && onAISummary()} disabled={loading}>
        {loading ? "요약 중…" : "AI 요약"}
      </button>
    </div>
  );
}
