import yahooFinance from "yahoo-finance2";
export default async function handler(req,res){
  try {
    const tickers=["WMT","COST","TGT","AMZN"];
    const results = await Promise.all(tickers.map(async t=>{
      const quote=await yahooFinance.quote(t);
      const chart=await yahooFinance.chart(t,{period1:"2024-07-01",interval:"1d"});
      const news=await yahooFinance.search(t,{newsCount:3});
      return {
        symbol:quote.symbol,
        name:quote.shortName,
        price:quote.regularMarketPrice,
        change:quote.regularMarketChangePercent,
        history:chart.quotes.map(q=>({date:q.date,close:q.close})),
        news:news.news.map(n=>({title:n.title,link:n.link,publisher:n.publisher,providerPublishTime:n.providerPublishTime}))
      };
    }));
    res.status(200).json(results);
  } catch(e){ res.status(500).json({error:e.message}); }
}
