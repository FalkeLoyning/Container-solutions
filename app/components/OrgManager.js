"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function OrgManager({ userId, onClose }) {
  const [orgs, setOrgs] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadOrgs(); }, []);

  const loadOrgs = async () => {
    const { data } = await supabase
      .from("org_members")
      .select("organization_id, role, organizations(id, name, invite_code)")
      .eq("user_id", userId);
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
  };

  useEffect(() => {
    if (!activeOrgId) { setMembers([]); return; }
    (async () => {
      const { data } = await supabase
        .from("org_members")
        .select("role, profiles(full_name, email)")
        .eq("organization_id", activeOrgId);
      if (data) setMembers(data.map((m) => ({ ...m.profiles, role: m.role })));
    })();
  }, [activeOrgId]);

  const createOrg = async () => {
    if (!newOrgName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error: createErr } = await supabase
        .from("organizations")
        .insert({ name: newOrgName.trim(), owner_id: userId })
        .select()
        .single();
      if (createErr) throw createErr;
      // add self as admin
      await supabase.from("org_members").insert({
        user_id: userId,
        organization_id: data.id,
        role: "admin",
      });
      setNewOrgName("");
      await loadOrgs();
      setActiveOrgId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinOrg = async () => {
    if (!joinCode.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const { data: org, error: findErr } = await supabase
        .from("organizations")
        .select("id")
        .eq("invite_code", joinCode.trim().toUpperCase())
        .single();
      if (findErr) throw new Error("Fant ingen organisasjon med den koden");
      const { error: joinErr } = await supabase
        .from("org_members")
        .insert({ user_id: userId, organization_id: org.id, role: "member" });
      if (joinErr) throw joinErr;
      setJoinCode("");
      await loadOrgs();
      setActiveOrgId(org.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  const inputStyle = { background: "var(--bg-primary)", color: "var(--text-primary)" };
  const btnStyle = { background: "var(--accent, #3b82f6)", color: "#fff" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-md rounded-xl p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--bg-secondary, #1e293b)", color: "var(--text-primary, #e2e8f0)" }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Organisasjoner</h2>
          <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100 cursor-pointer">Lukk</button>
        </div>

        {/* Tabs */}
        {orgs.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => setActiveOrgId(o.id)}
                className="px-3 py-1 rounded text-xs cursor-pointer"
                style={o.id === activeOrgId ? btnStyle : { opacity: 0.5 }}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        {/* Active org details */}
        {activeOrg && (
          <div className="text-xs flex flex-col gap-2">
            <p>Invitasjonskode: <strong>{activeOrg.inviteCode}</strong></p>
            <p className="font-semibold mt-1">Medlemmer:</p>
            {members.map((m, i) => (
              <div key={i} className="flex justify-between opacity-80">
                <span>{m.full_name || m.email}</span>
                <span className="opacity-50">{m.role}</span>
              </div>
            ))}
          </div>
        )}

        <hr className="border-white/10" />

        {/* Create */}
        <div className="flex gap-2">
          <input
            placeholder="Ny organisasjon…"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            className="flex-1 rounded px-3 py-1.5 text-sm"
            style={inputStyle}
          />
          <button
            onClick={createOrg}
            disabled={loading}
            className="rounded px-3 py-1.5 text-sm font-semibold cursor-pointer"
            style={btnStyle}
          >
            Opprett
          </button>
        </div>

        {/* Join */}
        <div className="flex gap-2">
          <input
            placeholder="Invitasjonskode…"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 rounded px-3 py-1.5 text-sm"
            style={inputStyle}
          />
          <button
            onClick={joinOrg}
            disabled={loading}
            className="rounded px-3 py-1.5 text-sm font-semibold cursor-pointer"
            style={btnStyle}
          >
            Bli med
          </button>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  );
}
