"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export default function OrgManager({ userId, onClose, onOrgChange }) {
  const [orgs, setOrgs] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [approvedEmails, setApprovedEmails] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [approveEmail, setApproveEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showApproved, setShowApproved] = useState(false);
  const [showAccessRequests, setShowAccessRequests] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);

  const isAdmin = myRole === "admin";

  // ── Load orgs ──
  const loadOrgs = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("org_members")
      .select("org_id, role, organizations(id, name)")
      .eq("user_id", userId);
    if (err) { setError(err.message); return; }
    if (data) {
      const mapped = data.map((m) => ({
        id: m.organizations.id,
        name: m.organizations.name,
        role: m.role,
      }));
      setOrgs(mapped);
      if (mapped.length && !activeOrgId) {
        setActiveOrgId(mapped[0].id);
        setMyRole(mapped[0].role);
      }
    }
  }, [userId, activeOrgId]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  // ── Load members + pending invites for active org ──
  useEffect(() => {
    if (!supabase || !activeOrgId) { setMembers([]); setPendingInvites([]); return; }
    const org = orgs.find((o) => o.id === activeOrgId);
    if (org) setMyRole(org.role);

    (async () => {
      const { data } = await supabase
        .from("org_members")
        .select("user_id, role, profiles(full_name, email)")
        .eq("org_id", activeOrgId);
      if (data) setMembers(data.map((m) => ({ userId: m.user_id, role: m.role, ...m.profiles })));
    })();

    (async () => {
      const { data } = await supabase
        .from("org_invites")
        .select("email, created_at")
        .eq("org_id", activeOrgId);
      if (data) setPendingInvites(data);
    })();
  }, [activeOrgId, orgs]);

  // ── Load approved emails ──
  const loadApproved = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("approved_emails")
      .select("id, email, created_at")
      .order("created_at", { ascending: false });
    if (data) setApprovedEmails(data);
  }, []);

  useEffect(() => { if (showApproved) loadApproved(); }, [showApproved, loadApproved]);

  // ── Load access requests ──
  const loadAccessRequests = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("access_requests")
      .select("id, email, full_name, message, status, created_at")
      .order("created_at", { ascending: false });
    if (data) setAccessRequests(data);
  }, []);

  useEffect(() => { if (showAccessRequests) loadAccessRequests(); }, [showAccessRequests, loadAccessRequests]);

  const handleApproveRequest = async (req) => {
    if (!supabase) return;
    setLoading(true);
    try {
      // Add to approved_emails
      await supabase.from("approved_emails").upsert(
        { email: req.email, added_by: userId },
        { onConflict: "email" }
      );
      // Update request status
      await supabase
        .from("access_requests")
        .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: userId })
        .eq("id", req.id);
      await loadAccessRequests();
      await loadApproved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (req) => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase
        .from("access_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: userId })
        .eq("id", req.id);
      await loadAccessRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Create org ──
  const createOrg = async () => {
    if (!supabase || !newOrgName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error: createErr } = await supabase
        .from("organizations")
        .insert({ name: newOrgName.trim(), owner_id: userId })
        .select()
        .single();
      if (createErr) throw createErr;
      const { error: memberErr } = await supabase.from("org_members").insert({
        user_id: userId,
        org_id: data.id,
        role: "admin",
      });
      if (memberErr) throw memberErr;
      setNewOrgName("");
      setActiveOrgId(data.id);
      setMyRole("admin");
      await loadOrgs();
      if (onOrgChange) onOrgChange(data.id, data.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Add member by email ──
  const addMember = async () => {
    if (!supabase || !addEmail.trim() || !activeOrgId) return;
    setError(null);
    setLoading(true);
    try {
      const email = addEmail.trim().toLowerCase();

      // Ensure email is approved
      await supabase.from("approved_emails").upsert(
        { email, added_by: userId },
        { onConflict: "email", ignoreDuplicates: true }
      );

      // Look up existing user
      const { data: users } = await supabase.rpc("lookup_user_by_email", { lookup_email: email });

      if (users && users.length > 0) {
        // User exists → add to org directly
        const { error: addErr } = await supabase.from("org_members").insert({
          user_id: users[0].user_id,
          org_id: activeOrgId,
          role: "member",
        });
        if (addErr) {
          if (addErr.message.includes("duplicate")) throw new Error("Denne personen er allerede medlem");
          throw addErr;
        }
      } else {
        // User doesn't exist → create invite
        const { error: invErr } = await supabase.from("org_invites").insert({
          email,
          org_id: activeOrgId,
          invited_by: userId,
        });
        if (invErr) {
          if (invErr.message.includes("duplicate")) throw new Error("Denne e-posten er allerede invitert");
          throw invErr;
        }
      }

      setAddEmail("");
      // Refresh members + invites
      const { data: m } = await supabase
        .from("org_members")
        .select("user_id, role, profiles(full_name, email)")
        .eq("org_id", activeOrgId);
      if (m) setMembers(m.map((x) => ({ userId: x.user_id, role: x.role, ...x.profiles })));

      const { data: inv } = await supabase
        .from("org_invites")
        .select("email, created_at")
        .eq("org_id", activeOrgId);
      if (inv) setPendingInvites(inv);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Remove member ──
  const removeMember = async (memberUserId) => {
    if (!supabase || !activeOrgId) return;
    const { error: rmErr } = await supabase
      .from("org_members")
      .delete()
      .eq("user_id", memberUserId)
      .eq("org_id", activeOrgId);
    if (rmErr) { setError(rmErr.message); return; }
    setMembers((prev) => prev.filter((m) => m.userId !== memberUserId));
  };

  // ── Remove invite ──
  const removeInvite = async (email) => {
    if (!supabase || !activeOrgId) return;
    const { error: rmErr } = await supabase
      .from("org_invites")
      .delete()
      .eq("email", email)
      .eq("org_id", activeOrgId);
    if (rmErr) { setError(rmErr.message); return; }
    setPendingInvites((prev) => prev.filter((i) => i.email !== email));
  };

  // ── Approve email (without adding to org) ──
  const handleApproveEmail = async () => {
    if (!supabase || !approveEmail.trim()) return;
    setError(null);
    try {
      const { error: insErr } = await supabase.from("approved_emails").insert({
        email: approveEmail.trim().toLowerCase(),
        added_by: userId,
      });
      if (insErr) {
        if (insErr.message.includes("duplicate")) throw new Error("E-posten er allerede godkjent");
        throw insErr;
      }
      setApproveEmail("");
      await loadApproved();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Remove approved email ──
  const removeApproved = async (id) => {
    if (!supabase) return;
    const { error: rmErr } = await supabase.from("approved_emails").delete().eq("id", id);
    if (rmErr) { setError(rmErr.message); return; }
    setApprovedEmails((prev) => prev.filter((a) => a.id !== id));
  };

  const inputClass =
    "flex-1 rounded-lg px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] " +
    "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 " +
    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto shadow-2xl border border-[var(--border)]"
        style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">🏢 Organisasjoner</h2>
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── Org tabs ── */}
        {orgs.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => setActiveOrgId(o.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  o.id === activeOrgId
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]"
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Active org details ── */}
        {activeOrgId && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4 space-y-4">
            {/* Members */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Medlemmer ({members.length})
              </p>
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div key={m.userId} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[var(--text-primary)] truncate">
                        {m.full_name || m.email}
                      </span>
                      {m.full_name && (
                        <span className="text-[var(--text-secondary)] truncate text-[10px]">{m.email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        m.role === "admin"
                          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                      }`}>
                        {m.role === "admin" ? "Admin" : "Medlem"}
                      </span>
                      {isAdmin && m.userId !== userId && (
                        <button
                          onClick={() => removeMember(m.userId)}
                          className="text-red-400 hover:text-red-600 cursor-pointer text-[10px]"
                          title="Fjern"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Inviterte — venter på registrering ({pendingInvites.length})
                </p>
                <div className="space-y-1.5">
                  {pendingInvites.map((inv) => (
                    <div key={inv.email} className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)]">
                        {inv.email} <span className="text-amber-500">⏳</span>
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => removeInvite(inv.email)}
                          className="text-red-400 hover:text-red-600 cursor-pointer text-[10px]"
                          title="Fjern invitasjon"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add member (admin only) */}
            {isAdmin && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Legg til medlem
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="E-postadresse…"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMember()}
                    className={inputClass}
                  />
                  <button
                    onClick={addMember}
                    disabled={loading || !addEmail.trim()}
                    className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-all text-white disabled:opacity-50"
                    style={{ background: "var(--accent)" }}
                  >
                    Legg til
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1.5">
                  Godkjenner e-posten automatisk. Personen legges til direkte hvis de har konto, ellers inviteres de.
                </p>
              </div>
            )}
          </div>
        )}

        {orgs.length === 0 && !loading && (
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">
            Du er ikke medlem av noen organisasjon ennå.
          </p>
        )}

        <hr className="border-[var(--border)]" />

        {/* ── Create org ── */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Opprett ny organisasjon
          </p>
          <div className="flex gap-2">
            <input
              placeholder="Organisasjonsnavn…"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createOrg()}
              className={inputClass}
            />
            <button
              onClick={createOrg}
              disabled={loading || !newOrgName.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-all text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              Opprett
            </button>
          </div>
        </div>

        {/* ── Approved emails (admin only, collapsible) ── */}
        {isAdmin && (
          <>
            <hr className="border-[var(--border)]" />
            <div>
              <button
                onClick={() => setShowApproved(!showApproved)}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors"
              >
                <span className="transition-transform" style={{ transform: showApproved ? "rotate(90deg)" : "" }}>
                  ▸
                </span>
                Godkjente e-poster ({approvedEmails.length})
              </button>

              {showApproved && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Godkjenn e-post…"
                      value={approveEmail}
                      onChange={(e) => setApproveEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleApproveEmail()}
                      className={inputClass}
                    />
                    <button
                      onClick={handleApproveEmail}
                      disabled={!approveEmail.trim()}
                      className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-all border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50"
                    >
                      Godkjenn
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {approvedEmails.map((a) => (
                      <div key={a.id} className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-primary)]">{a.email}</span>
                        <button
                          onClick={() => removeApproved(a.id)}
                          className="text-red-400 hover:text-red-600 cursor-pointer text-[10px]"
                          title="Fjern godkjenning"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Access Requests (admin only, collapsible) ── */}
        {isAdmin && (
          <>
            <hr className="border-[var(--border)]" />
            <div>
              <button
                onClick={() => setShowAccessRequests(!showAccessRequests)}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-primary)] transition-colors"
              >
                <span className="transition-transform" style={{ transform: showAccessRequests ? "rotate(90deg)" : "" }}>
                  ▸
                </span>
                Tilgangsforespørsler ({accessRequests.filter((r) => r.status === "pending").length} ventende)
              </button>

              {showAccessRequests && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {accessRequests.length === 0 && (
                    <p className="text-xs text-[var(--text-secondary)] italic">Ingen forespørsler ennå</p>
                  )}
                  {accessRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`rounded-lg border p-3 space-y-1 ${
                        req.status === "pending"
                          ? "border-amber-300 bg-amber-50"
                          : req.status === "approved"
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{req.full_name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{req.email}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          req.status === "pending" ? "bg-amber-200 text-amber-800"
                          : req.status === "approved" ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                        }`}>
                          {req.status === "pending" ? "Venter" : req.status === "approved" ? "Godkjent" : "Avslått"}
                        </span>
                      </div>
                      {req.message && (
                        <p className="text-xs text-[var(--text-secondary)] italic">&ldquo;{req.message}&rdquo;</p>
                      )}
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {new Date(req.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {req.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleApproveRequest(req)}
                            disabled={loading}
                            className="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            ✓ Godkjenn
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req)}
                            disabled={loading}
                            className="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            ✕ Avslå
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-medium bg-red-50 text-red-600 border border-red-200">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
