import { useState } from 'react';

export default function RetailerCard({ data }) {
  const [open, setOpen] = useState(false);             // 뉴스 리스트 토글
  const [sumOpen, setSumOpen] = useState(false);       // 요약 표시 토글
  const [sumLoading, setSumLoading] = useState(false); // 요약 로딩
  const [summary, setSummary] = useState('');          // 요약 결과
  const [sumError, setSumError] = useState('');        // 에러 문구

  const pct = (a, b) => (a != null && b != null && Number(b) !== 0)
    ? (((Number(a) - Number(b)) / Number(b)) * 100).toFixed(2) + '%'
    : '-';
  const changePct = pct(data.stock?.price, data.stock?.previousClose);
  const symbol = data.symbol;

  async function loadSummary() {
    try {
      setSumError('');
      setSumLoading(true);
      const r = await fetch(`/api/company-news-summary?symbol=${encodeURIComponent(symbol)}&lang=ko&limit=10`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to fetch summary');
      setSummary(j.summary || '(요약 없음)');
      setSumOpen(true);
    } catch (e) {
      setSumError(String(e));
      setSummary('');
      setSumOpen(true);
    } finally {
      setSumLoading(false);
    }
  }

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

            {/* AI 뉴스 요약: 클릭 시 이 카드 안에서 요약 표시 */}
            <button
              onClick={loadSummary}
              disabled={sumLoading}
              className="text-xs border px-2 py-1 rounded-lg bg-black text-white hover:opacity-90"
              title="최근 10개 뉴스 기준 전략 요약"
            >
              {sumLoading ? "요약 중..." : "AI뉴스요약"}
            </button>
          </div>

          {/* 토글 버튼: 기존 뉴스 리스트 */}
          <button
            onClick={() => setOpen(v => !v)}
            className="mt-2 text-xs text-slate-600 underline"
          >
            {open ? "뉴스 닫기" : "뉴스 보기"}
          </button>
        </div>
      </div>

      {/* 요약 블록 */}
      {sumOpen && (
        <div className="mt-3 p-3 rounded-lg border bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">AI 뉴스 요약</div>
            <button onClick={() => setSumOpen(false)} className="text-xs underline text-slate-600">닫기</button>
          </div>
          {sumError && <div className="text-xs text-red-600 mb-2">에러: {sumError}</div>}
          {!sumError && (
            <pre className="whitespace-pre-wrap text-sm leading-6 font-sans">{summary}</pre>
          )}
        </div>
      )}

      {/* 기존 뉴스 리스트 */}
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
