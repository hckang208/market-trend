import React from "react";
import clsx from "clsx";

export default function NewsHeader({ active, onTab, onAISummary }) {
  const tab = (t) => clsx("btn", active===t ? "btn-primary" : "btn-ghost");
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button className={tab("foreign")} onClick={()=>onTab("foreign")}>해외뉴스</button>
      <button className={tab("korea")} onClick={()=>onTab("korea")}>국내뉴스</button>
      <button className="btn btn-primary" onClick={onAISummary}>AI 요약</button>
    </div>
  );
}