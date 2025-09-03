// pages/api/daily-report.js
export default async function handler(req, res) {
  try {
    const proto = (req.headers["x-forwarded-proto"] || "http");
    const host = req.headers.host;
    const base = `${proto}://${host}`;

    const symbols = ["WMT","TGT","ANF","VSCO","KSS","AMZN","BABA","9983.T"];
    const stockPromises = symbols.map(async (s) => {
      try {
        const r = await fetch(`${base}/api/stocks?symbol=${encodeURIComponent(s)}`);
        const j = await r.json();
        return { symbol: s, ...j };
      } catch {
        return { symbol: s, error: true };
      }
    });

    const [indResp, newsResp, stocks] = await Promise.all([
      fetch(`${base}/api/indicators`).then(r=>r.json()).catch(()=>({})),
      fetch(`${base}/api/news?cat=retail,fashion,textile`).then(r=>r.json()).catch(()=>([])),
      Promise.all(stockPromises)
    ]);

    // 간이 템플릿 요약 (fallback)
    const flatStocks = stocks
      .map(s => {
        const cp = Number(s?.changePercent ?? s?.change_percentage ?? s?.percent ?? 0);
        const name = s?.longName || s?.name || s?.symbol || "N/A";
        return { name, symbol:s.symbol, cp };
      });

    const sorted = flatStocks.slice().sort((a,b)=>b.cp - a.cp);
    const topGainers = sorted.slice(0,3);
    const topLosers = sorted.slice(-3).reverse();

    const news = Array.isArray(newsResp) ? newsResp : (newsResp?.articles || []);
    const newsTop = news.slice(0,5).map(n => `- ${n.title || n.headline || "(제목 없음)"} (${n.source || n.publisher || ""})`).join("\n");

    const today = new Date().toISOString().slice(0,10);
    let fallbackMd = `# AI Daily Report (${today})

## Top Gainers
${topGainers.map(g=>`- ${g.name} (${g.symbol}) ${g.cp>=0?"+":""}${g.cp.toFixed(2)}%`).join("\n") || "- 데이터 없음"}

## Top Losers
${topLosers.map(g=>`- ${g.name} (${g.symbol}) ${g.cp>=0?"+":""}${g.cp.toFixed(2)}%`).join("\n") || "- 데이터 없음"}

## Indicators Snapshot
- keys: ${Object.keys(indResp||{}).join(", ") || "N/A"}

## Headlines (Retail / Fashion)
${newsTop || "- 뉴스 없음"}

> 참고: OPENAI_API_KEY가 없으면 템플릿 요약으로 출력됩니다.
`;

    // OpenAI 사용 (선택)
    const useAI = !!process.env.OPENAI_API_KEY;
    if (useAI) {
      try {
        const prompt = `
당신은 의사결정을 돕는 구매/소싱 전문 애널리스트입니다.
입력 데이터(주가/지표/헤드라인)를 한솔텍스타일 '부자재구매부' 관점에서, 6~10줄의 실행가능 요약으로 정리하세요.
- 오늘의 요점 3가지 (가격/리스크/기회)
- 리스크 신호(원면/유가/운임/환율)와 조달 영향
- 리테일러 뉴스가 주문/스타일/소싱에 주는 시사점
- 한줄 권고(액션)

[STOCKS]
${JSON.stringify(flatStocks)}

[INDICATORS]
${JSON.stringify(indResp)}

[NEWS_HEADLINES]
${(Array.isArray(news) ? news.slice(0,8) : []).map(n=>n.title||n.headline).join("\n")}
        `.trim();

        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a concise, practical procurement analyst." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          })
        });
        const j = await r.json();
        const aiText = j?.choices?.[0]?.message?.content?.trim();
        if (aiText) {
          return res.status(200).json({ date: today, usedAI: true, summary: aiText });
        }
      } catch {
        // fallthrough to fallback
      }
    }

    return res.status(200).json({ date: today, usedAI: false, summary: fallbackMd });
  } catch (e) {
    return res.status(500).json({ error: "daily-report-failed", detail: String(e) });
  }
}
