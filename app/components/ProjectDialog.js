"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import useConfigStore from "../store/useConfigStore";

export default function ProjectDialog({ userId, orgId, onClose, onLoad, initialTab = "save" }) {
  const [tab, setTab] = useState(initialTab);
  const [customerName, setCustomerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const exportConfig = useConfigStore((s) => s.exportConfig);
  const importConfig = useConfigStore((s) => s.importConfig);

  useEffect(() => { if (tab === "load") loadProjects(); }, [tab]);

  const loadProjects = async () => {
    if (!supabase) return;
    setLoading(true);
    let query = supabase
      .from("projects")
      .select("id, customer_name, project_name, project_code, updated_at, owner_id")
      .order("updated_at", { ascending: false });
    if (orgId) {
      query = query.or(`owner_id.eq.${userId},org_id.eq.${orgId}`);
    } else {
      query = query.eq("owner_id", userId);
    }
    const { data, error: loadErr } = await query;
    if (loadErr) setError(loadErr.message);
    else setProjects(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!supabase || !projectName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const config = exportConfig();
      const { error: saveErr } = await supabase.from("projects").insert({
        owner_id: userId,
        org_id: orgId || null,
        customer_name: customerName.trim() || null,
        project_name: projectName.trim(),
        project_code: projectCode.trim() || null,
        config,
      });
      if (saveErr) throw saveErr;
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (projectId) => {
    if (!supabase) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error: loadErr } = await supabase
        .from("projects")
        .select("config, project_name, customer_name, project_code")
        .eq("id", projectId)
        .single();
      if (loadErr) throw loadErr;
      importConfig(data.config);
      if (onLoad) onLoad(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!supabase) return;
    const { error: delErr } = await supabase.from("projects").delete().eq("id", projectId);
    if (!delErr) setProjects((prev) => prev.filter((p) => p.id !== projectId));
    else setError(delErr.message);
  };

  const inputClass =
    "w-full rounded-xl px-4 py-3 text-sm bg-[var(--bg-input)] border border-[var(--border)] " +
    "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 " +
    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto shadow-2xl border border-[var(--border)]"
        style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">📋 Prosjekter</h2>
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
          {[
            { key: "save", label: "💾 Lagre nytt" },
            { key: "load", label: "📂 Åpne prosjekt" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                tab === key
                  ? "bg-white text-[var(--accent)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Save tab */}
        {tab === "save" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Kundenavn
              </label>
              <input
                placeholder="F.eks. Aker Solutions"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Prosjektnavn <span className="text-red-400">*</span>
              </label>
              <input
                placeholder="F.eks. Kontorcontainer Fornebu"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Prosjektkode
              </label>
              <input
                placeholder="F.eks. P-2026-042"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !projectName.trim()}
              className="w-full rounded-xl py-3 font-semibold text-sm text-white cursor-pointer transition-all
                hover:shadow-lg hover:shadow-[var(--accent)]/25 active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)" }}
            >
              {loading ? "Lagrer…" : "💾 Lagre prosjekt"}
            </button>
          </div>
        )}

        {/* Load tab */}
        {tab === "load" && (
          <div className="flex flex-col gap-2">
            {loading && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">Laster prosjekter…</p>
            )}
            {!loading && projects.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                Ingen prosjekter funnet ennå.
              </p>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--bg-input)] hover:border-[var(--accent)]/50 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {p.project_name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {[p.customer_name, p.project_code].filter(Boolean).join(" · ") ||
                      new Date(p.updated_at).toLocaleDateString("nb-NO")}
                  </p>
                </div>
                <div className="flex gap-2 ml-3 flex-shrink-0">
                  <button
                    onClick={() => handleLoad(p.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer text-white transition-all hover:shadow-sm"
                    style={{ background: "var(--accent)" }}
                  >
                    Åpne
                  </button>
                  {p.owner_id === userId && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all"
                    >
                      Slett
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
