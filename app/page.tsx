"use client";
import { useState } from "react";

const COLORS = {
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
  textMuted: "#6b7280",
  textSub: "#9ca3af",
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const formatHours = (h: number) => `${h.toFixed(1)}h`;

interface PillProps { color: string; glow: string; children: React.ReactNode; }
function Pill({ color, glow, children }: PillProps) {
  return (
    <span style={{ background: glow, color, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

interface ModalProps { title: string; onClose: () => void; children: React.ReactNode; }
function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: `0 24px 80px rgba(0,0,0,0.6)` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ color: COLORS.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 20, cursor: "pointer", padding: 4, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }
function Input({ label, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: COLORS.textSub, fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>}
      <input {...props} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box", ...props.style }} />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; children: React.ReactNode; }
function Select({ label, children, ...props }: SelectProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: COLORS.textSub, fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>}
      <select {...props} style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}>
        {children}
      </select>
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "danger" | "success";
interface BtnProps { children: React.ReactNode; onClick?: () => void; variant?: BtnVariant; style?: React.CSSProperties; }
function Btn({ children, onClick, variant = "primary", style = {} }: BtnProps) {
  const styles: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: COLORS.accent, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: COLORS.textSub, border: `1px solid ${COLORS.border}` },
    danger: { background: COLORS.redGlow, color: COLORS.red, border: `1px solid ${COLORS.red}44` },
    success: { background: COLORS.greenGlow, color: COLORS.green, border: `1px solid ${COLORS.green}44` },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", ...style }}>
      {children}
    </button>
  );
}

interface StatCardProps { label: string; value: string | number; color: string; icon: string; }
function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px", flex: 1, minWidth: 140, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ color, fontSize: 24, fontWeight: 800, letterSpacing: -1 }}>{value}</div>
      <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

interface Contractor { id: number; name: string; rate: number; color: string; }
interface Property { id: number; address: string; city: string; }
interface Log { id: number; contractorId: number; propertyId: number; hours: number; date: string; paid: boolean; note: string; }

const CONTRACTOR_COLORS = ["#7c3aed","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#8b5cf6","#14b8a6"];

export default function GetPaid() {
  const [tab, setTab] = useState("dashboard");
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

  const [showAddContractor, setShowAddContractor] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showLogHours, setShowLogHours] = useState(false);

  const [cForm, setCForm] = useState({ name: "", rate: "" });
  const [pForm, setPForm] = useState({ address: "", city: "" });
  const [lForm, setLForm] = useState({ contractorId: "", propertyId: "", hours: "", date: "", note: "" });

  const addContractor = () => {
    if (!cForm.name || !cForm.rate) return;
    setContractors([...contractors, { id: Date.now(), name: cForm.name, rate: parseFloat(cForm.rate), color: CONTRACTOR_COLORS[contractors.length % CONTRACTOR_COLORS.length] }]);
    setCForm({ name: "", rate: "" });
    setShowAddContractor(false);
  };

  const addProperty = () => {
    if (!pForm.address) return;
    setProperties([...properties, { id: Date.now(), address: pForm.address, city: pForm.city }]);
    setPForm({ address: "", city: "" });
    setShowAddProperty(false);
  };

  const logHours = () => {
    if (!lForm.contractorId || !lForm.propertyId || !lForm.hours || !lForm.date) return;
    setLogs([...logs, { id: Date.now(), contractorId: parseInt(lForm.contractorId), propertyId: parseInt(lForm.propertyId), hours: parseFloat(lForm.hours), date: lForm.date, note: lForm.note, paid: false }]);
    setLForm({ contractorId: "", propertyId: "", hours: "", date: "", note: "" });
    setShowLogHours(false);
  };

  const togglePaid = (logId: number) => setLogs(logs.map((l) => l.id === logId ? { ...l, paid: !l.paid } : l));
  const deleteLog = (logId: number) => setLogs(logs.filter((l) => l.id !== logId));

  const totalOwed = logs.filter((l) => !l.paid).reduce((sum, l) => {
    const c = contractors.find((c) => c.id === l.contractorId);
    return sum + (c ? c.rate * l.hours : 0);
  }, 0);
  const totalPaid = logs.filter((l) => l.paid).reduce((sum, l) => {
    const c = contractors.find((c) => c.id === l.contractorId);
    return sum + (c ? c.rate * l.hours : 0);
  }, 0);
  const totalHours = logs.reduce((sum, l) => sum + l.hours, 0);

  const contractorSummary = contractors.map((c) => {
    const cLogs = logs.filter((l) => l.contractorId === c.id);
    const owed = cLogs.filter((l) => !l.paid).reduce((sum, l) => sum + l.hours * c.rate, 0);
    const paid = cLogs.filter((l) => l.paid).reduce((sum, l) => sum + l.hours * c.rate, 0);
    const hours = cLogs.reduce((sum, l) => sum + l.hours, 0);
    return { ...c, owed, paid, hours, logCount: cLogs.length };
  });

  const propertySummary = properties.map((p) => {
    const pLogs = logs.filter((l) => l.propertyId === p.id);
    const owed = pLogs.filter((l) => !l.paid).reduce((sum, l) => {
      const c = contractors.find((c) => c.id === l.contractorId);
      return sum + (c ? l.hours * c.rate : 0);
    }, 0);
    const hours = pLogs.reduce((sum, l) => sum + l.hours, 0);
    return { ...p, owed, hours, logCount: pLogs.length };
  });

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "⚡" },
    { id: "contractors", label: "Contractors", icon: "👷" },
    { id: "properties", label: "Properties", icon: "🏠" },
    { id: "logs", label: "Hours Log", icon: "🕐" },
  ];

  const initials = (name: string) => name.split(" ").map((n) => n[0]).join("");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: COLORS.text }}>
      {/* Header */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💸</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>GetPaid</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? COLORS.accentGlow : "transparent", border: tab === t.id ? `1px solid ${COLORS.accent}44` : "1px solid transparent", borderRadius: 8, padding: "6px 14px", color: tab === t.id ? COLORS.accentLight : COLORS.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{t.icon}</span><span style={{ fontSize: 11 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Overview</h1>
              <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 14 }}>Track every dollar, every hour.</p>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
              <StatCard label="Total Owed" value={formatCurrency(totalOwed)} color={COLORS.red} icon="🔴" />
              <StatCard label="Total Paid" value={formatCurrency(totalPaid)} color={COLORS.green} icon="✅" />
              <StatCard label="Hours Logged" value={formatHours(totalHours)} color={COLORS.yellow} icon="⏱️" />
              <StatCard label="Contractors" value={contractors.length} color={COLORS.accentLight} icon="👷" />
            </div>
            <div style={{ marginBottom: 32 }}>
              <Btn onClick={() => setShowLogHours(true)} style={{ fontSize: 15, padding: "12px 28px" }}>+ Log Hours</Btn>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 1 }}>Contractor Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {contractorSummary.map((c) => (
                <div key={c.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + "22", border: `1px solid ${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, fontWeight: 800, fontSize: 14 }}>{initials(c.name)}</div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 12 }}>{formatCurrency(c.rate)}/hr &middot; {formatHours(c.hours)} logged</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {c.owed > 0 && <Pill color={COLORS.red} glow={COLORS.redGlow}>Owes {formatCurrency(c.owed)}</Pill>}
                    {c.paid > 0 && <Pill color={COLORS.green} glow={COLORS.greenGlow}>Paid {formatCurrency(c.paid)}</Pill>}
                    {c.logCount === 0 && <Pill color={COLORS.textMuted} glow="transparent">No logs yet</Pill>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, color: COLORS.textSub, textTransform: "uppercase", letterSpacing: 1 }}>Property Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {propertySummary.map((p) => (
                <div key={p.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 24 }}>🏠</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.address}</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 12 }}>{p.city} &middot; {p.logCount} entries &middot; {formatHours(p.hours)}</div>
                  </div>
                  {p.owed > 0 && <Pill color={COLORS.red} glow={COLORS.redGlow}>Owed {formatCurrency(p.owed)}</Pill>}
                  {p.owed === 0 && p.logCount > 0 && <Pill color={COLORS.green} glow={COLORS.greenGlow}>All Paid</Pill>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTRACTORS */}
        {tab === "contractors" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Contractors</h1>
                <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 14 }}>{contractors.length} crew members</p>
              </div>
              <Btn onClick={() => setShowAddContractor(true)}>+ Add Contractor</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {contractors.map((c) => {
                const summary = contractorSummary.find((s) => s.id === c.id)!;
                return (
                  <div key={c.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: c.color + "22", border: `2px solid ${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, fontWeight: 800, fontSize: 16 }}>{initials(c.name)}</div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                      <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 2 }}>{formatCurrency(c.rate)} / hour</div>
                    </div>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div style={{ textAlign: "center" }}><div style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>{formatHours(summary.hours)}</div><div style={{ color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Hours</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: COLORS.red, fontWeight: 700, fontSize: 15 }}>{formatCurrency(summary.owed)}</div><div style={{ color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Owed</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: COLORS.green, fontWeight: 700, fontSize: 15 }}>{formatCurrency(summary.paid)}</div><div style={{ color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Paid</div></div>
                    </div>
                    <button onClick={() => setContractors(contractors.filter((x) => x.id !== c.id))} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PROPERTIES */}
        {tab === "properties" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Properties</h1>
                <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 14 }}>{properties.length} active projects</p>
              </div>
              <Btn onClick={() => setShowAddProperty(true)}>+ Add Property</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {properties.map((p) => {
                const summary = propertySummary.find((s) => s.id === p.id)!;
                const pLogs = logs.filter((l) => l.propertyId === p.id);
                const assigned = [...new Set(pLogs.map((l) => l.contractorId))].map((id) => contractors.find((c) => c.id === id)).filter((c): c is Contractor => !!c);
                return (
                  <div key={p.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 32 }}>🏠</div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{p.address}</div>
                        <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 2 }}>{p.city}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                          {assigned.map((c) => (
                            <span key={c.id} style={{ background: c.color + "22", color: c.color, border: `1px solid ${c.color}44`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{c.name.split(" ")[0]}</span>
                          ))}
                          {assigned.length === 0 && <span style={{ color: COLORS.textMuted, fontSize: 12 }}>No contractors assigned yet</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 24 }}>
                        <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 15 }}>{formatHours(summary.hours)}</div><div style={{ color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Hours</div></div>
                        <div style={{ textAlign: "center" }}><div style={{ color: summary.owed > 0 ? COLORS.red : COLORS.green, fontWeight: 700, fontSize: 15 }}>{formatCurrency(summary.owed)}</div><div style={{ color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Owed</div></div>
                      </div>
                      <button onClick={() => setProperties(properties.filter((x) => x.id !== p.id))} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LOGS */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Hours Log</h1>
                <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 14 }}>{logs.length} entries &middot; {logs.filter((l) => !l.paid).length} unpaid</p>
              </div>
              <Btn onClick={() => setShowLogHours(true)}>+ Log Hours</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
                const c = contractors.find((x) => x.id === log.contractorId);
                const p = properties.find((x) => x.id === log.propertyId);
                const amount = c ? c.rate * log.hours : 0;
                return (
                  <div key={log.id} style={{ background: COLORS.card, border: `1px solid ${log.paid ? COLORS.green + "33" : COLORS.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: c ? c.color + "22" : "#ffffff11", border: `1px solid ${c ? c.color + "44" : "#ffffff22"}`, display: "flex", alignItems: "center", justifyContent: "center", color: c?.color, fontWeight: 800, fontSize: 13 }}>
                      {c ? initials(c.name) : "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c?.name || "Unknown"}</div>
                      <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{p?.address || "Unknown property"}</div>
                      {log.note && <div style={{ color: COLORS.textSub, fontSize: 12, marginTop: 4, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
                    </div>
                    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                      <div><div style={{ color: COLORS.text, fontWeight: 700, fontSize: 14 }}>{formatHours(log.hours)}</div><div style={{ color: COLORS.textMuted, fontSize: 11 }}>{log.date}</div></div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: log.paid ? COLORS.green : COLORS.yellow }}>{formatCurrency(amount)}</div>
                      <Btn variant={log.paid ? "ghost" : "success"} onClick={() => togglePaid(log.id)} style={{ padding: "6px 14px", fontSize: 12 }}>{log.paid ? "✓ Paid" : "Mark Paid"}</Btn>
                      <button onClick={() => deleteLog(log.id)} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
              {logs.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: COLORS.textMuted }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
                  <div style={{ fontWeight: 600 }}>No hours logged yet</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Hit &quot;+ Log Hours&quot; to get started</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showAddContractor && (
        <Modal title="Add Contractor" onClose={() => setShowAddContractor(false)}>
          <Input label="Full Name" placeholder="e.g. Marcus Webb" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} />
          <Input label="Hourly Rate ($)" type="number" placeholder="45" value={cForm.rate} onChange={(e) => setCForm({ ...cForm, rate: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowAddContractor(false)}>Cancel</Btn>
            <Btn onClick={addContractor}>Add Contractor</Btn>
          </div>
        </Modal>
      )}

      {showAddProperty && (
        <Modal title="Add Property" onClose={() => setShowAddProperty(false)}>
          <Input label="Street Address" placeholder="e.g. 2847 Elmwood Ave" value={pForm.address} onChange={(e) => setPForm({ ...pForm, address: e.target.value })} />
          <Input label="City, State" placeholder="e.g. Chicago, IL" value={pForm.city} onChange={(e) => setPForm({ ...pForm, city: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowAddProperty(false)}>Cancel</Btn>
            <Btn onClick={addProperty}>Add Property</Btn>
          </div>
        </Modal>
      )}

      {showLogHours && (
        <Modal title="Log Hours" onClose={() => setShowLogHours(false)}>
          <Select label="Contractor" value={lForm.contractorId} onChange={(e) => setLForm({ ...lForm, contractorId: e.target.value })}>
            <option value="">Select contractor...</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.rate)}/hr)</option>)}
          </Select>
          <Select label="Property" value={lForm.propertyId} onChange={(e) => setLForm({ ...lForm, propertyId: e.target.value })}>
            <option value="">Select property...</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </Select>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Input label="Hours Worked" type="number" placeholder="8" value={lForm.hours} onChange={(e) => setLForm({ ...lForm, hours: e.target.value })} /></div>
            <div style={{ flex: 1 }}><Input label="Date" type="date" value={lForm.date} onChange={(e) => setLForm({ ...lForm, date: e.target.value })} /></div>
          </div>
          <Input label="Note (optional)" placeholder="e.g. Framing + demo" value={lForm.note} onChange={(e) => setLForm({ ...lForm, note: e.target.value })} />
          {lForm.contractorId && lForm.hours && (
            <div style={{ background: COLORS.accentGlow, border: `1px solid ${COLORS.accent}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: COLORS.accentLight }}>
              💰 This will log <strong>{formatCurrency((contractors.find((c) => c.id === parseInt(lForm.contractorId))?.rate || 0) * parseFloat(lForm.hours || "0"))}</strong> owed
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowLogHours(false)}>Cancel</Btn>
            <Btn onClick={logHours}>Log Hours</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
