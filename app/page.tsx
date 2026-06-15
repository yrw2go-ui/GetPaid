"use client";
import { useState } from "react";

const C = {
  bg: "#0a0a0f",
  surface: "#13131a",
  card: "#1a1a24",
  border: "#2a2a3a",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  accentGlow: "rgba(124,58,237,0.15)",
  green: "#10b981",
  greenGlow: "rgba(16,185,129,0.15)",
  yellow: "#f59e0b",
  yellowGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444",
  redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3",
  muted: "#6b7280",
  sub: "#9ca3af",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const hrs = (h: number) => `${h.toFixed(1)}h`;
const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

function timeToDecimal(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  let diff = timeToDecimal(end) - timeToDecimal(start);
  if (diff < 0) diff += 24;
  return Math.round(diff * 10) / 10;
}

interface Contractor { id: number; name: string; rate: number; color: string; }
interface Property { id: number; address: string; city: string; }
interface Log { id: number; contractorId: number; propertyId: number; hours: number; date: string; paid: boolean; note: string; }

const COLORS = ["#7c3aed","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#8b5cf6","#14b8a6"];

// ── Components ────────────────────────────────────────────────────────────

function Pill({ color, glow, children }: { color: string; glow: string; children: React.ReactNode }) {
  return <span style={{ background: glow, color, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{children}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 500, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>}
      <input {...props} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{ width: "100%", background: C.surface, border: `1px solid ${focused ? C.accent : C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s", ...props.style }} />
    </div>
  );
}

function Sel({ label, children, ...props }: { label?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>}
      <select {...props} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}>{children}</select>
    </div>
  );
}

function Btn({ children, onClick, v = "primary", style = {} }: { children: React.ReactNode; onClick?: () => void; v?: "primary"|"ghost"|"success"|"danger"; style?: React.CSSProperties }) {
  const s = { primary: { background: C.accent, color: "#fff", border: "none" }, ghost: { background: "transparent", color: C.sub, border: `1px solid ${C.border}` }, success: { background: C.greenGlow, color: C.green, border: `1px solid ${C.green}44` }, danger: { background: C.redGlow, color: C.red, border: `1px solid ${C.red}44` } };
  return <button onClick={onClick} style={{ ...s[v], borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s", ...style }}>{children}</button>;
}

function InlineEdit({ value, onSave, style = {} }: { value: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (editing) return (
    <input autoFocus value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { onSave(val); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === "Enter") { onSave(val); setEditing(false); } if (e.key === "Escape") { setVal(value); setEditing(false); } }}
      style={{ background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 6, padding: "2px 8px", color: C.text, fontSize: "inherit", fontWeight: "inherit", outline: "none", ...style }} />
  );
  return <span onClick={() => setEditing(true)} style={{ cursor: "text", borderBottom: `1px dashed ${C.border}`, paddingBottom: 1, ...style }} title="Click to edit">{value}</span>;
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", flex: 1, minWidth: 130, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>{value}</div>
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

// ── Property Detail View ─────────────────────────────────────────────────

function PropertyDetail({ property, logs, contractors, onBack, onTogglePaid, onDeleteLog }: {
  property: Property; logs: Log[]; contractors: Contractor[];
  onBack: () => void; onTogglePaid: (id: number) => void; onDeleteLog: (id: number) => void;
}) {
  const pLogs = logs.filter((l) => l.propertyId === property.id);
  const totalOwed = pLogs.filter((l) => !l.paid).reduce((sum, l) => {
    const con = contractors.find((c) => c.id === l.contractorId);
    return sum + (con ? con.rate * l.hours : 0);
  }, 0);
  const totalPaid = pLogs.filter((l) => l.paid).reduce((sum, l) => {
    const con = contractors.find((c) => c.id === l.contractorId);
    return sum + (con ? con.rate * l.hours : 0);
  }, 0);
  const totalHrs = pLogs.reduce((sum, l) => sum + l.hours, 0);

  // Group by contractor
  const byContractor = contractors.map((con) => {
    const cLogs = pLogs.filter((l) => l.contractorId === con.id);
    if (cLogs.length === 0) return null;
    const owed = cLogs.filter((l) => !l.paid).reduce((s, l) => s + l.hours * con.rate, 0);
    const paid = cLogs.filter((l) => l.paid).reduce((s, l) => s + l.hours * con.rate, 0);
    const hours = cLogs.reduce((s, l) => s + l.hours, 0);
    return { con, cLogs, owed, paid, hours };
  }).filter(Boolean) as { con: Contractor; cLogs: Log[]; owed: number; paid: number; hours: number }[];

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>
        ← Back to Properties
      </button>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>{property.address}</h1>
        <p style={{ color: C.muted, margin: "4px 0 0", fontSize: 14 }}>{property.city}</p>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32, marginTop: 24 }}>
        <StatCard label="Total Owed" value={$$(totalOwed)} color={C.red} icon="🔴" />
        <StatCard label="Total Paid" value={$$(totalPaid)} color={C.green} icon="✅" />
        <StatCard label="Hours Logged" value={hrs(totalHrs)} color={C.yellow} icon="⏱️" />
        <StatCard label="Entries" value={pLogs.length} color={C.accentLight} icon="📋" />
      </div>

      {byContractor.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <div style={{ fontWeight: 600 }}>No hours logged for this property yet</div>
        </div>
      )}

      {byContractor.map(({ con, cLogs, owed, paid, hours }) => (
        <div key={con.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
          {/* Contractor header */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: con.color + "22", border: `2px solid ${con.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: con.color, fontWeight: 800, fontSize: 14 }}>{initials(con.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{con.name}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{$$(con.rate)}/hr &middot; {hrs(hours)} total</div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {owed > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.red, fontWeight: 800, fontSize: 16 }}>{$$(owed)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Owed</div></div>}
              {paid > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.green, fontWeight: 800, fontSize: 16 }}>{$$(paid)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Paid</div></div>}
            </div>
          </div>
          {/* Log rows */}
          {[...cLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
            const amount = con.rate * log.hours;
            return (
              <div key={log.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: log.paid ? `${C.green}08` : "transparent" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{log.date}</div>
                  {log.note && <div style={{ color: C.sub, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 13, minWidth: 40 }}>{hrs(log.hours)}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: log.paid ? C.green : C.yellow, minWidth: 70 }}>{$$(amount)}</div>
                <Btn v={log.paid ? "ghost" : "success"} onClick={() => onTogglePaid(log.id)} style={{ padding: "6px 14px", fontSize: 12 }}>{log.paid ? "✓ Paid" : "Mark Paid"}</Btn>
                <button onClick={() => onDeleteLog(log.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────

export default function GetPaid() {
  const [tab, setTab] = useState("dashboard");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [contractors, setContractors] = useState<Contractor[]>([
    { id: 1, name: "Marcus Webb", rate: 45, color: "#7c3aed" },
    { id: 2, name: "Layla Torres", rate: 38, color: "#10b981" },
    { id: 3, name: "Devon Park", rate: 52, color: "#f59e0b" },
  ]);
  const [properties, setProperties] = useState<Property[]>([
    { id: 1, address: "2847 Elmwood Ave", city: "Chicago, IL" },
    { id: 2, address: "501 Raven Court", city: "Oak Park, IL" },
  ]);
  const [logs, setLogs] = useState<Log[]>([
    { id: 1, contractorId: 1, propertyId: 1, hours: 8, date: "2025-06-10", paid: false, note: "Demo & framing" },
    { id: 2, contractorId: 2, propertyId: 1, hours: 6, date: "2025-06-11", paid: false, note: "Electrical rough-in" },
    { id: 3, contractorId: 3, propertyId: 2, hours: 10, date: "2025-06-09", paid: true, note: "Full kitchen tile" },
  ]);

  const [showAddC, setShowAddC] = useState(false);
  const [showAddP, setShowAddP] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const [cForm, setCForm] = useState({ name: "", rate: "" });
  const [pForm, setPForm] = useState({ address: "", city: "" });
  const [lForm, setLForm] = useState({ contractorId: "", propertyId: "", hours: "", startTime: "", endTime: "", date: new Date().toISOString().split("T")[0], note: "", useTime: false });

  // Computed hours from time range
  const computedHours = lForm.useTime ? calcHours(lForm.startTime, lForm.endTime) : parseFloat(lForm.hours || "0");

  const addContractor = () => {
    if (!cForm.name || !cForm.rate) return;
    setContractors([...contractors, { id: Date.now(), name: cForm.name, rate: parseFloat(cForm.rate), color: COLORS[contractors.length % COLORS.length] }]);
    setCForm({ name: "", rate: "" }); setShowAddC(false);
  };

  const addProperty = () => {
    if (!pForm.address) return;
    setProperties([...properties, { id: Date.now(), address: pForm.address, city: pForm.city }]);
    setPForm({ address: "", city: "" }); setShowAddP(false);
  };

  const saveLog = () => {
    if (!lForm.contractorId || !lForm.propertyId || !lForm.date) return;
    const h = lForm.useTime ? calcHours(lForm.startTime, lForm.endTime) : parseFloat(lForm.hours);
    if (!h || h <= 0) return;
    setLogs([...logs, { id: Date.now(), contractorId: parseInt(lForm.contractorId), propertyId: parseInt(lForm.propertyId), hours: h, date: lForm.date, note: lForm.note, paid: false }]);
    setLForm({ contractorId: "", propertyId: "", hours: "", startTime: "", endTime: "", date: new Date().toISOString().split("T")[0], note: "", useTime: false });
    setShowLog(false);
  };

  const togglePaid = (id: number) => setLogs(logs.map((l) => l.id === id ? { ...l, paid: !l.paid } : l));
  const deleteLog = (id: number) => setLogs(logs.filter((l) => l.id !== id));

  const updateContractor = (id: number, field: keyof Contractor, value: string | number) =>
    setContractors(contractors.map((c) => c.id === id ? { ...c, [field]: value } : c));
  const updateProperty = (id: number, field: keyof Property, value: string) =>
    setProperties(properties.map((p) => p.id === id ? { ...p, [field]: value } : p));

  // Summaries
  const totalOwed = logs.filter((l) => !l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractorId); return s + (c ? c.rate * l.hours : 0); }, 0);
  const totalPaid = logs.filter((l) => l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractorId); return s + (c ? c.rate * l.hours : 0); }, 0);
  const totalHours = logs.reduce((s, l) => s + l.hours, 0);

  const cSummary = contractors.map((c) => {
    const cl = logs.filter((l) => l.contractorId === c.id);
    return { ...c, owed: cl.filter((l) => !l.paid).reduce((s, l) => s + l.hours * c.rate, 0), paid: cl.filter((l) => l.paid).reduce((s, l) => s + l.hours * c.rate, 0), hours: cl.reduce((s, l) => s + l.hours, 0), count: cl.length };
  });

  const pSummary = properties.map((p) => {
    const pl = logs.filter((l) => l.propertyId === p.id);
    const owed = pl.filter((l) => !l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractorId); return s + (c ? l.hours * c.rate : 0); }, 0);
    const paid = pl.filter((l) => l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractorId); return s + (c ? l.hours * c.rate : 0); }, 0);
    return { ...p, owed, paid, hours: pl.reduce((s, l) => s + l.hours, 0), count: pl.length };
  });

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "⚡" },
    { id: "contractors", label: "Crew", icon: "👷" },
    { id: "properties", label: "Properties", icon: "🏠" },
    { id: "logs", label: "Hours", icon: "🕐" },
  ];

  const logPreviewAmount = lForm.contractorId && computedHours > 0
    ? (contractors.find((c) => c.id === parseInt(lForm.contractorId))?.rate || 0) * computedHours
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: C.text }}>
      {/* Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💸</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>GetPaid</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedProperty(null); }}
                style={{ background: tab === t.id ? C.accentGlow : "transparent", border: tab === t.id ? `1px solid ${C.accent}44` : "1px solid transparent", borderRadius: 8, padding: "6px 12px", color: tab === t.id ? C.accentLight : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Overview</h1>
              <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>Track every dollar, every hour.</p>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              <StatCard label="Total Owed" value={$$(totalOwed)} color={C.red} icon="🔴" />
              <StatCard label="Total Paid" value={$$(totalPaid)} color={C.green} icon="✅" />
              <StatCard label="Hours Logged" value={hrs(totalHours)} color={C.yellow} icon="⏱️" />
              <StatCard label="Crew" value={contractors.length} color={C.accentLight} icon="👷" />
            </div>
            <div style={{ marginBottom: 28 }}>
              <Btn onClick={() => setShowLog(true)} style={{ fontSize: 15, padding: "12px 28px" }}>+ Log Hours</Btn>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 14, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>Crew Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {cSummary.map((c) => (
                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: c.color + "22", border: `1px solid ${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, fontWeight: 800, fontSize: 13 }}>{initials(c.name)}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ color: C.muted, fontSize: 12 }}>{$$(c.rate)}/hr &middot; {hrs(c.hours)}</div></div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {c.owed > 0 && <Pill color={C.red} glow={C.redGlow}>Owes {$$(c.owed)}</Pill>}
                    {c.paid > 0 && <Pill color={C.green} glow={C.greenGlow}>Paid {$$(c.paid)}</Pill>}
                    {c.count === 0 && <Pill color={C.muted} glow="transparent">No logs</Pill>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 14, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>Properties</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pSummary.map((p) => (
                <div key={p.id} onClick={() => { setTab("properties"); setSelectedProperty(p); }}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                  <div style={{ fontSize: 22 }}>🏠</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.address}</div><div style={{ color: C.muted, fontSize: 12 }}>{p.city} &middot; {p.count} entries &middot; {hrs(p.hours)}</div></div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {p.owed > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.red, fontWeight: 800, fontSize: 15 }}>{$$(p.owed)}</div><div style={{ color: C.muted, fontSize: 11 }}>owed</div></div>}
                    {p.paid > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.green, fontWeight: 800, fontSize: 15 }}>{$$(p.paid)}</div><div style={{ color: C.muted, fontSize: 11 }}>paid</div></div>}
                    <span style={{ color: C.accentLight, fontSize: 18 }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONTRACTORS ── */}
        {tab === "contractors" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Crew</h1>
                <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{contractors.length} members &middot; tap name or rate to edit</p>
              </div>
              <Btn onClick={() => setShowAddC(true)}>+ Add</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {contractors.map((con) => {
                const s = cSummary.find((x) => x.id === con.id)!;
                return (
                  <div key={con.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: con.color + "22", border: `2px solid ${con.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: con.color, fontWeight: 800, fontSize: 15 }}>{initials(con.name)}</div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>
                        <InlineEdit value={con.name} onSave={(v) => updateContractor(con.id, "name", v)} />
                      </div>
                      <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                        $<InlineEdit value={con.rate.toString()} onSave={(v) => updateContractor(con.id, "rate", parseFloat(v) || con.rate)} style={{ width: 50 }} /> / hour
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700 }}>{hrs(s.hours)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Hours</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.red, fontWeight: 700 }}>{$$(s.owed)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Owed</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.green, fontWeight: 700 }}>{$$(s.paid)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Paid</div></div>
                    </div>
                    <button onClick={() => setContractors(contractors.filter((x) => x.id !== con.id))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PROPERTIES ── */}
        {tab === "properties" && (
          selectedProperty ? (
            <PropertyDetail property={selectedProperty} logs={logs} contractors={contractors} onBack={() => setSelectedProperty(null)} onTogglePaid={togglePaid} onDeleteLog={deleteLog} />
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Properties</h1>
                  <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{properties.length} projects &middot; tap to view details</p>
                </div>
                <Btn onClick={() => setShowAddP(true)}>+ Add</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pSummary.map((p) => {
                  const assigned = [...new Set(logs.filter((l) => l.propertyId === p.id).map((l) => l.contractorId))].map((id) => contractors.find((c) => c.id === id)).filter((c): c is Contractor => !!c);
                  return (
                    <div key={p.id} onClick={() => setSelectedProperty(p)}
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 30 }}>🏠</div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>
                            <span onClick={(e) => e.stopPropagation()}>
                              <InlineEdit value={p.address} onSave={(v) => updateProperty(p.id, "address", v)} />
                            </span>
                          </div>
                          <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
                            <span onClick={(e) => e.stopPropagation()}>
                              <InlineEdit value={p.city} onSave={(v) => updateProperty(p.id, "city", v)} />
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            {assigned.map((c) => <span key={c.id} style={{ background: c.color + "22", color: c.color, border: `1px solid ${c.color}44`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{c.name.split(" ")[0]}</span>)}
                            {assigned.length === 0 && <span style={{ color: C.muted, fontSize: 12 }}>No crew assigned yet</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                          <div>
                            <div style={{ color: C.red, fontWeight: 800, fontSize: 18 }}>{$$(p.owed)}</div>
                            <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Owed</div>
                          </div>
                          {p.paid > 0 && <div>
                            <div style={{ color: C.green, fontWeight: 800, fontSize: 18 }}>{$$(p.paid)}</div>
                            <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Paid</div>
                          </div>}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <span style={{ color: C.accentLight, fontSize: 20 }}>›</span>
                            <button onClick={(e) => { e.stopPropagation(); setProperties(properties.filter((x) => x.id !== p.id)); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ── HOURS LOG ── */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Hours Log</h1>
                <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{logs.length} entries &middot; {logs.filter((l) => !l.paid).length} unpaid</p>
              </div>
              <Btn onClick={() => setShowLog(true)}>+ Log Hours</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
                const con = contractors.find((x) => x.id === log.contractorId);
                const prop = properties.find((x) => x.id === log.propertyId);
                const amount = con ? con.rate * log.hours : 0;
                return (
                  <div key={log.id} style={{ background: C.card, border: `1px solid ${log.paid ? C.green + "33" : C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: con ? con.color + "22" : "#fff1", border: `1px solid ${con ? con.color + "44" : "#fff2"}`, display: "flex", alignItems: "center", justifyContent: "center", color: con?.color, fontWeight: 800, fontSize: 13 }}>{con ? initials(con.name) : "?"}</div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{con?.name || "Unknown"}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{prop?.address || "Unknown"}</div>
                      {log.note && <div style={{ color: C.sub, fontSize: 12, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(log.hours)}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{log.date}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: log.paid ? C.green : C.yellow }}>{$$(amount)}</div>
                    <Btn v={log.paid ? "ghost" : "success"} onClick={() => togglePaid(log.id)} style={{ padding: "6px 12px", fontSize: 12 }}>{log.paid ? "✓ Paid" : "Mark Paid"}</Btn>
                    <button onClick={() => deleteLog(log.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
                  </div>
                );
              })}
              {logs.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div><div style={{ fontWeight: 600 }}>No hours logged yet</div></div>}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {showAddC && (
        <Modal title="Add Crew Member" onClose={() => setShowAddC(false)}>
          <Field label="Full Name" placeholder="e.g. Marcus Webb" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} />
          <Field label="Hourly Rate ($)" type="number" placeholder="45" value={cForm.rate} onChange={(e) => setCForm({ ...cForm, rate: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn v="ghost" onClick={() => setShowAddC(false)}>Cancel</Btn>
            <Btn onClick={addContractor}>Add</Btn>
          </div>
        </Modal>
      )}

      {showAddP && (
        <Modal title="Add Property" onClose={() => setShowAddP(false)}>
          <Field label="Street Address" placeholder="e.g. 2847 Elmwood Ave" value={pForm.address} onChange={(e) => setPForm({ ...pForm, address: e.target.value })} />
          <Field label="City, State" placeholder="e.g. Chicago, IL" value={pForm.city} onChange={(e) => setPForm({ ...pForm, city: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn v="ghost" onClick={() => setShowAddP(false)}>Cancel</Btn>
            <Btn onClick={addProperty}>Add</Btn>
          </div>
        </Modal>
      )}

      {showLog && (
        <Modal title="Log Hours" onClose={() => setShowLog(false)}>
          <Sel label="Crew Member" value={lForm.contractorId} onChange={(e) => setLForm({ ...lForm, contractorId: e.target.value })}>
            <option value="">Select crew member...</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} ({$$(c.rate)}/hr)</option>)}
          </Sel>
          <Sel label="Property" value={lForm.propertyId} onChange={(e) => setLForm({ ...lForm, propertyId: e.target.value })}>
            <option value="">Select property...</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </Sel>

          {/* Time mode toggle */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setLForm({ ...lForm, useTime: false })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${!lForm.useTime ? C.accent : C.border}`, background: !lForm.useTime ? C.accentGlow : "transparent", color: !lForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Manual Hours</button>
              <button onClick={() => setLForm({ ...lForm, useTime: true })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${lForm.useTime ? C.accent : C.border}`, background: lForm.useTime ? C.accentGlow : "transparent", color: lForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Start / End Time</button>
            </div>
            {!lForm.useTime ? (
              <Field label="Hours Worked" type="number" placeholder="8.5" value={lForm.hours} onChange={(e) => setLForm({ ...lForm, hours: e.target.value })} />
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Field label="Start Time" type="time" value={lForm.startTime} onChange={(e) => setLForm({ ...lForm, startTime: e.target.value })} /></div>
                <div style={{ flex: 1 }}><Field label="End Time" type="time" value={lForm.endTime} onChange={(e) => setLForm({ ...lForm, endTime: e.target.value })} /></div>
              </div>
            )}
            {lForm.useTime && lForm.startTime && lForm.endTime && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.sub, marginTop: -8, marginBottom: 16 }}>
                ⏱️ Calculated: <strong style={{ color: C.text }}>{computedHours.toFixed(1)} hours</strong>
              </div>
            )}
          </div>

          <Field label="Date" type="date" value={lForm.date} onChange={(e) => setLForm({ ...lForm, date: e.target.value })} />
          <Field label="Note (optional)" placeholder="e.g. Framing + demo" value={lForm.note} onChange={(e) => setLForm({ ...lForm, note: e.target.value })} />

          {logPreviewAmount > 0 && (
            <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.accentLight }}>
              💰 This logs <strong>{$$(logPreviewAmount)}</strong> owed
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setShowLog(false)}>Cancel</Btn>
            <Btn onClick={saveLog}>Save Entry</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
