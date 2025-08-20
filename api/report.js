import { kv } from "@vercel/kv";
import PDFDocument from "pdfkit";

export default async function handler(req,res){
  try{
    const today=new Date().toISOString().split("T")[0];
    const analysis=await kv.get(`analysis:${today}`);
    const doc=new PDFDocument({margin:50});
    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",`attachment; filename=report-${today}.pdf`);
    doc.pipe(res);
    doc.fontSize(20).text("Hansol Textile · Daily Market Insight",{align:"center"});
    doc.moveDown(2);
    doc.fontSize(14).text("🤖 Executive Summary",{underline:true});
    doc.fontSize(12).text(analysis||"오늘의 분석 준비 중...");
    doc.end();
  }catch(e){ res.status(500).json({error:e.message}); }
}
