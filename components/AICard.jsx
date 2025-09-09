export default function AICard({ title="AI 요약", html }) {
  return (
    <div className="card p-5">
      <div className="hdr mb-3">{title}</div>
      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: html || "<p>요약할 뉴스가 없습니다.</p>" }} />
    </div>
  );
}
