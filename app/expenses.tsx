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
  yellow: "#f59e0b", yellowGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444", redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3", muted: "#6b7280", sub: "#9ca3af",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const today = () => new Date().toISOString().split("T")[0];

const CATEGORIES = ["Materials", "Tools", "Flooring", "Plumbing", "Electrical", "Paint", "Hardware", "Lumber", "Appliances", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  Materials: "#7c3aed", Tools: "#f59e0b", Flooring: "#10b981",
  Plumbing: "#06b6d4", Electrical: "#f97316", Paint: "#ec4899",
  Hardware: "#8b5cf6", Lumber: "#84cc16", Appliances: "#14b8a6", Other: "#6b7280",
};

interface Property { id: string; address: string; city: string; }
interface ExpenseItem {
  id?: string; name: string; sku: string; qty: number;
  price: number; category: string; tax_deductible: boolean;
}
interface Expense {
  id: string; property_id: string | null; store: string;
  date: string; notes: string; items: ExpenseItem[];
  total?: number;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }} onClick={(e) => e.stopPropagation()}>
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
    <div style={{ marginBottom: 14 }}>
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

function CategoryPill({ cat }: { cat: string }) {
  const color = CATEGORY_COLORS[cat] || C.muted;
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{cat}</span>;
}

// ── Receipt Scanner modal ─────────────────────────────────────────────────────
function ReceiptScanModal({ properties, onComplete, onClose }: {
  properties: Property[];
  onComplete: (expense: Omit<Expense, "id">, items: ExpenseItem[]) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"upload"|"scanning"|"review"|"assign">("upload");
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [store, setStore] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImage(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const scan = async () => {
    if (!imageBase64) return;
    setStep("scanning");
    setScanError(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
              {
                type: "text",
                text: `You are a receipt data extraction expert for a home rehab/construction company. Analyze this receipt carefully.

Extract all data and return ONLY valid JSON with no markdown, no backticks, no explanation. Use this exact structure:
{
  "store": "exact store name (e.g. Home Depot, Menards, Lowes)",
  "date": "date as YYYY-MM-DD or original format",
  "notes": "any promo codes, loyalty numbers, or relevant info",
  "items": [
    {
      "name": "full item description",
      "sku": "SKU, UPC, item number, or barcode if visible (empty string if not found)",
      "qty": 1,
      "price": 0.00,
      "category": "one of: Materials, Tools, Flooring, Plumbing, Electrical, Paint, Hardware, Lumber, Appliances, Other",
      "tax_deductible": true or false
    }
  ]
}

Category rules: Tools = tax deductible (business equipment). Materials/Hardware/Lumber/Flooring/Paint = used in property, deductible as capital improvement. Appliances = usually deductible. Personal items = not deductible.

Tax deductible rules: If purchased for a rehab/rental property business, most items ARE tax deductible. Mark tax_deductible: true for anything that is clearly for construction, repair, or renovation. Mark false for food, personal items, or unclear items.

Return ONLY the JSON object.`
              }
            ]
          }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content[0].text.trim();
      const parsed = JSON.parse(text);
      setStore(parsed.store || "");
      setDate(parsed.date || today());
      setNotes(parsed.notes || "");
      setItems((parsed.items || []).map((item: ExpenseItem) => ({
        name: item.name || "",
        sku: item.sku || "",
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0,
        category: CATEGORIES.includes(item.category) ? item.category : "Other",
        tax_deductible: Boolean(item.tax_deductible),
      })));
      setStep("review");
    } catch (e: unknown) {
      setScanError("Could not read receipt: " + (e instanceof Error ? e.message : String(e)));
      setStep("upload");
    }
  };

  const addManualItem = () => {
    setItems([...items, { name: "", sku: "", qty: 1, price: 0, category: "Materials", tax_deductible: true }]);
  };

  const updateItem = (i: number, field: keyof ExpenseItem, value: string | number | boolean) => {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const total = items.reduce((s, item) => s + Number(item.price) * Number(item.qty), 0);
  const taxDeductibleTotal = items.filter(i => i.tax_deductible).reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);

  const complete = async () => {
    if (!propertyId) return;
    setSaving(true);
    await onComplete({ property_id: propertyId, store, date, notes, items });
    setSaving(false);
    onClose();
  };

  return (
    <Modal title={step === "upload" ? "Upload Receipt" : step === "scanning" ? "Scanning..." : step === "review" ? "Review Receipt" : "Assign to Property"} onClose={onClose}>

      {/* STEP 1: Upload */}
      {step === "upload" && (
        <div>
          {!image ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: C.surface, marginBottom: 20 }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>📷</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Upload Receipt Photo</div>
              <div style={{ color: C.muted, fontSize: 13 }}>JPG, PNG, or PDF &middot; tap to choose or take photo</div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <img src={image} alt="Receipt" style={{ width: "100%", maxHeight: 300, objectFit: "contain", background: "#000", borderRadius: 10, marginBottom: 12 }} />
              <button onClick={() => { setImage(null); setImageBase64(null); }} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer" }}>✕ Remove</button>
            </div>
          )}
          {scanError && <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {scanError}</div>}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.sub, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>OR ADD MANUALLY WITHOUT RECEIPT</div>
            <Btn v="ghost" onClick={() => setStep("review")} style={{ width: "100%", textAlign: "center" }}>Enter Manually</Btn>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
            {image && <Btn onClick={scan} style={{ flex: 1 }}>🔍 Scan with AI</Btn>}
          </div>
        </div>
      )}

      {/* STEP 2: Scanning */}
      {step === "scanning" && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Reading your receipt...</div>
          <div style={{ color: C.muted, fontSize: 14 }}>AI is extracting items, SKUs, and categories</div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === "review" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 2 }}><Field label="Store" placeholder="e.g. Home Depot" value={store} onChange={(e) => setStore(e.target.value)} /></div>
            <div style={{ flex: 1 }}><Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <Field label="Notes (optional)" placeholder="Receipt notes, promo codes..." value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Line Items</div>
          
          {items.map((item, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input placeholder="Item name" value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)}
                  style={{ flex: 3, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none" }} />
                <input placeholder="SKU/UPC" value={item.sku} onChange={(e) => updateItem(i, "sku", e.target.value)}
                  style={{ flex: 2, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: 12, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(i, "qty", parseFloat(e.target.value) || 1)}
                  style={{ width: 56, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 8px", color: C.text, fontSize: 13, outline: "none" }} />
                <input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                  style={{ width: 80, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 8px", color: C.text, fontSize: 13, outline: "none" }} />
                <select value={item.category} onChange={(e) => updateItem(i, "category", e.target.value)}
                  style={{ flex: 1, minWidth: 100, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 8px", color: C.text, fontSize: 12, outline: "none" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: item.tax_deductible ? C.green : C.muted, whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={item.tax_deductible} onChange={(e) => updateItem(i, "tax_deductible", e.target.checked)} style={{ accentColor: C.green }} />
                  Tax ded.
                </label>
                <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16, padding: 2 }}>✕</button>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
                Subtotal: <span style={{ color: C.text, fontWeight: 600 }}>{$$(Number(item.price) * Number(item.qty))}</span>
                {item.sku && <span style={{ marginLeft: 12, color: C.sub }}>SKU: {item.sku}</span>}
              </div>
            </div>
          ))}

          <button onClick={addManualItem} style={{ width: "100%", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 8, padding: "10px", color: C.muted, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
            + Add Item
          </button>

          {items.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub, marginBottom: 6 }}>
                <span>{items.length} items</span>
                <span>{$$(total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.green, marginBottom: 6 }}>
                <span>✓ Tax deductible</span>
                <span>{$$(taxDeductibleTotal)}</span>
              </div>
              {total - taxDeductibleTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted }}>
                  <span>Non-deductible</span>
                  <span>{$$(total - taxDeductibleTotal)}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Btn v="ghost" onClick={() => setStep("upload")}>Back</Btn>
            <Btn onClick={() => setStep("assign")} style={{ flex: 1 }} v={items.length ? "primary" : "ghost"}>
              Next: Assign to Property →
            </Btn>
          </div>
        </div>
      )}

      {/* STEP 4: Assign */}
      {step === "assign" && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{store || "No store"}</div>
            <div style={{ color: C.muted, fontSize: 13 }}>{date} &middot; {items.length} items &middot; <span style={{ color: C.green, fontWeight: 700 }}>{$$(total)}</span></div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" }}>Assign to Property</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {properties.map((p) => (
                <button key={p.id} onClick={() => setPropertyId(p.id)}
                  style={{ background: propertyId === p.id ? C.accentGlow : C.surface, border: `1px solid ${propertyId === p.id ? C.accent : C.border}`, borderRadius: 10, padding: "12px 16px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🏠</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{p.address}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{p.city}</div>
                  </div>
                  {propertyId === p.id && <span style={{ marginLeft: "auto", color: C.accentLight, fontSize: 18 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn v="ghost" onClick={() => setStep("review")}>Back</Btn>
            <Btn onClick={complete} style={{ flex: 1 }} v={propertyId ? "success" : "ghost"}>
              {saving ? "Saving..." : "✓ Complete"}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Expense Detail ─────────────────────────────────────────────────────────────
function ExpenseDetail({ expense, propertyName, onBack, onDelete }: {
  expense: Expense & { items: ExpenseItem[] };
  propertyName: string;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const total = expense.items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const deductible = expense.items.filter(i => i.tax_deductible).reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const byCategory = CATEGORIES.map(cat => {
    const catItems = expense.items.filter(i => i.category === cat);
    if (!catItems.length) return null;
    return { cat, items: catItems, total: catItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0) };
  }).filter(Boolean) as { cat: string; items: ExpenseItem[]; total: number }[];

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 24 }}>&#8592; Back to Expenses</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1, margin: 0 }}>{expense.store || "Manual Entry"}</h1>
          <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{expense.date} &middot; 🏠 {propertyName}</div>
          {expense.notes && <div style={{ color: C.sub, fontSize: 13, marginTop: 4, fontStyle: "italic" }}>{expense.notes}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{$$(total)}</div>
          <div style={{ fontSize: 13, color: C.green }}>✓ {$$(deductible)} deductible</div>
        </div>
      </div>

      {byCategory.map(({ cat, items, total: catTotal }) => (
        <div key={cat} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <CategoryPill cat={cat} />
            <span style={{ marginLeft: "auto", fontWeight: 700 }}>{$$(catTotal)}</span>
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                {item.sku && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>SKU: {item.sku}</div>}
                {item.tax_deductible && <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>✓ Tax deductible</div>}
              </div>
              <div style={{ textAlign: "right", minWidth: 80 }}>
                {Number(item.qty) > 1 && <div style={{ fontSize: 11, color: C.muted }}>×{item.qty}</div>}
                <div style={{ fontWeight: 700, fontSize: 14 }}>{$$(Number(item.price) * Number(item.qty))}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{$$(Number(item.price))} ea.</div>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}><span style={{ color: C.sub }}>{expense.items.length} items</span><span style={{ fontWeight: 700 }}>{$$(total)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.green }}><span>Tax deductible</span><span>{$$(deductible)}</span></div>
        {total - deductible > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginTop: 4 }}><span>Non-deductible</span><span>{$$(total - deductible)}</span></div>}
      </div>

      <button onClick={() => { if (confirm("Delete this expense? This cannot be undone.")) onDelete(expense.id); }}
        style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 18px", color: C.red, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        🗑️ Delete Expense
      </button>
    </div>
  );
}

// ── Main Expenses Tab ─────────────────────────────────────────────────────────
export default function ExpensesTab({ properties }: { properties: Property[] }) {
  const [expenses, setExpenses] = useState<(Expense & { items: ExpenseItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScan, setShowScan] = useState(false);
  const [selected, setSelected] = useState<(Expense & { items: ExpenseItem[] }) | null>(null);
  const [filterProperty, setFilterProperty] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: exps } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    const { data: eitems } = await supabase.from("expense_items").select("*");
    if (exps && eitems) {
      const withItems = exps.map((e: Expense) => ({
        ...e,
        items: eitems.filter((i: ExpenseItem & { expense_id: string }) => i.expense_id === e.id),
      }));
      setExpenses(withItems);
    }
    setLoading(false);
  };

  const saveExpense = async (data: Omit<Expense, "id">, items: ExpenseItem[]) => {
    const { data: exp } = await supabase.from("expenses").insert({
      property_id: data.property_id, store: data.store, date: data.date, notes: data.notes,
    }).select().single();
    if (exp) {
      const itemRows = items.map(item => ({ ...item, expense_id: exp.id }));
      const { data: savedItems } = await supabase.from("expense_items").insert(itemRows).select();
      setExpenses(prev => [{ ...exp, items: savedItems || [] }, ...prev]);
    }
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    setSelected(null);
  };

  const filtered = filterProperty === "all" ? expenses : expenses.filter(e => e.property_id === filterProperty);
  const totalSpent = filtered.reduce((s, e) => s + e.items.reduce((si, i) => si + Number(i.price) * Number(i.qty), 0), 0);
  const totalDeductible = filtered.reduce((s, e) => s + e.items.filter(i => i.tax_deductible).reduce((si, i) => si + Number(i.price) * Number(i.qty), 0), 0);

  const getPropertyName = (id: string | null) => properties.find(p => p.id === id)?.address || "Unassigned";

  if (selected) return (
    <ExpenseDetail
      expense={selected}
      propertyName={getPropertyName(selected.property_id)}
      onBack={() => setSelected(null)}
      onDelete={deleteExpense}
    />
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Expenses</h1>
          <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>Receipts, materials, and rehab costs</p>
        </div>
        <Btn onClick={() => setShowScan(true)}>+ Upload Receipt</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Total Spent</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.red }}>{$$(totalSpent)}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Tax Deductible</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{$$(totalDeductible)}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Receipts</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.accentLight }}>{filtered.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 20 }}>
        <select value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", color: C.text, fontSize: 14, outline: "none" }}>
          <option value="all">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      </div>

      {/* Expense list */}
      {loading && <div style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>Loading expenses...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((exp) => {
          const expTotal = exp.items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
          const expDeductible = exp.items.filter(i => i.tax_deductible).reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
          const cats = [...new Set(exp.items.map(i => i.category))];
          return (
            <div key={exp.id} onClick={() => setSelected(exp)}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent + "66")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accentGlow, border: `1px solid ${C.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧾</div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{exp.store || "Manual Entry"}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{exp.date} &middot; {getPropertyName(exp.property_id)} &middot; {exp.items.length} items</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {cats.slice(0, 4).map(cat => <CategoryPill key={cat} cat={cat} />)}
                    {cats.length > 4 && <span style={{ color: C.muted, fontSize: 11 }}>+{cats.length - 4} more</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{$$(expTotal)}</div>
                  <div style={{ fontSize: 12, color: C.green }}>✓ {$$(expDeductible)}</div>
                  <span style={{ color: C.accentLight, fontSize: 16 }}>›</span>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No expenses yet</div>
            <div style={{ fontSize: 14 }}>Upload a receipt to get started</div>
          </div>
        )}
      </div>

      {showScan && (
        <ReceiptScanModal
          properties={properties}
          onComplete={saveExpense}
          onClose={() => setShowScan(false)}
        />
      )}
    </div>
  );
}
