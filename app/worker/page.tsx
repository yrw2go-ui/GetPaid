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
  yellow: "#f59e0b", red: "#ef4444", redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const hrs = (h: number) => `${Number(h).toFixed(1)}h`;
const today = () => new Date().toISOString().split("T")[0];
const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; };

interface Worker { id: string; name: string; email: string; rate: number; account_id: string; }
interface Property { id: string; address: string; city: string; }
interface Submission { id: string; hours: number; date: string; note: string; status: string; property_id: string; rate_override: number | null; }

function AuthScreen({ onAuth }: { onAuth: (u: { id: string; email: string }) => void }) {
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("invite") || "" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inp = { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box" as const };

  const handle = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.user) onAuth({ id: data.user.id, email: data.user.email || "" });
      } else {
        if (!name) { setError("Your name is required"); setLoading(false); return; }
        if (!token) { setError("You need an invite code to sign up"); setLoading(false); return; }
        const { data: invite } = await supabase.from("worker_invites").select("*").eq("token", token).eq("accepted", false).single();
        if (!invite) { setError("Invalid or expired invite code"); setLoading(false); return; }
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user) {
          await supabase.from("workers").insert({
            account_id: invite.account_id, user_id: data.user.id, name, email,
            rate: 0, status: "active", contractor_id: invite.contractor_id || null,
          });
          await supabase.from("worker_invites").update({ accepted: true }).eq("id", invite.id);
          onAuth({ id: data.user.id, email: data.user.email || "" });
        }
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter',-apple-system,sans-serif", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💸</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, margin: 0 }}>Get<span style={{ color: "#f97316" }}>Paid</span></h1>
          <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>Worker Portal</p>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
          <div style={{ display: "flex", background: C.surface, borderRadius: 10, padding: 4, marginBottom: 22 }}>
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "9px", borderRadius: 7, border: "none", background: mode === m ? C.accent : "transparent", color: mode === m ? "#fff" : C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          {mode === "signup" && <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="First Last" style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Invite Code</label>
              <input value={token} onChange={e => setToken(e.target.value)} placeholder="From your invite link" style={inp} />
            </div>
          </>}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} style={inp} />
          </div>
          {error && <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.red }}>⚠️ {error}</div>}
          <button onClick={handle} disabled={loading}
            style={{ width: "100%", background: loading ? C.border : C.accent, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkerPortal() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tab, setTab] = useState("hours");
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({ propertyId: "", hours: "", date: today(), note: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email || "" });
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email || "" });
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) loadData(); }, [user]);

  const completeWorkerSetup = async () => {
    if (!user) return;
    const token = new URLSearchParams(window.location.search).get("invite") || "";
    if (!token) { alert("No invite code in the link. Ask your employer for a fresh invite link."); return; }
    const { data: invite } = await supabase.from("worker_invites").select("*").eq("token", token).single();
    if (!invite) { alert("Invalid or expired invite code."); return; }
    const name = prompt("Enter your full name:") || user.email;
    await supabase.from("workers").insert({
      account_id: invite.account_id, user_id: user.id, name, email: user.email,
      rate: 0, status: "active", contractor_id: invite.contractor_id || null,
    });
    await supabase.from("worker_invites").update({ accepted: true }).eq("id", invite.id);
    loadData();
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: w } = await supabase.from("workers").select("*").eq("user_id", user.id).single();
    if (!w) { setLoading(false); return; }
    setWorker(w);
    const [{ data: props }, { data: subs }] = await Promise.all([
      supabase.from("properties").select("id,address,city").eq("account_id", w.account_id),
      supabase.from("hour_submissions").select("*").eq("worker_id", w.id).order("date", { ascending: false }),
    ]);
    setProperties(props || []);
    setSubmissions(subs || []);
    setLoading(false);
  };

  const submitHours = async () => {
    if (!worker || !logForm.propertyId || !logForm.hours || !logForm.date) return;
    const { data } = await supabase.from("hour_submissions").insert({
      worker_id: worker.id, account_id: worker.account_id,
      property_id: logForm.propertyId, hours: parseFloat(logForm.hours),
      date: logForm.date, note: logForm.note, status: "pending",
    }).select().single();
    if (data) setSubmissions(prev => [data, ...prev]);
    setLogForm({ propertyId: "", hours: "", date: today(), note: "" });
    setShowLog(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setWorker(null); };

  const approvedSubs = submissions.filter(s => s.status === "approved");
  const pendingSubs = submissions.filter(s => s.status === "pending");
  const weekSubs = approvedSubs.filter(s => s.date >= weekStart());
  const totalHours = approvedSubs.reduce((s, sub) => s + Number(sub.hours), 0);
  const weekHours = weekSubs.reduce((s, sub) => s + Number(sub.hours), 0);
  const totalEarned = approvedSubs.reduce((s, sub) => s + Number(sub.hours) * (Number(sub.rate_override) || worker?.rate || 0), 0);
  const weekEarned = weekSubs.reduce((s, sub) => s + Number(sub.hours) * (Number(sub.rate_override) || worker?.rate || 0), 0);
  const getProperty = (id: string) => properties.find(p => p.id === id)?.address || "Unknown";

  const printPayStub = () => {
    const fmt = (n: number) => $$(n);
    const rows = approvedSubs.map(s => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${s.date}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${getProperty(s.property_id)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${Number(s.hours).toFixed(1)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(Number(s.rate_override)||worker?.rate||0)}/hr</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(Number(s.hours)*(Number(s.rate_override)||worker?.rate||0))}</td></tr>`).join("");
    const win = window.open("","_blank");
    if (win) { win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:0.5in;color:#000}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 10px;border-bottom:2px solid #000;font-size:12px}@page{margin:0.5in;size:8.5in 11in}</style></head><body><div style="display:flex;justify-content:space-between;margin-bottom:24px"><div><h2 style="margin:0">Pay Statement</h2><div style="color:#666;font-size:13px">As of ${today()}</div></div><div style="text-align:right"><div style="font-size:22px;font-weight:700">${fmt(totalEarned)}</div><div style="color:#666;font-size:12px">Total Earned</div></div></div><div style="margin-bottom:20px;font-size:14px"><strong>Worker:</strong> ${worker?.name}<br><strong>Rate:</strong> Varies by job</div><table><thead><tr><th>Date</th><th>Property</th><th style="text-align:right">Hours</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="padding:10px;font-weight:700">Total</td><td style="padding:10px;font-weight:700;text-align:right">${fmt(totalEarned)}</td></tr></tfoot></table><script>window.onload=()=>window.print()<\/script></body></html>`); win.document.close(); }
  };

  if (!authChecked) return <div style={{ minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif" }}><div style={{fontSize:40}}>💸</div></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;
  if (loading) return <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:C.text }}><div style={{fontSize:40}}>💸</div><div style={{color:C.muted,fontSize:14}}>Loading your portal...</div></div>;
  if (!worker) {
    const hasInvite = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("invite");
    return (
    <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'Inter',sans-serif",color:C.text,display:"flex",alignItems:"center",justifyContent:"center",padding:24,flexDirection:"column",gap:16,textAlign:"center" }}>
      <div style={{fontSize:40}}>{hasInvite ? "🎉" : "⚠️"}</div>
      <div style={{fontWeight:700,fontSize:18}}>{hasInvite ? "Finish setting up your account" : "No worker account found"}</div>
      <div style={{color:C.muted,fontSize:14,maxWidth:320}}>{hasInvite ? "You&apos;re logged in but haven&apos;t linked to your employer yet. Tap below to finish." : "You need an invite link from your employer to access this portal."}</div>
      {hasInvite && (
        <button onClick={completeWorkerSetup} style={{background:C.accent,border:"none",borderRadius:10,padding:"12px 24px",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>Complete Setup</button>
      )}
      <button onClick={signOut} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 20px",color:C.muted,fontSize:14,cursor:"pointer"}}>Sign Out</button>
    </div>
  );
  }

  return (
    <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'Inter',-apple-system,sans-serif",color:C.text }}>
      <div style={{ background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 20px",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ display:"flex",alignItems:"center",height:56,gap:12 }}>
          <div style={{fontSize:20}}>💸</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14}}>{worker.name}</div>
            <div style={{color:C.muted,fontSize:11}}>Worker Portal · Rate set per job</div>
          </div>
          <button onClick={signOut} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer"}}>Sign Out</button>
        </div>
        <div style={{ display:"flex",gap:4,paddingBottom:8,overflowX:"auto",scrollbarWidth:"none" as const }}>
          {[{id:"hours",label:"My Hours"},{id:"earnings",label:"Earnings"},{id:"paystub",label:"Pay Stub"}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background:tab===t.id?C.accentGlow:"transparent",border:tab===t.id?`1px solid ${C.accent}44`:"1px solid transparent",borderRadius:8,padding:"6px 14px",color:tab===t.id?C.accentLight:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:600,margin:"0 auto",padding:"24px 20px" }}>
        {tab === "hours" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <div>
                <h1 style={{fontSize:22,fontWeight:800,letterSpacing:-0.5,margin:0}}>My Hours</h1>
                <p style={{color:C.muted,margin:"4px 0 0",fontSize:13}}>{pendingSubs.length > 0 ? `${pendingSubs.length} pending approval` : "All caught up"}</p>
              </div>
              <button onClick={() => setShowLog(true)} style={{background:C.accent,border:"none",borderRadius:10,padding:"10px 18px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>+ Log Hours</button>
            </div>
            <div style={{ display:"flex",gap:12,marginBottom:24,flexWrap:"wrap" }}>
              {[{label:"This Week",value:hrs(weekHours),color:C.accentLight},{label:"Total Hours",value:hrs(totalHours),color:C.yellow},{label:"Pending",value:String(pendingSubs.length),color:C.muted}].map(({label,value,color}) => (
                <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px",flex:1,minWidth:90}}>
                  <div style={{color,fontSize:20,fontWeight:800}}>{value}</div>
                  <div style={{color:C.muted,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            {submissions.length === 0 && <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}><div style={{fontSize:36,marginBottom:10}}>🕐</div><div style={{fontWeight:600}}>No hours logged yet</div></div>}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {submissions.map(s => (
                <div key={s.id} style={{background:C.card,border:`1px solid ${s.status==="approved"?C.green+"44":s.status==="rejected"?C.red+"44":C.border}`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{s.date}</div>
                    <div style={{color:C.muted,fontSize:12,marginTop:2}}>{getProperty(s.property_id)}</div>
                    {s.note && <div style={{color:C.sub,fontSize:12,fontStyle:"italic",marginTop:2}}>{s.note}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:14}}>{hrs(Number(s.hours))}</div>
                    <div style={{fontSize:11,marginTop:3,fontWeight:700,color:s.status==="approved"?C.green:s.status==="rejected"?C.red:C.yellow,textTransform:"uppercase"}}>{s.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "earnings" && (
          <div>
            <h1 style={{fontSize:22,fontWeight:800,letterSpacing:-0.5,marginBottom:20}}>Earnings</h1>
            <div style={{background:`linear-gradient(135deg,${C.green}22,${C.greenGlow})`,border:`1px solid ${C.green}44`,borderRadius:14,padding:"20px 24px",marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Total Earned (approved)</div>
              <div style={{fontSize:32,fontWeight:800,letterSpacing:-1}}>{$$(totalEarned)}</div>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:20}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px",flex:1}}>
                <div style={{color:C.accentLight,fontSize:18,fontWeight:800}}>{$$(weekEarned)}</div>
                <div style={{color:C.muted,fontSize:11,fontWeight:700,textTransform:"uppercase",marginTop:3}}>This Week</div>
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px",flex:1}}>
                <div style={{color:C.yellow,fontSize:18,fontWeight:800}}>Per Job</div>
                <div style={{color:C.muted,fontSize:11,fontWeight:700,textTransform:"uppercase",marginTop:3}}>Rate Varies</div>
              </div>
            </div>
            {approvedSubs.map(s => (
              <div key={s.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{s.date} · {getProperty(s.property_id)}</div>
                  <div style={{color:C.muted,fontSize:12,marginTop:2}}>{hrs(Number(s.hours))} × {$$(Number(s.rate_override)||worker.rate)}/hr</div>
                </div>
                <div style={{fontWeight:700,fontSize:14,color:C.green}}>{$$(Number(s.hours)*(Number(s.rate_override)||worker.rate))}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "paystub" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h1 style={{fontSize:22,fontWeight:800,letterSpacing:-0.5,margin:0}}>Pay Stub</h1>
              <button onClick={printPayStub} style={{background:C.accent,border:"none",borderRadius:10,padding:"10px 18px",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>📄 Download PDF</button>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
                <div><div style={{fontWeight:800,fontSize:16}}>{worker.name}</div><div style={{color:C.muted,fontSize:13}}>{worker.email}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:800,color:C.green}}>{$$(totalEarned)}</div><div style={{color:C.muted,fontSize:12}}>Total Earned</div></div>
              </div>
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
                {[["Total Hours",hrs(totalHours)],["Approved Entries",String(approvedSubs.length)],["Pending Entries",String(pendingSubs.length)]].map(([label,value],i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:13}}>
                    <span style={{color:i===3?C.yellow:C.muted}}>{label}</span>
                    <span style={{color:i===3?C.yellow:C.text}}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showLog && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:16,overflowY:"auto"}} onClick={() => setShowLog(false)}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:24,width:"100%",maxWidth:480,marginTop:20}} onClick={e => e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:16}}>Log Hours</div>
              <button onClick={() => setShowLog(false)} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",color:C.sub,fontSize:11,fontWeight:700,marginBottom:5,letterSpacing:0.8,textTransform:"uppercase"}}>Property</label>
              <select value={logForm.propertyId} onChange={e => setLogForm(f => ({...f,propertyId:e.target.value}))}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none"}}>
                <option value="">Select property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:14}}>
              <div style={{flex:1}}>
                <label style={{display:"block",color:C.sub,fontSize:11,fontWeight:700,marginBottom:5,letterSpacing:0.8,textTransform:"uppercase"}}>Hours</label>
                <input type="number" placeholder="8.0" value={logForm.hours} onChange={e => setLogForm(f => ({...f,hours:e.target.value}))}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box" as const}} />
              </div>
              <div style={{flex:1}}>
                <label style={{display:"block",color:C.sub,fontSize:11,fontWeight:700,marginBottom:5,letterSpacing:0.8,textTransform:"uppercase"}}>Date</label>
                <input type="date" value={logForm.date} onChange={e => setLogForm(f => ({...f,date:e.target.value}))}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box" as const}} />
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:C.sub,fontSize:11,fontWeight:700,marginBottom:5,letterSpacing:0.8,textTransform:"uppercase"}}>Note (optional)</label>
              <input placeholder="What did you work on?" value={logForm.note} onChange={e => setLogForm(f => ({...f,note:e.target.value}))}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box" as const}} />
            </div>
            <div style={{background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#f59e0b"}}>
              ⏳ Hours will be submitted for your employer&apos;s approval before being counted.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={() => setShowLog(false)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 18px",color:C.muted,fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={submitHours} style={{flex:1,background:C.accent,border:"none",borderRadius:8,padding:"10px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Submit Hours</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
