"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export default function OrgManager({ userId, onClose, onOrgChange }) {
  const [orgs, setOrgs] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadOrgs = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("org_members")
      .select("organization_id, role, organizations(id, name, invite_code)")
      .eq("user_id", userId);
    if (err) { setError(err.message); return; }
    if (data) {
      const mapped = data.map((m) => ({
        id: m.organizations.id,
        name: m.organizations.name,
        inviteCode: m.organizations.invite_code,
        role: m.role,
      }));
      setOrgs(mapped);
      if (mapped.length && !activeOrgId) setActiveOrgId(mapped[0].id);
    }
  }, [userId, activeOrgId]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  useEffect(() => {
    if (!supabase || !activeOrgId) { setMembers([]); return; }
    (async () => {
      const { data } = await supabase
        .from("org_members")
        .select("role, profiles(full_name, email)")
        .eq("organization_id", activeOrgId);
      if (data) setMembers(data.map((m) => ({ ...m.profiles, role: m.role })));
    })();
  }, [activeOrgId]);

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
      // Add self as admin member
      const { error: memberErr } = await supabase.from("org_members").insert({
        user_id: userId,
        organization_id: data.id,
        role: "admin",
      });
      if (memberErr) throw memberErr;
      setNewOrgName("");
      setActiveOrgId(data.id);
      await loadOrgs();
      if (onOrgChange) onOrgChange(data.id, data.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinOrg = async () => {
    if (!supabase || !joinCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const code = joinCode.trim().toUpperCase();
      const { data: org, error: findErr } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("invite_code", code)
        .single();
      if (findErr || !org) throw new Error("Fant ingen organisasjon med den koden");
      const { error: joinErr } = await supabase
        .from("org_members")
        .insert({ user_id: userId, organization_id: org.id, role: "member" });
      if (joinErr) {
        if (joinErr.message.includes("duplicate")) throw new Error("Du er allerede medlem");
        throw joinErr;
      }
      setJoinCode("");
      setActiveOrgId(org.id);
      await loadOrgs();
      if (onOrgChange) onOrgChange(org.id, org.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto shadow-2xl border border-[var(--border)]"
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

        {/* Org tabs */}
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

        {/* Active org details */}
        {activeOrg && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Invitasjonskode
              </span>
              <span
                className="font-mono text-sm font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-lg cursor-pointer select-all"
                title="Klikk for å kopiere"
                onClick={() => navigator.clipboard?.writeText(activeOrg.inviteCode)}
              >
                {activeOrg.inviteCode}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Medlemmer ({members.length})
              </p>
              <div className="space-y-1.5">
                {members.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-[var(--text-primary)]">{m.full_name || m.email}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      m.role === "admin"
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                    }`}>
                      {m.role === "admin" ? "Admin" : "Medlem"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {orgs.length === 0 && !loading && (
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">
            Du er ikke medlem av noen organisasjon ennå.
          </p>
        )}

        <hr className="border-[var(--border)]" />

        {/* Create org */}
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
              className="flex-1 rounded-lg px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]"
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

        {/* Join org */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Bli med i eksisterende
          </p>
          <div className="flex gap-2">
            <input
              placeholder="Lim inn invitasjonskode…"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinOrg()}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-mono uppercase bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 placeholder:font-sans placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]"
            />
            <button
              onClick={joinOrg}
              disabled={loading || !joinCode.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-all border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50"
            >
              Bli med
            </button>
          </div>
        </div>

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
