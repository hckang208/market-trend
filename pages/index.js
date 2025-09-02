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

  // (백업 계산기 – API가 퍼센트를 못 줄 때만 사용)
  const pctChange = (price, prev) => {
    if (price == null || prev == null || prev === 0) return null;
    return ((price - prev) / prev) * 100;
  };

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

        {/* 일일 등락률 요약 */}
        <div className="mt-8">
          <div className="flex items-center j
