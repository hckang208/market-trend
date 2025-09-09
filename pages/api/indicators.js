export default async function handler(req, res) {
  try {
    // TODO: implement real fetch (FRED/RAPID) if keys present
    const mock = [
      { label: "WTI(배럴)", value: 78.4, mom: -0.6, yoy: 2.1 },
      { label: "USD/KRW", value: 1378, mom: 0.3, yoy: 4.2 },
      { label: "미 10Y", value: 4.18, mom: -0.05, yoy: 0.22 },
      { label: "美 CPI YoY", value: 2.5, mom: -0.1, yoy: -1.0 },
      { label: "ISM Mfg", value: 49.8, mom: 0.4, yoy: 1.2 },
      { label: "실업률%", value: 4.1, mom: 0.1, yoy: 0.3 },
    ];
    res.status(200).json({ items: mock, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ items: [], generatedAt: new Date().toISOString() });
  }
}