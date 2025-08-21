export default function handler(req, res) {
  console.log("📢 stocks.js API 호출됨!");
  res.status(200).json({
    status: "ok",
    message: "stocks API 정상 동작 중 ✅",
    sample: [100, 101, 102, 103, 104]
  });
}
