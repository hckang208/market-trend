export default function KpiCard({ title, value, sub }) {
  return (
    <div className="kpi">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-extrabold mt-1">{value ?? '-'}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
