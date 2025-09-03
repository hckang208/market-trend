import { useEffect, useState } from 'react';
import KpiCard from '../components/KpiCard';

export default function Home() {
  const [ind, setInd] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [insight, setInsight] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const [deck, setDeck] = useState([]);
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsInsight, setNewsInsight] = useState("");
  const [newsAiBusy, setNewsAiBusy] = useState(false);

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

  async function loadNewsDeck() {
    if (newsBusy) return;
    try {
      setNewsBusy(true);
      setNewsInsight("");
      const seen = new Set();
      const merged = [];

      for (const r of list) {
        const q = r?.stock?.longName || r.symbol;
        try {
          const res = await fetch(`/api/news?q=${encodeURIComponent(q)}`);
          if (!res.ok) continue;
          const arr = await res.json();
          for (const n of (arr || []).slice(0, 3)) {
            const key = n?.url || n?.title;
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push({
              symbol: r.symbol,
              name: r?.stock?.longName || r.symbol,
              title: n?.title || n?.url || '(제목 없음)',
              url: n?.url || '#',
              source: (n?.provider && (n.provider[0]?.name || n.provider?.name)) || n?.source || '',
              published: n?.datePublished || n?.date || ''
            });
          }
          await new Promise(res => setTimeout(res, 300));
        } catch (e) {
          console.warn('news error for', q, e);
        }
      }

      merged.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
      setDeck(merged);
    } finally {
      setNewsBusy(false);
    }
  }

  async function generateNewsInsights() {
    if (!deck.length) {
      setNewsInsight("먼저 ‘뉴스 모아보기’를 눌러 뉴스를 로드하세요.");
      return;
    }
    try {
      setNewsAiBusy(true);
      const retailersForSummary = list.map(r => {
        const news = deck.filter(d => d.symbol === r.symbol).map(d => ({ title: d.title, url: d.url }));
        return { ...r, news };
      });
      const body = JSON.stringify({ indicators: ind, retailers: retailersForSummary });
      const r = await fetch('/api/analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!r.ok) {
        const t = await r.text();
        setNewsInsight(`AI 뉴스 요약 실패: ${t}`);
        return;
      }
      const j = await r.json();
      setNewsInsight(j.summary || "");
    } catch (e) {
      setNewsInsight(`AI 뉴스 요약 실패: ${e.message}`);
    } finally {
      setNewsAiBusy(false);
    }
  }

  const pctChange = (price, prev) => {
    if (price == null || prev == null || prev === 0) return null;
    return ((price - prev) / prev) * 100;
  };

  return (
    <div>
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-line">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/hansoll-logo.svg" alt="Hansoll" className="h-7 w-auto" />
            <div className="font-black text-xl">Market Trend</div>
          </div>
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

        {/* 금리/스프레드 */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          <KpiCard title="미국 기준금리 (Fed Funds, %)" value={ind?.fedfunds?.latest} sub={ind?.fedfunds?.date} />
          <KpiCard title="미국 10년물 국채(%, DGS10)" value={ind?.dgs10?.latest} sub={ind?.dgs10?.date} />
          <KpiCard title="미국 2년물 국채(%, DGS2)" value={ind?.dgs2?.latest} sub={ind?.dgs2?.date} />
          <KpiCard title="금리 스프레드(10Y–2Y, bp)" value={ind?.t10y2y?.latest} sub={ind?.t10y2y?.date} />
        </div>

        {/* 리테일 수요 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <KpiCard title="미국 소매판매 (총액)" value={ind?.retail_sales_total?.latest} sub={ind?.retail_sales_total?.date} />
          <KpiCard title="의류·액세서리 매출" value={ind?.retail_sales_clothing?.latest} sub={ind?.retail_sales_clothing?.date} />
        </div>

        {/* 일일 등락률 요약 */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">2.일일 주요 Retailer 주가 등락률</h2>
            <div className="text-sm text-slate-500">카드를 클릭하면 Yahoo Finance로 이동</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
            {list.map((r) => {
              const price = r.stock?.price ?? null;
              const prev = r.stock?.previousClose ?? null;

              const pct =
                (r.stock?.changePercent != null)
                  ? Number(r.stock.changePercent)
                  : (r.stock?.change != null && price != null && (price - Number(r.stock.change)) !== 0)
                    ? (Number(r.stock.change) / (price - Number(r.stock.change))) * 100
                    : pctChange(price, prev);

              const color = pct == null ? 'text-slate-500' : (pct >= 0 ? 'text-emerald-600' : 'text-red-600');
              const sign = pct == null ? '' : (pct >= 0 ? '▲ ' : '▼ ');
              const pctText = pct == null ? '-' : `${sign}${Math.abs(pct).toFixed(2)}%`;
              const link = `https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`;

              return (
                <a
                  key={`pct-${r.symbol}`}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="block card p-4 hover:shadow-lg transition border border-line rounded-xl"
                >
                  <div className="text-xs text-slate-500">{r.symbol}</div>
                  <div className="text-sm font-semibold truncate">{r.stock?.longName || r.symbol}</div>
                  <div className="mt-2 text-lg font-extrabold">{price ?? '-'}</div>
                  <div className={`text-sm ${color}`}>{pctText}</div>
                </a>
              );
            })}
          </div>
        </div>

        {/* AI Insight (전체 데이터 요약) */}
        <div className="card p-5 mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">AI 인사이트 (임원 보고용 요약)</h2>
            <button
              onClick={generateInsights}
              disabled={aiBusy}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {aiBusy ? '분석 중…' : '최신 인사이트 생성'}
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1">현재 표시된 지표·주가·헤드라인을 바탕으로 요약합니다.</p>
          <div className="mt-3 whitespace-pre-wrap">{insight || '버튼을 눌러 AI 분석을 생성하세요.'}</div>
        </div>

        {/* 뉴스 모음 + 뉴스 AI 요약 */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">주요 retailer 관련 뉴스 모음</h2>
            <div className="flex gap-2">
              <button
                onClick={loadNewsDeck}
                disabled={newsBusy}
                className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-50"
              >
                {newsBusy ? '뉴스 수집 중…' : '뉴스 모아보기'}
              </button>
              <button
                onClick={generateNewsInsights}
                disabled={newsAiBusy}
                className="px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {newsAiBusy ? '요약 중…' : '뉴스 AI 요약'}
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">각 종목 상위 뉴스 3개씩을 수집해 최신순으로 정리합니다. (중복 제거)</p>

          <div className="mt-3 space-y-3">
            {deck.length === 0 && !newsBusy && (
              <div className="text-slate-500 text-sm">아직 뉴스가 없습니다. “뉴스 모아보기”를 눌러 로드하세요.</div>
            )}
            {deck.map((n, idx) => (
              <a
                key={idx}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block card p-4 hover:shadow-lg transition border border-line rounded-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs px-2 py-0.5 rounded-full border bg-white">{n.symbol}</div>
                  <div className="text-xs text-slate-500">
                    {n.source || ''}{n.published ? ` · ${new Date(n.published).toLocaleString()}` : ''}
                  </div>
                </div>
                <div className="mt-1 font-semibold">{n.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{n.name}</div>
              </a>
            ))}
          </div>

          {newsInsight && (
            <div className="card p-5 mt-4">
              <h3 className="text-lg font-bold">뉴스 기반 AI 요약</h3>
              <div className="mt-2 whitespace-pre-wrap">{newsInsight}</div>
            </div>
          )}
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
