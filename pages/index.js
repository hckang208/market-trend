// pages/index.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import Head from "next/head";

const FOREIGN_DOMAINS = process.env.NEXT_PUBLIC_FOREIGN_NEWS_DOMAINS || "businessoffashion.com,just-style.com";

/* =========================
   Utilities
========================= */
const fmtNum = (n, d = 2) => {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
};

const fmtSignPct = (n, d = 2) => {
  const v = Number(n);
  if (!isFinite(v)) return "0.00%";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(d)}%`;
};

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/* =========================
   AI Analysis Component
========================= */
function AIAnalysisPanel({ block, payload, title = "AI Intelligence Brief" }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ts, setTs] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!payload) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block,
            language: "ko",
            mode: "brief",
            data: payload,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Analysis failed");
        setText(j.summary || "");
        setTs(new Date().toISOString());
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [block, JSON.stringify(payload || {})]);

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-title">
          <span className="ai-icon">✨</span>
          {title}
        </div>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="ai-toggle"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          )}
        </button>
      </div>
      
      {expanded && (
        <div className="ai-content">
          {loading ? (
            <div className="ai-loading">
              <div className="pulse-dot"></div>
              <span>Analyzing with Gemini 2.5...</span>
            </div>
          ) : err ? (
            <div className="ai-error">Analysis unavailable</div>
          ) : (
            <>
              <div className="ai-text">{text || "No insights available"}</div>
              {ts && (
                <div className="ai-meta">
                  Generated {new Date(ts).toLocaleTimeString("ko-KR", { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: "Asia/Seoul" 
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   Header Component
========================= */
function HeaderBar() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-logo">H</div>
          <div>
            <div className="brand-name">Hansol Intelligence</div>
            <div className="brand-sub">Market Trend Analysis</div>
          </div>
        </div>
        <div className="header-meta">
          <div className="header-time">
            {time.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            <span className="time-divider">·</span>
            {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>
    </header>
  );
}

/* =========================
   Procurement Dashboard
========================= */
function ProcurementDashboard() {
  const LS_KEY = "procure.dashboard.v1";
  const defaultData = {
    currency: "USD",
    period: "Monthly",
    periodLabel: new Date().toISOString().slice(0,7),
    revenue: 0,
    materialSpend: 0,
    styles: 0,
    poCount: 0,
    costSave: 0,
    supplyBreakdown: { domestic: 40, thirdCountry: 35, local: 25 },
  };

  const [data, setData] = useState(defaultData);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/procure-sheet", { cache: "no-store" });
        const j = await r.json();
        if (j?.ok && j.data) {
          setData(prev => ({ ...prev, ...j.data }));
          return;
        }
      } catch {}
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setData(prev => ({ ...prev, ...JSON.parse(raw) }));
      } catch {}
    })();
  }, []);

  const ratio = useMemo(() => {
    const r = Number(data.revenue || 0);
    const m = Number(data.materialSpend || 0);
    if (r <= 0) return 0;
    return clamp((m / r) * 100, 0, 100);
  }, [data]);

  const supply = useMemo(() => {
    const d = Number(data.supplyBreakdown.domestic || 0);
    const t = Number(data.supplyBreakdown.thirdCountry || 0);
    const l = Number(data.supplyBreakdown.local || 0);
    const sum = d + t + l || 1;
    return {
      domestic: clamp((d / sum) * 100),
      thirdCountry: clamp((t / sum) * 100),
      local: clamp((l / sum) * 100),
    };
  }, [data]);

  const fmtCurrency = (value, currency = "USD") => {
    const num = Number(value || 0);
    if (currency === "KRW") {
      return new Intl.NumberFormat("ko-KR", { 
        style: "currency", 
        currency: "KRW", 
        maximumFractionDigits: 0 
      }).format(num);
    }
    return new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD", 
      maximumFractionDigits: 0 
    }).format(num);
  };

  const MetricCard = ({ label, value, change, trend, accent }) => (
    <div className={`metric-card ${accent ? 'metric-accent' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {change && (
        <div className={`metric-change ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : ''}`}>
          {trend === 'up' && '↑'} {trend === 'down' && '↓'} {change}
        </div>
      )}
    </div>
  );

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Procurement Intelligence</h2>
          <div className="section-meta">
            {data.periodLabel} · {data.period} · {data.currency}
          </div>
        </div>
        <button 
          onClick={() => setEditMode(!editMode)} 
          className="btn-icon"
          title="Configure"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
          </svg>
        </button>
      </div>

      <div className="metrics-grid">
        <MetricCard 
          label="Total Revenue" 
          value={fmtCurrency(data.revenue, data.currency)}
        />
        <MetricCard 
          label="Material Spend" 
          value={fmtCurrency(data.materialSpend, data.currency)}
        />
        <MetricCard 
          label="Spend Ratio" 
          value={`${ratio.toFixed(1)}%`}
          accent
        />
        <MetricCard 
          label="Cost Savings" 
          value={fmtCurrency(data.costSave, data.currency)}
          trend="up"
        />
        <MetricCard 
          label="Active POs" 
          value={fmtNum(data.poCount, 0)}
        />
      </div>

      <div className="supply-viz">
        <div className="viz-header">
          <h3 className="viz-title">Supply Chain Distribution</h3>
        </div>
        <div className="supply-bars">
          <div className="supply-bar">
            <div className="bar-label">
              <span>Domestic</span>
              <span className="bar-value">{supply.domestic.toFixed(1)}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill bar-domestic" style={{ width: `${supply.domestic}%` }}></div>
            </div>
          </div>
          <div className="supply-bar">
            <div className="bar-label">
              <span>Third Country</span>
              <span className="bar-value">{supply.thirdCountry.toFixed(1)}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill bar-third" style={{ width: `${supply.thirdCountry}%` }}></div>
            </div>
          </div>
          <div className="supply-bar">
            <div className="bar-label">
              <span>Local</span>
              <span className="bar-value">{supply.local.toFixed(1)}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill bar-local" style={{ width: `${supply.local}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <AIAnalysisPanel 
        block="procurement" 
        payload={{ ...data, ratio, supply }}
        title="Procurement Analysis"
      />

      {editMode && (
        <div className="edit-panel">
          <div className="edit-grid">
            <input 
              type="number" 
              value={data.revenue} 
              onChange={e => setData(d => ({ ...d, revenue: Number(e.target.value) }))}
              placeholder="Revenue"
            />
            <input 
              type="number" 
              value={data.materialSpend} 
              onChange={e => setData(d => ({ ...d, materialSpend: Number(e.target.value) }))}
              placeholder="Material Spend"
            />
            <input 
              type="number" 
              value={data.costSave} 
              onChange={e => setData(d => ({ ...d, costSave: Number(e.target.value) }))}
              placeholder="Cost Save"
            />
            <input 
              type="number" 
              value={data.poCount} 
              onChange={e => setData(d => ({ ...d, poCount: Number(e.target.value) }))}
              placeholder="PO Count"
            />
          </div>
          <button 
            onClick={() => {
              localStorage.setItem(LS_KEY, JSON.stringify(data));
              setEditMode(false);
            }} 
            className="btn-primary"
          >
            Save Configuration
          </button>
        </div>
      )}
    </section>
  );
}

/* =========================
   Market Indicators
========================= */
function MarketIndicators() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/indicators", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load indicators");
        setState({ loading: false, data: j, error: "" });
      } catch (e) {
        setState({ loading: false, data: null, error: String(e) });
      }
    })();
  }, []);

  const indicators = [
    { key: "wti", title: "WTI Crude", unit: "$/bbl", critical: true },
    { key: "usdkrw", title: "USD/KRW", unit: "", critical: true },
    { key: "cpi", title: "US CPI", unit: "Index" },
    { key: "fedfunds", title: "Fed Rate", unit: "%" },
    { key: "t10y2y", title: "Yield Spread", unit: "bp" },
    { key: "inventory_ratio", title: "Inventory/Sales", unit: "" },
    { key: "ism_retail", title: "ISM Retail", unit: "%" },
    { key: "unemployment", title: "Unemployment", unit: "%" },
  ];

  const Sparkline = ({ series = [], trend }) => {
    if (!series || series.length < 2) return null;
    const width = 80, height = 30;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const step = width / (series.length - 1);
    const pts = series.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * height;
      return `${x},${y}`;
    }).join(" ");
    
    return (
      <svg width={width} height={height} className="sparkline">
        <polyline 
          fill="none" 
          stroke={trend >= 0 ? "#10b981" : "#ef4444"} 
          strokeWidth="2" 
          points={pts} 
        />
      </svg>
    );
  };

  if (state.loading) {
    return (
      <section className="dashboard-section">
        <h2 className="section-title">Market Indicators</h2>
        <div className="loading-skeleton">
          <div className="skeleton-pulse"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2 className="section-title">Market Indicators</h2>
        <div className="section-meta">
          Live from FRED · Updated hourly
        </div>
      </div>

      <div className="indicators-grid">
        {indicators.map(ind => {
          const node = state.data?.[ind.key] || {};
          const value = node.value ?? null;
          const change = node.changePercent ?? null;
          const yoy = node.yoyPercent ?? null;
          const series = node.history || [];
          
          return (
            <div key={ind.key} className={`indicator-card ${ind.critical ? 'indicator-critical' : ''}`}>
              <div className="indicator-header">
                <div className="indicator-title">{ind.title}</div>
                {ind.critical && <span className="indicator-badge">KEY</span>}
              </div>
              <div className="indicator-value">
                {value !== null ? fmtNum(value) : "—"}
                {ind.unit && <span className="indicator-unit">{ind.unit}</span>}
              </div>
              <div className="indicator-changes">
                {change !== null && (
                  <span className={`indicator-change ${change >= 0 ? 'positive' : 'negative'}`}>
                    {fmtSignPct(change)}
                  </span>
                )}
                {yoy !== null && (
                  <span className="indicator-yoy">
                    YoY {fmtSignPct(yoy)}
                  </span>
                )}
              </div>
              <Sparkline series={series} trend={change} />
            </div>
          );
        })}
      </div>

      <AIAnalysisPanel 
        block="indicators" 
        payload={state.data}
        title="Market Analysis"
      />
    </section>
  );
}

/* =========================
   Equity Monitor
========================= */
function EquityMonitor() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const SYMBOLS = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA","9983.T"];
  const NAMES = {
    WMT: "Walmart",
    TGT: "Target",
    ANF: "Abercrombie & Fitch",
    VSCO: "Victoria's Secret",
    KSS: "Kohl's",
    AMZN: "Amazon",
    BABA: "Alibaba",
    "9983.T": "Fast Retailing",
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await Promise.all(
          SYMBOLS.map(async s => {
            try {
              const r = await fetch(`/api/stocks?symbol=${encodeURIComponent(s)}`);
              const j = await r.json();
              const price = j.regularMarketPrice ?? j.price ?? null;
              const prevClose = j.regularMarketPreviousClose ?? j.previousClose ?? null;
              let pct = 0;
              if (price && prevClose && prevClose !== 0) {
                pct = ((price - prevClose) / prevClose) * 100;
              }
              return { 
                symbol: s, 
                name: NAMES[s], 
                price, 
                pct,
                volume: j.regularMarketVolume ?? null
              };
            } catch {
              return { symbol: s, name: NAMES[s], price: null, pct: 0 };
            }
          })
        );
        setStocks(data.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="dashboard-section">
        <h2 className="section-title">Equity Monitor</h2>
        <div className="loading-skeleton">
          <div className="skeleton-pulse"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2 className="section-title">Equity Monitor</h2>
        <div className="section-meta">
          Real-time · Major retailers
        </div>
      </div>

      <div className="equity-grid">
        {stocks.map(stock => (
          <div key={stock.symbol} className="equity-card">
            <div className="equity-header">
              <div>
                <div className="equity-name">{stock.name}</div>
                <div className="equity-symbol">{stock.symbol}</div>
              </div>
              <div className={`equity-change ${stock.pct >= 0 ? 'positive' : 'negative'}`}>
                {stock.pct >= 0 ? '▲' : '▼'} {Math.abs(stock.pct).toFixed(2)}%
              </div>
            </div>
            <div className="equity-price">
              {stock.price ? `$${stock.price.toFixed(2)}` : "—"}
            </div>
            <div className="equity-actions">
              <a href={`/company/${stock.symbol}`} className="btn-text">
                AI Analysis →
              </a>
            </div>
          </div>
        ))}
      </div>

      <AIAnalysisPanel 
        block="stocks" 
        payload={{ stocks: stocks.filter(s => Math.abs(s.pct) >= 3) }}
        title="Equity Analysis"
      />
    </section>
  );
}

/* =========================
   News Intelligence
========================= */
function NewsIntelligence() {
  const [activeSource, setActiveSource] = useState('global');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadNews(source) {
    try {
      setLoading(true);
      setNews([]);
      let url = '';
      if (source === 'global') {
        url = "/api/news?" + new URLSearchParams({ 
          industry: "fashion|apparel|garment|textile", 
          language: "en", 
          days: "7", 
          limit: "20",
          domains: FOREIGN_DOMAINS
        }).toString();
      } else {
        url = "/api/news-kr-rss?" + new URLSearchParams({ 
          feeds: "http://www.ktnews.com/rss/allArticle.xml", 
          days: "1", 
          limit: "20" 
        }).toString();
      }
      const r = await fetch(url);
      const data = await r.json();
      setNews(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews('global');
  }, []);

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2 className="section-title">News Intelligence</h2>
        <div className="news-tabs">
          <button 
            onClick={() => { setActiveSource('global'); loadNews('global'); }}
            className={`tab ${activeSource === 'global' ? 'tab-active' : ''}`}
          >
            Global
          </button>
          <button 
            onClick={() => { setActiveSource('korea'); loadNews('korea'); }}
            className={`tab ${activeSource === 'korea' ? 'tab-active' : ''}`}
          >
            Korea
          </button>
        </div>
      </div>

      <div className="news-grid">
        <div className="news-list">
          {loading ? (
            <div className="loading-skeleton">
              <div className="skeleton-pulse"></div>
            </div>
          ) : (
            news.slice(0, 10).map((item, i) => (
              <article key={i} className="news-item">
                <a href={item.url || item.link} target="_blank" rel="noreferrer" className="news-link">
                  <div className="news-title">{item.title}</div>
                  <div className="news-meta">
                    <span className="news-source">{item.source?.name || item.source || 'Unknown'}</span>
                    <span className="news-time">
                      {item.publishedAt || item.pubDate ? 
                        new Date(item.publishedAt || item.pubDate).toLocaleDateString() : ''}
                    </span>
                  </div>
                </a>
              </article>
            ))
          )}
        </div>

        <div className="news-ai">
          <AIAnalysisPanel 
            block="news" 
            payload={{ articles: news.slice(0, 10), source: activeSource }}
            title="News Insights"
          />
        </div>
      </div>
    </section>
  );
}

/* =========================
   Main App
========================= */
export default function Home() {
  return (
    <>
      <Head>
        <title>Hansol Intelligence | Market Trend Analysis</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        <style jsx global>{`
          :root {
            --primary: #1e40af;
            --primary-dark: #1e3a8a;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #ffffff;
            --border: #e2e8f0;
            --text-primary: #0f172a;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
            --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* Header Styles */
          .header {
            background: white;
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(8px);
            background: rgba(255, 255, 255, 0.95);
          }

          .header-inner {
            max-width: 1400px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .brand-logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 20px;
            box-shadow: var(--shadow-md);
          }

          .brand-name {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
          }

          .brand-sub {
            font-size: 12px;
            color: var(--text-muted);
            font-weight: 500;
          }

          .header-meta {
            display: flex;
            align-items: center;
            gap: 2rem;
          }

          .header-time {
            font-size: 14px;
            color: var(--text-secondary);
            font-weight: 500;
          }

          .time-divider {
            margin: 0 0.5rem;
            color: var(--text-muted);
          }

          /* Main Layout */
          main {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
          }

          /* Dashboard Sections */
          .dashboard-section {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border);
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.5rem;
          }

          .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0;
          }

          .section-meta {
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 0.25rem;
          }

          /* Metrics Grid */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .metric-card {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            position: relative;
            transition: all 0.2s ease;
          }

          .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }

          .metric-accent {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            color: white;
          }

          .metric-accent .metric-label {
            color: rgba(255, 255, 255, 0.9);
          }

          .metric-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
          }

          .metric-value {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1.2;
          }

          .metric-accent .metric-value {
            color: white;
          }

          .metric-change {
            font-size: 13px;
            font-weight: 600;
            margin-top: 0.5rem;
          }

          .trend-up {
            color: var(--success);
          }

          .trend-down {
            color: var(--danger);
          }

          /* Supply Visualization */
          .supply-viz {
            background: #f8fafc;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }

          .viz-header {
            margin-bottom: 1.5rem;
          }

          .viz-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .supply-bars {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .supply-bar {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .bar-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
          }

          .bar-value {
            font-weight: 700;
            color: var(--text-primary);
          }

          .bar-track {
            height: 8px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;
          }

          .bar-fill {
            height: 100%;
            transition: width 0.5s ease;
            border-radius: 999px;
          }

          .bar-domestic {
            background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
          }

          .bar-third {
            background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%);
          }

          .bar-local {
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          }

          /* AI Panel */
          .ai-panel {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            margin-top: 1.5rem;
          }

          .ai-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.25rem;
            background: white;
            border-bottom: 1px solid var(--border);
          }

          .ai-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .ai-icon {
            font-size: 16px;
          }

          .ai-toggle {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .ai-toggle:hover {
            background: #f1f5f9;
            color: var(--text-primary);
          }

          .ai-content {
            padding: 1.25rem;
            animation: slideDown 0.3s ease;
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .ai-loading {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-secondary);
            font-size: 14px;
          }

          .pulse-dot {
            width: 8px;
            height: 8px;
            background: var(--primary);
            border-radius: 50%;
            animation: pulse 1.5s ease infinite;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.5);
            }
          }

          .ai-text {
            font-size: 14px;
            line-height: 1.7;
            color: var(--text-secondary);
            white-space: pre-wrap;
          }

          .ai-meta {
            margin-top: 0.75rem;
            font-size: 12px;
            color: var(--text-muted);
          }

          .ai-error {
            color: var(--danger);
            font-size: 14px;
          }

          /* Indicators Grid */
          .indicators-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .indicator-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            transition: all 0.2s ease;
          }

          .indicator-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }

          .indicator-critical {
            border-color: var(--primary);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
          }

          .indicator-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
          }

          .indicator-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
          }

          .indicator-badge {
            font-size: 10px;
            font-weight: 700;
            color: var(--primary);
            background: rgba(59, 130, 246, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
          }

          .indicator-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
          }

          .indicator-unit {
            font-size: 0.875rem;
            font-weight: 400;
            color: var(--text-muted);
            margin-left: 0.25rem;
          }

          .indicator-changes {
            display: flex;
            gap: 0.75rem;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 0.75rem;
          }

          .indicator-change.positive {
            color: var(--success);
          }

          .indicator-change.negative {
            color: var(--danger);
          }

          .indicator-yoy {
            color: var(--text-muted);
          }

          .sparkline {
            margin-top: 0.5rem;
          }

          /* Equity Grid */
          .equity-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .equity-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            transition: all 0.2s ease;
          }

          .equity-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }

          .equity-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
          }

          .equity-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .equity-symbol {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 2px;
          }

          .equity-change {
            font-size: 14px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 6px;
          }

          .equity-change.positive {
            color: var(--success);
            background: rgba(16, 185, 129, 0.1);
          }

          .equity-change.negative {
            color: var(--danger);
            background: rgba(239, 68, 68, 0.1);
          }

          .equity-price {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.75rem;
          }

          .equity-actions {
            display: flex;
            gap: 0.5rem;
          }

          /* News Styles */
          .news-tabs {
            display: flex;
            gap: 0.5rem;
          }

          .tab {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            background: white;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .tab:hover {
            background: #f8fafc;
            color: var(--text-primary);
          }

          .tab-active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
          }

          .news-grid {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 1.5rem;
          }

          .news-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .news-item {
            padding: 1rem;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid var(--border);
            transition: all 0.2s ease;
          }

          .news-item:hover {
            background: white;
            box-shadow: var(--shadow-sm);
          }

          .news-link {
            text-decoration: none;
            color: inherit;
          }

          .news-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            line-height: 1.4;
          }

          .news-meta {
            display: flex;
            gap: 1rem;
            font-size: 12px;
            color: var(--text-muted);
          }

          .news-source {
            font-weight: 500;
          }

          /* Buttons */
          .btn-primary {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }

          .btn-text {
            color: var(--primary);
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s ease;
          }

          .btn-text:hover {
            color: var(--primary-dark);
          }

          .btn-icon {
            background: white;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            color: var(--text-secondary);
          }

          .btn-icon:hover {
            background: #f8fafc;
            color: var(--text-primary);
          }

          /* Edit Panel */
          .edit-panel {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            margin-top: 1rem;
            animation: slideDown 0.3s ease;
          }

          .edit-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .edit-panel input {
            padding: 0.5rem 0.75rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 14px;
            background: white;
            transition: all 0.2s ease;
          }

          .edit-panel input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          /* Loading Skeleton */
          .loading-skeleton {
            padding: 2rem;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .skeleton-pulse {
            width: 100%;
            max-width: 400px;
            height: 100px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 8px;
          }

          @keyframes loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }

          /* Responsive Design */
          @media (max-width: 1024px) {
            .metrics-grid {
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
            
            .indicators-grid {
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }
            
            .equity-grid {
              grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            }
            
            .news-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .header-inner {
              padding: 1rem;
            }
            
            main {
              padding: 1rem;
            }
            
            .dashboard-section {
              padding: 1rem;
            }
            
            .section-header {
              flex-direction: column;
              gap: 1rem;
            }
            
            .metrics-grid {
              grid-template-columns: 1fr;
            }
          }
