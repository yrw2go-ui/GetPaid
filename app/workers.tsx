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
  red: "#ef4444", redGlow: "rgba(239,68,68,0.15)",
  text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const hrs = (h: number) => `${Number(h).toFixed(1)}h`;

interface Worker { id: string; name: string; email: string; rate: number; status: string; contractor_id?: string; }
interface Submission { id: string; worker_id: string; hours: number; date: string; note: string; status: string; property_id: string; manual_location?: string; }
interface Property { id: string; address: string; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, marginTop: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function WorkersTab({ userId, properties, contractors }: { userId: string; properties: Property[]; contractors: { id: string; name: string; rate: number }[] }) {
  const [account, setAccount] = useState<{ id: string; plan: string } | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [invites, setInvites] = useState<{ id: string; email: string; token: string; accepted: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteContractorId, setInviteContractorId] = useState("");
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [tab, setTab] = useState<"workers"|"approvals">("approvals");
  const [copiedToken, setCopiedToken] = useState("");
  const [approvalRates, setApprovalRates] = useState<Record<string, string>>({});
  const [activePunches, setActivePunches] = useState<{ id: string; worker_id: string; clock_in: string; property_id: string | null; manual_location: string }[]>([]);
  const [punchModal, setPunchModal] = useState<Worker | null>(null);
  const [adminPunchProp, setAdminPunchProp] = useState("");
  const [adminPunchManual, setAdminPunchManual] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data: acc } = await supabase.from("accounts").select("id,plan").eq("user_id", userId).single();
    if (!acc) { setLoading(false); return; }
    setAccount(acc);
    const [{ data: w }, { data: s }, { data: inv }, { data: punches }] = await Promise.all([
      supabase.from("workers").select("*").eq("account_id", acc.id),
      supabase.from("hour_submissions").select("*").eq("account_id", acc.id).eq("status", "pending").order("date", { ascending: false }),
      supabase.from("worker_invites").select("*").eq("account_id", acc.id).order("created_at", { ascending: false }),
      supabase.from("time_punches").select("*").eq("account_id", acc.id).is("clock_out", null),
    ]);
    setWorkers(w || []);
    setSubmissions(s || []);
    setInvites(inv || []);
    setActivePunches(punches || []);
    setLoading(false);
  };

  // Live tick for running timers
  useEffect(() => {
    if (!activePunches.length) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activePunches.length]);

  const elapsedFor = (clockIn: string) => {
    const secs = Math.max(0, Math.floor((nowTick - new Date(clockIn).getTime()) / 1000));
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  const adminClockIn = async () => {
    if (!punchModal || !account) return;
    if (!adminPunchProp && !adminPunchManual.trim()) { alert("Pick a job or type a location."); return; }
    const { data, error } = await supabase.from("time_punches").insert({
      account_id: account.id, worker_id: punchModal.id,
      contractor_id: punchModal.contractor_id || null,
      property_id: adminPunchProp || null,
      manual_location: adminPunchProp ? "" : adminPunchManual.trim(),
      clock_in: new Date().toISOString(), submitted: false,
    }).select().single();
    if (error) { alert("Error: " + error.message); return; }
    if (data) setActivePunches(prev => [...prev, data]);
    setPunchModal(null); setAdminPunchProp(""); setAdminPunchManual("");
  };

  const adminClockOut = async (punch: { id: string; worker_id: string; clock_in: string; property_id: string | null; manual_location: string }) => {
    if (!account) return;
    const w = workers.find(x => x.id === punch.worker_id);
    if (!w) return;
    const out = new Date();
    const inTime = new Date(punch.clock_in);
    const hours = Math.round(((out.getTime() - inTime.getTime()) / 3600000) * 100) / 100;
    if (hours <= 0) { alert("Shift too short to record."); return; }

    await supabase.from("time_punches").update({
      clock_out: out.toISOString(), submitted: true,
    }).eq("id", punch.id);

    const d = inTime;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

    await supabase.from("hour_submissions").insert({
      account_id: account.id, worker_id: punch.worker_id,
      property_id: punch.property_id,
      manual_location: punch.manual_location || "",
      hours, date: dateStr, note: "Clocked shift", status: "pending",
    });

    setActivePunches(prev => prev.filter(p => p.id !== punch.id));
    load();
  };

  const sendInvite = async () => {
    if (!inviteEmail || !account) return;
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data } = await supabase.from("worker_invites").insert({
      account_id: account.id, email: inviteEmail, token, accepted: false,
      contractor_id: inviteContractorId || null,
    }).select().single();
    if (data) {
      setInvites(prev => [data, ...prev]);
      setInviteEmail("");
      setInviteContractorId("");
      setShowInvite(false);
      // Copy invite link
      const link = `${window.location.origin}/worker?invite=${token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(""), 4000);
    }
  };

  const approveSubmission = async (sub: Submission) => {
    const worker = workers.find(w => w.id === sub.worker_id);
    if (!worker) return;
    const rate = parseFloat(approvalRates[sub.id] || "0");
    if (!rate || rate <= 0) { alert("Enter the pay rate for this job before approving."); return; }
    // Create actual log entry with the per-job rate as rate_override
    const noteWithLoc = sub.property_id
      ? sub.note
      : [sub.manual_location, sub.note].filter(Boolean).join(" — ");
    await supabase.from("logs").insert({
      contractor_id: worker.contractor_id || null, property_id: sub.property_id || null,
      hours: sub.hours, date: sub.date, note: noteWithLoc,
      paid: false, deductions: "[]", rate_override: rate,
      user_id: userId,
    });
    // Store the rate on the submission too so worker sees correct earnings
    await supabase.from("hour_submissions").update({ status: "approved", rate_override: rate }).eq("id", sub.id);
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
  };

  const rejectSubmission = async (id: string) => {
    await supabase.from("hour_submissions").update({ status: "rejected" }).eq("id", id);
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  const updateWorkerRate = async () => {
    if (!editWorker) return;
    await supabase.from("workers").update({ rate: editWorker.rate }).eq("id", editWorker.id);
    setWorkers(prev => prev.map(w => w.id === editWorker.id ? { ...w, rate: editWorker.rate } : w));
    setEditWorker(null);
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/worker?invite=${token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(""), 3000);
  };

  const getProperty = (id: string, manual?: string) => properties.find(p => p.id === id)?.address || manual || "Unknown";
  const getWorkerName = (id: string) => workers.find(w => w.id === id)?.name || "Unknown";

  if (loading) return <div style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Portal &amp; Approvals</h2>
          <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 13 }}>{workers.length} on portal · {submissions.length} pending approval</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ background: C.accent, border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Invite Worker
        </button>
      </div>

      {/* ON THE CLOCK */}
      {activePunches.length > 0 && (
        <div style={{ background: `linear-gradient(135deg, ${C.green}18, rgba(16,185,129,0.06))`, border: `1px solid ${C.green}44`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            🟢 On the Clock ({activePunches.length})
          </div>
          {activePunches.map(p => {
            const w = workers.find(x => x.id === p.worker_id);
            const loc = p.property_id
              ? (properties.find(pr => pr.id === p.property_id)?.address || "Job")
              : p.manual_location;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 0", borderTop: `1px solid ${C.border}44` }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{w?.name || "Worker"}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>📍 {loc}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, color: C.green, fontVariantNumeric: "tabular-nums" as const }}>{elapsedFor(p.clock_in)}</div>
                <button onClick={() => adminClockOut(p)}
                  style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "8px 14px", color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Clock Out
                </button>
              </div>
            );
          })}
        </div>
      )}

      {copiedToken && (
        <div style={{ background: C.greenGlow, border: `1px solid ${C.green}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: C.green }}>
          ✓ Invite link copied to clipboard! Share it with your worker.
        </div>
      )}

      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["approvals", `Pending Approvals (${submissions.length})`], ["workers", "Workers & Invites"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as "workers"|"approvals")}
            style={{ background: tab === id ? C.accentGlow : "transparent", border: `1px solid ${tab === id ? C.accent + "44" : C.border}`, borderRadius: 8, padding: "8px 16px", color: tab === id ? C.accentLight : C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* APPROVALS */}
      {tab === "approvals" && (
        <div>
          {submissions.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0", color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 600 }}>No pending submissions</div>
            </div>
          )}
          {submissions.map(s => (
            <div key={s.id} style={{ background: C.card, border: `1px solid ${C.yellow}44`, borderRadius: 12, padding: "16px 18px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getWorkerName(s.worker_id)}</div>
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{s.date} · {getProperty(s.property_id, s.manual_location)}</div>
                  {s.note && <div style={{ color: C.sub, fontSize: 12, fontStyle: "italic", marginTop: 3 }}>{s.note}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{hrs(Number(s.hours))}</div>
                  <div style={{ color: C.yellow, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Pending</div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase" }}>Pay Rate for This Job ($/hr)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="number" placeholder="e.g. 20.00 for painting, 12.00 for cleanup" value={approvalRates[s.id] || ""}
                    onChange={e => setApprovalRates(prev => ({ ...prev, [s.id]: e.target.value }))}
                    style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                  {approvalRates[s.id] && Number(approvalRates[s.id]) > 0 && (
                    <span style={{ fontSize: 13, color: C.green, fontWeight: 700, whiteSpace: "nowrap" }}>= {$$(Number(s.hours) * Number(approvalRates[s.id]))}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => approveSubmission(s)}
                  style={{ flex: 1, background: C.greenGlow, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "10px", color: C.green, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ✓ Approve
                </button>
                <button onClick={() => rejectSubmission(s.id)}
                  style={{ flex: 1, background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px", color: C.red, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WORKERS & INVITES */}
      {tab === "workers" && (
        <div>
          {workers.length === 0 && invites.filter(i => !i.accepted).length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0", color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No workers yet</div>
              <div style={{ fontSize: 14 }}>Invite workers to get started</div>
            </div>
          )}

          {workers.map(w => (
            <div key={w.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.accentGlow, border: `1px solid ${C.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.accentLight, fontSize: 14 }}>
                {w.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{w.email} · {$$(w.rate)}/hr</div>
                {w.contractor_id && <div style={{ fontSize: 11, color: C.accentLight, marginTop: 2 }}>🔗 Linked to {contractors.find(c => c.id === w.contractor_id)?.name || "crew member"}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!activePunches.some(p => p.worker_id === w.id) && (
                  <button onClick={() => { setPunchModal(w); setAdminPunchProp(""); setAdminPunchManual(""); }}
                    style={{ background: C.greenGlow, border: `1px solid ${C.green}44`, borderRadius: 8, padding: "6px 14px", color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Clock In
                  </button>
                )}
                <button onClick={() => setEditWorker({ ...w })}
                  style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "6px 14px", color: C.accentLight, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Edit Rate
                </button>
              </div>
            </div>
          ))}

          {invites.filter(i => !i.accepted).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Pending Invites</div>
              {invites.filter(i => !i.accepted).map(inv => (
                <div key={inv.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.email}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Code: {inv.token}</div>
                  </div>
                  <button onClick={() => copyInviteLink(inv.token)}
                    style={{ background: copiedToken === inv.token ? C.greenGlow : C.accentGlow, border: `1px solid ${copiedToken === inv.token ? C.green : C.accent}44`, borderRadius: 8, padding: "6px 12px", color: copiedToken === inv.token ? C.green : C.accentLight, fontSize: 12, cursor: "pointer" }}>
                    {copiedToken === inv.token ? "✓ Copied" : "Copy Link"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <Modal title="Invite Worker" onClose={() => setShowInvite(false)}>
          <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.accentLight }}>
            💡 We&apos;ll generate an invite link you can share with your worker. They&apos;ll use it to sign up for the worker portal at <strong>{typeof window !== "undefined" ? window.location.origin : ""}/worker</strong>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Link to Existing Crew Member</label>
            <select value={inviteContractorId} onChange={e => setInviteContractorId(e.target.value)}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none" }}>
              <option value="">New worker (not linked)</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Their portal hours will flow into this crew member&apos;s card.</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Worker&apos;s Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="worker@example.com" onKeyDown={e => e.key === "Enter" && sendInvite()}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowInvite(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 18px", color: C.muted, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button onClick={sendInvite} style={{ flex: 1, background: C.accent, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Generate & Copy Invite Link</button>
          </div>
        </Modal>
      )}

      {/* Edit worker rate modal */}
      {editWorker && (
        <Modal title={`Edit Rate — ${editWorker.name}`} onClose={() => setEditWorker(null)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Hourly Rate ($)</label>
            <input type="number" value={editWorker.rate} onChange={e => setEditWorker(w => w ? { ...w, rate: parseFloat(e.target.value) || 0 } : null)}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEditWorker(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 18px", color: C.muted, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button onClick={updateWorkerRate} style={{ flex: 1, background: C.accent, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Rate</button>
          </div>
        </Modal>
      )}
      {punchModal && (
        <Modal title={`Clock In — ${punchModal.name}`} onClose={() => setPunchModal(null)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" as const }}>Pick a Job</label>
            <select value={adminPunchProp} onChange={e => { setAdminPunchProp(e.target.value); if (e.target.value) setAdminPunchManual(""); }}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none" }}>
              <option value="">Select a job...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>
          <div style={{ textAlign: "center", color: C.muted, fontSize: 12, marginBottom: 16 }}>— or —</div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" as const }}>Type a Location</label>
            <input value={adminPunchManual} onChange={e => { setAdminPunchManual(e.target.value); if (e.target.value) setAdminPunchProp(""); }}
              placeholder="e.g. 412 Oak St"
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setPunchModal(null)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 18px", color: C.muted, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button onClick={adminClockIn} disabled={!adminPunchProp && !adminPunchManual.trim()}
              style={{ flex: 1, background: (!adminPunchProp && !adminPunchManual.trim()) ? C.surface : C.green, border: "none", borderRadius: 8, padding: "10px", color: (!adminPunchProp && !adminPunchManual.trim()) ? C.muted : "#fff", fontSize: 14, fontWeight: 700, cursor: (!adminPunchProp && !adminPunchManual.trim()) ? "not-allowed" : "pointer" }}>
              Clock In
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
