import React from "react";

export default function AICard({ title, text }) {
  const [ts, setTs] = React.useState("");
  React.useEffect(() => {
    const now = new Date();
    const z = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Seoul",
    }).format(now);
    setTs(z);
  }, []);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="hdr">{title}</div>
        <div className="text-xs text-sub" suppressHydrationWarning>
          GEMINI 2.5 사용중{ts ? ` · ${ts}` : ""}
        </div>
      </div>
      <div className="whitespace-pre-wrap leading-7 text-sm">{text || "데이터 수집 중..."}</div>
    </div>
  );
}