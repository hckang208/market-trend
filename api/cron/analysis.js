import { kv } from "@vercel/kv";

export default async function handler(req,res){
  try{
    const today=new Date().toISOString().split("T")[0];
    const prompt=`오늘의 주요 리테일러 주가 및 패션/의류 관련 경제지표를 요약해줘. 4~5문장.`;
    const gptRes=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"gpt-4o-mini",
        messages:[{role:"user",content:prompt}]
      })
    });
    const result=await gptRes.json();
    const analysis=result.choices[0].message.content;
    await kv.set(`analysis:${today}`,analysis);
    res.status(200).json({success:true,analysis});
  }catch(e){ res.status(500).json({error:e.message}); }
}
