import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "procure.dashboard.v1";

const defaultData = {
  period: "2025-09",
  periodLabel: "2025년 9월",
  currency: "KRW",
  revenue: 0,
  materialSpend: 0,
  styles: 0,
  poCount: 0,
  supplyBreakdown: { domestic: 0, thirdCountry: 0, local: 0 },
  notes: "",
  lastYear: {
    revenue: null,
    materialSpend: null,
    styles: null,
    poCount: null,
    supplyBreakdown: { domestic: null, thirdCountry: null, local: null }
  }
};

function yoy(curr, prev) {
  if (prev === null || prev === undefined) return null;
  if (!isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export default function ProcurementTopBlock() {
  const [data, setData] = useState(defaultData);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...defaultData, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEditing(false);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `procure-${data.period}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(reader.result);
        setData({ ...defaultData, ...next });
      } catch (e) {
        alert("JSON 파싱 실패");
      }
    };
    reader.readAsText(file);
  };

  const computed = useMemo(() => {
    const ly = data.lastYear || {};
    const lsb = ly.supplyBreakdown || {};
    const sb = data.supplyBreakdown || {};
    return {
      yoy: {
        revenue: yoy(data.revenue, ly.revenue),
        materialSpend: yoy(data.materialSpend, ly.materialSpend),
        styles: yoy(data.styles, ly.styles),
        poCount: yoy(data.poCount, ly.poCount),
        supply_domestic: yoy(sb.domestic, lsb.domestic),
        supply_third: yoy(sb.thirdCountry, lsb.thirdCountry),
        supply_local: yoy(sb.local, lsb.local)
      }
    };
  }, [data]);

  const analyze = async () => {
    setBusy(true);
    setSummary("");
    try {
      const payload = {
        block: "procurement",
        language: "ko",
        data: {
          period: data.period,
          periodLabel: data.periodLabel,
          currency: data.currency,
          current: {
            revenue: data.revenue,
            materialSpend: data.materialSpend,
            styles: data.styles,
            poCount: data.poCount,
            supplyBreakdown: data.supplyBreakdown,
            notes: data.notes
          },
          lastYear: data.lastYear,
          yoy: computed.yoy
        }
      };

      const r = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (r.ok) {
        const j = await r.json();
        if (j?.summary) {
          setSummary(j.summary.trim());
          setBusy(false);
          return;
        }
      }
      setSummary(localFallbackSummary(payload.data));
    } catch {
      setSummary(localFallbackSummary({ ...data, yoy: computed.yoy }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ position:"sticky", top: 12, zIndex: 50, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontWeight: 800 }}>부자재 구매 현황 (sample data입니다)</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={analyze} disabled={busy} style={btn()}>
            {busy ? "분석 중…" : "분석(베타)"}
          </button>
          <button onClick={() => setEditing(true)} style={btn("ghost")}>✏️ 편집</button>
          <button onClick={exportJson} style={btn("ghost")}>⤓ Export</button>
          <label style={btn("ghost", true)}>
            Import
            <input type="file" accept="application/json" onChange={e => e.target.files[0] && importJson(e.target.files[0])} style={{ display: "none" }} />
          </label>
        </div>
      </header>

      <p style={{ color: "#666", marginTop: 0 }}>{data.periodLabel} · 통화 {data.currency}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
        <Stat label="매출" value={fmtNum(data.revenue)} unit={data.currency} />
        <Stat label="부자재 매입" value={fmtNum(data.materialSpend)} unit={data.currency} />
        <Stat label="오더 수" value={fmtNum(data.styles)} />
        <Stat label="PO 수" value={fmtNum(data.poCount)} />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
        <Stat label="국내 비중" value={fmtNum(data.supplyBreakdown.domestic)} unit="%" />
        <Stat label="3국 비중" value={fmtNum(data.supplyBreakdown.thirdCountry)} unit="%" />
        <Stat label="현지 비중" value={fmtNum(data.supplyBreakdown.local)} unit="%" />
      </div>

      {summary && (
        <div style={{ marginTop: 14, padding: 12, background: "#fafafa", border: "1px solid #eee", borderRadius: 10, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {summary}
        </div>
      )}

      {editing && (
        <EditDialog data={data} setData={setData} onClose={() => setEditing(false)} onSave={save} />
      )}
    </section>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
      <div style={{ color: "#666", fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>
        {value}{unit ? ` ${unit}` : ""}
      </div>
    </div>
  );
}

function btn(variant = "solid", asLabel = false) {
  const base = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    background: "#111",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14
  };
  if (variant === "ghost") {
    base.background = "#fff";
    base.color = "#111";
  }
  if (asLabel) base.display = "inline-flex";
  return base;
}

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return new Intl.NumberFormat().format(Number(n));
}

function localFallbackSummary(d) {
  const lines = [];
  if (isFinite(d.revenue) && d.revenue > 0) lines.push(`매출 ${fmtNum(d.revenue)} ${d.currency || ""}`);
  if (isFinite(d.materialSpend) && d.materialSpend > 0) lines.push(`부자재 매입 ${fmtNum(d.materialSpend)} ${d.currency || ""}`);
  if (isFinite(d.styles) && d.styles > 0) lines.push(`오더 ${fmtNum(d.styles)}건`);
  if (isFinite(d.poCount) && d.poCount > 0) lines.push(`PO ${fmtNum(d.poCount)}건`);
  const sb = d.supplyBreakdown || {};
  const mix = [sb.domestic, sb.thirdCountry, sb.local].filter(isFinite).reduce((a,b)=>a+b,0);
  if (mix) lines.push(`공급 비중: 국내 ${sb.domestic ?? "-"}% · 3국 ${sb.thirdCountry ?? "-"}% · 현지 ${sb.local ?? "-"}%`);

  const yoy = d.yoy || {};
  const k = Object.entries(yoy).filter(([,v]) => v !== null && isFinite(v));
  if (k.length) {
    const ups = k.filter(([,v]) => v > 0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([n,v])=>`${n} +${v.toFixed(1)}%`);
    const downs = k.filter(([,v]) => v < 0).sort((a,b)=>a[1]-b[1]).slice(0,2).map(([n,v])=>`${n} ${v.toFixed(1)}%`);
    if (ups.length) lines.push(`상승: ${ups.join(", ")}`);
    if (downs.length) lines.push(`하락: ${downs.join(", ")}`);
  }
  if (d.notes) lines.push(`메모: ${d.notes}`);
  return lines.join("\\n");
}

function EditDialog({ data, setData, onClose, onSave }) {
  const [temp, setTemp] = useState(data);
  const bind = (path) => (e) => {
    const v = e.target.value;
    setTemp((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let ref = next;
      for (let i=0;i<keys.length-1;i++) ref = ref[keys[i]];
      const leaf = keys[keys.length-1];
      ref[leaf] = e.target.type === "number" ? Number(v) : v;
      return next;
    });
  };

  const NumberInput = (props) => <input type="number" step="any" {...props} style={inp()} />;
  const TextInput   = (props) => <input type="text" {...props} style={inp()} />;

  return (
    <div style={modal()}>
      <div style={sheet()}>
        <h4 style={{ marginTop: 0 }}>부자재 현황 편집</h4>

        <div style={grid(3)}>
          <TextInput  placeholder="기간(예: 2025-09)" value={temp.period} onChange={bind("period")} />
          <TextInput  placeholder="라벨(예: 2025년 9월)" value={temp.periodLabel} onChange={bind("periodLabel")} />
          <TextInput  placeholder="통화(예: KRW/USD)" value={temp.currency} onChange={bind("currency")} />
        </div>

        <div style={grid(4)}>
          <NumberInput placeholder="매출" value={temp.revenue} onChange={bind("revenue")} />
          <NumberInput placeholder="부자재 매입" value={temp.materialSpend} onChange={bind("materialSpend")} />
          <NumberInput placeholder="오더 수" value={temp.styles} onChange={bind("styles")} />
          <NumberInput placeholder="PO 수" value={temp.poCount} onChange={bind("poCount")} />
        </div>

        <div style={grid(3)}>
          <NumberInput placeholder="국내 비중(%)" value={temp.supplyBreakdown.domestic} onChange={bind("supplyBreakdown.domestic")} />
          <NumberInput placeholder="3국 비중(%)" value={temp.supplyBreakdown.thirdCountry} onChange={bind("supplyBreakdown.thirdCountry")} />
          <NumberInput placeholder="현지 비중(%)" value={temp.supplyBreakdown.local} onChange={bind("supplyBreakdown.local")} />
        </div>

        <textarea
          placeholder="메모"
          value={temp.notes}
          onChange={(e)=>setTemp({...temp, notes:e.target.value})}
          style={{ ...inp(), minHeight: 90 }}
        />

        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>선택 입력: 작년 기준값</summary>
          <div style={{ marginTop: 8 }}>
            <div style={grid(4)}>
              <NumberInput placeholder="(작년) 매출" value={temp.lastYear.revenue ?? ""} onChange={bind("lastYear.revenue")} />
              <NumberInput placeholder="(작년) 부자재" value={temp.lastYear.materialSpend ?? ""} onChange={bind("lastYear.materialSpend")} />
              <NumberInput placeholder="(작년) 오더" value={temp.lastYear.styles ?? ""} onChange={bind("lastYear.styles")} />
              <NumberInput placeholder="(작년) PO" value={temp.lastYear.poCount ?? ""} onChange={bind("lastYear.poCount")} />
            </div>
            <div style={grid(3)}>
              <NumberInput placeholder="(작년) 국내 비중" value={temp.lastYear.supplyBreakdown.domestic ?? ""} onChange={bind("lastYear.supplyBreakdown.domestic")} />
              <NumberInput placeholder="(작년) 3국 비중" value={temp.lastYear.supplyBreakdown.thirdCountry ?? ""} onChange={bind("lastYear.supplyBreakdown.thirdCountry")} />
              <NumberInput placeholder="(작년) 현지 비중" value={temp.lastYear.supplyBreakdown.local ?? ""} onChange={bind("lastYear.supplyBreakdown.local")} />
            </div>
          </div>
        </details>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={btn("ghost")}>취소</button>
          <button onClick={() => { setData(temp); onSave(); }} style={btn()}>저장</button>
        </div>
      </div>
    </div>
  );
}

const inp = () => ({ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, width: "100%", fontSize: 14 });
const grid = (n) => ({ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, gap: 10 });
const modal = () => ({ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 });
const sheet = () => ({ background: "#fff", borderRadius: 12, padding: 16, width: "min(900px, 92vw)", border: "1px solid #e5e7eb" });
