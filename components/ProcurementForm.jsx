export default function ProcurementForm({ onSubmit }) {
  return (
    <form className="card p-4" onSubmit={(e)=>{ e.preventDefault(); onSubmit?.(new FormData(e.currentTarget)); }}>
      <div className="hdr mb-3">관심 키워드</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input name="brand" placeholder="브랜드 (예: Walmart)" className="border rounded-xl px-3 py-2" />
        <input name="sector" placeholder="섹터 (예: Apparel)" className="border rounded-xl px-3 py-2" />
        <input name="kr" placeholder="국내 키워드 (예: 면화, 환율)" className="border rounded-xl px-3 py-2" />
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary" type="submit">적용</button>
        <span className="text-sub text-sm">뉴스 필터에 반영됩니다.</span>
      </div>
    </form>
  );
}
