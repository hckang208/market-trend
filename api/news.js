import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
