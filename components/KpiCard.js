// components/KpiCard.js
import dayjs from 'dayjs';

/**
 * 사용법
 * 1) 기존(레거시) 모드: <KpiCard title="WTI" value={78.3} sub="2025-09-01" />
 * 2) 프로 모드: <KpiCard title="WTI" unit="" data={obj} href="https://fred..." />
 *    - data 형태: { latest, date, prevPct, yoyPct, series: [{d,v}] }
 *    - href 가 있으면 카드 전체가 원본(예: FRED) 링크로 클릭 이동
 */

function formatNumber(v, decimals = 2) {
  if (v == null || Number.isNaN(v)) return '-';
  const n = Number(v);
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

// 가벼운 스파크라인 (SVG)
function Sparkline({ series = [], colorClass = 'text-emerald-600' }) {
  if (!series?.length) return <div className="h-9" />;
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

  const pathD = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-[120px] h-9 ${colorClass}`}>
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" />
      {last && <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" />}
    </svg>
  );
}

export default function KpiCard({
  // 공통
  title,

  // 레거시 모드 전용
  value,
  sub,

  // 프로 모드 전용
  unit = '',
  data,                 // { latest, date, prevPct, yoyPct, series:[{d,v}] }
  decimals = 2,
  hint,
  href                  // 존재하면 카드 전체가 링크
}) {
  const isPro = !!data;
  const updated = isPro
    ? (data?.date ? dayjs(data.date).format('YYYY-MM-DD') : '')
    : (sub || '');

  // 프로 모드 계산/색상
  const latest = isPro ? (data?.latest ?? null) : value;
  const prevPct = isPro ? (data?.prevPct ?? null) : null;
  const yoyPct  = isPro ? (data?.yoyPct ?? null)  : null;
  const series  = isPro ? (data?.series ?? [])    : [];

  const deltaClass = classFromDelta(prevPct);
  const sparkColor =
    deltaClass.includes('emerald') ? 'text-emerald-600'
    : deltaClass.includes('red') ? 'text-red-600'
    : 'text-slate-400';

  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href ? {
    href,
    target: "_blank",
    rel: "noreferrer noopener",
    className: "group relative overflow-hidden rounded-xl border border-line bg-white p-4 shadow-sm hover:shadow-md transition block focus:outline-none focus:ring-2 focus:ring-brand-500"
  } : {
    className: "group relative overflow-hidden rounded-xl border border-line bg-white p-4 shadow-sm hover:shadow-md transition"
  };

  return (
    <Wrapper {...wrapperProps} aria-label={href ? `${title} - 원본 데이터로 이동` : undefined}>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-800">{title}</div>
        <div className="text-[11px] text-slate-500">
          <span className="hidden sm:inline">Updated&nbsp;</span>{updated || '-'}
        </div>
      </div>

      {/* 본문 */}
      {isPro ? (
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-2xl font-extrabold">
              {formatNumber(latest, decimals)}{unit && <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>}
            </div>
            <div className={`mt-1 text-sm ${deltaClass}`}>
              <Arrow delta={prevPct} />
              {prevPct == null ? '-' : `${Math.abs(prevPct).toFixed(2)}%`} <span className="text-slate-400">vs Prev</span>
            </div>
            <div className={`text-xs ${classFromDelta(yoyPct)}`}>
              <Arrow delta={yoyPct} />
              {yoyPct == null ? '-' : `${Math.abs(yoyPct).toFixed(2)}%`} <span className="text-slate-400">YoY</span>
            </div>
          </div>
          <Sparkline series={series} colorClass={sparkColor} />
        </div>
      ) : (
        // 레거시 UI (기존 대시보드와 호환)
        <div className="mt-2">
          <div className="text-2xl font-extrabold">{formatNumber(value, 2)}</div>
          <div className="text-xs text-slate-500 mt-1">{sub || ''}</div>
        </div>
      )}

      {/* 보조설명/툴팁 */}
      {(hint || href) && (
        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
          {hint && <span>{hint}</span>}
          {href && <span className="ml-auto">원본 열기 ↗</span>}
        </div>
      )}

      {/* 호버 보조문구 */}
      {href && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-slate-900/90 px-2 py-1 text-[11px] text-white opacity-0 shadow-md transition group-hover:opacity-100">
          클릭 시 원본으로 이동
        </div>
      )}
    </Wrapper>
  );
}
