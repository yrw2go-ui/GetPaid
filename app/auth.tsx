"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://rytoiilokjxelabqaljq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dG9paWxva2p4ZWxhYnFhbGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg2MTQsImV4cCI6MjA5NzEwNDYxNH0.LbJz7YLWi_kX6Gw93lvayPKcaXkGiPUusQ3d-zPQ8Kk"
);

const C = {
  bg: "#0a0a0f", card: "#1a1a24", border: "#2a2a3a",
  accent: "#7c3aed", accentLight: "#a78bfa", accentGlow: "rgba(124,58,237,0.15)",
  green: "#10b981", red: "#ef4444",
  text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const PLANS = [
  { id: "solo", name: "Solo", price: "$12.99/mo", desc: "Just you — invoices, expenses, scope, receipt scanning", workers: 0 },
  { id: "crew", name: "Crew", price: "$29.99/mo", desc: "Up to 10 workers, worker portal, pay stubs, 1099-NEC", workers: 10 },
  { id: "pro", name: "Pro", price: "$64.99/mo", desc: "Up to 20 workers + everything", workers: 20 },
];

export default function AuthPage({ onAuth }: { onAuth: (user: { id: string; email: string }) => void }) {
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [plan, setPlan] = useState("solo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");

  const inp = (field: string) => ({
    background: "#13131a",
    border: `1px solid ${focused === field ? C.accent : C.border}`,
    borderRadius: 10, padding: "12px 16px", color: C.text,
    fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" as const,
  });

  const handleAuth = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.user) onAuth({ id: data.user.id, email: data.user.email || "" });
      } else {
        if (!businessName) { setError("Business name required"); setLoading(false); return; }
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user) {
          await supabase.from("accounts").insert({
            user_id: data.user.id, email, business_name: businessName, plan, scan_count: 0,
          });
          onAuth({ id: data.user.id, email: data.user.email || "" });
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${C.accent}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px" }}>💸</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, margin: 0 }}>GetPaid</h1>
          <p style={{ color: C.muted, margin: "8px 0 0", fontSize: 15 }}>Contractor payroll & job management</p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: "#13131a", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: mode === m ? C.accent : "transparent", color: mode === m ? "#fff" : C.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Plan selector (signup only) */}
          {mode === "signup" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: 0.8, textTransform: "uppercase" }}>Choose Your Plan</label>
              {PLANS.map(p => (
                <div key={p.id} onClick={() => setPlan(p.id)}
                  style={{ background: plan === p.id ? C.accentGlow : "#13131a", border: `1px solid ${plan === p.id ? C.accent : C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: plan === p.id ? C.accentLight : C.text }}>{p.price}</div>
                  </div>
                  {plan === p.id && <div style={{ color: C.accentLight, fontSize: 18 }}>✓</div>}
                </div>
              ))}
            </div>
          )}

          {/* Fields */}
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Business Name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Bowser Contracting" onFocus={() => setFocused("biz")} onBlur={() => setFocused("")}
                style={inp("biz")} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
              style={inp("email")} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" onFocus={() => setFocused("pw")} onBlur={() => setFocused("")}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              style={inp("pw")} />
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.red }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleAuth} disabled={loading}
            style={{ width: "100%", background: loading ? "#2a2a3a" : `linear-gradient(135deg, ${C.accent}, #a78bfa)`, border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", letterSpacing: -0.3 }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {mode === "signup" && (
            <p style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
              By signing up you agree to our terms. Plans are billed monthly. Cancel anytime.
            </p>
          )}
        </div>

        <p style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 20 }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: C.accentLight, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
