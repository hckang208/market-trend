import { useEffect, useState } from "react";

export default function MarketIndicators() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/indicators");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  if (error) return <div className="text-sm text-red-600">지표 로딩 실패: {error}</div>;
  if (!data) return <div className="text-sm text-slate-500">지표를 불러오는 중...</div>;

  const fields = [
    { key: "usdkrw", label: "USD/KRW" },
    { key: "wti", label: "WTI" },
    { key: "cotton", label: "Cotton" },
    { key: "scfi", label: "SCFI" },
    { key: "usd", label: "DXY" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {fields.map((f) => (
        <div key={f.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{f.label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {data?.[f.key]?.value ?? data?.[f.key] ?? "-"}
          </div>
          {data?.[f.key]?.date && (
            <div className="mt-1 text-[11px] text-slate-400">{data[f.key].date}</div>
          )}
        </div>
      ))}
    </div>
  );
}
