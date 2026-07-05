"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rytoiilokjxelabqaljq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dG9paWxva2p4ZWxhYnFhbGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg2MTQsImV4cCI6MjA5NzEwNDYxNH0.LbJz7YLWi_kX6Gw93lvayPKcaXkGiPUusQ3d-zPQ8Kk"
);

const C = {
  bg: "#0a0a0f", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#f97316", accentLight: "#fb923c", accentGlow: "rgba(249,115,22,0.15)",
  green: "#10b981", greenGlow: "rgba(16,185,129,0.15)",
  yellow: "#f59e0b",
  red: "#ef4444",
  text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const CATEGORY_COLORS: Record<string, string> = {
  Materials: "#f97316", Tools: "#f59e0b", Flooring: "#10b981",
  Plumbing: "#06b6d4", Electrical: "#f97316", Paint: "#ec4899",
  Hardware: "#8b5cf6", Lumber: "#84cc16", Appliances: "#14b8a6", Other: "#6b7280",
};

interface ExpenseItem {
  id: string; expense_id: string; name: string; sku: string;
  qty: number; price: number; category: string; tax_deductible: boolean;
}
interface Expense {
  id: string; property_id: string | null; store: string; date: string; notes: string;
}
interface Property { id: string; address: string; city: string; }

export default function TaxTab({ properties }: { properties: Property[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: exps }, { data: eitems }] = await Promise.all([
      supabase.from("expenses").select("*"),
      supabase.from("expense_items").select("*").eq("tax_deductible", true),
    ]);
    setExpenses(exps || []);
    setItems(eitems || []);
    setLoading(false);
  };

  const getProperty = (id: string | null) => id ? properties.find(p => p.id === id) : null;

  // Filter to selected year and deductible items only
  const yearExpenses = expenses.filter(e => e.date && new Date(e.date).getFullYear() === year);
  const yearExpenseIds = new Set(yearExpenses.map(e => e.id));
  const deductibleItems = items.filter(i => yearExpenseIds.has(i.expense_id));

  // Group by category
  const byCategory = deductibleItems.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ExpenseItem[]>);

  const grandTotal = deductibleItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const categoryTotals = Object.entries(byCategory).map(([cat, catItems]) => ({
    cat,
    total: catItems.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0),
    items: catItems,
  })).sort((a, b) => b.total - a.total);

  const buildTaxHTML = () => {
    const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

    const categoryRows = categoryTotals.map(({ cat, total, items: catItems }) => `
      <tr style="background:#f3f4f6">
        <td colspan="4" style="padding:8px 10px;font-weight:700;font-size:13px;border-top:2px solid #000">${cat}</td>
        <td style="padding:8px 10px;font-weight:700;text-align:right;border-top:2px solid #000">${fmt(total)}</td>
      </tr>
      ${catItems.map(item => {
        const exp = expenses.find(e => e.id === item.expense_id);
        const prop = exp ? getProperty(exp?.property_id) : null;
        return `<tr>
          <td style="padding:5px 10px 5px 20px;font-size:12px">${item.name}</td>
          <td style="padding:5px 10px;font-size:11px;color:#666">${item.sku || "—"}</td>
          <td style="padding:5px 10px;font-size:12px">${exp?.store || "—"}</td>
          <td style="padding:5px 10px;font-size:12px;color:#666">${prop ? prop.address : (exp?.date || "—")}</td>
          <td style="padding:5px 10px;font-size:12px;text-align:right">${fmt(Number(item.price) * Number(item.qty))}</td>
        </tr>`;
      }).join("")}
    `).join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 0.5in; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #000; font-size: 12px; }
        @page { margin: 0.5in; size: 8.5in 11in; }
      </style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          <h1 style="font-size:22px;margin:0 0 4px">Tax Deductible Expenses</h1>
          <div style="color:#666;font-size:13px">Tax Year ${year}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:24px;font-weight:700">${fmt(grandTotal)}</div>
          <div style="color:#666;font-size:12px">Total Deductible</div>
        </div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#166534">
        ✓ ${deductibleItems.length} deductible items across ${categoryTotals.length} categories
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:35%">Item Description</th>
            <th style="width:15%">SKU / UPC</th>
            <th style="width:15%">Store</th>
            <th style="width:20%">Property / Date</th>
            <th style="width:15%;text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
          <tr style="border-top:3px solid #000">
            <td colspan="4" style="padding:10px;font-weight:700;font-size:14px">TOTAL TAX DEDUCTIBLE</td>
            <td style="padding:10px;font-weight:700;font-size:14px;text-align:right">${fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:30px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:10px">
        Generated by GetPaid · ${new Date().toLocaleDateString()} · Items marked as tax deductible at time of entry
      </div>
      <script>window.onload = () => window.print();<\/script>
    </body></html>`;
  };

  const downloadPDF = () => {
    const win = window.open("", "_blank");
    if (win) { win.document.write(buildTaxHTML()); win.document.close(); }
  };

  const sharePDF = async () => {
    setSharing(true);
    // Open print window — user can save as PDF then share from files
    downloadPDF();
    setSharing(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Tax Summary</h1>
          <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>Deductible expenses for your accountant</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setYear(y => y - 1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 14, cursor: "pointer" }}>&#8249;</button>
          <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "8px 18px", color: C.accentLight, fontWeight: 800, fontSize: 16, minWidth: 60, textAlign: "center" }}>{year}</div>
          <button onClick={() => setYear(y => y + 1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 14, cursor: "pointer" }}>&#8250;</button>
        </div>
      </div>

      {/* Grand total banner */}
      <div style={{ background: `linear-gradient(135deg, ${C.green}22, ${C.greenGlow})`, border: `1px solid ${C.green}44`, borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Total Tax Deductible {year}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: -1 }}>{$$(grandTotal)}</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{deductibleItems.length} items · {categoryTotals.length} categories</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={downloadPDF} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 18px", color: C.sub, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>📄 Download PDF</button>
          <button onClick={sharePDF} disabled={sharing} style={{ background: C.green, border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: sharing ? 0.7 : 1 }}>
            {sharing ? "Preparing..." : "📤 Share with Accountant"}
          </button>
        </div>
      </div>

      {loading && <div style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>Loading...</div>}

      {!loading && deductibleItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No deductible items for {year}</div>
          <div style={{ fontSize: 14 }}>Upload receipts in the Expenses tab and mark items as tax deductible</div>
        </div>
      )}

      {/* By category */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {categoryTotals.map(({ cat, total, items: catItems }) => {
          const color = CATEGORY_COLORS[cat] || C.muted;
          return (
            <div key={cat} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 12px", fontSize: 12, fontWeight: 700 }}>{cat}</span>
                <span style={{ flex: 1, color: C.muted, fontSize: 13 }}>{catItems.length} items</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.green }}>{$$(total)}</span>
              </div>
              {catItems.map((item) => {
                const exp = expenses.find(e => e.id === item.expense_id);
                const prop = exp ? getProperty(exp?.property_id) : null;
                return (
                  <div key={item.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}22`, display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
                        {item.sku && <span style={{ fontSize: 11, color: C.muted }}>SKU: {item.sku}</span>}
                        {exp?.store && <span style={{ fontSize: 11, color: C.muted }}>{exp.store}</span>}
                        {exp?.date && <span style={{ fontSize: 11, color: C.muted }}>{exp.date}</span>}
                        {prop && <span style={{ fontSize: 11, color: C.accentLight }}>🏠 {prop.address}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {Number(item.qty) > 1 && <div style={{ fontSize: 11, color: C.muted }}>×{item.qty}</div>}
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.green }}>{$$(Number(item.price) * Number(item.qty))}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
