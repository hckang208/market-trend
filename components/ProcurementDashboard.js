import { useEffect, useMemo, useState } from "react";
import AIBox from "./AIBox";

const fmtNum = (n, d = 2) => { const v = Number(n); if (!isFinite(v)) return "-"; return v.toLocaleString(undefined, { maximumFractionDigits: d }); };
const fmtSignPct = (n, d = 1) => { const v = Number(n); if (!isFinite(v)) return "0.0%"; const s = v >= 0 ? "+" : ""; return `${s}${v.toFixed(d)}%`; };
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export default function ProcurementDashboard() {
  const LS_KEY = "procure.dashboard.v1";
  const defaultData = {
    currency: "USD",
    period: "월간",
    periodLabel: "",
    revenue: 0,
    materialSpend: 0,
    styles: 0,
    poCount: 0,
    costSave: 0,
    supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 },
  };
  const [data, setData] = useState(defaultData);
  const [openEdit, setOpenEdit] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/procure-sheet", { cache: "no-store" });
        const j = await r.json();
        if (j?.ok && j.data) {
          setData(prev => ({ ...prev, ...j.data }));
          return;
        }
      } catch {}
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setData(prev => ({ ...prev, ...JSON.parse(raw) }));
      } catch {}
    })();
  }, []);

  const ratio = useMemo(() => {
    const r = Number(data.revenue || 0);
    const m = Number(data.materialSpend || 0);
    if (r <= 0) return 0;
    return clamp((m / r) * 100, 0, 100);
  }, [data]);

  const supply = useMemo(() => {
    const d = Number(data.supplyBreakdown.domestic || 0);
    const t = Number(data.supplyBreakdown.thirdCountry || 0);
    const l = Number(data.supplyBreakdown.local || 0);
    const sum = d + t + l || 1;
    return {
      domestic: clamp((d / sum) * 100),
      thirdCountry: clamp((t / sum) * 100),
      local: clamp((l / sum) * 100),
    };
  }, [data]);

  const save = () => { localStorage.setItem(LS_KEY, JSON.stringify(data)); setOpenEdit(false); };
  const reset = () => { localStorage.removeItem(LS_KEY); setData(defaultData); };

  const fmtCurrency = (value, currency = "USD") => {
    const num = Number(value || 0);
    try {
      if (currency === "KRW") {
        return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(num);
      }
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
    } catch {
      return (currency === "KRW" ? "₩" : "$") + num.toLocaleString();
    }
  };

  const Card = ({ title, value, sub }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
      {sub ? <div className="text-xs text-slate-500 mt-1">{sub}</div> : null}
    </div>
  );

  return (
    <section className="border border-slate-200 rounded-2xl bg-white shadow-sm p-4">
      {/* 내부 타이틀 제거 (중복 방지). 페이지 섹션 타이틀에서만 표시 */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-slate-500">
            기간: <b>{data.periodLabel || "—"}</b> / 방식: <b>{data.period}</b> / 통화: <b>{data.currency}</b>
          </div>
          <div className="mt-1">
            <button onClick={() => setOpenEdit(o=>!o)} className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-slate-100">{openEdit ? "입력 닫기" : "수기 입력"}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card title="총 매출액" value={fmtCurrency(data.revenue, data.currency)} />
        <Card title="총 부자재매입액" value={fmtCurrency(data.materialSpend, data.currency)} />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">매출 대비 부자재 매입비중</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{fmtSignPct(ratio, 1)}</div>
          <div className="h-2 rounded-full bg-slate-100 mt-2 overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${ratio}%` }} /></div>
        </div>
        <Card title="총 Cost Save" value={fmtCurrency(data.costSave || 0, data.currency)} />
        <Card title="총 발행 PO수" value={fmtNum(data.poCount, 0)} />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 p-3">
        <div className="text-sm font-bold text-slate-700">공급현황 (국내 / 3국 / 현지)</div>
        <div className="mt-2 flex h-4 rounded-full overflow-hidden border border-slate-200">
          <div className="h-full" style={{ width: `${supply.domestic}%`, background: "#111827" }} title={`국내 ${fmtNum(supply.domestic, 1)}%`} />
          <div className="h-full" style={{ width: `${supply.thirdCountry}%`, background: "#4B5563" }} title={`3국 ${fmtNum(supply.thirdCountry, 1)}%`} />
          <div className="h-full" style={{ width: `${supply.local}%`, background: "#9CA3AF" }} title={`현지 ${fmtNum(supply.local, 1)}%`} />
        </div>
        <div className="mt-2 flex gap-3 text-xs text-slate-500">
          <span>국내 {fmtNum(supply.domestic, 1)}%</span>
          <span>3국 {fmtNum(supply.thirdCountry, 1)}%</span>
          <span>현지 {fmtNum(supply.local, 1)}%</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">GEMINI 2.5 사용중</div>
      </div>

      <div className="mt-3">
        <AIBox block="procurement" payload={{ ...data, ratio, supply }} />
      </div>

      {openEdit && (
        <div className="mt-3 border-t border-slate-200 pt-3 space-y-3">
          {/* 입력 폼 동일 */}
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm">기간 표시</label>
            <input className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.periodLabel || ""} onChange={(e) => setData(d => ({ ...d, periodLabel: e.target.value }))} placeholder="예: 2025-09" />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm">방식</label>
            <input className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.period || ""} onChange={(e) => setData(d => ({ ...d, period: e.target.value }))} placeholder="월간 / 주간 / 일간 등" />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 text-sm">통화</label>
            <select className="border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.currency} onChange={(e) => setData(d => ({ ...d, currency: e.target.value }))}>
              <option value="USD">USD</option><option value="KRW">KRW</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><label className="w-36 text-sm">총 매출액</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.revenue} onChange={(e) => setData(d => ({ ...d, revenue: Number(e.target.value) }))} /></div>
            <div className="flex items-center gap-2"><label className="w-36 text-sm">총 부자재매입액</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.materialSpend} onChange={(e) => setData(d => ({ ...d, materialSpend: Number(e.target.value) }))} /></div>
            <div className="flex items-center gap-2"><label className="w-36 text-sm">총 Cost Save</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.costSave} onChange={(e) => setData(d => ({ ...d, costSave: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><label className="w-44 text-sm">총 오더수(스타일)</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.styles} onChange={(e) => setData(d => ({ ...d, styles: Number(e.target.value) }))} /></div>
            <div className="flex items-center gap-2"><label className="w-44 text-sm">총 발행 PO수</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.poCount} onChange={(e) => setData(d => ({ ...d, poCount: Number(e.target.value) }))} /></div>
          </div>
          <div className="pt-2">
            <div className="text-sm font-bold">공급현황(%) — 합계 100 기준</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
              <div className="flex items-center gap-2"><label className="w-24 text-sm">국내(%)</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.supplyBreakdown.domestic}
                onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, domestic: Number(e.target.value) } }))} /></div>
              <div className="flex items-center gap-2"><label className="w-24 text-sm">3국(%)</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.supplyBreakdown.thirdCountry}
                onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, thirdCountry: Number(e.target.value) } }))} /></div>
              <div className="flex items-center gap-2"><label className="w-24 text-sm">현지(%)</label><input type="number" className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm" value={data.supplyBreakdown.local}
                onChange={(e) => setData(d => ({ ...d, supplyBreakdown: { ...d.supplyBreakdown, local: Number(e.target.value) } }))} /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={save} className="px-3 py-2 text-sm rounded-lg border border-blue-600 bg-blue-600 text-white font-bold">저장</button>
            <button onClick={() => setOpenEdit(false)} className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-100">닫기</button>
            <button onClick={reset} className="px-3 py-2 text-sm rounded-lg border border-red-500 bg-red-500 text-white font-bold">초기화</button>
          </div>
        </div>
      )}
    </section>
  );
}
