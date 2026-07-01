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
  text: "#f1f1f3", muted: "#9ca3af", sub: "#d1d5db",
};

const $$ = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const hrs = (h: number) => `${Number(h).toFixed(1)}h`;

interface Worker { id: string; name: string; email: string; rate: number; status: string; }
interface Submission { id: string; worker_id: string; hours: number; date: string; note: string; status: string; property_id: string; }
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

export default function WorkersTab({ userId, properties }: { userId: string; properties: Property[] }) {
  const [account, setAccount] = useState<{ id: string; plan: string } | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [invites, setInvites] = useState<{ id: string; email: string; token: string; accepted: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [tab, setTab] = useState<"workers"|"approvals">("approvals");
  const [copiedToken, setCopiedToken] = useState("");

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data: acc } = await supabase.from("accounts").select("id,plan").eq("user_id", userId).single();
    if (!acc) { setLoading(false); return; }
    setAccount(acc);
    const [{ data: w }, { data: s }, { data: inv }] = await Promise.all([
      supabase.from("workers").select("*").eq("account_id", acc.id),
      supabase.from("hour_submissions").select("*").eq("account_id", acc.id).eq("status", "pending").order("date", { ascending: false }),
      supabase.from("worker_invites").select("*").eq("account_id", acc.id).order("created_at", { ascending: false }),
    ]);
    setWorkers(w || []);
    setSubmissions(s || []);
    setInvites(inv || []);
    setLoading(false);
  };

  const sendInvite = async () => {
    if (!inviteEmail || !account) return;
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data } = await supabase.from("worker_invites").insert({
      account_id: account.id, email: inviteEmail, token, accepted: false,
    }).select().single();
    if (data) {
      setInvites(prev => [data, ...prev]);
      setInviteEmail("");
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
    // Create actual log entry
    await supabase.from("logs").insert({
      contractor_id: null, property_id: sub.property_id,
      hours: sub.hours, date: sub.date, note: sub.note,
      paid: false, deductions: "[]", rate_override: null,
      user_id: userId,
    });
    await supabase.from("hour_submissions").update({ status: "approved" }).eq("id", sub.id);
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

  const getProperty = (id: string) => properties.find(p => p.id === id)?.address || "Unknown";
  const getWorkerName = (id: string) => workers.find(w => w.id === id)?.name || "Unknown";

  if (loading) return <div style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, margin: 0 }}>Workers</h1>
          <p style={{ color: C.muted, margin: "6px 0 0", fontSize: 14 }}>{workers.length} workers · {submissions.length} pending approval</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ background: C.accent, border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Invite Worker
        </button>
      </div>

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
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{s.date} · {getProperty(s.property_id)}</div>
                  {s.note && <div style={{ color: C.sub, fontSize: 12, fontStyle: "italic", marginTop: 3 }}>{s.note}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{hrs(Number(s.hours))}</div>
                  <div style={{ color: C.yellow, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Pending</div>
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
              </div>
              <button onClick={() => setEditWorker({ ...w })}
                style={{ background: C.accentGlow, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "6px 14px", color: C.accentLight, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Edit Rate
              </button>
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
            💡 We'll generate an invite link you can share with your worker. They'll use it to sign up for the worker portal at <strong>{typeof window !== "undefined" ? window.location.origin : ""}/worker</strong>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: C.sub, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase" }}>Worker's Email</label>
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
    </div>
  );
}
