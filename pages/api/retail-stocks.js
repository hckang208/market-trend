export default async function handler(req, res) {
  try {
    const list = [
      { ticker: "LULU", name: "Lululemon", chg: -2.1 },
      { ticker: "GPS", name: "Gap Inc", chg: 1.3 },
      { ticker: "NKE", name: "Nike", chg: -0.8 },
      { ticker: "DECK", name: "Deckers", chg: 0.6 },
      { ticker: "PVH", name: "PVH", chg: 1.0 },
      { ticker: "RL", name: "Ralph Lauren", chg: -0.4 }
    ];
    res.status(200).json({ items: list, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ items: [], generatedAt: new Date().toISOString() });
  }
}