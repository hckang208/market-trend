import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    res.status(200).json({ message: "stocks.js API 호출 성공!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
