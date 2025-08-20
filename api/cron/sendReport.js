import sgMail from "@sendgrid/mail";
export default async function handler(req,res){
  try{
    const today=new Date().toISOString().split("T")[0];
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to:"your_email@company.com",
      from:"noreply@projectpaw.co.kr",
      subject:`[Daily Report] Market Insight - ${today}`,
      html:`오늘의 리포트 👉 <a href="https://yourdomain.vercel.app/api/report">PDF 다운로드</a>`
    });
    res.status(200).json({success:true});
  }catch(e){ res.status(500).json({error:e.message}); }
}
