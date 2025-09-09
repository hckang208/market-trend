export default function KPI({ label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-sub">{label}</div>
      <div className="kpi mt-1">{value ?? '-'}</div>
      {sub ? <div className="text-xs text-sub mt-1">{sub}</div> : null}
    </div>
  );
}
