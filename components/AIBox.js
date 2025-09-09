import { useEffect, useState } from "react";

function safe(s){ try { return String(s ?? ""); } catch { return ""; } }

export default function AIBox({ block, payload, title="AI 현황분석" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [ts, setTs] = useState("");

  useEffect(() => {
    // prefetch when payload changes
    if (!payload) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ block, language: "ko", mode: "brief", data: payload })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "AI 요약 실패");
        let s = j.summary || "";
        s = s.replace(/^(?:##\s*)?(?:한솔섬유)?\s*(?:임원보고)?\s*$/gmi, "").replace(/(전략기획부|임원)[^\n]*\n?/g, "");
        setText(s);
        setTs(new Date().toISOString());
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [block, JSON.stringify(payload || {})]);

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="font-extrabold">{title}</div>
        <button onClick={() => setOpen(o => !o)} className="px-2 py-1 text-sm rounded-lg border border-slate-300 bg-slate-100">
          {open ? "접기" : "AI 요약"}
        </button>
      </div>
      {open && (
        <>
          <div className="text-xs text-slate-500 mb-1">
            <span suppressHydrationWarning>GEMINI 2.5 사용중{ts ? ` · ${new Date(ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` : ""}</span>
          </div>
          {loading && <div className="text-slate-600">분석 중…</div>}
          {err && <div className="text-red-600">오류: {err}</div>}
          {!loading && !err && <div className="whitespace-pre-wrap leading-7 text-sm">{safe(text) || "분석 결과가 없습니다."}</div>}
        </>
      )}
    </div>
  );
}
