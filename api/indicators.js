import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const fredKey = process.env.FRED_API_KEY;
    if (!fredKey) {
      return res.status(500).json({ error: "환경변수 FRED_API_KEY 없음" });
    }

    const urls = {
      usdKrw: `https://api.stlouisfed.org/fred/series/observations?series_id=DEXKOUS&api_key=${fredKey}&file_type=json`,
      cotton: `https://api.stlouisfed.org/fred/series/observations?series_id=COTTON&api_key=${fredKey}&file_type=json`,
      oil: `https://api.stlouisfed.org/fred/series/observations?series_id=DCOILWTICO&api_key=${fredKey}&file_type=json`,
      cpiApparel: `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAPPSL&api_key=${fredKey}&file_type=json`,
      retailSales: `https://api.stlouisfed.org/fred/series/observations?series_id=RSXFS&api_key=${fredKey}&file_type=json`,
      inventoryRatio: `https://api.stlouisfed.org/fred/series/observations?series_id=ISRATIO&api_key=${fredKey}&file_type=json`
    };

    async function fetchLast(url) {
      const r = await fetch(url);
      if (!r.ok) return null;
      const d = await r.json();
      const arr = d?.observations || [];
      if (arr.length === 0) return null;
      const last = arr[arr.length - 1];
      return parseFloat(last.value) || null;
    }

    const [usdKrw, cotton, oil, cpiApparel, retailSales, inventoryRatio] =
      await Promise.all([
        fetchLast(urls.usdKrw),
        fetchLast(urls.cotton),
        fetchLast(urls.oil),
        fetchLast(urls.cpiApparel),
        fetchLast(urls.retailSales),
        fetchLast(urls.inventoryRatio)
      ]);

    res.status(200).json({
      usdKrw,
      cotton,
      oil,
      cpiApparel,
      retailSales,
      inventoryRatio
    });
  } catch (err) {
    console.error("API indicators handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
