import { useEffect, useState } from "react";

export default function NewsIntelligence() {
  const [foreign, setForeign] = useState([]);
  const [korean, setKorean] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [n1, n2] = await Promise.all([
          fetch("/api/news"),
          fetch("/api/news-kr-rss"),
        ]);
        const f = n1.ok ? await n1.json() : { articles: [] };
        const k = n2.ok ? await n2.json() : { items: [] };
        setForeign(Array.isArray(f?.articles) ? f.articles : []);
        setKorean(Array.isArray(k?.items) ? k.items : []);
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  async function handleSummarize() {
    try {
      setLoading(true);
      const items = [
        ...foreign.map(a => ({ title: a?.title, url: a?.url })) .slice(0, 8),
        ...korean.map(a => ({ title: a?.title, url: a?.link })) .slice(0, 8),
      ].slice(0, 12);
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      if (res.ok) {
        const j = await res.json();
        setSummary(j?.summary || "");
      } else {
        setSummary("요약 생성에 실패했습니다.");
      }
    } catch (e) {
      setSummary("요약 오류: " + String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-slate-900">해외 뉴스 / 국내 뉴스</div>
        <button
          onClick={handleSummarize}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-blue-600 text-white text-sm disabled:opacity-60"
        >
          {loading ? "요약 중..." : "AI 요약"}
        </button>
      </div>

      {/* Foreign */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2">해외</div>
        <ul className="space-y-2">
          {foreign.slice(0, 8).map((a, i) => (
            <li key={i} className="text-sm">
              <a href={a?.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                {a?.title || "-"}
              </a>
            </li>
          ))}
          {foreign.length === 0 && <li className="text-sm text-slate-500">해외 뉴스가 없습니다.</li>}
        </ul>
      </div>

      {/* Korean */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2">국내</div>
        <ul className="space-y-2">
          {korean.slice(0, 8).map((a, i) => (
            <li key={i} className="text-sm">
              <a href={a?.link} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                {a?.title || "-"}
              </a>
            </li>
          ))}
          {korean.length === 0 && <li className="text-sm text-slate-500">국내 뉴스가 없습니다.</li>}
        </ul>
      </div>

      {summary && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
             dangerouslySetInnerHTML={{ __html: summary }} />
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
