// components/KpiProCard.jsx
import dayjs from 'dayjs';

function formatNumber(v, decimals = 2) {
  if (v == null || Number.isNaN(v)) return '-';
  const n = Number(v);
  // 큰 수는 간단 압축 (k, M, B)
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(decimals) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(decimals) + 'k';
  return n.toFixed(decimals);
}

function classFromDelta(delta) {
  if (delta == null) return 'text-slate-500';
  return delta >= 0 ? 'text-emerald-600' : 'text-red-600';
}

function Arrow({ delta }) {
  if (delta == null) return null;
  return <span className="mr-1">{delta >= 0 ? '▲' : '▼'}</span>;
}

// 아주 가벼운 스파크라인 (SVG)
function Sparkline({ series = [], colorClass = 'text-emerald-600' }) {
  if (!series.length) {
    return <div className="h-9" />;
  }
  const w = 120, h = 36, pad = 2;
  const vals = series.map(d => Number(d.v)).filter(v => !Number.isNaN(v));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = (max - min) || 1;

  const pts = series.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
    const y = h - pad - ((Number(d.v) - min) / span) * (h - pad * 2);
    return [x, y];
  });

  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-[120px] h-9 ${colorClass}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      {last && <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" />}
    </svg>
  );
}

export default function KpiProCard({
  title,
  unit = '',
  data,                 // { latest, date, prev, prevPct, yoyBase, yoyPct, series:[{d,v}] }
  decimals = 2,
  hint,                 // 하단 보조 라벨 (예: 'bp', '% YoY 기준' 등)
}) {
  const latest = data?.latest ?? null;
  const prevPct = data?.prevPct ?? null;
  const yoyPct = data?.yoyPct ?? null;
  const series = data?.series ?? [];
  const updated = data?.date ? dayjs(data.date).format('YYYY-MM-DD') : '';

  const deltaClass = classFromDelta(prevPct);
  const yoyClass = classFromDelta(yoyPct);
  const sparkColor = deltaClass.includes('emerald') ? 'text-emerald-600' : (deltaClass.includes('red') ? 'text-red-600' : 'text-slate-400');

  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-white p-4 shadow-sm hover:shadow-md transition">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-800">{title}</div>
        <div className="text-[11px] text-slate-500">
          <span className="hidden sm:inline">Updated&nbsp;</span>{updated || '-'}
        </div>
      </div>

      {/* 값 + 전일/전월 변화율 */}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-extrabold">
            {formatNumber(latest, decimals)}{unit && <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>}
          </div>
          <div className={`mt-1 text-sm ${deltaClass}`}>
            <Arrow delta={prevPct} />
            {prevPct == null ? '-' : `${Math.abs(prevPct).toFixed(2)}%`} <span className="text-slate-400">vs Prev</span>
          </div>
          <div className={`text-xs ${yoyClass}`}>
            <Arrow delta={yoyPct} />
            {yoyPct == null ? '-' : `${Math.abs(yoyPct).toFixed(2)}%`} <span className="text-slate-400">YoY</span>
          </div>
        </div>

        {/* 스파크라인 */}
        <Sparkline series={series} colorClass={sparkColor} />
      </div>

      {/* 툴팁/보조설명 */}
      {(hint || '').length > 0 && (
        <div className="mt-2 text-[11px] text-slate-500">{hint}</div>
      )}

      {/* 호버 시 부가정보 */}
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-slate-900/90 px-2 py-1 text-[11px] text-white opacity-0 shadow-md transition group-hover:opacity-100">
        Prev/YoY는 최신 관측치 기준 자동 산출
      </div>
    </div>
  );
}
