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
  yellow: "#f59e0b", yellowGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444", text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

interface Contractor { id: string; name: string; rate: number; }
interface TaxInfo { id?: string; worker_id: string; ssn_or_tin: string; address: string; legal_name: string; }
interface PayerInfo { business_name: string; business_address: string; business_ein: string; business_phone: string; }

export default function Form1099({ userId, taxYear, contractorPaidMap }: {
  userId: string; taxYear: number;
  contractorPaidMap: { id: string; name: string; paid: number }[];
}) {
  const [account, setAccount] = useState<{ id: string } | null>(null);
  const [payer, setPayer] = useState<PayerInfo>({ business_name: "", business_address: "", business_ein: "", business_phone: "" });
  const [taxInfoMap, setTaxInfoMap] = useState<Record<string, TaxInfo>>({});
  const [showPayerSetup, setShowPayerSetup] = useState(false);
  const [editingTaxFor, setEditingTaxFor] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState<TaxInfo>({ worker_id: "", ssn_or_tin: "", address: "", legal_name: "" });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Threshold is year-dependent: $600 for TY2025 and prior, $2,000 for TY2026+
  const threshold = taxYear >= 2026 ? 2000 : 600;
  const eligible = contractorPaidMap.filter(c => c.paid >= threshold);
  const belowThreshold = contractorPaidMap.filter(c => c.paid > 0 && c.paid < threshold);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data: acc } = await supabase.from("accounts").select("id,business_name,business_address,business_ein,business_phone").eq("user_id", userId).single();
    if (acc) {
      setAccount({ id: acc.id });
      setPayer({
        business_name: acc.business_name || "", business_address: acc.business_address || "",
        business_ein: acc.business_ein || "", business_phone: acc.business_phone || "",
      });
      const { data: tax } = await supabase.from("worker_tax_info").select("*").eq("account_id", acc.id);
      const map: Record<string, TaxInfo> = {};
      (tax || []).forEach((t: TaxInfo) => { map[t.worker_id] = t; });
      setTaxInfoMap(map);
    }
    setLoading(false);
  };

  const savePayer = async () => {
    await supabase.from("accounts").update({
      business_name: payer.business_name, business_address: payer.business_address,
      business_ein: payer.business_ein, business_phone: payer.business_phone,
    }).eq("user_id", userId);
    setShowPayerSetup(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveTaxInfo = async () => {
    if (!account || !editingTaxFor) return;
    const existing = taxInfoMap[editingTaxFor];
    if (existing?.id) {
      await supabase.from("worker_tax_info").update({
        ssn_or_tin: taxForm.ssn_or_tin, address: taxForm.address, legal_name: taxForm.legal_name,
      }).eq("id", existing.id);
    } else {
      await supabase.from("worker_tax_info").insert({
        worker_id: editingTaxFor, account_id: account.id,
        ssn_or_tin: taxForm.ssn_or_tin, address: taxForm.address, legal_name: taxForm.legal_name,
      });
    }
    setTaxInfoMap(prev => ({ ...prev, [editingTaxFor]: { ...taxForm, worker_id: editingTaxFor } }));
    setEditingTaxFor(null);
  };

  const maskTIN = (tin: string) => {
    if (!tin) return "Not provided";
    const clean = tin.replace(/\D/g, "");
    if (clean.length >= 4) return `XXX-XX-${clean.slice(-4)}`;
    return "•••";
  };

  const generate1099 = (c: { id: string; name: string; paid: number }) => {
    const tax = taxInfoMap[c.id];
    const recipientName = tax?.legal_name || c.name;
    const recipientAddr = tax?.address || "";
    const recipientTIN = tax?.ssn_or_tin || "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>1099-NEC ${recipientName} ${taxYear}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0.4in; color: #000; font-size: 9px; }
      .form { border: 2px solid #000; width: 100%; max-width: 7.5in; }
      .top-row { display: flex; border-bottom: 1px solid #000; }
      .cell { border-right: 1px solid #000; padding: 4px 6px; }
      .cell:last-child { border-right: none; }
      .label { font-size: 7px; color: #000; margin-bottom: 2px; }
      .value { font-size: 11px; font-weight: bold; min-height: 14px; }
      .void-copy { font-size: 7px; text-align: right; padding: 2px 6px; }
      .box1 { background: #f0f0f0; }
      .title-cell { width: 40%; }
      .amt-cell { width: 30%; text-align: right; }
      h1 { font-size: 14px; margin: 0 0 2px; }
      .omb { font-size: 7px; text-align: right; }
      .year-big { font-size: 20px; font-weight: bold; }
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div style="font-size:8px">Form <strong style="font-size:12px">1099-NEC</strong><br>(Rev. ${taxYear})</div>
      <div style="text-align:center"><div class="year-big">${taxYear}</div><div style="font-size:8px">Nonemployee Compensation</div></div>
      <div class="omb">OMB No. 1545-0116<br>Copy B<br>For Recipient</div>
    </div>
    <div class="form">
      <div class="top-row">
        <div class="cell" style="width:55%">
          <div class="label">PAYER'S name, street address, city, state, ZIP, and phone no.</div>
          <div class="value" style="font-size:10px">${payer.business_name}</div>
          <div style="font-size:9px">${payer.business_address}</div>
          <div style="font-size:9px">${payer.business_phone}</div>
        </div>
        <div style="width:45%">
          <div class="cell" style="border-right:none;border-bottom:1px solid #000">
            <div class="label">1 Nonemployee compensation</div>
            <div class="value box1" style="font-size:13px">${$$(c.paid)}</div>
          </div>
          <div class="cell" style="border-right:none">
            <div class="label">2 Payer made direct sales totaling $5,000 or more</div>
            <div class="value"></div>
          </div>
        </div>
      </div>
      <div class="top-row">
        <div class="cell" style="width:27.5%">
          <div class="label">PAYER'S TIN</div>
          <div class="value">${payer.business_ein}</div>
        </div>
        <div class="cell" style="width:27.5%">
          <div class="label">RECIPIENT'S TIN</div>
          <div class="value">${maskTIN(recipientTIN)}</div>
        </div>
        <div class="cell" style="width:45%">
          <div class="label">3 (reserved)</div>
          <div class="value"></div>
        </div>
      </div>
      <div class="top-row">
        <div class="cell" style="width:55%">
          <div class="label">RECIPIENT'S name</div>
          <div class="value" style="font-size:11px">${recipientName}</div>
        </div>
        <div class="cell" style="width:45%;border-right:none">
          <div class="label">4 Federal income tax withheld</div>
          <div class="value">$0.00</div>
        </div>
      </div>
      <div class="top-row">
        <div class="cell" style="width:55%">
          <div class="label">Street address (including apt. no.)</div>
          <div class="value" style="font-size:10px">${recipientAddr}</div>
        </div>
        <div style="width:45%">
          <div class="cell" style="border-right:none;border-bottom:1px solid #000">
            <div class="label">5 State tax withheld</div>
            <div class="value">$0.00</div>
          </div>
          <div class="cell" style="border-right:none;border-bottom:1px solid #000">
            <div class="label">6 State/Payer's state no.</div>
            <div class="value"></div>
          </div>
          <div class="cell" style="border-right:none">
            <div class="label">7 State income</div>
            <div class="value"></div>
          </div>
        </div>
      </div>
    </div>
    <div style="font-size:7px;margin-top:8px;color:#333">
      This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported.
    </div>
    <div style="font-size:7px;margin-top:12px;color:#999;border-top:1px solid #ccc;padding-top:6px">
      Generated by GetPaid · Not an official IRS form. Verify all figures before filing. Consult a tax professional. Official forms available at irs.gov/form1099nec
    </div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const payerComplete = payer.business_name && payer.business_address && payer.business_ein;

  if (loading) return <div style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>1099-NEC Forms</h1>
          <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>Tax year {taxYear} · {eligible.length} form{eligible.length !== 1 ? "s" : ""} to file</p>
        </div>
        <button onClick={() => setShowPayerSetup(true)}
          style={{ background: payerComplete ? C.surface : C.accent, border: `1px solid ${payerComplete ? C.border : C.accent}`, borderRadius: 10, padding: "10px 18px", color: payerComplete ? C.sub : "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {payerComplete ? "⚙️ Business Info" : "⚠️ Set Up Business Info"}
        </button>
      </div>

      {saved && <div style={{ background: C.greenGlow, border: `1px solid ${C.green}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.green }}>✓ Saved</div>}

      {!payerComplete && (
        <div style={{ background: C.yellowGlow, border: `1px solid ${C.yellow}44`, borderRadius: 12, padding: "16px 18px", marginBottom: 20, fontSize: 13, color: C.yellow }}>
          ⚠️ Set up your business info (payer details) before generating 1099 forms. Tap the button above.
        </div>
      )}

      <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: C.accentLight }}>
        💡 A 1099-NEC is required for each contractor paid <strong>{$$(threshold)} or more</strong> in {taxYear}. {taxYear >= 2026 ? "(New $2,000 threshold under the OBBBA, up from $600.)" : "($600 threshold for 2025 and earlier.)"} Amounts shown are what you&apos;ve marked as <strong>paid</strong> on their crew card.
      </div>

      {/* Eligible workers */}
      {eligible.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 0", color: C.muted }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No 1099s needed for {taxYear}</div>
          <div style={{ fontSize: 14 }}>No contractors paid {$$(threshold)}+ this year</div>
        </div>
      )}

      {eligible.map(c => {
        const tax = taxInfoMap[c.id];
        const hasTaxInfo = tax?.ssn_or_tin && tax?.address;
        return (
          <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{tax?.legal_name || c.name}</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>
                  {hasTaxInfo ? `TIN: ${maskTIN(tax.ssn_or_tin)}` : "⚠️ Tax info needed"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Box 1 · Nonemployee Comp</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: C.green }}>{$$(c.paid)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setEditingTaxFor(c.id); setTaxForm(tax || { worker_id: c.id, ssn_or_tin: "", address: "", legal_name: c.name }); }}
                style={{ flex: 1, background: hasTaxInfo ? C.surface : C.accentGlow, border: `1px solid ${hasTaxInfo ? C.border : C.accent}44`, borderRadius: 8, padding: "10px", color: hasTaxInfo ? C.sub : C.accentLight, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {hasTaxInfo ? "Edit Tax Info" : "+ Add Tax Info"}
              </button>
              <button onClick={() => generate1099(c)} disabled={!payerComplete || !hasTaxInfo}
                style={{ flex: 1, background: (!payerComplete || !hasTaxInfo) ? C.surface : C.accent, border: "none", borderRadius: 8, padding: "10px", color: (!payerComplete || !hasTaxInfo) ? C.muted : "#fff", fontSize: 13, fontWeight: 700, cursor: (!payerComplete || !hasTaxInfo) ? "not-allowed" : "pointer" }}>
                📄 Generate 1099-NEC
              </button>
            </div>
          </div>
        );
      })}

      {/* Below threshold info */}
      {belowThreshold.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Below {$$(threshold)} threshold (no 1099 required)</div>
          {belowThreshold.map(c => (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{c.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{$$(c.paid)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Payer setup modal */}
      {showPayerSetup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }} onClick={() => setShowPayerSetup(false)}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, marginTop: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Business Info (Payer)</div>
              <button onClick={() => setShowPayerSetup(false)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>This appears as the PAYER on every 1099-NEC form.</div>
            {[
              { key: "business_name", label: "Business / Legal Name", ph: "Bowser Contracting LLC" },
              { key: "business_address", label: "Address (street, city, state, ZIP)", ph: "123 Main St, City, ST 12345" },
              { key: "business_ein", label: "EIN / Tax ID", ph: "12-3456789" },
              { key: "business_phone", label: "Phone", ph: "(555) 123-4567" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>{f.label}</label>
                <input value={payer[f.key as keyof PayerInfo]} onChange={e => setPayer(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowPayerSetup(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 18px", color: C.muted, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={savePayer} style={{ flex: 1, background: C.accent, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Business Info</button>
            </div>
          </div>
        </div>
      )}

      {/* Tax info modal */}
      {editingTaxFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }} onClick={() => setEditingTaxFor(null)}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, marginTop: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Recipient Tax Info</div>
              <button onClick={() => setEditingTaxFor(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>From their W-9. Stored securely, shown masked.</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Legal Name (as on W-9)</label>
              <input value={taxForm.legal_name} onChange={e => setTaxForm(f => ({ ...f, legal_name: e.target.value }))}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>SSN or TIN</label>
              <input value={taxForm.ssn_or_tin} onChange={e => setTaxForm(f => ({ ...f, ssn_or_tin: e.target.value }))}
                placeholder="XXX-XX-XXXX"
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Address</label>
              <input value={taxForm.address} onChange={e => setTaxForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Street, city, state, ZIP"
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingTaxFor(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 18px", color: C.muted, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveTaxInfo} style={{ flex: 1, background: C.accent, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Tax Info</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
