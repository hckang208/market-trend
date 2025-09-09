import { useEffect, useState } from "react";

export default function ProcurementDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/procure-sheet");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  if (error) {
    return <div className="text-sm text-red-600">조달 데이터 로딩 실패: {error}</div>;
  }

  if (!data) return <div className="text-sm text-slate-500">조달 데이터를 불러오는 중...</div>;

  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.slice(0, 6).map((it, idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{it?.label ?? "지표"}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{it?.value ?? "-"}</div>
          {it?.delta != null && (
            <div className={"mt-1 text-xs " + (it.delta >= 0 ? "text-red-600" : "text-emerald-600")}>
              {it.delta >= 0 ? "▲" : "▼"} {Math.abs(it.delta)}
            </div>
          )}
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-sm text-slate-500">표시할 조달 항목이 없습니다.</div>
      )}
    </div>
  );
}
