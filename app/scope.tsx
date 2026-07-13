"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rytoiilokjxelabqaljq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dG9paWxva2p4ZWxhYnFhbGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg2MTQsImV4cCI6MjA5NzEwNDYxNH0.LbJz7YLWi_kX6Gw93lvayPKcaXkGiPUusQ3d-zPQ8Kk"
);

const C = {
  bg: "#0a0a0f", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#f97316", accentLight: "#fb923c", accentGlow: "rgba(249,115,22,0.15)",
  green: "#10b981", greenGlow: "rgba(16,185,129,0.15)",
  yellow: "#f59e0b", yellowGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444", redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const IRS_RATE = 0.70;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

interface Property { id: string; address: string; city: string; status?: string; closed_date?: string; }
interface ScopeItem {
  id: string; property_id: string; description: string; cost: number; labor: number;
  completed: boolean; excluded_from_invoice: boolean; sort_order: number; is_paint?: boolean; materials_purchased?: boolean; notes?: string;
}
interface MileageLog { id: string; property_id: string; date: string; miles: number; note: string; }
interface Log { id: string; contractor_id: string; property_id: string; hours: number; rate_override: number | null; date: string; paid: boolean; note: string; deductions: { title: string; amount: number }[]; }
interface Contractor { id: string; name: string; rate: number; color: string; }
interface Expense { id: string; property_id: string | null; items: { price: number; qty: number }[]; }
interface Advance { id: string; contractor_id: string; amount: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const isPaint = (desc: string) => /paint|painting|primer|stain|finish coat/i.test(desc);
const isPMFee = (desc: string) => /property management fee|pm fee|management fee/i.test(desc);
const netAmt = (log: Log, rate: number) => {
  const r = log.rate_override != null ? Number(log.rate_override) : rate;
  const gross = Number(log.hours) * r;
  const ded = (log.deductions || []).reduce((s, d) => s + Number(d.amount), 0);
  return Math.max(0, gross - ded);
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, marginTop: 20, marginBottom: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, v = "primary", style = {}, disabled }: { children: React.ReactNode; onClick?: () => void; v?: "primary"|"ghost"|"success"|"danger"; style?: React.CSSProperties; disabled?: boolean }) {
  const s = { primary: { background: C.accent, color: "#fff", border: "none" }, ghost: { background: "transparent", color: C.sub, border: `1px solid ${C.border}` }, success: { background: C.greenGlow, color: C.green, border: `1px solid ${C.green}44` }, danger: { background: C.redGlow, color: C.red, border: `1px solid ${C.red}44` } };
  return <button onClick={onClick} disabled={disabled} style={{ ...s[v], borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}>{children}</button>;
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div style={{ color, fontSize: 20, fontWeight: 800, letterSpacing: -1 }}>{value}</div>
      <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

// ── Property P&L ──────────────────────────────────────────────────────────────
function PropertyPL({ property, scopeItems, logs, contractors, expenses, advances, mileageLogs, invoiceSubmitted }: {
  property: Property; scopeItems: ScopeItem[]; logs: Log[]; contractors: Contractor[];
  expenses: Expense[]; advances: Advance[]; mileageLogs: MileageLog[]; invoiceSubmitted?: boolean;
}) {
  const pLogs = logs.filter(l => l.property_id === property.id);
  const pExpenses = expenses.filter(e => e.property_id === property.id);
  const pMileage = mileageLogs.filter(m => m.property_id === property.id);

  // Expected revenue = ALL scope items, paint labor counts but paint cost excluded, PM fee fully excluded
  const expectedRevenue = scopeItems.filter(i => !i.excluded_from_invoice && !isPMFee(i.description)).reduce((s, i) => {
    const paintItem = isPaint(i.description);
    return s + (paintItem ? Number(i.labor) : Number(i.cost) + Number(i.labor));
  }, 0);
  // Actual revenue only shows after invoice submitted
  const revenue = invoiceSubmitted ? expectedRevenue : 0;

  // Labor costs
  const laborCost = pLogs.reduce((s, l) => {
    const c = contractors.find(c => c.id === l.contractor_id);
    return s + (c ? netAmt(l, c.rate) : 0);
  }, 0);

  // Advances
  const totalAdvances = advances.filter(a => {
    const cIds = [...new Set(pLogs.map(l => l.contractor_id))];
    return cIds.includes(a.contractor_id);
  }).reduce((s, a) => s + Number(a.amount), 0);

  // Material expenses
  const materialCost = pExpenses.reduce((s, e) =>
    s + (e.items || []).reduce((si, i) => si + Number(i.price) * Number(i.qty), 0), 0);

  // Mileage
  const mileageCost = pMileage.reduce((s, m) => s + Number(m.miles) * IRS_RATE, 0);
  const totalMiles = pMileage.reduce((s, m) => s + Number(m.miles), 0);

  const totalCosts = laborCost + materialCost + mileageCost;
  const netProfit = (invoiceSubmitted ? revenue : expectedRevenue) - totalCosts;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Property P&L</div>
      {!invoiceSubmitted && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8, alignItems: "center" }}>
          <span style={{ color: C.muted }}>Expected Invoice Revenue</span>
          <span style={{ color: C.yellow, fontWeight: 700 }}>{$$(expectedRevenue)}</span>
        </div>
      )}
      {invoiceSubmitted && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8, alignItems: "center" }}>
          <span style={{ color: C.muted }}>Invoice Revenue</span>
          <span style={{ color: C.green, fontWeight: 700 }}>{$$(revenue)}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: C.muted }}>Labor (payroll)</span>
        <span style={{ color: C.red }}>-{$$(laborCost)}</span>
      </div>
      {totalAdvances > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: C.muted }}>Advances paid</span>
        <span style={{ color: C.red }}>-{$$(totalAdvances)}</span>
      </div>}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: C.muted }}>Materials / Expenses</span>
        <span style={{ color: C.red }}>-{$$(materialCost)}</span>
      </div>
      {mileageCost > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: C.muted }}>Mileage ({totalMiles.toFixed(0)} mi × ${IRS_RATE})</span>
        <span style={{ color: C.red }}>-{$$(mileageCost)}</span>
      </div>}
      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18 }}>
        <span style={{ color: C.text }}>Net Profit</span>
        <span style={{ color: netProfit >= 0 ? C.green : C.red }}>{$$(netProfit)}</span>
      </div>
    </div>
  );
}

// ── Scope Detail View ─────────────────────────────────────────────────────────
function ScopeDetail({ property, onBack, onClose, logs, contractors, expenses, advances, allMileageLogs, onPropertyUpdate }: {
  property: Property; onBack: () => void; onClose?: () => void;
  logs: Log[]; contractors: Contractor[]; expenses: Expense[]; advances: Advance[];
  allMileageLogs: MileageLog[]; onPropertyUpdate: (p: Property) => void;
}) {
  const [items, setItems] = useState<ScopeItem[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMileage, setShowMileage] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [editItem, setEditItem] = useState<ScopeItem | null>(null);
  const [newItem, setNewItem] = useState({ description: "", cost: "", labor: "" });
  const [mileageForm, setMileageForm] = useState({ date: today(), miles: "", note: "" });
  const [invoiceSubmitted, setInvoiceSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [property.id]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: s }, { data: m }, { data: inv }] = await Promise.all([
      supabase.from("scope_items").select("*").eq("property_id", property.id).order("sort_order"),
      supabase.from("mileage_logs").select("*").eq("property_id", property.id).order("date", { ascending: false }),
      supabase.from("invoices").select("id,status").eq("property_id", property.id).eq("status", "submitted").limit(1),
    ]);
    setItems(s || []);
    setMileageLogs(m || []);
    setInvoiceSubmitted(!!(inv && inv.length > 0));
    setLoading(false);
  };

  const toggleInvoiceSubmitted = async () => {
    const newVal = !invoiceSubmitted;
    if (newVal) {
      await supabase.from("invoices").update({ status: "submitted" }).eq("property_id", property.id);
    } else {
      await supabase.from("invoices").update({ status: "draft" }).eq("property_id", property.id);
    }
    setInvoiceSubmitted(newVal);
  };

  const sendToInvoice = async () => {
    // Load user settings for contractor info
    const { data: setts } = await supabase.from("user_settings").select("*");
    const s: Record<string, string> = {};
    (setts || []).forEach((row: { key: string; value: string }) => { s[row.key] = row.value; });

    // Get next invoice number
    const { data: existingInvs } = await supabase.from("invoices").select("invoice_number").order("invoice_number", { ascending: false }).limit(1);
    const lastNum = existingInvs?.[0]?.invoice_number || 141;
    const invNum = lastNum + 1;

    // Build sections from scope items - exclude paint cost, include paint labor
    const invoiceableItems = items.filter(i => !i.excluded_from_invoice);
    const miscItems = invoiceableItems.map(i => {
      const paint = isPaint(i.description);
      return {
        id: i.id,
        description: i.description,
        materials: paint ? 0 : Number(i.cost),
        labor: Number(i.labor),
      };
    });

    const sections = [
      { id: "exterior", name: "Exterior", items: [] as { id: string; description: string; materials: number; labor: number }[] },
      { id: "interior", name: "Interior", items: [] as { id: string; description: string; materials: number; labor: number }[] },
      { id: "bathroom", name: "Bathroom", items: [] as { id: string; description: string; materials: number; labor: number }[] },
      { id: "kitchen", name: "Kitchen", items: [] as { id: string; description: string; materials: number; labor: number }[] },
      { id: "misc", name: "Misc", items: miscItems },
    ];

    const { data } = await supabase.from("invoices").insert({
      user_id: userId,
      property_id: property.id,
      invoice_number: invNum,
      date: today(),
      status: "draft",
      contractor_name: s.name || "",
      contractor_address: s.address || "",
      contractor_phone: s.phone || "",
      contractor_email: s.email || "",
      sections: JSON.stringify(sections),
      notes: s.payment_info || "",
    }).select().single();

    if (data) {
      alert(`Invoice #${invNum} created! Go to the Invoices tab to view and download it.`);
    }
  };

  const scanScope = async (file: File) => {
    setScanning(true); setScanError(null);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = (e) => res((e.target?.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const response = await fetch("/api/scan-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      });
      const parsed = await response.json();
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.items?.length) {
        const rows = parsed.items.map((item: Partial<ScopeItem>, idx: number) => ({
          property_id: property.id,
          description: item.description || "",
          cost: Number(item.cost) || 0,
          labor: Number(item.labor) || 0,
          completed: false,
          excluded_from_invoice: isPMFee(item.description || ""),
          sort_order: (items.length + idx),
        }));
        const { data, error } = await supabase.from("scope_items").insert(rows.map((r: Record<string, unknown>) => ({ ...r, user_id: userId }))).select();
        if (error) throw new Error("Save failed: " + error.message);
        if (data) setItems(prev => [...prev, ...data]);
      }
    } catch (e: unknown) {
      setScanError("Could not read scope: " + (e instanceof Error ? e.message : String(e)));
    }
    setScanning(false);
  };

  const addItem = async () => {
    if (!newItem.description) return;
    const pmFee = isPMFee(newItem.description);
    const { data } = await supabase.from("scope_items").insert({
      user_id: userId,
      property_id: property.id, description: newItem.description,
      cost: parseFloat(newItem.cost) || 0, labor: parseFloat(newItem.labor) || 0,
      completed: false, excluded_from_invoice: pmFee,
      sort_order: items.length,
    }).select().single();
    if (data) setItems(prev => [...prev, data]);
    setNewItem({ description: "", cost: "", labor: "" });
    setShowAddItem(false);
  };

  const toggleComplete = async (item: ScopeItem) => {
    await supabase.from("scope_items").update({ completed: !item.completed }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
  };

  const toggleExclude = async (item: ScopeItem) => {
    await supabase.from("scope_items").update({ excluded_from_invoice: !item.excluded_from_invoice }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, excluded_from_invoice: !i.excluded_from_invoice } : i));
  };

  const toggleMatPurchased = async (item: ScopeItem) => {
    await supabase.from("scope_items").update({ materials_purchased: !item.materials_purchased }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, materials_purchased: !i.materials_purchased } : i));
  };

  const removeItem = async (id: string) => {
    if (!confirm("Remove this item from scope? This cannot be undone.")) return;
    await supabase.from("scope_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    await supabase.from("scope_items").update({ description: editItem.description, cost: editItem.cost, labor: editItem.labor, notes: editItem.notes || "" }).eq("id", editItem.id);
    setItems(prev => prev.map(i => i.id === editItem.id ? editItem : i));
    setEditItem(null);
  };

  const addMileage = async () => {
    if (!mileageForm.miles) return;
    const { data } = await supabase.from("mileage_logs").insert({
      user_id: userId,
      property_id: property.id, date: mileageForm.date,
      miles: parseFloat(mileageForm.miles), note: mileageForm.note,
    }).select().single();
    if (data) setMileageLogs(prev => [data, ...prev]);
    setMileageForm({ date: today(), miles: "", note: "" });
  };

  const deleteMileage = async (id: string) => {
    if (!confirm("Delete this mileage entry?")) return;
    await supabase.from("mileage_logs").delete().eq("id", id);
    setMileageLogs(prev => prev.filter(m => m.id !== id));
  };

  const toggleClose = async () => {
    const newStatus = property.status === "complete" ? "active" : "complete";
    const closedDate = newStatus === "complete" ? today() : null;
    await supabase.from("properties").update({ status: newStatus, closed_date: closedDate }).eq("id", property.id);
    onPropertyUpdate({ ...property, status: newStatus, closed_date: closedDate || undefined });
    setShowCloseConfirm(false);
  };

  // Totals
  const totalScope = items.reduce((s, i) => s + Number(i.cost) + Number(i.labor), 0);
  const totalCompleted = items.filter(i => i.completed).reduce((s, i) => s + Number(i.cost) + Number(i.labor), 0);
  const totalInvoiceable = items.filter(i => i.completed && !isPaint(i.description) && !i.excluded_from_invoice).reduce((s, i) => s + Number(i.cost) + Number(i.labor), 0);
  const totalPaint = items.filter(i => isPaint(i.description)).reduce((s, i) => s + Number(i.cost) + Number(i.labor), 0);
  const completedCount = items.filter(i => i.completed).length;
  const totalMiles = mileageLogs.reduce((s, m) => s + Number(m.miles), 0);

  const isClosed = property.status === "complete";

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 20 }}>&#8592; Back</button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1, margin: 0 }}>{property.address}</h1>
            {isClosed && <span style={{ background: C.greenGlow, border: `1px solid ${C.green}44`, borderRadius: 999, padding: "2px 12px", fontSize: 12, fontWeight: 700, color: C.green }}>✓ Complete</span>}
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>{property.city}{isClosed && property.closed_date ? ` · Closed ${property.closed_date}` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && scanScope(e.target.files[0])} />
          <Btn v="ghost" onClick={() => fileRef.current?.click()} disabled={scanning}>{scanning ? "Scanning..." : "📎 Upload Scope"}</Btn>
          <Btn v="ghost" onClick={() => setShowMileage(!showMileage)}>🚗 Mileage</Btn>
          <Btn v={invoiceSubmitted ? "success" : "ghost"} onClick={toggleInvoiceSubmitted}>{invoiceSubmitted ? "✓ Invoice Submitted" : "📤 Mark Invoice Submitted"}</Btn>
          <Btn v="primary" onClick={sendToInvoice} style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}>📄 Send to Invoice</Btn>
          <Btn v={isClosed ? "ghost" : "success"} onClick={() => setShowCloseConfirm(true)}>{isClosed ? "↩ Reopen" : "✓ Close Property"}</Btn>
        </div>
      </div>

      {scanError && <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.red }}>⚠️ {scanError} <button onClick={() => setScanError(null)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", marginLeft: 8 }}>✕</button></div>}
      {scanning && <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: C.accentLight, textAlign: "center" }}>🤖 AI is reading your scope of work — extracting all line items with exact descriptions...</div>}

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total Scope" value={$$(totalScope)} color={C.accentLight} icon="📋" />
        <StatCard label="Completed" value={$$(totalCompleted)} color={C.yellow} icon="✅" />
        <StatCard label="Invoiceable" value={$$(totalInvoiceable)} color={C.green} icon="💰" />
        {totalPaint > 0 && <StatCard label="Paint (excluded)" value={$$(totalPaint)} color={C.muted} icon="🎨" />}
      </div>

      {/* P&L */}
      <PropertyPL property={property} scopeItems={items} logs={logs} contractors={contractors} expenses={expenses} advances={advances} mileageLogs={[...mileageLogs, ...allMileageLogs.filter(m => m.property_id !== property.id ? false : true)]} invoiceSubmitted={invoiceSubmitted} />

      {/* Mileage section */}
      {showMileage && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Mileage Log — {totalMiles.toFixed(0)} mi · {$$(totalMiles * IRS_RATE)} @ ${IRS_RATE}/mi (IRS)</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input type="date" value={mileageForm.date} onChange={(e) => setMileageForm(f => ({ ...f, date: e.target.value }))}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
            <input type="number" placeholder="Miles" value={mileageForm.miles} onChange={(e) => setMileageForm(f => ({ ...f, miles: e.target.value }))}
              style={{ width: 90, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
            <input placeholder="Note (optional)" value={mileageForm.note} onChange={(e) => setMileageForm(f => ({ ...f, note: e.target.value }))}
              style={{ flex: 1, minWidth: 120, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, outline: "none" }} />
            <Btn onClick={addMileage} style={{ padding: "8px 16px", fontSize: 13 }}>+ Add</Btn>
          </div>
          {mileageLogs.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 13 }}>{m.miles} mi</span><span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{m.date}{m.note ? ` · ${m.note}` : ""}</span></div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.yellow }}>{$$(Number(m.miles) * IRS_RATE)}</div>
              <button onClick={() => deleteMileage(m.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* Scope items */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>
          Scope of Work — {completedCount}/{items.length} completed
        </div>
        <Btn onClick={() => setShowAddItem(true)} style={{ padding: "6px 14px", fontSize: 12 }}>+ Add Item</Btn>
      </div>

      {loading && <div style={{ color: C.muted, textAlign: "center", padding: "30px 0" }}>Loading...</div>}

      {items.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No scope items yet</div>
          <div style={{ fontSize: 14 }}>Upload a scope document or add items manually</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const total = Number(item.cost) + Number(item.labor);
          const paint = isPaint(item.description);
          const excluded = item.excluded_from_invoice || paint;
          return (
            <div key={item.id} style={{ background: C.card, border: `1px solid ${item.completed ? C.green + "44" : C.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12, opacity: excluded && !item.completed ? 0.75 : 1, transition: "all 0.15s" }}>
              {/* Checkbox */}
              <button onClick={() => toggleComplete(item)}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.completed ? C.green : C.border}`, background: item.completed ? C.green : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>
                {item.completed ? "✓" : ""}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, textDecoration: item.completed ? "line-through" : "none", opacity: item.completed ? 0.7 : 1 }}>{item.description}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                  {Number(item.cost) > 0 && <span style={{ fontSize: 12, color: C.muted }}>Materials: {$$(Number(item.cost))}</span>}
                  {Number(item.labor) > 0 && <span style={{ fontSize: 12, color: C.muted }}>Labor: {$$(Number(item.labor))}</span>}
                  {paint && <span style={{ fontSize: 11, color: C.muted, background: C.surface, borderRadius: 4, padding: "1px 6px" }}>🎨 paint cost excluded · labor counts</span>}
                  {isPMFee(item.description) && <span style={{ fontSize: 11, color: C.red, background: C.redGlow, borderRadius: 4, padding: "1px 6px" }}>💼 PM fee — excluded from invoice</span>}
                  {!paint && !isPMFee(item.description) && excluded && <span style={{ fontSize: 11, color: C.muted, background: C.surface, borderRadius: 4, padding: "1px 6px" }}>excluded</span>}
                  {item.notes && <div style={{ fontSize: 12, color: C.accentLight, marginTop: 2, fontStyle: "italic" }}>📝 {item.notes}</div>}
                  {Number(item.cost) > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); toggleMatPurchased(item); }}
                      style={{ fontSize: 11, color: item.materials_purchased ? C.green : C.muted, background: item.materials_purchased ? C.greenGlow : C.surface, border: `1px solid ${item.materials_purchased ? C.green + "44" : C.border}`, borderRadius: 4, padding: "1px 8px", cursor: "pointer", fontWeight: item.materials_purchased ? 700 : 400 }}>
                      {item.materials_purchased ? "🛒 Materials bought" : "🛒 Mark materials bought"}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: item.completed ? C.green : C.text }}>{$$(total)}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => setEditItem(item)} style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 6, padding: "3px 8px", color: C.accentLight, fontSize: 11, cursor: "pointer" }}>Edit</button>
                  {!paint && <button onClick={() => toggleExclude(item)} style={{ background: excluded ? C.greenGlow : C.surface, border: `1px solid ${excluded ? C.green : C.border}44`, borderRadius: 6, padding: "3px 8px", color: excluded ? C.green : C.muted, fontSize: 11, cursor: "pointer" }}>{excluded ? "Include" : "Exclude"}</button>}
                  <button onClick={() => removeItem(item.id)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "3px 8px", color: C.red, fontSize: 11, cursor: "pointer" }}>Remove</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add item modal */}
      {showAddItem && (
        <Modal title="Add Scope Item" onClose={() => setShowAddItem(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Description</label>
            <textarea value={newItem.description} onChange={(e) => setNewItem(n => ({ ...n, description: e.target.value }))}
              placeholder="e.g. Paint entire house, trim, doors"
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const, minHeight: 80, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Materials ($)</label>
              <input type="number" placeholder="0.00" value={newItem.cost} onChange={(e) => setNewItem(n => ({ ...n, cost: e.target.value }))}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Labor ($)</label>
              <input type="number" placeholder="0.00" value={newItem.labor} onChange={(e) => setNewItem(n => ({ ...n, labor: e.target.value }))}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
          </div>
          {isPaint(newItem.description) && <div style={{ background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 12, color: C.yellow }}>🎨 Paint item — paint cost excluded from invoice, labor still counts</div>}
          {isPMFee(newItem.description) && <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 12, color: C.red }}>💼 Property management fee — will be fully excluded from invoice</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn v="ghost" onClick={() => setShowAddItem(false)}>Cancel</Btn>
            <Btn onClick={addItem}>Add Item</Btn>
          </div>
        </Modal>
      )}

      {/* Edit item modal */}
      {editItem && (
        <Modal title="Edit Scope Item" onClose={() => setEditItem(null)}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Description</label>
            <textarea value={editItem.description} onChange={(e) => setEditItem(ei => ei ? { ...ei, description: e.target.value } : null)}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const, minHeight: 80, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Materials ($)</label>
              <input type="number" value={editItem.cost} onChange={(e) => setEditItem(ei => ei ? { ...ei, cost: parseFloat(e.target.value) || 0 } : null)}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Labor ($)</label>
              <input type="number" value={editItem.labor} onChange={(e) => setEditItem(ei => ei ? { ...ei, labor: parseFloat(e.target.value) || 0 } : null)}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Notes</label>
            <textarea value={editItem.notes || ""} onChange={(e) => setEditItem(ei => ei ? { ...ei, notes: e.target.value } : null)}
              placeholder="e.g. Waiting on delivery, used 3 boxes, see receipt #..."
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const, minHeight: 60, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn v="ghost" onClick={() => setEditItem(null)}>Cancel</Btn>
            <Btn onClick={saveEditItem}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {/* Close confirm */}
      {showCloseConfirm && (
        <Modal title={isClosed ? "Reopen Property?" : "Close Property?"} onClose={() => setShowCloseConfirm(false)}>
          <div style={{ background: isClosed ? C.accentGlow : C.greenGlow, border: `1px solid ${isClosed ? C.accent : C.green}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: isClosed ? C.accentLight : C.green }}>
            {isClosed ? "This will reopen the property and mark it as active again." : "This will mark the property as complete. You can still view and edit everything — it will be clearly marked as closed."}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setShowCloseConfirm(false)}>Cancel</Btn>
            <Btn v={isClosed ? "primary" : "success"} onClick={toggleClose}>{isClosed ? "Yes, Reopen" : "Yes, Close Property"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main Scope Tab ─────────────────────────────────────────────────────────────
export default function ScopeTab({ properties, logs, contractors, expenses, advances, userId, onPropertyUpdate }: {
  properties: Property[]; logs: Log[]; contractors: Contractor[];
  expenses: Expense[]; advances: Advance[];
  onPropertyUpdate: (p: Property) => void;
}) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [allMileageLogs, setAllMileageLogs] = useState<MileageLog[]>([]);
  const [filter, setFilter] = useState<"all"|"active"|"complete">("all");

  useEffect(() => {
    supabase.from("mileage_logs").select("*").then(({ data }) => setAllMileageLogs(data || []));
  }, []);

  const filteredProps = properties.filter(p => {
    if (filter === "active") return !p.status || p.status === "active";
    if (filter === "complete") return p.status === "complete";
    return true;
  });

  if (selectedProperty) return (
    <ScopeDetail
      property={selectedProperty} onBack={() => setSelectedProperty(null)}
      logs={logs} contractors={contractors} expenses={expenses} advances={advances}
      allMileageLogs={allMileageLogs} onPropertyUpdate={(p) => { onPropertyUpdate(p); setSelectedProperty(p); }}
    />
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Scope of Work</h1>
        <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>Track rehab scope, P&L, and mileage per property</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "active", "complete"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? C.accentGlow : "transparent", border: `1px solid ${filter === f ? C.accent + "44" : C.border}`, borderRadius: 8, padding: "6px 16px", color: filter === f ? C.accentLight : C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredProps.map((p) => {
          const isClosed = p.status === "complete";
          return (
            <div key={p.id} onClick={() => setSelectedProperty(p)}
              style={{ background: C.card, border: `1px solid ${isClosed ? C.green + "33" : C.border}`, borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = isClosed ? C.green + "33" : C.border)}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ fontSize: 28 }}>🏠</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.address}</div>
                    {isClosed && <span style={{ background: C.greenGlow, border: `1px solid ${C.green}44`, borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700, color: C.green }}>✓ Complete</span>}
                  </div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{p.city}{isClosed && p.closed_date ? ` · Closed ${p.closed_date}` : ""}</div>
                </div>
                <span style={{ color: C.accentLight, fontSize: 20 }}>›</span>
              </div>
            </div>
          );
        })}
        {filteredProps.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 0", color: C.muted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
            <div style={{ fontWeight: 600 }}>No {filter === "all" ? "" : filter} properties</div>
          </div>
        )}
      </div>
    </div>
  );
}
