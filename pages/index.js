import { useEffect, useState } from 'react';

export default function Home() {
  const [indicators, setIndicators] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const indRes = await fetch('/api/indicators');
        if (indRes.ok) {
          setIndicators(await indRes.json());
        }
        const retailersList = ['WMT','TGT','KSS','VSCO','ANF','CRI','9983.T','AMZN','BABA'];
        const results = [];
        for (let sym of retailersList) {
          try {
            const sRes = await fetch(`/api/stocks?symbol=${sym}`);
            const stock = sRes.ok ? await sRes.json() : null;
            const nRes = await fetch(`/api/news?q=${encodeURIComponent(sym)}`);
            const news = nRes.ok ? await nRes.json() : [];
            results.push({symbol: sym, stock, news});
          } catch (err) {
            console.error('Error loading', sym, err);
          }
        }
        setRetailers(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{fontFamily: 'sans-serif', padding: '20px'}}>
      <h1>Market Trend Dashboard</h1>
      {loading && <p>Loading data...</p>}
      {indicators && (
        <div style={{marginBottom:'20px'}}>
          <h2>Indicators</h2>
          <pre>{JSON.stringify(indicators,null,2)}</pre>
        </div>
      )}
      {retailers.map(r => (
        <div key={r.symbol} style={{border:'1px solid #ccc',margin:'10px',padding:'10px'}}>
          <h3>{r.stock?.longName || r.symbol}</h3>
          <p>Price: {r.stock?.price} {r.stock?.currency}</p>
          <p>MarketCap: {r.stock?.marketCap}</p>
          <h4>News</h4>
          <ul>
            {r.news?.map((n,i)=>(<li key={i}>{n.title || n.url}</li>))}
          </ul>
        </div>
      ))}
    </div>
  );
}
