import { useState } from 'react';

export default function RetailerCard({ data }) {
  const [open, setOpen] = useState(false);
  const pct = (a, b) => (a != null && b != null && Number(b) !== 0)
    ? (((Number(a) - Number(b)) / Number(b)) * 100).toFixed(2) + '%'
    : '-';
  const changePct = pct(data.stock?.price, data.stock?.previousClose);
  const symbol = data.symbol;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">{data.stock?.longName || symbol}</div>
          <div className="text-sm text-slate-500">{symbol} · {data.stock?.currency || ''}</div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <div className="text-2xl font-extrabold">{data.stock?.price ?? '-'}</div>
            <div className={"text-sm " + ((changePct && changePct !== '-' && !String(changePct).startsWith('-')) ? "text-green-600" : "text-red-600")}>
              {changePct}
            </div>

            {/* Yahoo Finance 링크 */}
            <a
              href={`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs border px-2 py-1 rounded-lg hover:underline"
            >
              Yahoo
            </a>

            {/* AI 뉴스 요약 링크 */}
            <a
              href={`/company/${encodeURIComponent(symbol)}`}
              className="text-xs border px-2 py-1 rounded-lg bg-black text-white hover:opacity-90"
            >
              AI뉴스요약
            </a>
          </div>

          {/* 토글 버튼 */}
          <button
            onClick={() => setOpen(v => !v)}
            className="mt-2 text-xs text-slate-600 underline"
          >
            {open ? "뉴스 닫기" : "뉴스 보기"}
          </button>
        </div>
      </div>

      {open && (
        <ul className="mt-3 list-disc pl-6 space-y-1">
          {(data.news || []).map((n, i) => (
            <li key={i}>
              <a href={n.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {n.title || n.url}
              </a>
            </li>
          ))}
          {(!data.news || data.news.length===0) && <li className="text-slate-500">뉴스 없음</li>}
        </ul>
      )}
    </div>
  );
}
