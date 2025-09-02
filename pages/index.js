import { useEffect, useState } from 'react';
import KpiCard from '../components/KpiCard';
import RetailerCard from '../components/RetailerCard';

export default function Home() {
  const [ind, setInd] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const symbols = ['WMT','TGT','KSS','VSCO','ANF','CRI','9983.T','AMZN','BABA'];

  useEffect(() => {
    (async () => {
      try {
        const indRes = await fetch('/api/indicators');
        if (indRes.ok) setInd(await indRes.json());

        const out = [];
        for (const s of symbols) {
          const sRes = await fetch(`/api/stocks?symbol=${s}`);
          const stock = sRes.ok ? await sRes.json() : null;
          out.push({ symbol: s, stock, news: [] });
        }
        setList(out);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadNews(s) {
    const nRes = await fetch(`/api/news?q=${encodeURIComponent(s)}`);
    if (!nRes.ok) return;
    const news = await nRes.json();
    setList(prev => prev.map(r => r.symbol===s ? { ...r, news } : r));
  }

  async function generateInsights() {
    try {
      setAiBusy(true);
      const body = JSON.stringify({ indicators: ind, retailers: list });
      const r = await fetch('/api/analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!r.ok) {
        const t = await r.text();
        setInsight(`AI 분석 실패: ${t}`);
        return;
      }
      const j = await r.json();
      setInsight(j.summary || "");
    } catch (e) {
      setInsight(`AI 분석 실패: ${e.message}`);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div>
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-line">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3"><img src="/hansoll-logo.svg" alt="Hansoll" className="h-7 w-auto" /><div className="font-black text-xl">Market Trend</div></div>
          <nav className="text-sm text-slate-600 flex gap-4">
            <a href="#" className="hover:text-ink">Dashboard</a>
            <a href="https://vercel.com" target="_blank" rel="noreferrer" className="hover:text-ink">Deploy</a>
          </nav>
        </div>
      </header>

      <main className="container">
        <h1 className="text-2xl font-black mb-4">구매시황 Dashboard</h1>
        <p className="muted mb-6">주요 지표와 리테일러 주가를 한 곳에서 확인하세요.</p>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard title="WTI (USD/bbl)" value={ind?.wti?.latest} sub={ind?.wti?.date} />
          <KpiCard title="USD/KRW" value={ind?.usdkrw?.latest} sub={ind?.usdkrw?.date} />
          <KpiCard title="US CPI (Index)" value={ind?.cpi?.latest} sub={ind?.cpi?.date} />
        </div>

        {/* AI Insight */}
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">AI 인사이트 (임원 보고용 요약)</h2>
            <button onClick={generateInsights} disabled={aiBusy} className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
              {aiBusy ? '분석 중…' : '최신 인사이트 생성'}
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1">현재 표시된 지표·주가·헤드라인을 바탕으로 요약합니다.</p>
          <div className="mt-3 whitespace-pre-wrap">{insight || '버튼을 눌러 AI 분석을 생성하세요.'}</div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">주요 리테일러</h2>
          <div className="text-sm text-slate-500">카드에 마우스를 올리면 뉴스 로딩</div>
        </div>

        {/* Retailers */}
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          {list.map((r) => (
            <div key={r.symbol} onMouseEnter={()=>!r.news?.length && loadNews(r.symbol)}>
              <RetailerCard data={r} />
            </div>
          ))}
        </div>

        {loading && <div className="mt-8 text-slate-500">데이터 불러오는 중…</div>}
      </main>

      <footer className="mt-10 border-t border-line">
        <div className="container text-center text-sm text-slate-500 py-6">
          © Market Trend — internal pilot
        </div>
      </footer>
    </div>
  );
}
