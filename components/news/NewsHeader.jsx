import React from "react";

export default function NewsHeader({ active, onTab, onAISummary }) {
  const wrap = { display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" };
  const btn = (is) => ({
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid " + (is ? "#111827" : "#e5e7eb"),
    background: is ? "#111827" : "#fff",
    color: is ? "#fff" : "#111827",
    cursor: "pointer"
  });
  return (
    <div style={wrap}>
      <button style={btn(active==="foreign")} onClick={() => onTab("foreign")}>해외뉴스</button>
      <button style={btn(active==="korea")} onClick={() => onTab("korea")}>국내뉴스</button>
      <button style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff"}} onClick={onAISummary}>
        AI 요약
      </button>
    </div>
  );
}
