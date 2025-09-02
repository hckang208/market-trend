import { useEffect, useState } from 'react';
import KpiCard from '../components/KpiCard';
import RetailerCard from '../components/RetailerCard';

export default function Home() {
  const [ind, setInd] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div>
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-line">
        <div className="container flex items-center justify-between">
          <div className="font-black text-xl">Market Trend</div>
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

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">주요 리테일러</h2>
          <div className="text-sm text-slate-500">클릭 시 뉴스 로딩</div>
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
