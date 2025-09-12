import Head from 'next/head';
import '../styles/globals.css';
export default function App({ Component, pageProps }) {
  return (<>
  <Head>
    <style dangerouslySetInnerHTML={{__html: `
/* === Critical inline fallback (in case globals.css fails) === */
:root{--text:#0A1628;--surface:#fff;--border:#E1E4E8;--muted-2:#94A3B8}
*{box-sizing:border-box}
body{margin:0;font-family:'Inter','Noto Sans KR',system-ui,sans-serif;color:var(--text);background:#fff}
.header{position:sticky;top:0;background:rgba(255,255,255,.8);backdrop-filter:saturate(180%) blur(8px);border-bottom:1px solid var(--border)}
.main-container{max-width:1440px;margin:0 auto;padding:24px}
.section{margin-bottom:32px}
.section-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.section-title{font-size:18px;font-weight:800;letter-spacing:-.02em}
.section-subtitle{font-size:12px;color:var(--muted-2)}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
.tab-nav{display:flex;gap:8px;margin-bottom:8px}
.tab-btn{padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:#fff}
.tab-btn.active{border-color:#0A1628}
`}} />
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    <title>Hansoll · Market Trend Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </Head>
  <Component {...pageProps} />
</>);

}
