"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import useConfigStore from "../store/useConfigStore";

export default function ProjectDialog({ userId, orgId, onClose, onLoad }) {
  const [tab, setTab] = useState("save"); // "save" | "load"
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
    setLoading(true);
    let query = supabase
      .from("projects")
      .select("id, customer_name, project_name, project_code, updated_at, owner_id")
      .order("updated_at", { ascending: false });
    // Get own projects + org projects
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
    if (!projectName.trim()) return;
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
    const { error: delErr } = await supabase.from("projects").delete().eq("id", projectId);
    if (!delErr) setProjects((prev) => prev.filter((p) => p.id !== projectId));
    else setError(delErr.message);
  };

  const inputStyle = { background: "var(--bg-primary)", color: "var(--text-primary)" };
  const btnStyle = { background: "var(--accent, #3b82f6)", color: "#fff" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-lg rounded-xl p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--bg-secondary, #1e293b)", color: "var(--text-primary, #e2e8f0)" }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Prosjekter</h2>
          <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100 cursor-pointer">Lukk</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["save", "load"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded text-sm font-semibold cursor-pointer"
              style={tab === t ? btnStyle : { opacity: 0.5 }}
            >
              {t === "save" ? "Lagre nytt" : "Åpne prosjekt"}
            </button>
          ))}
        </div>

        {tab === "save" && (
          <div className="flex flex-col gap-3">
            <input
              placeholder="Kundenavn"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="rounded px-3 py-2 text-sm"
              style={inputStyle}
            />
            <input
              placeholder="Prosjektnavn *"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className="rounded px-3 py-2 text-sm"
              style={inputStyle}
            />
            <input
              placeholder="Prosjektkode"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              className="rounded px-3 py-2 text-sm"
              style={inputStyle}
            />
            <button
              onClick={handleSave}
              disabled={loading || !projectName.trim()}
              className="rounded py-2 font-semibold text-sm cursor-pointer"
              style={btnStyle}
            >
              {loading ? "Lagrer…" : "Lagre prosjekt"}
            </button>
          </div>
        )}

        {tab === "load" && (
          <div className="flex flex-col gap-2">
            {loading && <p className="text-xs opacity-60">Laster…</p>}
            {!loading && projects.length === 0 && (
              <p className="text-xs opacity-60">Ingen prosjekter funnet.</p>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded px-3 py-2"
                style={{ background: "var(--bg-primary)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.project_name}</p>
                  <p className="text-xs opacity-60 truncate">
                    {[p.customer_name, p.project_code].filter(Boolean).join(" · ") ||
                      new Date(p.updated_at).toLocaleDateString("nb-NO")}
                  </p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleLoad(p.id)}
                    className="text-xs px-2 py-1 rounded cursor-pointer"
                    style={btnStyle}
                  >
                    Åpne
                  </button>
                  {p.owner_id === userId && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs px-2 py-1 rounded cursor-pointer text-red-400 hover:text-red-300"
                    >
                      Slett
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  );
}
