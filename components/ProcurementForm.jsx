import React from "react";

export default function ProcurementForm({ data, setData, onSave, onClose, onReset }) {
  const row = "grid grid-cols-[120px,1fr] items-center gap-2 my-1.5";
  const grid2 = "grid grid-cols-2 gap-3";
  const grid3 = "grid grid-cols-3 gap-3";

  return (
    <div className="card p-4">
      <div className={row}>
        <label>기간 표시</label>
        <input className="card p-2" value={data.periodLabel||""} onChange={(e)=>setData(d=>({...d,periodLabel:e.target.value}))} placeholder="예: 2025-09"/>
      </div>
      <div className={row}>
        <label>방식</label>
        <input className="card p-2" value={data.period||""} onChange={(e)=>setData(d=>({...d,period:e.target.value}))} placeholder="월간 / 주간 / 일간 등"/>
      </div>
      <div className={row}>
        <label>통화</label>
        <select className="card p-2" value={data.currency} onChange={(e)=>setData(d=>({...d,currency:e.target.value}))}>
          <option value="USD">USD</option>
          <option value="KRW">KRW</option>
        </select>
      </div>

      <div className={grid2}>
        <div className={row}>
          <label>총 매출액</label>
          <input className="card p-2" type="number" value={data.revenue??0} onChange={(e)=>setData(d=>({...d,revenue:Number(e.target.value)}))}/>
        </div>
        <div className={row}>
          <label>총 부자재매입액</label>
          <input className="card p-2" type="number" value={data.materialSpend??0} onChange={(e)=>setData(d=>({...d,materialSpend:Number(e.target.value)}))}/>
        </div>
        <div className={row}>
          <label>총 Cost Save</label>
          <input className="card p-2" type="number" value={data.costSave??0} onChange={(e)=>setData(d=>({...d,costSave:Number(e.target.value)}))}/>
        </div>
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="font-bold mb-1.5">공급현황(%) — 합계 100 기준</div>
        <div className={grid3}>
          <div className={row}>
            <label>국내(%)</label>
            <input className="card p-2" type="number" value={data.supplyBreakdown?.domestic??0} onChange={(e)=>setData(d=>({...d,supplyBreakdown:{...d.supplyBreakdown,domestic:Number(e.target.value)}}))}/>
          </div>
          <div className={row}>
            <label>3국(%)</label>
            <input className="card p-2" type="number" value={data.supplyBreakdown?.thirdCountry??0} onChange={(e)=>setData(d=>({...d,supplyBreakdown:{...d.supplyBreakdown,thirdCountry:Number(e.target.value)}}))}/>
          </div>
          <div className={row}>
            <label>현지(%)</label>
            <input className="card p-2" type="number" value={data.supplyBreakdown?.local??0} onChange={(e)=>setData(d=>({...d,supplyBreakdown:{...d.supplyBreakdown,local:Number(e.target.value)}}))}/>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="btn btn-ghost" onClick={onSave}>저장</button>
        <button className="btn btn-ghost" onClick={onClose}>닫기</button>
        <button className="btn border-red-400 text-red-300 hover:bg-red-400/10" onClick={onReset}>초기화</button>
      </div>
    </div>
  );
}