import { useState } from 'react';

export default function RetailerCard({ data }) {
  const [open, setOpen] = useState(false);
  const pct = (a, b) => (a && b) ? (((a - b) / b) * 100).toFixed(2) + '%' : '-';
  const changePct = pct(data.stock?.price, data.stock?.previousClose);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">{data.stock?.longName || data.symbol}</div>
          <div className="text-sm text-slate-500">{data.symbol} · {data.stock?.currency || ''}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold">{data.stock?.price ?? '-'}</div>
          <div className={"text-sm " + (String(changePct).startsWith('-') ? 'text-red-600' : 'text-emerald-600')}>{changePct}</div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={()=>setOpen(v=>!v)} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50">
          {open ? '뉴스 닫기' : '뉴스 보기'}
        </button>
        <a className="px-3 py-1.5 rounded-lg border hover:bg-slate-50" href={`https://finance.yahoo.com/quote/${encodeURIComponent(data.symbol)}`} target="_blank" rel="noreferrer">Yahoo</a>
      </div>

      {open && (
        <ul className="mt-3 list-disc pl-6 space-y-1">
          {(data.news || []).map((n, i) => (
            <li key={i}>
              <a href={n.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{n.title || n.url}</a>
            </li>
          ))}
          {(!data.news || data.news.length===0) && <li className="text-slate-500">뉴스 없음</li>}
        </ul>
      )}
    </div>
  );
}
