"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rytoiilokjxelabqaljq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dG9paWxva2p4ZWxhYnFhbGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg2MTQsImV4cCI6MjA5NzEwNDYxNH0.LbJz7YLWi_kX6Gw93lvayPKcaXkGiPUusQ3d-zPQ8Kk"
);

const C = {
  bg: "#0a0a0f", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#7c3aed", accentLight: "#a78bfa", accentGlow: "rgba(124,58,237,0.15)",
  green: "#10b981", greenGlow: "rgba(16,185,129,0.15)",
  yellow: "#f59e0b",
  red: "#ef4444", redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const today = () => new Date().toISOString().split("T")[0];

interface Property { id: string; address: string; city: string; }
interface LineItem { id: string; description: string; materials: number; labor: number; }
interface Section { id: string; name: string; items: LineItem[]; }
interface Invoice {
  id: string; property_id: string | null; invoice_number: number; date: string;
  status: string; contractor_name: string; contractor_address: string;
  contractor_phone: string; contractor_email: string;
  sections: Section[]; notes: string; created_at: string;
}
interface Settings { name: string; address: string; phone: string; email: string; payment_info: string; }

const DEFAULT_SECTIONS: Section[] = [
  { id: "exterior", name: "Exterior", items: [] },
  { id: "interior", name: "Interior", items: [] },
  { id: "bathroom", name: "Bathroom", items: [] },
  { id: "kitchen", name: "Kitchen", items: [] },
  { id: "misc", name: "Misc", items: [] },
];

const newItem = (): LineItem => ({ id: crypto.randomUUID(), description: "", materials: 0, labor: 0 });

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "16px", overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: wide ? 780 : 520, marginTop: 20, marginBottom: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>}
      <input {...props} onFocus={(e) => { setF(true); props.onFocus?.(e); }} onBlur={(e) => { setF(false); props.onBlur?.(e); }}
        style={{ width: "100%", background: C.surface, border: `1px solid ${f ? C.accent : C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", ...props.style }} />
    </div>
  );
}

function Btn({ children, onClick, v = "primary", style = {} }: { children: React.ReactNode; onClick?: () => void; v?: "primary"|"ghost"|"success"|"danger"; style?: React.CSSProperties }) {
  const s = { primary: { background: C.accent, color: "#fff", border: "none" }, ghost: { background: "transparent", color: C.sub, border: `1px solid ${C.border}` }, success: { background: C.greenGlow, color: C.green, border: `1px solid ${C.green}44` }, danger: { background: C.redGlow, color: C.red, border: `1px solid ${C.red}44` } };
  return <button onClick={onClick} style={{ ...s[v], borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", ...style }}>{children}</button>;
}

// ── PDF Print Styles ──────────────────────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print, #invoice-print * { visibility: visible !important; }
  #invoice-print { position: fixed; left: 0; top: 0; width: 100%; }
  @page { margin: 0.5in; size: letter; }
}
`;

// ── Invoice Print View ────────────────────────────────────────────────────────
function InvoicePrint({ invoice, property }: { invoice: Invoice; property: Property | undefined }) {
  const sectionTotals = invoice.sections.map(s => ({
    ...s,
    materials: s.items.reduce((sum, i) => sum + Number(i.materials), 0),
    labor: s.items.reduce((sum, i) => sum + Number(i.labor), 0),
    total: s.items.reduce((sum, i) => sum + Number(i.materials) + Number(i.labor), 0),
  }));
  const grandMaterials = sectionTotals.reduce((s, sec) => s + sec.materials, 0);
  const grandLabor = sectionTotals.reduce((s, sec) => s + sec.labor, 0);
  const grandTotal = grandMaterials + grandLabor;

  return (
    <div id="invoice-print" style={{ fontFamily: "Arial, sans-serif", color: "#000", background: "#fff", padding: "0 20px" }}>
      <style>{PRINT_STYLES}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, paddingTop: 20 }}>
        <div style={{ border: "2px solid #000", padding: "12px 20px", minWidth: 200, textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{invoice.contractor_name || "CONTRACTOR NAME"}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{invoice.contractor_address || "CONTRACTOR ADDRESS"}</div>
          <div style={{ fontSize: 13 }}>{invoice.contractor_phone || "PHONE #"}</div>
          <div style={{ fontSize: 13 }}>{invoice.contractor_email || "EMAIL"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14 }}><strong>Date:</strong> {invoice.date}</div>
          <div style={{ fontSize: 14, marginTop: 8 }}><strong>Invoice #:</strong> {invoice.invoice_number}</div>
        </div>
      </div>

      {/* Property */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Property Address: <span style={{ fontWeight: 400 }}>{property ? `${property.address}, ${property.city}` : ""}</span></div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000" }}>
            <th style={{ textAlign: "left", padding: "6px 8px", width: "50%", textDecoration: "underline" }}>Description</th>
            <th style={{ textAlign: "right", padding: "6px 8px", textDecoration: "underline" }}>Material Costs</th>
            <th style={{ textAlign: "right", padding: "6px 8px", textDecoration: "underline" }}>Labor</th>
            <th style={{ textAlign: "right", padding: "6px 8px", background: "#888", color: "#fff", textDecoration: "underline" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sectionTotals.map((section) => (
            <>
              <tr key={section.id + "-header"}>
                <td colSpan={4} style={{ padding: "10px 8px 4px", fontWeight: 700, fontSize: 14 }}>{section.name}:</td>
              </tr>
              {section.items.length === 0 && (
                <tr key={section.id + "-empty"}>
                  <td style={{ padding: "4px 8px 4px 20px", color: "#999" }}></td>
                  <td></td><td></td>
                  <td style={{ textAlign: "right", padding: "4px 8px", background: "#888", color: "#fff" }}></td>
                </tr>
              )}
              {section.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: "4px 8px 4px 20px" }}>{item.description}</td>
                  <td style={{ textAlign: "right", padding: "4px 8px" }}>{Number(item.materials) > 0 ? $$(Number(item.materials)) : ""}</td>
                  <td style={{ textAlign: "right", padding: "4px 8px" }}>{Number(item.labor) > 0 ? $$(Number(item.labor)) : ""}</td>
                  <td style={{ textAlign: "right", padding: "4px 8px", background: "#888", color: "#fff" }}>{$$(Number(item.materials) + Number(item.labor))}</td>
                </tr>
              ))}
            </>
          ))}

          {/* Totals row */}
          <tr style={{ borderTop: "2px solid #000", marginTop: 8 }}>
            <td style={{ padding: "10px 8px", fontWeight: 700, fontStyle: "italic" }}>above work has been completed</td>
            <td style={{ textAlign: "right", padding: "10px 8px", fontWeight: 700 }}>{$$(grandMaterials)}</td>
            <td style={{ textAlign: "right", padding: "10px 8px", fontWeight: 700 }}>{$$(grandLabor)}</td>
            <td style={{ textAlign: "right", padding: "10px 8px", background: "#888", color: "#fff", fontWeight: 700, fontStyle: "italic" }}>{$$(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Notes / Payment */}
      {(invoice.notes || invoice.contractor_email) && (
        <div style={{ marginTop: 24, fontSize: 13 }}>
          {invoice.notes && <div>{invoice.notes}</div>}
        </div>
      )}
    </div>
  );
}

// ── Invoice Editor ────────────────────────────────────────────────────────────
function InvoiceEditor({ invoice, property, settings, onSave, onClose, onDelete }: {
  invoice: Invoice; property: Property | undefined; settings: Settings;
  onSave: (inv: Invoice) => void; onClose: () => void; onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Invoice>({ ...invoice });
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateSection = (sectionId: string, items: LineItem[]) => {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sectionId ? { ...s, items } : s) }));
  };

  const addItem = (sectionId: string) => {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sectionId ? { ...s, items: [...s.items, newItem()] } : s) }));
  };

  const updateItem = (sectionId: string, itemId: string, field: keyof LineItem, value: string | number) => {
    setForm(f => ({
      ...f,
      sections: f.sections.map(s => s.id === sectionId ? {
        ...s, items: s.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
      } : s)
    }));
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    if (!confirm("Delete this line item?")) return;
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === sectionId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s) }));
  };

  const grandMaterials = form.sections.reduce((s, sec) => s + sec.items.reduce((si, i) => si + Number(i.materials), 0), 0);
  const grandLabor = form.sections.reduce((s, sec) => s + sec.items.reduce((si, i) => si + Number(i.labor), 0), 0);
  const grandTotal = grandMaterials + grandLabor;

  const save = async () => {
    setSaving(true);
    await supabase.from("invoices").update({
      date: form.date, contractor_name: form.contractor_name, contractor_address: form.contractor_address,
      contractor_phone: form.contractor_phone, contractor_email: form.contractor_email,
      sections: JSON.stringify(form.sections), notes: form.notes, status: form.status,
    }).eq("id", form.id);
    onSave(form);
    setSaving(false);
    onClose();
  };

  const printPDF = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  return (
    <>
      {showPreview && <InvoicePrint invoice={form} property={property} />}
      <Modal title={`Invoice #${form.invoice_number}`} onClose={onClose} wide>
        {/* Header fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <Field label="Your Name" value={form.contractor_name} onChange={(e) => setForm(f => ({ ...f, contractor_name: e.target.value }))} />
          <Field label="Date" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
          <Field label="Your Address" value={form.contractor_address} onChange={(e) => setForm(f => ({ ...f, contractor_address: e.target.value }))} />
          <Field label="Your Phone" value={form.contractor_phone} onChange={(e) => setForm(f => ({ ...f, contractor_phone: e.target.value }))} />
          <Field label="Your Email" value={form.contractor_email} onChange={(e) => setForm(f => ({ ...f, contractor_email: e.target.value }))} />
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 12 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", fontSize: 14, color: C.text, width: "100%", boxSizing: "border-box" as const }}>
              <span style={{ color: C.muted, fontSize: 11 }}>PROPERTY</span><br />
              <span style={{ color: property ? C.text : C.muted }}>{property ? `${property.address}, ${property.city}` : "No property linked"}</span>
            </div>
          </div>
        </div>

        {/* Sections */}
        {form.sections.map((section) => {
          const secMaterials = section.items.reduce((s, i) => s + Number(i.materials), 0);
          const secLabor = section.items.reduce((s, i) => s + Number(i.labor), 0);
          const secTotal = secMaterials + secLabor;
          return (
            <div key={section.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 1 }}>{section.name}</div>
                {secTotal > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{$$(secTotal)}</div>}
              </div>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 90px 32px", gap: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Description</div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Materials</div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Labor</div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Total</div>
                <div></div>
              </div>

              {section.items.map((item) => {
                const itemTotal = Number(item.materials) + Number(item.labor);
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 90px 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
                    <input value={item.description} onChange={(e) => updateItem(section.id, item.id, "description", e.target.value)}
                      placeholder="Description..." style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
                    <input type="number" value={item.materials || ""} onChange={(e) => updateItem(section.id, item.id, "materials", parseFloat(e.target.value) || 0)}
                      placeholder="0.00" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", textAlign: "right", width: "100%", boxSizing: "border-box" as const }} />
                    <input type="number" value={item.labor || ""} onChange={(e) => updateItem(section.id, item.id, "labor", parseFloat(e.target.value) || 0)}
                      placeholder="0.00" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", textAlign: "right", width: "100%", boxSizing: "border-box" as const }} />
                    <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: itemTotal > 0 ? C.green : C.muted }}>{itemTotal > 0 ? $$(itemTotal) : "—"}</div>
                    <button onClick={() => deleteItem(section.id, item.id)} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 6, width: 28, height: 28, color: C.red, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                );
              })}

              <button onClick={() => addItem(section.id)}
                style={{ background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 7, padding: "6px 14px", color: C.muted, fontSize: 12, cursor: "pointer", marginTop: 4 }}>
                + Add {section.name} Item
              </button>
            </div>
          );
        })}

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Notes / Payment Info</label>
          <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Please send payment via ACH to..."
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const, minHeight: 70, resize: "vertical" }} />
        </div>

        {/* Grand total */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 6 }}><span>Materials</span><span>{$$(grandMaterials)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 10 }}><span>Labor</span><span>{$$(grandLabor)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <span>Grand Total</span><span style={{ color: C.green }}>{$$(grandTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={printPDF} v="ghost" style={{ flex: 1 }}>📄 Download PDF</Btn>
          <Btn onClick={save} style={{ flex: 1 }} v="success">{saving ? "Saving..." : "Save Invoice"}</Btn>
        </div>
        <div style={{ marginTop: 12 }}>
          {!deleteConfirm
            ? <button onClick={() => setDeleteConfirm(true)} style={{ background: "none", border: "none", color: C.red, fontSize: 13, cursor: "pointer", opacity: 0.7 }}>🗑️ Delete Invoice</button>
            : <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.red }}>⚠️ Delete permanently?</span>
                <button onClick={() => { onDelete(invoice.id); onClose(); }} style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "4px 12px", color: C.red, fontSize: 12, cursor: "pointer" }}>Yes, Delete</button>
                <button onClick={() => setDeleteConfirm(false)} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              </div>
          }
        </div>
      </Modal>
    </>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ settings, onSave, onClose }: { settings: Settings; onSave: (s: Settings) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...settings });
  return (
    <Modal title="Your Info (for invoices)" onClose={onClose}>
      <Field label="Your Name / Company" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
      <Field label="Address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
      <Field label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
      <Field label="Email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
      <Field label="Payment Info (shown on invoice)" value={form.payment_info} onChange={(e) => setForm(f => ({ ...f, payment_info: e.target.value }))} placeholder="e.g. Please send payment via ACH to..." />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { onSave(form); onClose(); }}>Save</Btn>
      </div>
    </Modal>
  );
}

// ── Main Invoices Tab ─────────────────────────────────────────────────────────
export default function InvoicesTab({ properties }: { properties: Property[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({ name: "", address: "", phone: "", email: "", payment_info: "" });
  const [showSettings, setShowSettings] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [filterProperty, setFilterProperty] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: invs } = await supabase.from("invoices").select("*").order("invoice_number", { ascending: false });
    const { data: setts } = await supabase.from("user_settings").select("*");
    if (invs) setInvoices(invs.map((inv: Invoice) => ({ ...inv, sections: typeof inv.sections === "string" ? JSON.parse(inv.sections) : inv.sections })));
    if (setts) {
      const s: Partial<Settings> = {};
      setts.forEach((row: { key: string; value: string }) => { (s as Record<string, string>)[row.key] = row.value; });
      setSettings({ name: s.name || "", address: s.address || "", phone: s.phone || "", email: s.email || "", payment_info: s.payment_info || "" });
    }
    setLoading(false);
  };

  const saveSettings = async (s: Settings) => {
    const entries = Object.entries(s);
    for (const [key, value] of entries) {
      await supabase.from("user_settings").upsert({ key, value }, { onConflict: "key" });
    }
    setSettings(s);
  };

  const createInvoice = async (propertyId: string | null) => {
    const property = properties.find(p => p.id === propertyId);
    const { data } = await supabase.from("invoices").insert({
      property_id: propertyId || null,
      invoice_number: Math.floor(Math.random() * 900000) + 100000,
      date: today(),
      status: "draft",
      contractor_name: settings.name,
      contractor_address: settings.address,
      contractor_phone: settings.phone,
      contractor_email: settings.email,
      sections: JSON.stringify(DEFAULT_SECTIONS),
      notes: settings.payment_info,
    }).select().single();
    if (data) {
      // Get proper sequential number
      const { data: numData } = await supabase.rpc("nextval", { seq: "invoice_number_seq" }).single();
      const invNum = numData || (invoices.length > 0 ? Math.max(...invoices.map(i => i.invoice_number)) + 1 : 142);
      await supabase.from("invoices").update({ invoice_number: invNum }).eq("id", data.id);
      const inv = { ...data, invoice_number: invNum, sections: DEFAULT_SECTIONS };
      setInvoices(prev => [inv, ...prev]);
      setEditInvoice(inv);
    }
  };

  const scanAndCreateInvoice = async (file: File) => {
    setScanning(true);
    setScanError(null);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = (e) => res((e.target?.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("Read failed"));
        r.readAsDataURL(file);
      });

      const response = await fetch("/api/scan-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const parsed = await response.json();
      if (parsed.error) throw new Error(parsed.error);

      // Find matching property by address if possible
      const matchedProperty = properties.find(p =>
        parsed.property_address && p.address.toLowerCase().includes(parsed.property_address.toLowerCase().split(",")[0])
      );

      // Get next invoice number
      const maxNum = invoices.length > 0 ? Math.max(...invoices.map(i => i.invoice_number)) : 141;
      const invNum = parsed.invoice_number && parsed.invoice_number > 0 ? parsed.invoice_number : maxNum + 1;

      const { data } = await supabase.from("invoices").insert({
        property_id: matchedProperty?.id || properties[0]?.id || null,
        invoice_number: invNum,
        date: parsed.date || today(),
        status: "draft",
        contractor_name: parsed.contractor_name || settings.name,
        contractor_address: parsed.contractor_address || settings.address,
        contractor_phone: parsed.contractor_phone || settings.phone,
        contractor_email: parsed.contractor_email || settings.email,
        sections: JSON.stringify(parsed.sections || DEFAULT_SECTIONS),
        notes: parsed.notes || settings.payment_info,
      }).select().single();

      if (data) {
        const inv = { ...data, sections: parsed.sections || DEFAULT_SECTIONS };
        setInvoices(prev => [inv, ...prev]);
        setEditInvoice(inv);
      }
    } catch (e: unknown) {
      setScanError("Could not read invoice: " + (e instanceof Error ? e.message : String(e)));
    }
    setScanning(false);
  };

  const deleteInvoice = async (id: string) => {
    await supabase.from("invoices").delete().eq("id", id);
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  const filtered = filterProperty === "all" ? invoices : invoices.filter(i => i.property_id === filterProperty);
  const grandTotal = invoices.reduce((s, inv) => {
    const secs = Array.isArray(inv.sections) ? inv.sections : [];
    return s + secs.reduce((ss: number, sec: Section) => ss + sec.items.reduce((si, item) => si + Number(item.materials) + Number(item.labor), 0), 0);
  }, 0);

  const getProperty = (id: string | null) => id ? properties.find(p => p.id === id) : undefined;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Invoices</h1>
          <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{invoices.length} invoices &middot; {$$(grandTotal)} total billed</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn v="ghost" onClick={() => setShowSettings(true)}>⚙️ My Info</Btn>
          <Btn v="ghost" onClick={() => scanFileRef.current?.click()} style={{ position: "relative" }}>
            {scanning ? "Scanning..." : "📷 Scan Invoice"}
          </Btn>
          <input ref={scanFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) scanAndCreateInvoice(e.target.files[0]); }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => createInvoice(null)}
              style={{ background: C.accent, border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              + New Invoice
            </button>
            {properties.length > 0 && (
              <select onChange={(e) => { if (e.target.value) { createInvoice(e.target.value); e.target.value = ""; } }}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 13, cursor: "pointer", outline: "none" }}>
                <option value="">Link to Property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Total Billed</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{$$(grandTotal)}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Invoices</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.accentLight }}>{invoices.length}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Properties</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{new Set(invoices.map(i => i.property_id)).size}</div>
        </div>
      </div>

      {scanError && (
        <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#ef4444" }}>
          ⚠️ {scanError} <button onClick={() => setScanError(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: 8 }}>✕</button>
        </div>
      )}
      {scanning && (
        <div style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#a78bfa", textAlign: "center" }}>
          🤖 AI is reading your invoice — extracting line items, amounts, and contractor info...
        </div>
      )}

      {/* Filter */}
      <div style={{ marginBottom: 20 }}>
        <select value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", color: C.text, fontSize: 14, outline: "none" }}>
          <option value="all">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      </div>

      {/* Invoice list */}
      {loading && <div style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>Loading invoices...</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((inv) => {
          const prop = getProperty(inv.property_id);
          const secs = Array.isArray(inv.sections) ? inv.sections : [];
          const total = secs.reduce((s: number, sec: Section) => s + sec.items.reduce((si, i) => si + Number(i.materials) + Number(i.labor), 0), 0);
          const itemCount = secs.reduce((s: number, sec: Section) => s + sec.items.length, 0);
          return (
            <div key={inv.id} onClick={() => setEditInvoice(inv)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accentGlow, border: `1px solid ${C.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Invoice #{inv.invoice_number}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{prop?.address || "No property"} &middot; {inv.date} &middot; {itemCount} items</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.green }}>{$$(total)}</div>
                  <div style={{ fontSize: 11, color: inv.status === "draft" ? C.yellow : C.green, textTransform: "uppercase", letterSpacing: 0.5 }}>{inv.status}</div>
                </div>
                <span style={{ color: C.accentLight, fontSize: 18 }}>›</span>
              </div>
            </div>
          );
        })}
        {!filtered.length && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No invoices yet</div>
            <div style={{ fontSize: 14 }}>Tap &quot;+ New Invoice&quot; to create a standalone invoice or link one to a property</div>
          </div>
        )}
      </div>

      {showSettings && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
      {editInvoice && (
        <InvoiceEditor
          invoice={editInvoice}
          property={getProperty(editInvoice.property_id)}
          settings={settings}
          onSave={(inv) => setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i))}
          onClose={() => setEditInvoice(null)}
          onDelete={deleteInvoice}
        />
      )}
    </div>
  );
}
