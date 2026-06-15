"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rytoiilokjxelabqaljq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dG9paWxva2p4ZWxhYnFhbGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg2MTQsImV4cCI6MjA5NzEwNDYxNH0.LbJz7YLWi_kX6Gw93lvayPKcaXkGiPUusQ3d-zPQ8Kk"
);

const C = {
  bg: "#0a0a0f", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#7c3aed", accentLight: "#a78bfa", accentGlow: "rgba(124,58,237,0.15)",
  green: "#10b981", greenGlow: "rgba(16,185,129,0.15)",
  yellow: "#f59e0b", yellowGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444", redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3", muted: "#6b7280", sub: "#9ca3af",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const hrs = (h: number) => `${Number(h).toFixed(1)}h`;
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

interface Contractor { id: string; name: string; rate: number; color: string; }
interface Property { id: string; address: string; city: string; }
interface Deduction { title: string; amount: number; }
interface Log { id: string; contractor_id: string; property_id: string; hours: number; date: string; paid: boolean; note: string; deductions: Deduction[]; }

const COLORS = ["#7c3aed","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#8b5cf6","#14b8a6"];

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
  useEffect(() => setVal(value), [value]);
  if (editing) return (
    <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
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

function PropertyDetail({ property, logs, contractors, onBack, onTogglePaid, onDeleteLog, onUpdateLog }: {
  property: Property; logs: Log[]; contractors: Contractor[];
  onBack: () => void; onTogglePaid: (id: string) => void; onDeleteLog: (id: string) => void;
  onUpdateLog: (id: string, fields: Partial<Log>) => void;
}) {
  const pLogs = logs.filter((l) => l.property_id === property.id);
  const netAmt = (log: Log, rate: number) => {
    const gross = Number(log.hours) * rate;
    const ded = (log.deductions || []).reduce((s: number, d: Deduction) => s + Number(d.amount), 0);
    return Math.max(0, gross - ded);
  };
  const totalOwed = pLogs.filter((l) => !l.paid).reduce((sum, l) => { const con = contractors.find((c) => c.id === l.contractor_id); return sum + (con ? netAmt(l, con.rate) : 0); }, 0);
  const totalPaid = pLogs.filter((l) => l.paid).reduce((sum, l) => { const con = contractors.find((c) => c.id === l.contractor_id); return sum + (con ? netAmt(l, con.rate) : 0); }, 0);
  const totalHrs = pLogs.reduce((sum, l) => sum + Number(l.hours), 0);

  const [payAllTarget, setPayAllTarget] = useState<{ con: Contractor; owedLogs: Log[]; totalOwed: number } | null>(null);
  const [payAllDeds, setPayAllDeds] = useState<{ title: string; amount: string }[]>([]);
  const [payAllDedForm, setPayAllDedForm] = useState({ title: "", amount: "" });
  const [payAllDate, setPayAllDate] = useState(new Date().toISOString().split("T")[0]);
  const [editLogTarget, setEditLogTarget] = useState<Log | null>(null);
  const [editLogForm, setEditLogForm] = useState({ hours: "", date: "", note: "" });
  const [deleteLogTarget, setDeleteLogTarget] = useState<string | null>(null);

  const byContractor = contractors.map((con) => {
    const cLogs = pLogs.filter((l) => l.contractor_id === con.id);
    if (cLogs.length === 0) return null;
    const owedLogs = cLogs.filter((l) => !l.paid);
    const paidLogs = cLogs.filter((l) => l.paid);
    const owed = owedLogs.reduce((s, l) => s + netAmt(l, con.rate), 0);
    const paid = paidLogs.reduce((s, l) => s + netAmt(l, con.rate), 0);
    const hours = cLogs.reduce((s, l) => s + Number(l.hours), 0);
    return { con, cLogs, owedLogs, paidLogs, owed, paid, hours };
  }).filter(Boolean) as { con: Contractor; cLogs: Log[]; owedLogs: Log[]; paidLogs: Log[]; owed: number; paid: number; hours: number }[];

  const openPayAll = (con: Contractor, owedLogs: Log[], totalOwed: number) => {
    setPayAllTarget({ con, owedLogs, totalOwed });
    setPayAllDeds([]);
    setPayAllDedForm({ title: "", amount: "" });
    setPayAllDate(new Date().toISOString().split("T")[0]);
  };

  const doPayAll = async () => {
    if (!payAllTarget) return;
    const finalDeds = payAllDeds.map(d => ({ title: d.title, amount: parseFloat(d.amount) || 0 }));
    const today = payAllDate;
    for (const log of payAllTarget.owedLogs) {
      const merged = [...(log.deductions || []), ...finalDeds];
      await supabase.from("logs").update({ paid: true, date: today, deductions: JSON.stringify(merged) }).eq("id", log.id);
      onUpdateLog(log.id, { paid: true, date: today, deductions: merged });
    }
    setPayAllTarget(null);
  };

  const openEditLog = (log: Log) => {
    setEditLogTarget(log);
    setEditLogForm({ hours: String(log.hours), date: log.date, note: log.note || "" });
  };

  const saveEditLog = async () => {
    if (!editLogTarget) return;
    const fields = { hours: parseFloat(editLogForm.hours) || editLogTarget.hours, date: editLogForm.date, note: editLogForm.note };
    await supabase.from("logs").update(fields).eq("id", editLogTarget.id);
    onUpdateLog(editLogTarget.id, fields);
    setEditLogTarget(null);
  };

  const doDeleteLog = async () => {
    if (!deleteLogTarget) return;
    await supabase.from("logs").delete().eq("id", deleteLogTarget);
    onDeleteLog(deleteLogTarget);
    setDeleteLogTarget(null);
  };

  const payAllDedsTotal = payAllDeds.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>&#8592; Back to Properties</button>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>{property.address}</h1>
      <p style={{ color: C.muted, margin: "4px 0 24px", fontSize: 14 }}>{property.city}</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total Owed" value={$$(totalOwed)} color={C.red} icon="&#128308;" />
        <StatCard label="Total Paid" value={$$(totalPaid)} color={C.green} icon="&#9989;" />
        <StatCard label="Hours Logged" value={hrs(totalHrs)} color={C.yellow} icon="&#9200;" />
        <StatCard label="Entries" value={pLogs.length} color={C.accentLight} icon="&#128203;" />
      </div>

      {byContractor.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>&#127968;</div><div style={{ fontWeight: 600 }}>No hours logged for this property yet</div></div>}

      {byContractor.map(({ con, owedLogs, paidLogs, owed, paid, hours }) => (
        <div key={con.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: con.color + "22", border: `2px solid ${con.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: con.color, fontWeight: 800, fontSize: 14 }}>{initials(con.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{con.name}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{$$(con.rate)}/hr &middot; {hrs(hours)} total</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {owed > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.red, fontWeight: 800, fontSize: 16 }}>{$$(owed)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Owed</div></div>}
              {paid > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.green, fontWeight: 800, fontSize: 16 }}>{$$(paid)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Paid</div></div>}
              {owedLogs.length > 0 && (
                <button onClick={() => openPayAll(con, owedLogs, owed)}
                  style={{ background: `linear-gradient(135deg, ${C.green}, #059669)`, border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${C.green}44` }}>
                  Pay All {$$(owed)}
                </button>
              )}
            </div>
          </div>

          {owedLogs.length > 0 && (
            <div>
              <div style={{ padding: "8px 20px", background: C.redGlow, fontSize: 11, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: 0.8 }}>Unpaid</div>
              {[...owedLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
                const gross = con.rate * Number(log.hours);
                const net = netAmt(log, con.rate);
                return (
                  <div key={log.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{log.date}</div>
                      {log.note && <div style={{ color: C.sub, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
                      {(log.deductions || []).map((d: Deduction, i: number) => <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 1 }}>- {d.title}: {$$(Number(d.amount))}</div>)}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(Number(log.hours))}</div>
                      {(log.deductions || []).length > 0 && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(gross)}</div>}
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.yellow }}>{$$(net)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openEditLog(log)} style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "6px 10px", color: C.accentLight, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                      <Btn v="success" onClick={() => onTogglePaid(log.id)} style={{ padding: "6px 10px", fontSize: 12 }}>Mark Paid</Btn>
                      <button onClick={() => setDeleteLogTarget(log.id)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "6px 10px", color: C.red, fontSize: 12, cursor: "pointer" }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {paidLogs.length > 0 && (
            <div>
              <div style={{ padding: "8px 20px", background: C.greenGlow, fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.8 }}>Paid History</div>
              {[...paidLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
                const gross = con.rate * Number(log.hours);
                const net = netAmt(log, con.rate);
                return (
                  <div key={log.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: `${C.green}06` }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{log.date} <span style={{ color: C.green, fontSize: 11 }}>paid</span></div>
                      {log.note && <div style={{ color: C.sub, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
                      {(log.deductions || []).map((d: Deduction, i: number) => <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 1 }}>- {d.title}: {$$(Number(d.amount))}</div>)}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(Number(log.hours))}</div>
                      {(log.deductions || []).length > 0 && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(gross)}</div>}
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.green }}>{$$(net)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openEditLog(log)} style={{ background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 8, padding: "6px 10px", color: C.yellow, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                      <Btn v="ghost" onClick={() => onTogglePaid(log.id)} style={{ padding: "6px 10px", fontSize: 12 }}>Undo Paid</Btn>
                      <button onClick={() => setDeleteLogTarget(log.id)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "6px 10px", color: C.red, fontSize: 12, cursor: "pointer" }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {payAllTarget && (
        <Modal title={`Pay All — ${payAllTarget.con.name}`} onClose={() => setPayAllTarget(null)}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 8 }}>{payAllTarget.owedLogs.length} entries at {property.address}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.text, marginBottom: 4 }}>
              <span>Gross owed</span><span style={{ fontWeight: 700 }}>{$$(payAllTarget.totalOwed)}</span>
            </div>
            {payAllDeds.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.red, marginBottom: 4 }}>
                <span>- {d.title}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>-{$$(parseFloat(d.amount) || 0)}</span>
                  <button onClick={() => setPayAllDeds(payAllDeds.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>x</button>
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16 }}>
              <span style={{ color: C.text }}>Net to Pay</span>
              <span style={{ color: C.green }}>{$$(Math.max(0, payAllTarget.totalOwed - payAllDedsTotal))}</span>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Add Deduction (optional)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Item (e.g. Materials)" value={payAllDedForm.title} onChange={(e) => setPayAllDedForm({ ...payAllDedForm, title: e.target.value })}
                style={{ flex: 2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
              <input placeholder="$0" type="number" value={payAllDedForm.amount} onChange={(e) => setPayAllDedForm({ ...payAllDedForm, amount: e.target.value })}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => { if (!payAllDedForm.title || !payAllDedForm.amount) return; setPayAllDeds([...payAllDeds, payAllDedForm]); setPayAllDedForm({ title: "", amount: "" }); }}
                style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "8px 14px", color: C.accentLight, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add</button>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Date Paid</label>
            <input type="date" value={payAllDate} onChange={(e) => setPayAllDate(e.target.value)}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setPayAllTarget(null)}>Cancel</Btn>
            <Btn v="success" onClick={doPayAll}>Confirm Payment</Btn>
          </div>
        </Modal>
      )}

      {editLogTarget && (
        <Modal title={editLogTarget.paid ? "Edit Paid Entry" : "Edit Entry"} onClose={() => setEditLogTarget(null)}>
          {editLogTarget.paid && (
            <div style={{ background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.yellow }}>
              Warning: This entry is already marked as paid. Changes will update the paid record.
            </div>
          )}
          <Field label="Hours" type="number" value={editLogForm.hours} onChange={(e) => setEditLogForm({ ...editLogForm, hours: e.target.value })} />
          <Field label="Date" type="date" value={editLogForm.date} onChange={(e) => setEditLogForm({ ...editLogForm, date: e.target.value })} />
          <Field label="Note" placeholder="Optional note" value={editLogForm.note} onChange={(e) => setEditLogForm({ ...editLogForm, note: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn v="ghost" onClick={() => setEditLogTarget(null)}>Cancel</Btn>
            <Btn onClick={saveEditLog}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {deleteLogTarget && (
        <Modal title="Delete Entry?" onClose={() => setDeleteLogTarget(null)}>
          <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>
            Warning: This will permanently delete this log entry and cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setDeleteLogTarget(null)}>Cancel</Btn>
            <Btn v="danger" onClick={doDeleteLog}>Yes, Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


function ContractorDetail({ contractor, logs, properties, onBack, onTogglePaid, onDeleteLog, onUpdateLog, onUpdateContractor, onDeleteContractor, onAddLog }: {
  contractor: Contractor; logs: Log[]; properties: Property[];
  onBack: () => void; onTogglePaid: (id: string) => void; onDeleteLog: (id: string) => void;
  onUpdateLog: (id: string, fields: Partial<Log>) => void;
  onUpdateContractor: (id: string, field: string, value: string | number) => void;
  onDeleteContractor: (id: string) => void;
  onAddLog: (log: Log) => void;
}) {
  const cLogs = logs.filter((l) => l.contractor_id === contractor.id);
  const owedLogs = cLogs.filter((l) => !l.paid);
  const paidLogs = cLogs.filter((l) => l.paid);
  const netAmt = (log: Log) => {
    const gross = Number(log.hours) * contractor.rate;
    const ded = (log.deductions || []).reduce((s: number, d: Deduction) => s + Number(d.amount), 0);
    return Math.max(0, gross - ded);
  };
  const totalOwed = owedLogs.reduce((s, l) => s + netAmt(l), 0);
  const totalPaid = paidLogs.reduce((s, l) => s + netAmt(l), 0);
  const totalHrs = cLogs.reduce((s, l) => s + Number(l.hours), 0);

  const [editLog, setEditLog] = useState<Log | null>(null);
  const [editForm, setEditForm] = useState({ hours: "", date: "", note: "" });
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [showDeleteContractor, setShowDeleteContractor] = useState(false);
  const [showContractorLog, setShowContractorLog] = useState(false);
  const [cLogForm, setCLogForm] = useState({ propertyId: "", hours: "", startTime: "", endTime: "", date: new Date().toISOString().split("T")[0], note: "", useTime: false });
  const [editingName, setEditingName] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [nameVal, setNameVal] = useState(contractor.name);
  const [rateVal, setRateVal] = useState(String(contractor.rate));

  const openEdit = (log: Log) => {
    setEditLog(log);
    setEditForm({ hours: String(log.hours), date: log.date, note: log.note || "" });
  };

  const saveEdit = () => {
    if (!editLog) return;
    onUpdateLog(editLog.id, { hours: parseFloat(editForm.hours) || editLog.hours, date: editForm.date, note: editForm.note });
    setEditLog(null);
  };

  const confirmDeleteLog = (id: string) => setDeleteLogId(id);
  const doDeleteLog = () => { if (deleteLogId) { onDeleteLog(deleteLogId); setDeleteLogId(null); } };

  const LogRow = ({ log, isPaid }: { log: Log; isPaid: boolean }) => {
    const prop = properties.find((p) => p.id === log.property_id);
    const gross = Number(log.hours) * contractor.rate;
    const net = netAmt(log);
    return (
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: isPaid ? `${C.green}08` : "transparent" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{log.date}</div>
          <div style={{ color: C.accentLight, fontSize: 12, marginTop: 2 }}>🏠 {prop?.address || "Unknown"}</div>
          {log.note && <div style={{ color: C.sub, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
          {(log.deductions || []).map((d: Deduction, i: number) => (
            <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 2 }}>- {d.title}: {$$(Number(d.amount))}</div>
          ))}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(Number(log.hours))}</div>
          {(log.deductions || []).length > 0 && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(gross)}</div>}
          <div style={{ fontWeight: 700, fontSize: 14, color: isPaid ? C.green : C.yellow }}>{$$(net)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => openEdit(log)} style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "6px 12px", color: C.accentLight, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</button>
          <Btn v={isPaid ? "ghost" : "success"} onClick={() => onTogglePaid(log.id)} style={{ padding: "6px 12px", fontSize: 12 }}>{isPaid ? "✓ Paid" : "Mark Paid"}</Btn>
          <button onClick={() => confirmDeleteLog(log.id)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "6px 12px", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑️ Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>← Back to Crew</button>

      {/* Contractor header — fully editable */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 28, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: contractor.color + "22", border: `2px solid ${contractor.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: contractor.color, fontWeight: 800, fontSize: 18 }}>{initials(contractor.name)}</div>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => { onUpdateContractor(contractor.id, "name", nameVal); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { onUpdateContractor(contractor.id, "name", nameVal); setEditingName(false); } }}
              style={{ background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 18, fontWeight: 800, outline: "none", width: "100%" }} />
          ) : (
            <div onClick={() => setEditingName(true)} style={{ fontSize: 20, fontWeight: 800, cursor: "text", borderBottom: `1px dashed ${C.border}` }} title="Click to edit name">{contractor.name}</div>
          )}
          {editingRate ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{ color: C.muted, fontSize: 13 }}>$</span>
              <input autoFocus value={rateVal} onChange={(e) => setRateVal(e.target.value)} type="number"
                onBlur={() => { onUpdateContractor(contractor.id, "rate", parseFloat(rateVal) || contractor.rate); setEditingRate(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onUpdateContractor(contractor.id, "rate", parseFloat(rateVal) || contractor.rate); setEditingRate(false); } }}
                style={{ background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 14, outline: "none", width: 80 }} />
              <span style={{ color: C.muted, fontSize: 13 }}>/hr</span>
            </div>
          ) : (
            <div onClick={() => setEditingRate(true)} style={{ color: C.muted, fontSize: 13, marginTop: 6, cursor: "text", borderBottom: `1px dashed ${C.border}`, display: "inline-block" }} title="Click to edit rate">{$$(contractor.rate)}/hr</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn onClick={() => setShowContractorLog(true)} style={{ padding: "8px 16px", fontSize: 13 }}>+ Log Hours</Btn>
          <button onClick={() => setShowDeleteContractor(true)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "8px 14px", color: C.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🗑️ Delete</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total Owed" value={$$(totalOwed)} color={C.red} icon="🔴" />
        <StatCard label="Total Paid" value={$$(totalPaid)} color={C.green} icon="✅" />
        <StatCard label="Hours Logged" value={hrs(totalHrs)} color={C.yellow} icon="⏱️" />
        <StatCard label="Entries" value={cLogs.length} color={C.accentLight} icon="📋" />
      </div>

      {owedLogs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Unpaid — {$$(totalOwed)} owed</div>
          <div style={{ background: C.card, border: `1px solid ${C.red}33`, borderRadius: 14, overflow: "hidden" }}>
            {[...owedLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => <LogRow key={log.id} log={log} isPaid={false} />)}
          </div>
        </div>
      )}

      {paidLogs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Paid History — {$$(totalPaid)} total</div>
          <div style={{ background: C.card, border: `1px solid ${C.green}33`, borderRadius: 14, overflow: "hidden" }}>
            {[...paidLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => <LogRow key={log.id} log={log} isPaid={true} />)}
          </div>
        </div>
      )}

      {cLogs.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>👷</div><div style={{ fontWeight: 600 }}>No entries yet for this contractor</div></div>}

      {/* Edit log modal */}
      {editLog && (
        <Modal title={editLog.paid ? "Edit Paid Entry" : "Edit Entry"} onClose={() => setEditLog(null)}>
          {editLog.paid && (
            <div style={{ background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.yellow }}>
              ⚠️ This entry is marked as paid. Changes will update the paid record.
            </div>
          )}
          <Field label="Hours" type="number" value={editForm.hours} onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })} />
          <Field label="Date" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
          <Field label="Note" placeholder="Optional note" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn v="ghost" onClick={() => setEditLog(null)}>Cancel</Btn>
            <Btn onClick={saveEdit}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {/* Delete log warning */}
      {deleteLogId && (
        <Modal title="Delete Entry?" onClose={() => setDeleteLogId(null)}>
          <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>
            ⚠️ This will permanently delete this log entry. This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setDeleteLogId(null)}>Cancel</Btn>
            <Btn v="danger" onClick={doDeleteLog}>Yes, Delete</Btn>
          </div>
        </Modal>
      )}

      {/* Delete contractor warning */}
      {showDeleteContractor && (
        <Modal title="Delete Contractor?" onClose={() => setShowDeleteContractor(false)}>
          <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>
            ⚠️ This will permanently delete <strong>{contractor.name}</strong> and all their log entries. This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setShowDeleteContractor(false)}>Cancel</Btn>
            <Btn v="danger" onClick={() => { onDeleteContractor(contractor.id); onBack(); }}>Yes, Delete</Btn>
          </div>
        </Modal>
      )}

      {/* Log hours for this contractor */}
      {showContractorLog && (
        <Modal title={`Log Hours — ${contractor.name}`} onClose={() => setShowContractorLog(false)}>
          <Sel label="Property" value={cLogForm.propertyId} onChange={(e) => setCLogForm({ ...cLogForm, propertyId: e.target.value })}>
            <option value="">Select property...</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </Sel>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setCLogForm({ ...cLogForm, useTime: false })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${!cLogForm.useTime ? C.accent : C.border}`, background: !cLogForm.useTime ? C.accentGlow : "transparent", color: !cLogForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Manual Hours</button>
              <button onClick={() => setCLogForm({ ...cLogForm, useTime: true })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${cLogForm.useTime ? C.accent : C.border}`, background: cLogForm.useTime ? C.accentGlow : "transparent", color: cLogForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Start / End Time</button>
            </div>
            {!cLogForm.useTime ? (
              <Field label="Hours Worked" type="number" placeholder="8.5" value={cLogForm.hours} onChange={(e) => setCLogForm({ ...cLogForm, hours: e.target.value })} />
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Field label="Start Time" type="time" value={cLogForm.startTime} onChange={(e) => setCLogForm({ ...cLogForm, startTime: e.target.value })} /></div>
                <div style={{ flex: 1 }}><Field label="End Time" type="time" value={cLogForm.endTime} onChange={(e) => setCLogForm({ ...cLogForm, endTime: e.target.value })} /></div>
              </div>
            )}
            {cLogForm.useTime && cLogForm.startTime && cLogForm.endTime && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.sub, marginTop: -8, marginBottom: 16 }}>
                ⏱️ Calculated: <strong style={{ color: C.text }}>{calcHours(cLogForm.startTime, cLogForm.endTime).toFixed(1)} hours</strong>
              </div>
            )}
          </div>
          <Field label="Date" type="date" value={cLogForm.date} onChange={(e) => setCLogForm({ ...cLogForm, date: e.target.value })} />
          <Field label="Note (optional)" placeholder="e.g. Framing + demo" value={cLogForm.note} onChange={(e) => setCLogForm({ ...cLogForm, note: e.target.value })} />
          {(() => {
            const h = cLogForm.useTime ? calcHours(cLogForm.startTime, cLogForm.endTime) : parseFloat(cLogForm.hours || "0");
            const amt = h * contractor.rate;
            return h > 0 ? (
              <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.accentLight }}>
                💰 This logs <strong>{$$(amt)}</strong> owed to {contractor.name}
              </div>
            ) : null;
          })()}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setShowContractorLog(false)}>Cancel</Btn>
            <Btn onClick={async () => {
              if (!cLogForm.propertyId || !cLogForm.date) return;
              const h = cLogForm.useTime ? calcHours(cLogForm.startTime, cLogForm.endTime) : parseFloat(cLogForm.hours);
              if (!h || h <= 0) return;
              const { data, error } = await supabase.from("logs").insert({ contractor_id: contractor.id, property_id: cLogForm.propertyId, hours: h, date: cLogForm.date, note: cLogForm.note || "", paid: false, deductions: "[]" }).select().single();
              if (error) { alert("Error: " + error.message); return; }
              if (data) onAddLog({ ...data, deductions: [] });
              setCLogForm({ propertyId: "", hours: "", startTime: "", endTime: "", date: new Date().toISOString().split("T")[0], note: "", useTime: false });
              setShowContractorLog(false);
            }}>Save Entry</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function GetPaid() {
  const [tab, setTab] = useState("dashboard");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  const [showAddC, setShowAddC] = useState(false);
  const [showAddP, setShowAddP] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const [cForm, setCForm] = useState({ name: "", rate: "" });
  const [pForm, setPForm] = useState({ address: "", city: "" });
  const [lForm, setLForm] = useState({ contractorId: "", propertyId: "", hours: "", startTime: "", endTime: "", date: new Date().toISOString().split("T")[0], note: "", useTime: false });
  const [deductions, setDeductions] = useState<{title: string; amount: string}[]>([]);
  const [dedForm, setDedForm] = useState({ title: "", amount: "" });

  const computedHours = lForm.useTime ? calcHours(lForm.startTime, lForm.endTime) : parseFloat(lForm.hours || "0");

  // ── Load data ──
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: c, error: ce }, { data: p, error: pe }, { data: l, error: le }] = await Promise.all([
        supabase.from("contractors").select("*").order("created_at"),
        supabase.from("properties").select("*").order("created_at"),
        supabase.from("logs").select("*").order("date", { ascending: false }),
      ]);
      if (ce) console.error("contractors error:", ce);
      if (pe) console.error("properties error:", pe);
      if (le) console.error("logs error:", le);
      setContractors(c || []);
      setProperties(p || []);
      setLogs((l || []).map((log: Log) => ({
        ...log,
        deductions: Array.isArray(log.deductions) ? log.deductions : (typeof log.deductions === "string" ? JSON.parse(log.deductions || "[]") : []),
      })));
      setLoading(false);
    }
    load();
  }, []);

  // ── CRUD ──
  const addContractor = async () => {
    if (!cForm.name || !cForm.rate) return;
    const { data } = await supabase.from("contractors").insert({ name: cForm.name, rate: parseFloat(cForm.rate), color: COLORS[contractors.length % COLORS.length] }).select().single();
    if (data) setContractors([...contractors, data]);
    setCForm({ name: "", rate: "" }); setShowAddC(false);
  };

  const addProperty = async () => {
    if (!pForm.address) return;
    const { data } = await supabase.from("properties").insert({ address: pForm.address, city: pForm.city }).select().single();
    if (data) setProperties([...properties, data]);
    setPForm({ address: "", city: "" }); setShowAddP(false);
  };

  const saveLog = async () => {
    if (!lForm.contractorId || !lForm.propertyId || !lForm.date) return;
    const h = lForm.useTime ? calcHours(lForm.startTime, lForm.endTime) : parseFloat(lForm.hours);
    if (!h || h <= 0) return;
    const parsedDeductions = deductions.map(d => ({ title: d.title, amount: parseFloat(d.amount) || 0 }));
    const insertData = {
      contractor_id: lForm.contractorId,
      property_id: lForm.propertyId,
      hours: h,
      date: lForm.date,
      note: lForm.note || "",
      paid: false,
      deductions: JSON.stringify(parsedDeductions),
    };
    const { data, error } = await supabase.from("logs").insert(insertData).select().single();
    if (error) { console.error("Log save error:", error); alert("Error saving: " + error.message); return; }
    if (data) setLogs([...logs, { ...data, deductions: parsedDeductions }]);
    setLForm({ contractorId: "", propertyId: "", hours: "", startTime: "", endTime: "", date: new Date().toISOString().split("T")[0], note: "", useTime: false });
    setDeductions([]);
    setDedForm({ title: "", amount: "" });
    setShowLog(false);
  };

  const togglePaid = async (id: string) => {
    const log = logs.find((l) => l.id === id);
    if (!log) return;
    await supabase.from("logs").update({ paid: !log.paid }).eq("id", id);
    setLogs(logs.map((l) => l.id === id ? { ...l, paid: !l.paid } : l));
  };

  const deleteLog = async (id: string) => {
    await supabase.from("logs").delete().eq("id", id);
    setLogs(logs.filter((l) => l.id !== id));
  };

  const updateContractor = async (id: string, field: string, value: string | number) => {
    await supabase.from("contractors").update({ [field]: value }).eq("id", id);
    setContractors(contractors.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateProperty = async (id: string, field: string, value: string) => {
    await supabase.from("properties").update({ [field]: value }).eq("id", id);
    setProperties(properties.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };

  const deleteContractor = async (id: string) => {
    await supabase.from("contractors").delete().eq("id", id);
    setContractors(contractors.filter((c) => c.id !== id));
  };

  const deleteProperty = async (id: string) => {
    await supabase.from("properties").delete().eq("id", id);
    setProperties(properties.filter((p) => p.id !== id));
  };

  const updateLog = async (id: string, fields: Partial<Log>) => {
    await supabase.from("logs").update(fields).eq("id", id);
    setLogs(logs.map((l) => l.id === id ? { ...l, ...fields } : l));
  };

  // ── Summaries ──
  const totalOwed = logs.filter((l) => !l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractor_id); return s + (c ? c.rate * Number(l.hours) : 0); }, 0);
  const totalPaid = logs.filter((l) => l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractor_id); return s + (c ? c.rate * Number(l.hours) : 0); }, 0);
  const totalHours = logs.reduce((s, l) => s + Number(l.hours), 0);

  const cSummary = contractors.map((c) => {
    const cl = logs.filter((l) => l.contractor_id === c.id);
    return { ...c, owed: cl.filter((l) => !l.paid).reduce((s, l) => s + Number(l.hours) * c.rate, 0), paid: cl.filter((l) => l.paid).reduce((s, l) => s + Number(l.hours) * c.rate, 0), hours: cl.reduce((s, l) => s + Number(l.hours), 0), count: cl.length };
  });

  const pSummary = properties.map((p) => {
    const pl = logs.filter((l) => l.property_id === p.id);
    const netAmount = (l: Log, c: Contractor) => { const gross = Number(l.hours) * c.rate; const ded = (l.deductions || []).reduce((s: number, d: Deduction) => s + Number(d.amount), 0); return Math.max(0, gross - ded); };
    const owed = pl.filter((l) => !l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractor_id); return s + (c ? netAmount(l, c) : 0); }, 0);
    const paid = pl.filter((l) => l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractor_id); return s + (c ? netAmount(l, c) : 0); }, 0);
    return { ...p, owed, paid, hours: pl.reduce((s, l) => s + Number(l.hours), 0), count: pl.length };
  });

  const totalDedAmount = deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const grossPreview = lForm.contractorId && computedHours > 0 ? (contractors.find((c) => c.id === lForm.contractorId)?.rate || 0) * computedHours : 0;
  const logPreviewAmount = Math.max(0, grossPreview - totalDedAmount);

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "⚡" },
    { id: "contractors", label: "Crew", icon: "👷" },
    { id: "properties", label: "Properties", icon: "🏠" },
    { id: "logs", label: "Hours", icon: "🕐" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>💸</div>
      <div style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>Loading GetPaid...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: C.text }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💸</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>GetPaid</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedProperty(null); setSelectedContractor(null); }}
                style={{ background: tab === t.id ? C.accentGlow : "transparent", border: tab === t.id ? `1px solid ${C.accent}44` : "1px solid transparent", borderRadius: 8, padding: "6px 12px", color: tab === t.id ? C.accentLight : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <span>{t.icon}</span><span>{t.label}</span>
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
                <div key={c.id} onClick={() => { setTab("contractors"); setSelectedContractor(contractors.find(x => x.id === c.id) || null); }}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: c.color + "22", border: `1px solid ${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, fontWeight: 800, fontSize: 13 }}>{initials(c.name)}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ color: C.muted, fontSize: 12 }}>{$$(c.rate)}/hr &middot; {hrs(c.hours)}</div></div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {c.owed > 0 && <Pill color={C.red} glow={C.redGlow}>Owes {$$(c.owed)}</Pill>}
                    {c.paid > 0 && <Pill color={C.green} glow={C.greenGlow}>Paid {$$(c.paid)}</Pill>}
                    {c.count === 0 && <Pill color={C.muted} glow="transparent">No logs</Pill>}
                    <span style={{ color: C.accentLight, fontSize: 16 }}>›</span>
                  </div>
                </div>
              ))}
              {contractors.length === 0 && <div style={{ color: C.muted, fontSize: 14, padding: "20px 0" }}>No crew members yet. Add one in the Crew tab.</div>}
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
              {properties.length === 0 && <div style={{ color: C.muted, fontSize: 14, padding: "20px 0" }}>No properties yet. Add one in the Properties tab.</div>}
            </div>
          </div>
        )}

        {/* CONTRACTORS */}
        {tab === "contractors" && (
          selectedContractor ? (
            <ContractorDetail
              contractor={selectedContractor}
              logs={logs}
              properties={properties}
              onBack={() => setSelectedContractor(null)}
              onTogglePaid={togglePaid}
              onDeleteLog={deleteLog}
              onUpdateLog={updateLog}
              onUpdateContractor={updateContractor}
              onDeleteContractor={deleteContractor}
              onAddLog={(log) => setLogs(prev => [...prev, log])}
            />
          ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Crew</h1>
                <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{contractors.length} members &middot; tap to view &middot; tap name/rate to edit</p>
              </div>
              <Btn onClick={() => setShowAddC(true)}>+ Add</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {contractors.map((con) => {
                const s = cSummary.find((x) => x.id === con.id)!;
                return (
                  <div key={con.id} onClick={() => setSelectedContractor(con)}
                    style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: con.color + "22", border: `2px solid ${con.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: con.color, fontWeight: 800, fontSize: 15 }}>{initials(con.name)}</div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{con.name}</div>
                      <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{$$(con.rate)} / hour</div>
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700 }}>{hrs(s.hours)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Hours</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.red, fontWeight: 700 }}>{$$(s.owed)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Owed</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.green, fontWeight: 700 }}>{$$(s.paid)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Paid</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                      <span style={{ color: C.accentLight, fontSize: 20 }}>›</span>
                      <button onClick={() => deleteContractor(con.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )
        )}

        {/* PROPERTIES */}
        {tab === "properties" && (
          selectedProperty ? (
            <PropertyDetail property={selectedProperty} logs={logs} contractors={contractors} onBack={() => setSelectedProperty(null)} onTogglePaid={togglePaid} onDeleteLog={deleteLog} onUpdateLog={updateLog} />
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
                  const assigned = [...new Set(logs.filter((l) => l.property_id === p.id).map((l) => l.contractor_id))].map((id) => contractors.find((c) => c.id === id)).filter((c): c is Contractor => !!c);
                  return (
                    <div key={p.id} onClick={() => setSelectedProperty(p)}
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 30 }}>🏠</div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>
                            <span onClick={(e) => e.stopPropagation()}><InlineEdit value={p.address} onSave={(v) => updateProperty(p.id, "address", v)} /></span>
                          </div>
                          <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
                            <span onClick={(e) => e.stopPropagation()}><InlineEdit value={p.city} onSave={(v) => updateProperty(p.id, "city", v)} /></span>
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
                            <button onClick={(e) => { e.stopPropagation(); deleteProperty(p.id); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>🗑️</button>
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

        {/* LOGS */}
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
                const con = contractors.find((x) => x.id === log.contractor_id);
                const prop = properties.find((x) => x.id === log.property_id);
                const amount = con ? con.rate * Number(log.hours) : 0;
                return (
                  <div key={log.id} style={{ background: C.card, border: `1px solid ${log.paid ? C.green + "33" : C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: con ? con.color + "22" : "#fff1", border: `1px solid ${con ? con.color + "44" : "#fff2"}`, display: "flex", alignItems: "center", justifyContent: "center", color: con?.color, fontWeight: 800, fontSize: 13 }}>{con ? initials(con.name) : "?"}</div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{con?.name || "Unknown"}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{prop?.address || "Unknown"}</div>
                      {log.note && <div style={{ color: C.sub, fontSize: 12, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(Number(log.hours))}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{log.date}</div>
                    <div style={{ textAlign: "right" }}>
                      {(log.deductions || []).length > 0 && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(amount)}</div>}
                      <div style={{ fontWeight: 700, fontSize: 14, color: log.paid ? C.green : C.yellow }}>{$$(Math.max(0, amount - (log.deductions || []).reduce((s: number, d: Deduction) => s + Number(d.amount), 0)))}</div>
                    </div>
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

      {/* MODALS */}
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

          {/* Deductions */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Deductions (optional)</div>
            {deductions.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 13, color: C.text }}>{d.title}</span>
                <span style={{ color: C.red, fontWeight: 700, fontSize: 13 }}>-{$$(parseFloat(d.amount) || 0)}</span>
                <button onClick={() => setDeductions(deductions.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Item (e.g. Materials)" value={dedForm.title} onChange={(e) => setDedForm({ ...dedForm, title: e.target.value })}
                style={{ flex: 2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
              <input placeholder="$0.00" type="number" value={dedForm.amount} onChange={(e) => setDedForm({ ...dedForm, amount: e.target.value })}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => { if (!dedForm.title || !dedForm.amount) return; setDeductions([...deductions, dedForm]); setDedForm({ title: "", amount: "" }); }}
                style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "8px 14px", color: C.accentLight, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add</button>
            </div>
          </div>

          {/* Summary */}
          {grossPreview > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, marginBottom: 6 }}>
                <span>Gross ({computedHours.toFixed(1)}h)</span>
                <span>{$$(grossPreview)}</span>
              </div>
              {deductions.map((d, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.red, marginBottom: 4 }}>
                  <span>- {d.title}</span>
                  <span>-{$$(parseFloat(d.amount) || 0)}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15 }}>
                <span style={{ color: C.text }}>Net Owed</span>
                <span style={{ color: C.green }}>{$$(logPreviewAmount)}</span>
              </div>
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
