"use client";
import { useState, useEffect } from "react";
import AuthPage from "./auth";
import ExpensesTab from "./expenses";
import InvoicesTab from "./invoices";
import ScopeTab from "./scope";
import TaxTab from "./tax";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rytoiilokjxelabqaljq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dG9paWxva2p4ZWxhYnFhbGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg2MTQsImV4cCI6MjA5NzEwNDYxNH0.LbJz7YLWi_kX6Gw93lvayPKcaXkGiPUusQ3d-zPQ8Kk"
);

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0f", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#7c3aed", accentLight: "#a78bfa", accentGlow: "rgba(124,58,237,0.15)",
  green: "#10b981", greenGlow: "rgba(16,185,129,0.15)",
  yellow: "#f59e0b", yellowGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444", redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3", muted: "#6b7280", sub: "#9ca3af",
};

const COLORS = ["#7c3aed","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#8b5cf6","#14b8a6"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const hrs = (h: number) => `${Number(h).toFixed(1)}h`;
const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();
const timeToDecimal = (t: string) => { const [h, m] = t.split(":").map(Number); return h + m / 60; };
const calcHours = (start: string, end: string) => {
  if (!start || !end) return 0;
  let d = timeToDecimal(end) - timeToDecimal(start);
  if (d < 0) d += 24;
  return Math.round(d * 10) / 10;
};
const today = () => new Date().toISOString().split("T")[0];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contractor { id: string; name: string; rate: number; color: string; }
interface Property { id: string; address: string; city: string; status?: string; closed_date?: string; }
interface Deduction { title: string; amount: number; }
interface Advance { id: string; contractor_id: string; amount: number; date: string; note: string; }
interface Log {
  id: string; contractor_id: string; property_id: string;
  hours: number; rate_override: number | null;
  date: string; paid: boolean; note: string; deductions: Deduction[];
}

// Single source of truth for net amount — always use this
const effectiveRate = (log: Log, defaultRate: number) =>
  log.rate_override != null ? Number(log.rate_override) : defaultRate;
const netAmt = (log: Log, defaultRate: number) => {
  const gross = Number(log.hours) * effectiveRate(log, defaultRate);
  const ded = (log.deductions || []).reduce((s, d) => s + Number(d.amount), 0);
  return Math.max(0, gross - ded);
};
const grossAmt = (log: Log, defaultRate: number) =>
  Number(log.hours) * effectiveRate(log, defaultRate);

// ─── Shared UI components ─────────────────────────────────────────────────────
function Pill({ color, glow, children }: { color: string; glow: string; children: React.ReactNode }) {
  return (
    <span style={{ background: glow, color, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {children}
    </span>
  );
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
      <input {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{ width: "100%", background: C.surface, border: `1px solid ${focused ? C.accent : C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s", ...props.style }} />
    </div>
  );
}

function Sel({ label, children, ...props }: { label?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>}
      <select {...props} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}>
        {children}
      </select>
    </div>
  );
}

function Btn({ children, onClick, v = "primary", style = {} }: { children: React.ReactNode; onClick?: () => void; v?: "primary"|"ghost"|"success"|"danger"; style?: React.CSSProperties }) {
  const s = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: C.sub, border: `1px solid ${C.border}` },
    success: { background: C.greenGlow, color: C.green, border: `1px solid ${C.green}44` },
    danger:  { background: C.redGlow, color: C.red, border: `1px solid ${C.red}44` },
  };
  return <button onClick={onClick} style={{ ...s[v], borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", ...style }}>{children}</button>;
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

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.yellow }}>
      ⚠️ {children}
    </div>
  );
}

function Danger({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>
      ⚠️ {children}
    </div>
  );
}

// ─── Rate override UI (reused in log and edit modals) ──────────────────────────
function RateOverrideField({ defaultRate, value, active, onToggle, onChange }: {
  defaultRate: number; value: string; active: boolean;
  onToggle: () => void; onChange: (v: string) => void;
}) {
  const preview = active && value ? parseFloat(value) : null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Rate Override</label>
        <button onClick={onToggle} style={{ background: active ? C.accentGlow : "transparent", border: `1px solid ${active ? C.accent : C.border}`, borderRadius: 6, padding: "3px 10px", color: active ? C.accentLight : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {active ? "On" : "Use default"}
        </button>
      </div>
      {!active && <div style={{ fontSize: 12, color: C.muted }}>Default: {$$(defaultRate)}/hr</div>}
      {active && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.muted, fontSize: 13 }}>$</span>
          <input type="number" placeholder={String(defaultRate)} value={value} onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 14, outline: "none" }} />
          <span style={{ color: C.muted, fontSize: 13 }}>/hr (this entry only)</span>
        </div>
      )}
      {preview != null && <div style={{ fontSize: 12, color: C.accentLight, marginTop: 6 }}>Using {$$(preview)}/hr for this entry</div>}
    </div>
  );
}

// ─── Log edit modal ───────────────────────────────────────────────────────────
function EditLogModal({ log, defaultRate, onSave, onClose }: {
  log: Log; defaultRate: number;
  onSave: (fields: Partial<Log>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    hours: String(log.hours), date: log.date, note: log.note || "",
    rateOverride: log.rate_override != null ? String(log.rate_override) : "",
    useRateOverride: log.rate_override != null,
  });
  const rate = form.useRateOverride && form.rateOverride ? parseFloat(form.rateOverride) : defaultRate;
  const preview = parseFloat(form.hours || "0") * rate;
  return (
    <Modal title={log.paid ? "Edit Paid Entry" : "Edit Entry"} onClose={onClose}>
      {log.paid && <Warning>This entry is marked as paid. Changes will update the paid record.</Warning>}
      <Field label="Hours" type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
      <Field label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      <Field label="Note" placeholder="Optional note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      <RateOverrideField
        defaultRate={defaultRate} value={form.rateOverride} active={form.useRateOverride}
        onToggle={() => setForm({ ...form, useRateOverride: !form.useRateOverride, rateOverride: "" })}
        onChange={(v) => setForm({ ...form, rateOverride: v })}
      />
      {preview > 0 && (
        <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: "8px 14px", marginBottom: 16, fontSize: 13, color: C.accentLight }}>
          Entry total: <strong>{$$(preview)}</strong>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => {
          const rateOv = form.useRateOverride && form.rateOverride ? parseFloat(form.rateOverride) : null;
          onSave({ hours: parseFloat(form.hours) || log.hours, date: form.date, note: form.note, rate_override: rateOv });
        }}>Save Changes</Btn>
      </div>
    </Modal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteModal({ title, message, onConfirm, onClose }: { title: string; message: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <Danger>{message}</Danger>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn v="danger" onClick={onConfirm}>Yes, Delete</Btn>
      </div>
    </Modal>
  );
}

// ─── Property Detail ──────────────────────────────────────────────────────────
function PropertyDetail({ property, logs, contractors, onBack, onTogglePaid, onDeleteLog, onUpdateLog, onBatchPay }: {
  property: Property; logs: Log[]; contractors: Contractor[];
  onBack: () => void; onTogglePaid: (id: string) => void;
  onDeleteLog: (id: string) => void; onUpdateLog: (id: string, fields: Partial<Log>) => void;
  onBatchPay: (ids: string[], date: string) => void;
}) {
  const pLogs = logs.filter((l) => l.property_id === property.id);
  const totalOwed = pLogs.filter((l) => !l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractor_id); return s + (c ? netAmt(l, c.rate) : 0); }, 0);
  const totalPaid = pLogs.filter((l) => l.paid).reduce((s, l) => { const c = contractors.find((c) => c.id === l.contractor_id); return s + (c ? netAmt(l, c.rate) : 0); }, 0);
  const totalHrs = pLogs.reduce((s, l) => s + Number(l.hours), 0);

  const [payAllTarget, setPayAllTarget] = useState<{ con: Contractor; owedLogs: Log[]; totalOwed: number } | null>(null);
  const [payAllDeds, setPayAllDeds] = useState<{ title: string; amount: string }[]>([]);
  const [payAllDedForm, setPayAllDedForm] = useState({ title: "", amount: "" });
  const [payAllDate, setPayAllDate] = useState(today());
  const [editLog, setEditLog] = useState<Log | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

  const byContractor = contractors.map((con) => {
    const cLogs = pLogs.filter((l) => l.contractor_id === con.id);
    if (!cLogs.length) return null;
    const owedLogs = cLogs.filter((l) => !l.paid);
    const paidLogs = cLogs.filter((l) => l.paid);
    return {
      con, cLogs, owedLogs, paidLogs,
      hours: cLogs.reduce((s, l) => s + Number(l.hours), 0),
      owed: owedLogs.reduce((s, l) => s + netAmt(l, con.rate), 0),
      paid: paidLogs.reduce((s, l) => s + netAmt(l, con.rate), 0),
    };
  }).filter(Boolean) as { con: Contractor; cLogs: Log[]; owedLogs: Log[]; paidLogs: Log[]; hours: number; owed: number; paid: number }[];

  const openPayAll = (con: Contractor, owedLogs: Log[], totalOwed: number) => {
    setPayAllTarget({ con, owedLogs, totalOwed });
    setPayAllDeds([]); setPayAllDedForm({ title: "", amount: "" }); setPayAllDate(today());
  };

  const doPayAll = async () => {
    if (!payAllTarget) return;
    const ids = payAllTarget.owedLogs.map(l => l.id);
    // Just mark all logs as paid — don't touch their individual deductions
    await Promise.all(ids.map(id =>
      supabase.from("logs").update({ paid: true, date: payAllDate }).eq("id", id)
    ));
    onBatchPay(ids, payAllDate);
    setPayAllTarget(null);
  };

  const saveEdit = async (fields: Partial<Log>) => {
    if (!editLog) return;
    await supabase.from("logs").update(fields).eq("id", editLog.id);
    onUpdateLog(editLog.id, fields);
    setEditLog(null);
  };

  const doDelete = async () => {
    if (!deleteLogId) return;
    await supabase.from("logs").delete().eq("id", deleteLogId);
    onDeleteLog(deleteLogId); setDeleteLogId(null);
  };

  const payAllDedsTotal = payAllDeds.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

  const LogRow = ({ log, con, isPaid }: { log: Log; con: Contractor; isPaid: boolean }) => {
    const gross = grossAmt(log, con.rate);
    const net = netAmt(log, con.rate);
    const hasOverride = log.rate_override != null;
    const hasDeds = (log.deductions || []).length > 0;
    return (
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: isPaid ? `${C.green}06` : "transparent" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{log.date}{isPaid && <span style={{ color: C.green, fontSize: 11, marginLeft: 8 }}>paid</span>}</div>
          {log.note && <div style={{ color: C.sub, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
          {(log.deductions || []).map((d, i) => <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 1 }}>- {d.title}: {$$(Number(d.amount))}</div>)}
        </div>
        <div style={{ textAlign: "right", minWidth: 70 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(Number(log.hours))}</div>
          {hasOverride && <div style={{ fontSize: 11, color: C.accentLight }}>{$$(Number(log.rate_override))}/hr</div>}
          {(hasOverride || hasDeds) && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(gross)}</div>}
          <div style={{ fontWeight: 700, fontSize: 14, color: isPaid ? C.green : C.yellow }}>{$$(net)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setEditLog(log)} style={{ background: isPaid ? C.yellowGlow : C.accentGlow, border: `1px solid ${isPaid ? C.yellow : C.accent}44`, borderRadius: 8, padding: "6px 10px", color: isPaid ? C.yellow : C.accentLight, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
          {!isPaid && <Btn v="success" onClick={() => onTogglePaid(log.id)} style={{ padding: "6px 10px", fontSize: 12 }}>Mark Paid</Btn>}
          {isPaid && <Btn v="ghost" onClick={() => onTogglePaid(log.id)} style={{ padding: "6px 10px", fontSize: 12 }}>Undo</Btn>}
          <button onClick={() => setDeleteLogId(log.id)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "6px 10px", color: C.red, fontSize: 12, cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 24 }}>&#8592; Back to Properties</button>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>{property.address}</h1>
      <p style={{ color: C.muted, margin: "4px 0 24px", fontSize: 14 }}>{property.city}</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total Owed" value={$$(totalOwed)} color={C.red} icon="🔴" />
        <StatCard label="Total Paid" value={$$(totalPaid)} color={C.green} icon="✅" />
        <StatCard label="Hours" value={hrs(totalHrs)} color={C.yellow} icon="⏱️" />
        <StatCard label="Entries" value={pLogs.length} color={C.accentLight} icon="📋" />
      </div>

      {!byContractor.length && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div><div style={{ fontWeight: 600 }}>No hours logged yet</div></div>}

      {byContractor.map(({ con, owedLogs, paidLogs, owed, paid, hours }) => (
        <div key={con.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: con.color + "22", border: `2px solid ${con.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: con.color, fontWeight: 800, fontSize: 14 }}>{initials(con.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{con.name}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{$$(con.rate)}/hr &middot; {hrs(hours)}</div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
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
              <div style={{ padding: "6px 20px", background: C.redGlow, fontSize: 11, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: 0.8 }}>Unpaid</div>
              {[...owedLogs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => <LogRow key={log.id} log={log} con={con} isPaid={false} />)}
            </div>
          )}
          {paidLogs.length > 0 && (
            <div>
              <div style={{ padding: "6px 20px", background: C.greenGlow, fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.8 }}>Paid History</div>
              {[...paidLogs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => <LogRow key={log.id} log={log} con={con} isPaid={true} />)}
            </div>
          )}
        </div>
      ))}

      {/* Pay All modal */}
      {payAllTarget && (
        <Modal title={`Pay All — ${payAllTarget.con.name}`} onClose={() => setPayAllTarget(null)}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>{payAllTarget.owedLogs.length} entries at {property.address}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}><span style={{ color: C.sub }}>Gross owed</span><span style={{ fontWeight: 700, color: C.text }}>{$$(payAllTarget.totalOwed)}</span></div>
            {payAllDeds.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.red, marginBottom: 4 }}>
                <span>- {d.title}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span>-{$$(parseFloat(d.amount) || 0)}</span>
                  <button onClick={() => setPayAllDeds(payAllDeds.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>✕</button>
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
          <Field label="Date Paid" type="date" value={payAllDate} onChange={(e) => setPayAllDate(e.target.value)} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setPayAllTarget(null)}>Cancel</Btn>
            <Btn v="success" onClick={doPayAll}>Confirm Payment</Btn>
          </div>
        </Modal>
      )}

      {editLog && <EditLogModal log={editLog} defaultRate={contractors.find(c => c.id === editLog.contractor_id)?.rate || 0} onSave={saveEdit} onClose={() => setEditLog(null)} />}
      {deleteLogId && <DeleteModal title="Delete Entry?" message="This will permanently delete this log entry and cannot be undone." onConfirm={doDelete} onClose={() => setDeleteLogId(null)} />}
    </div>
  );
}

// ─── Contractor Detail ────────────────────────────────────────────────────────
function ContractorDetail({ contractor, logs, properties, advances, onBack, onTogglePaid, onDeleteLog, onUpdateLog, onUpdateContractor, onDeleteContractor, onAddLog, onAddAdvance, onDeleteAdvance }: {
  contractor: Contractor; logs: Log[]; properties: Property[]; advances: Advance[];
  onBack: () => void; onTogglePaid: (id: string) => void; onDeleteLog: (id: string) => void;
  onUpdateLog: (id: string, fields: Partial<Log>) => void;
  onUpdateContractor: (id: string, field: string, value: string | number) => void;
  onDeleteContractor: (id: string) => void;
  onAddLog: (log: Log) => void;
  onAddAdvance: (advance: Omit<Advance, "id">) => void;
  onDeleteAdvance: (id: string) => void;
}) {
  const cLogs = logs.filter((l) => l.contractor_id === contractor.id);
  const cAdvances = advances.filter(a => a.contractor_id === contractor.id);
  const owedLogs = cLogs.filter((l) => !l.paid);
  const paidLogs = cLogs.filter((l) => l.paid);
  const grossOwed = owedLogs.reduce((s, l) => s + netAmt(l, contractor.rate), 0);
  const totalAdvances = cAdvances.reduce((s, a) => s + Number(a.amount), 0);
  const totalOwed = Math.max(0, grossOwed - totalAdvances);
  const totalPaid = paidLogs.reduce((s, l) => s + netAmt(l, contractor.rate), 0);
  const totalHrs = cLogs.reduce((s, l) => s + Number(l.hours), 0);

  const [editLog, setEditLog] = useState<Log | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [showDeleteContractor, setShowDeleteContractor] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: "", date: today(), note: "" });
  const [editingName, setEditingName] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [nameVal, setNameVal] = useState(contractor.name);
  const [rateVal, setRateVal] = useState(String(contractor.rate));
  const [cLogForm, setCLogForm] = useState({ propertyId: "", hours: "", startTime: "", endTime: "", date: today(), note: "", useTime: false, rateOverride: "", useRateOverride: false });

  const saveEdit = async (fields: Partial<Log>) => {
    if (!editLog) return;
    await supabase.from("logs").update(fields).eq("id", editLog.id);
    onUpdateLog(editLog.id, fields); setEditLog(null);
  };

  const doDeleteLog = async () => {
    if (!deleteLogId) return;
    await supabase.from("logs").delete().eq("id", deleteLogId);
    onDeleteLog(deleteLogId); setDeleteLogId(null);
  };

  const saveLog = async () => {
    if (!cLogForm.propertyId || !cLogForm.date) return;
    const h = cLogForm.useTime ? calcHours(cLogForm.startTime, cLogForm.endTime) : parseFloat(cLogForm.hours);
    if (!h || h <= 0) return;
    const rateOv = cLogForm.useRateOverride && cLogForm.rateOverride ? parseFloat(cLogForm.rateOverride) : null;
    const { data, error } = await supabase.from("logs").insert({
      contractor_id: contractor.id, property_id: cLogForm.propertyId,
      hours: h, date: cLogForm.date, note: cLogForm.note || "",
      paid: false, deductions: "[]", rate_override: rateOv,
    }).select().single();
    if (error) { alert("Error: " + error.message); return; }
    if (data) onAddLog({ ...data, deductions: [] });
    setCLogForm({ propertyId: "", hours: "", startTime: "", endTime: "", date: today(), note: "", useTime: false, rateOverride: "", useRateOverride: false });
    setShowLogModal(false);
  };

  const logPreviewHours = cLogForm.useTime ? calcHours(cLogForm.startTime, cLogForm.endTime) : parseFloat(cLogForm.hours || "0");
  const logPreviewRate = cLogForm.useRateOverride && cLogForm.rateOverride ? parseFloat(cLogForm.rateOverride) : contractor.rate;
  const logPreviewAmt = logPreviewHours * logPreviewRate;

  const LogRow = ({ log, isPaid }: { log: Log; isPaid: boolean }) => {
    const prop = properties.find((p) => p.id === log.property_id);
    const gross = grossAmt(log, contractor.rate);
    const net = netAmt(log, contractor.rate);
    const hasOverride = log.rate_override != null;
    const hasDeds = (log.deductions || []).length > 0;
    return (
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: isPaid ? `${C.green}06` : "transparent" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{log.date}</div>
          <div style={{ color: C.accentLight, fontSize: 12, marginTop: 2 }}>🏠 {prop?.address || "Unknown"}</div>
          {log.note && <div style={{ color: C.sub, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
          {(log.deductions || []).map((d, i) => <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 1 }}>- {d.title}: {$$(Number(d.amount))}</div>)}
        </div>
        <div style={{ textAlign: "right", minWidth: 70 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(Number(log.hours))}</div>
          {hasOverride && <div style={{ fontSize: 11, color: C.accentLight }}>{$$(Number(log.rate_override))}/hr</div>}
          {(hasOverride || hasDeds) && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(gross)}</div>}
          <div style={{ fontWeight: 700, fontSize: 14, color: isPaid ? C.green : C.yellow }}>{$$(net)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setEditLog(log)} style={{ background: isPaid ? C.yellowGlow : C.accentGlow, border: `1px solid ${isPaid ? C.yellow : C.accent}44`, borderRadius: 8, padding: "6px 12px", color: isPaid ? C.yellow : C.accentLight, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</button>
          <Btn v={isPaid ? "ghost" : "success"} onClick={() => onTogglePaid(log.id)} style={{ padding: "6px 12px", fontSize: 12 }}>{isPaid ? "✓ Paid" : "Mark Paid"}</Btn>
          <button onClick={() => setDeleteLogId(log.id)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "6px 12px", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑️</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 24 }}>&#8592; Back to Crew</button>

      {/* Editable header */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 28, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: contractor.color + "22", border: `2px solid ${contractor.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: contractor.color, fontWeight: 800, fontSize: 18 }}>{initials(contractor.name)}</div>
        <div style={{ flex: 1 }}>
          {editingName
            ? <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={() => { onUpdateContractor(contractor.id, "name", nameVal); setEditingName(false); }} onKeyDown={(e) => { if (e.key === "Enter") { onUpdateContractor(contractor.id, "name", nameVal); setEditingName(false); } }} style={{ background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 18, fontWeight: 800, outline: "none", width: "100%" }} />
            : <div onClick={() => setEditingName(true)} style={{ fontSize: 20, fontWeight: 800, cursor: "text", borderBottom: `1px dashed ${C.border}` }} title="Click to edit">{contractor.name}</div>
          }
          {editingRate
            ? <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}><span style={{ color: C.muted, fontSize: 13 }}>$</span><input autoFocus value={rateVal} onChange={(e) => setRateVal(e.target.value)} type="number" onBlur={() => { onUpdateContractor(contractor.id, "rate", parseFloat(rateVal) || contractor.rate); setEditingRate(false); }} onKeyDown={(e) => { if (e.key === "Enter") { onUpdateContractor(contractor.id, "rate", parseFloat(rateVal) || contractor.rate); setEditingRate(false); } }} style={{ background: C.surface, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "4px 10px", color: C.text, fontSize: 14, outline: "none", width: 80 }} /><span style={{ color: C.muted, fontSize: 13 }}>/hr</span></div>
            : <div onClick={() => setEditingRate(true)} style={{ color: C.muted, fontSize: 13, marginTop: 6, cursor: "text", borderBottom: `1px dashed ${C.border}`, display: "inline-block" }} title="Click to edit rate">{$$(contractor.rate)}/hr</div>
          }
        </div>
        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <Btn onClick={() => setShowLogModal(true)} style={{ padding: "8px 16px", fontSize: 13 }}>+ Log Hours</Btn>
          <Btn v="success" onClick={() => setShowAdvanceModal(true)} style={{ padding: "8px 16px", fontSize: 13 }}>💵 + Advance</Btn>
          <button onClick={() => setShowDeleteContractor(true)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "8px 14px", color: C.red, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🗑️ Delete</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total Owed" value={$$(totalOwed)} color={C.red} icon="🔴" />
        <StatCard label="Total Paid" value={$$(totalPaid)} color={C.green} icon="✅" />
        <StatCard label="Hours" value={hrs(totalHrs)} color={C.yellow} icon="⏱️" />
        {totalAdvances > 0 && <StatCard label="Advances" value={$$(totalAdvances)} color={C.accentLight} icon="💵" />}
      </div>

      {/* Advances section */}
      {cAdvances.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accentLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Advances / Partial Payments — {$$(totalAdvances)} total</div>
          <div style={{ background: C.card, border: `1px solid ${C.accentLight}33`, borderRadius: 14, overflow: "hidden" }}>
            {[...cAdvances].sort((a, b) => b.date.localeCompare(a.date)).map((adv) => (
              <div key={adv.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ fontSize: 20 }}>💵</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.accentLight }}>{$$(Number(adv.amount))}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{adv.date}{adv.note && ` · ${adv.note}`}</div>
                </div>
                <button onClick={() => { if (confirm("Delete this advance?")) onDeleteAdvance(adv.id); }}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>🗑️</button>
              </div>
            ))}
          </div>
          {grossOwed > 0 && totalAdvances > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: C.sub }}>Gross owed: {$$(grossOwed)} − Advances: {$$(totalAdvances)}</span>
              <span style={{ fontWeight: 700, color: C.red }}>Net: {$$(totalOwed)}</span>
            </div>
          )}
        </div>
      )}

      {owedLogs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Unpaid — {$$(totalOwed)} owed</div>
          <div style={{ background: C.card, border: `1px solid ${C.red}33`, borderRadius: 14, overflow: "hidden" }}>
            {[...owedLogs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => <LogRow key={log.id} log={log} isPaid={false} />)}
          </div>
        </div>
      )}

      {paidLogs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Paid History — {$$(totalPaid)} total</div>
          <div style={{ background: C.card, border: `1px solid ${C.green}33`, borderRadius: 14, overflow: "hidden" }}>
            {[...paidLogs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => <LogRow key={log.id} log={log} isPaid={true} />)}
          </div>
        </div>
      )}

      {!cLogs.length && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>👷</div><div style={{ fontWeight: 600 }}>No entries yet</div></div>}

      {/* Log hours modal */}
      {showLogModal && (
        <Modal title={`Log Hours — ${contractor.name}`} onClose={() => setShowLogModal(false)}>
          <Sel label="Property" value={cLogForm.propertyId} onChange={(e) => setCLogForm({ ...cLogForm, propertyId: e.target.value })}>
            <option value="">Select property...</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </Sel>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setCLogForm({ ...cLogForm, useTime: false })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${!cLogForm.useTime ? C.accent : C.border}`, background: !cLogForm.useTime ? C.accentGlow : "transparent", color: !cLogForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Manual Hours</button>
              <button onClick={() => setCLogForm({ ...cLogForm, useTime: true })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${cLogForm.useTime ? C.accent : C.border}`, background: cLogForm.useTime ? C.accentGlow : "transparent", color: cLogForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Start / End Time</button>
            </div>
            {!cLogForm.useTime
              ? <Field label="Hours" type="number" placeholder="8.5" value={cLogForm.hours} onChange={(e) => setCLogForm({ ...cLogForm, hours: e.target.value })} />
              : <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><Field label="Start" type="time" value={cLogForm.startTime} onChange={(e) => setCLogForm({ ...cLogForm, startTime: e.target.value })} /></div><div style={{ flex: 1 }}><Field label="End" type="time" value={cLogForm.endTime} onChange={(e) => setCLogForm({ ...cLogForm, endTime: e.target.value })} /></div></div>
            }
            {cLogForm.useTime && cLogForm.startTime && cLogForm.endTime && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.sub, marginTop: -8, marginBottom: 16 }}>
                ⏱️ <strong style={{ color: C.text }}>{calcHours(cLogForm.startTime, cLogForm.endTime).toFixed(1)} hours</strong>
              </div>
            )}
          </div>
          <Field label="Date" type="date" value={cLogForm.date} onChange={(e) => setCLogForm({ ...cLogForm, date: e.target.value })} />
          <Field label="Note (optional)" placeholder="e.g. Painting trim" value={cLogForm.note} onChange={(e) => setCLogForm({ ...cLogForm, note: e.target.value })} />
          <RateOverrideField
            defaultRate={contractor.rate} value={cLogForm.rateOverride} active={cLogForm.useRateOverride}
            onToggle={() => setCLogForm({ ...cLogForm, useRateOverride: !cLogForm.useRateOverride, rateOverride: "" })}
            onChange={(v) => setCLogForm({ ...cLogForm, rateOverride: v })}
          />
          {logPreviewAmt > 0 && (
            <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.accentLight }}>
              💰 <strong>{$$(logPreviewAmt)}</strong> owed to {contractor.name}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setShowLogModal(false)}>Cancel</Btn>
            <Btn onClick={saveLog}>Save Entry</Btn>
          </div>
        </Modal>
      )}

      {editLog && <EditLogModal log={editLog} defaultRate={contractor.rate} onSave={saveEdit} onClose={() => setEditLog(null)} />}
      {deleteLogId && <DeleteModal title="Delete Entry?" message="This will permanently delete this entry and cannot be undone." onConfirm={doDeleteLog} onClose={() => setDeleteLogId(null)} />}
      {showDeleteContractor && (
        <DeleteModal title="Delete Contractor?" message={`This will permanently delete ${contractor.name} and all their log entries. This cannot be undone.`} onConfirm={() => { onDeleteContractor(contractor.id); onBack(); }} onClose={() => setShowDeleteContractor(false)} />
      )}

      {showAdvanceModal && (
        <Modal title={`Add Advance — ${contractor.name}`} onClose={() => setShowAdvanceModal(false)}>
          <div style={{ background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.yellow }}>
            💵 This will reduce the net amount owed to {contractor.name} without marking any hours as paid.
          </div>
          <Field label="Amount ($)" type="number" placeholder="0.00" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
          <Field label="Date" type="date" value={advanceForm.date} onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })} />
          <Field label="Note (optional)" placeholder="e.g. Cash advance, tool reimbursement" value={advanceForm.note} onChange={(e) => setAdvanceForm({ ...advanceForm, note: e.target.value })} />
          {advanceForm.amount && parseFloat(advanceForm.amount) > 0 && (
            <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.accentLight }}>
              Net owed after advance: <strong>{$$(Math.max(0, grossOwed - totalAdvances - parseFloat(advanceForm.amount)))}</strong>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setShowAdvanceModal(false)}>Cancel</Btn>
            <Btn onClick={() => {
              if (!advanceForm.amount || parseFloat(advanceForm.amount) <= 0) return;
              onAddAdvance({ contractor_id: contractor.id, amount: parseFloat(advanceForm.amount), date: advanceForm.date, note: advanceForm.note });
              setAdvanceForm({ amount: "", date: today(), note: "" });
              setShowAdvanceModal(false);
            }}>Save Advance</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function GetPaid() {
  const [locked, setLocked] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("gp_locked") === "true";
    return false;
  });
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSetupStep, setPinSetupStep] = useState<"enter"|"confirm">("enter");
  const [pinSetupFirst, setPinSetupFirst] = useState("");

  const getPin = () => typeof window !== "undefined" ? localStorage.getItem("gp_pin") || "" : "";

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setContractors([]); setProperties([]); setLogs([]); setAdvances([]);
    setScopeItems([]); setExpensesList([]); setExpenseItems([]);
  };

  const lockApp = () => {
    if (!getPin()) { setShowPinSetup(true); return; }
    setLocked(true);
    if (typeof window !== "undefined") localStorage.setItem("gp_locked", "true");
  };

  const unlockApp = () => {
    const pin = getPin();
    if (pinInput === pin) {
      setLocked(false);
      setPinInput(""); setPinError("");
      setShowUnlock(false);
      if (typeof window !== "undefined") localStorage.setItem("gp_locked", "false");
    } else {
      setPinError("Wrong PIN"); setPinInput("");
    }
  };

  const savePin = () => {
    if (pinSetupStep === "enter") {
      if (pinInput.length < 4) { setPinError("PIN must be 4 digits"); return; }
      setPinSetupFirst(pinInput); setPinInput(""); setPinError(""); setPinSetupStep("confirm");
    } else {
      if (pinInput !== pinSetupFirst) { setPinError("PINs don't match"); setPinInput(""); return; }
      if (typeof window !== "undefined") localStorage.setItem("gp_pin", pinInput);
      setPinInput(""); setPinError(""); setShowPinSetup(false); setPinSetupStep("enter");
      lockApp();
    }
  };

  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      const valid = ["dashboard", "contractors", "properties", "logs", "1099", "expenses", "invoices", "scope"];
      return valid.includes(hash) ? hash : "dashboard";
    }
    return "dashboard";
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [scopeItems, setScopeItems] = useState<{ id: string; property_id: string; cost: number; labor: number; excluded_from_invoice: boolean; description: string }[]>([]);
  const [expenseItems, setExpenseItems] = useState<{ id: string; expense_id: string; price: number; qty: number }[]>([]);
  const [expensesList, setExpensesList] = useState<{ id: string; property_id: string | null }[]>([]);
  const [showAddC, setShowAddC] = useState(false);
  const [showAddP, setShowAddP] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [cForm, setCForm] = useState({ name: "", rate: "" });
  const [pForm, setPForm] = useState({ address: "", city: "" });
  const [lForm, setLForm] = useState({ contractorId: "", propertyId: "", hours: "", startTime: "", endTime: "", date: today(), note: "", useTime: false, rateOverride: "", useRateOverride: false });
  const [lDeds, setLDeds] = useState<{ title: string; amount: string }[]>([]);
  const [lDedForm, setLDedForm] = useState({ title: "", amount: "" });
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      }
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email || "" });
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load
  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      // Migrate any existing data without user_id to this user (first-time login migration)
      const uid = user?.id;
      if (uid) await Promise.all([
        supabase.from("contractors").update({ user_id: uid }).is("user_id", null),
        supabase.from("properties").update({ user_id: uid }).is("user_id", null),
        supabase.from("logs").update({ user_id: uid }).is("user_id", null),
        supabase.from("advances").update({ user_id: uid }).is("user_id", null),
        supabase.from("expenses").update({ user_id: uid }).is("user_id", null),
        supabase.from("invoices").update({ user_id: uid }).is("user_id", null),
        supabase.from("scope_items").update({ user_id: uid }).is("user_id", null),
        supabase.from("mileage_logs").update({ user_id: uid }).is("user_id", null),
      ]);
      const [{ data: c }, { data: p }, { data: l }, { data: a }, { data: si }, { data: exps }, { data: ei }] = await Promise.all([
        supabase.from("contractors").select("*").order("created_at"),
        supabase.from("properties").select("*").order("created_at"),
        supabase.from("logs").select("*").order("date", { ascending: false }),
        supabase.from("advances").select("*").order("date", { ascending: false }),
        supabase.from("scope_items").select("id,property_id,cost,labor,excluded_from_invoice,description"),
        supabase.from("expenses").select("id,property_id"),
        supabase.from("expense_items").select("id,expense_id,price,qty"),
      ]);
      setContractors(c || []);
      setProperties(p || []);
      setAdvances(a || []);
      setScopeItems(si || []);
      setExpensesList(exps || []);
      setExpenseItems(ei || []);
      setLogs((l || []).map((log: Log) => ({
        ...log,
        deductions: Array.isArray(log.deductions) ? log.deductions : JSON.parse(log.deductions || "[]"),
      })));
      setLoading(false);
    }
    load();
  }, [user]);

  // CRUD
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
    const rateOv = lForm.useRateOverride && lForm.rateOverride ? parseFloat(lForm.rateOverride) : null;
    const parsedDeds = lDeds.map(d => ({ title: d.title, amount: parseFloat(d.amount) || 0 }));
    const { data, error } = await supabase.from("logs").insert({
      contractor_id: lForm.contractorId, property_id: lForm.propertyId,
      hours: h, date: lForm.date, note: lForm.note || "",
      paid: false, deductions: JSON.stringify(parsedDeds), rate_override: rateOv,
    }).select().single();
    if (error) { alert("Error saving: " + error.message); return; }
    if (data) setLogs([...logs, { ...data, deductions: parsedDeds }]);
    setLForm({ contractorId: "", propertyId: "", hours: "", startTime: "", endTime: "", date: today(), note: "", useTime: false, rateOverride: "", useRateOverride: false });
    setLDeds([]); setLDedForm({ title: "", amount: "" }); setShowLog(false);
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

  const updateLog = async (id: string, fields: Partial<Log>) => {
    await supabase.from("logs").update(fields).eq("id", id);
    setLogs(prev => prev.map((l) => l.id === id ? { ...l, ...fields } : l));
  };

  const batchPay = (ids: string[], date: string) => {
    const idSet = new Set(ids);
    setLogs(prev => prev.map(l =>
      idSet.has(l.id) ? { ...l, paid: true, date } : l
    ));
  };

  const addAdvance = async (advance: Omit<Advance, "id">) => {
    const { data } = await supabase.from("advances").insert(advance).select().single();
    if (data) setAdvances(prev => [data, ...prev]);
  };

  const deleteAdvance = async (id: string) => {
    await supabase.from("advances").delete().eq("id", id);
    setAdvances(prev => prev.filter(a => a.id !== id));
  };

  const updateContractor = async (id: string, field: string, value: string | number) => {
    await supabase.from("contractors").update({ [field]: value }).eq("id", id);
    setContractors(contractors.map((c) => c.id === id ? { ...c, [field]: value } : c));
    if (selectedContractor?.id === id) setSelectedContractor(prev => prev ? { ...prev, [field]: value } : null);
  };

  const deleteContractor = async (id: string) => {
    await supabase.from("contractors").delete().eq("id", id);
    setContractors(contractors.filter((c) => c.id !== id));
  };

  const updateProperty = async (id: string, field: string, value: string) => {
    await supabase.from("properties").update({ [field]: value }).eq("id", id);
    setProperties(properties.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };

  const deleteProperty = async (id: string) => {
    await supabase.from("properties").delete().eq("id", id);
    setProperties(properties.filter((p) => p.id !== id));
  };

  const updatePropertyStatus = (p: Property) => {
    setProperties(prev => prev.map(pp => pp.id === p.id ? p : pp));
  };

  // Summaries
  const cSummary = contractors.map((c) => {
    const cl = logs.filter((l) => l.contractor_id === c.id);
    const cAdvances = advances.filter(a => a.contractor_id === c.id);
    const totalAdvances = cAdvances.reduce((s, a) => s + Number(a.amount), 0);
    const grossOwed = cl.filter((l) => !l.paid).reduce((s, l) => s + netAmt(l, c.rate), 0);
    return {
      ...c,
      owed: Math.max(0, grossOwed - totalAdvances),
      advances: totalAdvances,
      paid: cl.filter((l) => l.paid).reduce((s, l) => s + netAmt(l, c.rate), 0),
      hours: cl.reduce((s, l) => s + Number(l.hours), 0),
      count: cl.length,
    };
  });

  const isPaintDesc = (desc: string) => /paint|painting|primer|stain|finish coat/i.test(desc || "");

  const pSummary = properties.map((p) => {
    const pl = logs.filter((l) => l.property_id === p.id);
    const getRate = (l: Log) => contractors.find((c) => c.id === l.contractor_id)?.rate || 0;
    const laborCost = pl.reduce((s, l) => s + netAmt(l, getRate(l)), 0);

    const pScope = scopeItems.filter(s => s.property_id === p.id);
    const expectedRevenue = pScope.filter(i => !i.excluded_from_invoice).reduce((s, i) => {
      const isPaint = isPaintDesc(i.description);
      return s + (isPaint ? Number(i.labor) : Number(i.cost) + Number(i.labor));
    }, 0);

    const pExpenseIds = new Set(expensesList.filter(e => e.property_id === p.id).map(e => e.id));
    const expenseCost = expenseItems.filter(i => pExpenseIds.has(i.expense_id)).reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);

    const netProfit = expectedRevenue - laborCost - expenseCost;

    return {
      ...p,
      owed: pl.filter((l) => !l.paid).reduce((s, l) => s + netAmt(l, getRate(l)), 0),
      paid: pl.filter((l) => l.paid).reduce((s, l) => s + netAmt(l, getRate(l)), 0),
      hours: pl.reduce((s, l) => s + Number(l.hours), 0),
      count: pl.length,
      expectedRevenue, laborCost, expenseCost, netProfit,
    };
  });

  const totalOwed = cSummary.reduce((s, c) => s + c.owed, 0);
  const totalPaid = cSummary.reduce((s, c) => s + c.paid, 0);
  const totalHours = logs.reduce((s, l) => s + Number(l.hours), 0);
  const portfolioRevenue = pSummary.reduce((s, p) => s + p.expectedRevenue, 0);
  const portfolioLabor = pSummary.reduce((s, p) => s + p.laborCost, 0);
  const portfolioExpenses = pSummary.reduce((s, p) => s + p.expenseCost, 0);
  const portfolioNetProfit = portfolioRevenue - portfolioLabor - portfolioExpenses;

  // 1099 data
  const tax1099 = contractors.map((con) => {
    const cLogs = logs.filter((l) => l.contractor_id === con.id && new Date(l.date).getFullYear() === taxYear);
    const gross = cLogs.reduce((s, l) => s + grossAmt(l, con.rate), 0);
    const deds = cLogs.reduce((s, l) => s + (l.deductions || []).reduce((ds, d) => ds + Number(d.amount), 0), 0);
    const net = Math.max(0, gross - deds);
    const paidNet = cLogs.filter(l => l.paid).reduce((s, l) => s + netAmt(l, con.rate), 0);
    const owedNet = cLogs.filter(l => !l.paid).reduce((s, l) => s + netAmt(l, con.rate), 0);
    const byProperty = properties.map(p => {
      const pl = cLogs.filter(l => l.property_id === p.id);
      if (!pl.length) return null;
      const pGross = pl.reduce((s, l) => s + grossAmt(l, con.rate), 0);
      const pDeds = pl.reduce((s, l) => s + (l.deductions || []).reduce((ds, d) => ds + Number(d.amount), 0), 0);
      return { property: p, hours: pl.reduce((s, l) => s + Number(l.hours), 0), gross: pGross, net: Math.max(0, pGross - pDeds) };
    }).filter(Boolean) as { property: Property; hours: number; gross: number; net: number }[];
    return { con, gross, deds, net, paidNet, owedNet, byProperty, entryCount: cLogs.length, hours: cLogs.reduce((s, l) => s + Number(l.hours), 0) };
  });
  const grandTotal = tax1099.reduce((s, c) => s + c.net, 0);

  // Log form preview
  const lRate = lForm.useRateOverride && lForm.rateOverride ? parseFloat(lForm.rateOverride) : (contractors.find(c => c.id === lForm.contractorId)?.rate || 0);
  const lHours = lForm.useTime ? calcHours(lForm.startTime, lForm.endTime) : parseFloat(lForm.hours || "0");
  const lGross = lRate * lHours;
  const lDedTotal = lDeds.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const lNet = Math.max(0, lGross - lDedTotal);

  const resetTab = (id: string) => {
    const sensitiveTabs = ["dashboard", "contractors", "logs", "1099", "invoices", "tax"];
    if (locked && sensitiveTabs.includes(id)) return;
    setTab(id);
    setSelectedProperty(null);
    setSelectedContractor(null);
    if (typeof window !== "undefined") window.location.hash = id;
  };

  const ALL_TABS = [
    { id: "dashboard", label: "Dashboard", icon: "⚡", sensitive: true },
    { id: "contractors", label: "Crew", icon: "👷", sensitive: true },
    { id: "properties", label: "Properties", icon: "🏠", sensitive: false },
    { id: "logs", label: "Hours", icon: "🕐", sensitive: true },
    { id: "1099", label: "1099", icon: "📋", sensitive: true },
    { id: "expenses", label: "Expenses", icon: "🧾", sensitive: false },
    { id: "invoices", label: "Invoices", icon: "📄", sensitive: true },
    { id: "scope", label: "Scope", icon: "📋", sensitive: false },
    { id: "tax", label: "Tax", icon: "💼", sensitive: true },
  ];
  const TABS = locked ? ALL_TABS.filter(t => !t.sensitive) : ALL_TABS;

  if (!authChecked) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 40 }}>💸</div>
    </div>
  );

  if (!user) return <AuthPage onAuth={(u) => setUser(u)} />;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>💸</div>
      <div style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>Loading GetPaid...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: C.text }}>

      {/* Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", height: 60, paddingLeft: 16 }}>
          {/* Logo — fixed, never scrolls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingRight: 12, borderRight: `1px solid ${C.border}`, marginRight: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.accent}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💸</div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5, whiteSpace: "nowrap" }}>GetPaid</span>
          </div>
          {/* Tabs — scroll independently */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingRight: 16, flex: 1 }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => resetTab(t.id)}
                style={{ background: tab === t.id ? C.accentGlow : "transparent", border: tab === t.id ? `1px solid ${C.accent}44` : "1px solid transparent", borderRadius: 8, padding: "6px 12px", color: tab === t.id ? C.accentLight : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
            <button onClick={() => locked ? setShowUnlock(true) : lockApp()}
              style={{ background: locked ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", border: `1px solid ${locked ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: 8, padding: "6px 12px", color: locked ? "#ef4444" : "#10b981", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 4 }}>
              {locked ? "🔒 Locked" : "🔓 Lock"}
            </button>
            <button onClick={signOut}
              style={{ background: "transparent", border: "1px solid #2a2a3a", borderRadius: 8, padding: "6px 12px", color: "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 4 }}>
              Sign Out
            </button>
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
            {!locked && (portfolioRevenue > 0 || portfolioLabor > 0 || portfolioExpenses > 0) && (
              <div style={{ background: `linear-gradient(135deg, ${C.accent}15, ${C.accentGlow})`, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accentLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Portfolio P&L — All Properties</div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Revenue</div><div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{$$(portfolioRevenue)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Labor</div><div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>-{$$(portfolioLabor)}</div></div>
                  <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Expenses</div><div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>-{$$(portfolioExpenses)}</div></div>
                  <div style={{ marginLeft: "auto" }}><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Net Profit</div><div style={{ fontSize: 24, fontWeight: 800, color: portfolioNetProfit >= 0 ? C.green : C.red }}>{$$(portfolioNetProfit)}</div></div>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Btn onClick={() => setShowLog(true)} style={{ fontSize: 15, padding: "12px 28px" }}>+ Log Hours</Btn>
              <Btn v="ghost" onClick={() => resetTab("invoices")} style={{ fontSize: 15, padding: "12px 28px" }}>📄 Invoices</Btn>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 14, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>Crew Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {cSummary.map((c) => (
                <div key={c.id} onClick={() => { setTab("contractors"); setSelectedContractor(contractors.find(x => x.id === c.id) || null); }}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: c.color + "22", border: `1px solid ${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, fontWeight: 800, fontSize: 13 }}>{initials(c.name)}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div><div style={{ color: C.muted, fontSize: 12 }}>{locked ? "••••" : `${$$(c.rate)}/hr · ${hrs(c.hours)}`}</div></div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {!locked && c.owed > 0 && <Pill color={C.red} glow={C.redGlow}>Owes {$$(c.owed)}</Pill>}
                    {!locked && c.advances > 0 && <Pill color={C.accentLight} glow={C.accentGlow}>💵 {$$(c.advances)}</Pill>}
                    {!locked && c.paid > 0 && <Pill color={C.green} glow={C.greenGlow}>Paid {$$(c.paid)}</Pill>}
                    {!locked && c.count === 0 && <Pill color={C.muted} glow="transparent">No logs</Pill>}
                    <span style={{ color: C.accentLight, fontSize: 16 }}>›</span>
                  </div>
                </div>
              ))}
              {!contractors.length && <div style={{ color: C.muted, fontSize: 14 }}>No crew yet. Add one in the Crew tab.</div>}
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
                    {!locked && p.owed > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.red, fontWeight: 800, fontSize: 15 }}>{$$(p.owed)}</div><div style={{ color: C.muted, fontSize: 11 }}>owed</div></div>}
                    {!locked && p.paid > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.green, fontWeight: 800, fontSize: 15 }}>{$$(p.paid)}</div><div style={{ color: C.muted, fontSize: 11 }}>paid</div></div>}
                    <span style={{ color: C.accentLight, fontSize: 18 }}>›</span>
                  </div>
                </div>
              ))}
              {!properties.length && <div style={{ color: C.muted, fontSize: 14 }}>No properties yet. Add one in the Properties tab.</div>}
            </div>
          </div>
        )}

        {/* CREW */}
        {tab === "contractors" && (
          selectedContractor ? (
            <ContractorDetail
              contractor={selectedContractor} logs={logs} properties={properties} advances={advances}
              onBack={() => setSelectedContractor(null)}
              onTogglePaid={togglePaid} onDeleteLog={deleteLog} onUpdateLog={updateLog}
              onUpdateContractor={updateContractor} onDeleteContractor={deleteContractor}
              onAddLog={(log) => setLogs(prev => [log, ...prev])}
              onAddAdvance={addAdvance} onDeleteAdvance={deleteAdvance}
            />
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Crew</h1>
                  <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{contractors.length} members &middot; tap to view</p>
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
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16 }}>{con.name}</div><div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{$$(con.rate)}/hr</div></div>
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700 }}>{hrs(s.hours)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Hours</div></div>
                        <div style={{ textAlign: "center" }}><div style={{ color: C.red, fontWeight: 700 }}>{$$(s.owed)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Owed</div></div>
                        <div style={{ textAlign: "center" }}><div style={{ color: C.green, fontWeight: 700 }}>{$$(s.paid)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Paid</div></div>
                      </div>
                      <span style={{ color: C.accentLight, fontSize: 20 }}>›</span>
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
            <PropertyDetail property={selectedProperty} logs={logs} contractors={contractors} onBack={() => setSelectedProperty(null)} onTogglePaid={togglePaid} onDeleteLog={deleteLog} onUpdateLog={updateLog} onBatchPay={batchPay} />
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Properties</h1>
                  <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{properties.length} projects &middot; tap to view</p>
                </div>
                <Btn onClick={() => setShowAddP(true)}>+ Add</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pSummary.map((p) => {
                  const assigned = [...new Set(logs.filter((l) => l.property_id === p.id).map((l) => l.contractor_id))]
                    .map((id) => contractors.find((c) => c.id === id)).filter(Boolean) as Contractor[];
                  return (
                    <div key={p.id} onClick={() => setSelectedProperty(p)}
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 30 }}>🏠</div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                            <span onClick={(e) => e.stopPropagation()}><span style={{ cursor: "text", borderBottom: `1px dashed ${C.border}` }} onClick={() => { const v = prompt("Edit address:", p.address); if (v) updateProperty(p.id, "address", v); }}>{p.address}</span></span>
                          </div>
                          <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
                            <span onClick={(e) => e.stopPropagation()}><span style={{ cursor: "text" }} onClick={() => { const v = prompt("Edit city:", p.city); if (v) updateProperty(p.id, "city", v); }}>{p.city}</span></span>
                          </div>
                          {!locked && (
                          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            {assigned.map((c) => {
                              const cLogs = logs.filter(l => l.property_id === p.id && l.contractor_id === c.id);
                              const allPaid = cLogs.length > 0 && cLogs.every(l => l.paid);
                              return (
                                <span key={c.id} style={{ background: allPaid ? "transparent" : c.color + "22", color: allPaid ? C.muted : c.color, border: `1px solid ${allPaid ? C.border : c.color + "44"}`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, opacity: allPaid ? 0.5 : 1, textDecoration: allPaid ? "line-through" : "none" }}>
                                  {c.name.split(" ")[0]}
                                </span>
                              );
                            })}
                            {!assigned.length && <span style={{ color: C.muted, fontSize: 12 }}>No crew yet</span>}
                          </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                          {!locked && p.owed > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.red, fontWeight: 800, fontSize: 18 }}>{$$(p.owed)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Owed</div></div>}
                          {!locked && p.paid > 0 && <div style={{ textAlign: "right" }}><div style={{ color: C.green, fontWeight: 800, fontSize: 18 }}>{$$(p.paid)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Paid</div></div>}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <span style={{ color: C.accentLight, fontSize: 20 }}>›</span>
                            {!locked && <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this property and all its logs?")) deleteProperty(p.id); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>🗑️</button>}
                          </div>
                        </div>
                      </div>
                      {!locked && (p.expectedRevenue > 0 || p.laborCost > 0 || p.expenseCost > 0) && (
                        <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                          <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Revenue</div><div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{$$(p.expectedRevenue)}</div></div>
                          <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Labor</div><div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>-{$$(p.laborCost)}</div></div>
                          <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Expenses</div><div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>-{$$(p.expenseCost)}</div></div>
                          <div style={{ marginLeft: "auto" }}><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Net Profit</div><div style={{ fontSize: 15, fontWeight: 800, color: p.netProfit >= 0 ? C.green : C.red }}>{$$(p.netProfit)}</div></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* HOURS LOG */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Hours Log</h1>
                <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{logs.length} entries &middot; {logs.filter(l => !l.paid).length} unpaid</p>
              </div>
              <Btn onClick={() => setShowLog(true)}>+ Log Hours</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...logs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => {
                const con = contractors.find((x) => x.id === log.contractor_id);
                const prop = properties.find((x) => x.id === log.property_id);
                const gross = con ? grossAmt(log, con.rate) : 0;
                const net = con ? netAmt(log, con.rate) : 0;
                const hasOverride = log.rate_override != null;
                const hasDeds = (log.deductions || []).length > 0;
                return (
                  <div key={log.id} style={{ background: C.card, border: `1px solid ${log.paid ? C.green + "33" : C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: con ? con.color + "22" : "#fff1", border: `1px solid ${con ? con.color + "44" : "#fff2"}`, display: "flex", alignItems: "center", justifyContent: "center", color: con?.color, fontWeight: 800, fontSize: 13 }}>{con ? initials(con.name) : "?"}</div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{con?.name || "Unknown"}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{prop?.address || "Unknown"} &middot; {log.date}</div>
                      {log.note && <div style={{ color: C.sub, fontSize: 12, fontStyle: "italic" }}>&ldquo;{log.note}&rdquo;</div>}
                    </div>
                    <div style={{ textAlign: "right", minWidth: 60 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{hrs(Number(log.hours))}</div>
                      {hasOverride && <div style={{ fontSize: 11, color: C.accentLight }}>{$$(Number(log.rate_override))}/hr</div>}
                      {(hasOverride || hasDeds) && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(gross)}</div>}
                      <div style={{ fontWeight: 700, fontSize: 14, color: log.paid ? C.green : C.yellow }}>{$$(net)}</div>
                    </div>
                    <Btn v={log.paid ? "ghost" : "success"} onClick={() => togglePaid(log.id)} style={{ padding: "6px 12px", fontSize: 12 }}>{log.paid ? "✓ Paid" : "Mark Paid"}</Btn>
                    <button onClick={() => deleteLog(log.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
                  </div>
                );
              })}
              {!logs.length && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div><div style={{ fontWeight: 600 }}>No hours logged yet</div></div>}
            </div>
          </div>
        )}

        {/* EXPENSES */}
        {tab === "expenses" && (
          <ExpensesTab properties={properties} />
        )}

        {/* INVOICES */}
        {tab === "invoices" && (
          <InvoicesTab properties={properties} />
        )}

        {/* SCOPE */}
        {tab === "scope" && (
          <ScopeTab properties={properties} logs={logs} contractors={contractors} expenses={[]} advances={advances} onPropertyUpdate={updatePropertyStatus} />
        )}

        {/* TAX */}
        {tab === "tax" && (
          <TaxTab properties={properties} />
        )}

        {/* 1099 */}
        {tab === "1099" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>1099 Summary</h1>
                <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>Annual contractor earnings tally</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setTaxYear(taxYear - 1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 14, cursor: "pointer" }}>&#8249;</button>
                <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "8px 18px", color: C.accentLight, fontWeight: 800, fontSize: 16, minWidth: 70, textAlign: "center" }}>{taxYear}</div>
                <button onClick={() => setTaxYear(taxYear + 1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 14, cursor: "pointer" }}>&#8250;</button>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${C.accent}22, ${C.accentGlow})`, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: "20px 24px", marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accentLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Total Net Earnings {taxYear}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: -1 }}>{$$(grandTotal)}</div>
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 18 }}>{tax1099.filter(c => c.entryCount > 0).length}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Contractors</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700, fontSize: 18 }}>{hrs(tax1099.reduce((s, c) => s + c.hours, 0))}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Hours</div></div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {tax1099.filter(c => c.entryCount > 0).map(({ con, gross, deds, net, paidNet, owedNet, byProperty, entryCount, hours }) => (
                <div key={con.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: con.color + "22", border: `2px solid ${con.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: con.color, fontWeight: 800, fontSize: 16 }}>{initials(con.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 17 }}>{con.name}</div>
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{hrs(hours)} &middot; {entryCount} entries</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{$$(net)}</div>
                      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Net Earnings</div>
                    </div>
                  </div>
                  <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}>{$$(gross)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Gross</div></div>
                    {deds > 0 && <div><div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>-{$$(deds)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Deductions</div></div>}
                    <div><div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{$$(paidNet)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Paid</div></div>
                    {owedNet > 0 && <div><div style={{ fontSize: 14, fontWeight: 700, color: C.yellow }}>{$$(owedNet)}</div><div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>Still Owed</div></div>}
                    {net >= 600 && (
                      <div style={{ marginLeft: "auto", background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: C.yellow, fontSize: 12, fontWeight: 700 }}>⚠️ 1099 Required (&ge;$600)</span>
                      </div>
                    )}
                  </div>
                  {byProperty.map(({ property, hours: ph, gross: pg, net: pn }) => (
                    <div key={property.id} style={{ padding: "12px 22px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 16 }}>🏠</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{property.address}</div><div style={{ color: C.muted, fontSize: 12 }}>{property.city} &middot; {hrs(ph)}</div></div>
                      <div style={{ textAlign: "right" }}>
                        {pg !== pn && <div style={{ color: C.muted, fontSize: 11, textDecoration: "line-through" }}>{$$(pg)}</div>}
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{$$(pn)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {!tax1099.filter(c => c.entryCount > 0).length && (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <div style={{ fontWeight: 600 }}>No earnings logged for {taxYear}</div>
                </div>
              )}
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

      {/* Lock / PIN modals */}
      {showUnlock && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 24 }}>
          <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 16, padding: 32, width: "100%", maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>App Locked</div>
            <div style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>Enter your PIN to unlock</div>
            <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(""); }}
              onKeyDown={(e) => e.key === "Enter" && unlockApp()}
              autoFocus
              style={{ width: "100%", background: "#13131a", border: `1px solid ${pinError ? "#ef4444" : "#2a2a3a"}`, borderRadius: 10, padding: "14px", color: "#f1f1f3", fontSize: 24, outline: "none", textAlign: "center", letterSpacing: 8, boxSizing: "border-box" as const, marginBottom: 8 }} />
            {pinError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>⚠️ {pinError}</div>}
            <button onClick={unlockApp}
              style={{ width: "100%", background: "#7c3aed", border: "none", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
              Unlock
            </button>
          </div>
        </div>
      )}

      {showPinSetup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 24 }}>
          <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 16, padding: 32, width: "100%", maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Set a PIN</div>
            <div style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              {pinSetupStep === "enter" ? "Choose a 4-digit PIN to lock the app" : "Confirm your PIN"}
            </div>
            <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(""); }}
              onKeyDown={(e) => e.key === "Enter" && savePin()}
              autoFocus
              style={{ width: "100%", background: "#13131a", border: `1px solid ${pinError ? "#ef4444" : "#2a2a3a"}`, borderRadius: 10, padding: "14px", color: "#f1f1f3", fontSize: 24, outline: "none", textAlign: "center", letterSpacing: 8, boxSizing: "border-box" as const, marginBottom: 8 }} />
            {pinError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>⚠️ {pinError}</div>}
            <button onClick={savePin}
              style={{ width: "100%", background: "#7c3aed", border: "none", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
              {pinSetupStep === "enter" ? "Next" : "Set PIN & Lock"}
            </button>
            <button onClick={() => { setShowPinSetup(false); setPinInput(""); setPinError(""); setPinSetupStep("enter"); }}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", marginTop: 14 }}>Cancel</button>
          </div>
        </div>
      )}

      {showLog && (
        <Modal title="Log Hours" onClose={() => setShowLog(false)}>
          <Sel label="Crew Member" value={lForm.contractorId} onChange={(e) => setLForm({ ...lForm, contractorId: e.target.value, rateOverride: "", useRateOverride: false })}>
            <option value="">Select crew member...</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} ({$$(c.rate)}/hr)</option>)}
          </Sel>
          {lForm.contractorId && (
            <RateOverrideField
              defaultRate={contractors.find(c => c.id === lForm.contractorId)?.rate || 0}
              value={lForm.rateOverride} active={lForm.useRateOverride}
              onToggle={() => setLForm({ ...lForm, useRateOverride: !lForm.useRateOverride, rateOverride: "" })}
              onChange={(v) => setLForm({ ...lForm, rateOverride: v })}
            />
          )}
          <Sel label="Property" value={lForm.propertyId} onChange={(e) => setLForm({ ...lForm, propertyId: e.target.value })}>
            <option value="">Select property...</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </Sel>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setLForm({ ...lForm, useTime: false })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${!lForm.useTime ? C.accent : C.border}`, background: !lForm.useTime ? C.accentGlow : "transparent", color: !lForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Manual Hours</button>
              <button onClick={() => setLForm({ ...lForm, useTime: true })} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${lForm.useTime ? C.accent : C.border}`, background: lForm.useTime ? C.accentGlow : "transparent", color: lForm.useTime ? C.accentLight : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Start / End Time</button>
            </div>
            {!lForm.useTime
              ? <Field label="Hours" type="number" placeholder="8.5" value={lForm.hours} onChange={(e) => setLForm({ ...lForm, hours: e.target.value })} />
              : <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><Field label="Start" type="time" value={lForm.startTime} onChange={(e) => setLForm({ ...lForm, startTime: e.target.value })} /></div><div style={{ flex: 1 }}><Field label="End" type="time" value={lForm.endTime} onChange={(e) => setLForm({ ...lForm, endTime: e.target.value })} /></div></div>
            }
            {lForm.useTime && lForm.startTime && lForm.endTime && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.sub, marginTop: -8, marginBottom: 16 }}>
                ⏱️ <strong style={{ color: C.text }}>{calcHours(lForm.startTime, lForm.endTime).toFixed(1)} hours</strong>
              </div>
            )}
          </div>
          <Field label="Date" type="date" value={lForm.date} onChange={(e) => setLForm({ ...lForm, date: e.target.value })} />
          <Field label="Note (optional)" placeholder="e.g. Framing + demo" value={lForm.note} onChange={(e) => setLForm({ ...lForm, note: e.target.value })} />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Deductions (optional)</div>
            {lDeds.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{d.title}</span>
                <span style={{ color: C.red, fontWeight: 700, fontSize: 13 }}>-{$$(parseFloat(d.amount) || 0)}</span>
                <button onClick={() => setLDeds(lDeds.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Item" value={lDedForm.title} onChange={(e) => setLDedForm({ ...lDedForm, title: e.target.value })} style={{ flex: 2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
              <input placeholder="$0" type="number" value={lDedForm.amount} onChange={(e) => setLDedForm({ ...lDedForm, amount: e.target.value })} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
              <button onClick={() => { if (!lDedForm.title || !lDedForm.amount) return; setLDeds([...lDeds, lDedForm]); setLDedForm({ title: "", amount: "" }); }} style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "8px 14px", color: C.accentLight, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add</button>
            </div>
          </div>
          {lGross > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, marginBottom: 4 }}><span>Gross ({lHours.toFixed(1)}h)</span><span>{$$(lGross)}</span></div>
              {lDeds.map((d, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.red, marginBottom: 2 }}><span>- {d.title}</span><span>-{$$(parseFloat(d.amount) || 0)}</span></div>)}
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15 }}>
                <span style={{ color: C.text }}>Net Owed</span><span style={{ color: C.green }}>{$$(lNet)}</span>
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
