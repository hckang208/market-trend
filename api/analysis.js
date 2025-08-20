import { kv } from "@vercel/kv";
export default async function handler(req,res){
  const today=new Date().toISOString().split("T")[0];
  const analysis=await kv.get(`analysis:${today}`);
  res.status(200).json({analysis:analysis||"오늘의 분석 준비 중..."});
}
