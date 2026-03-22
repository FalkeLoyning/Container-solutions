"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "./components/Sidebar";
import ActiveFeatures from "./components/ActiveFeatures";
import DrawingPreview from "./components/DrawingPreview";
import LoginScreen from "./components/LoginScreen";
import OrgManager from "./components/OrgManager";
import ProjectDialog from "./components/ProjectDialog";
import useConfigStore from "./store/useConfigStore";
import { supabase } from "./lib/supabase";

const Canvas3D = dynamic(() => import("./components/Canvas3D"), { ssr: false });

function ResetPasswordDialog({ onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) { setError("Passordet må være minst 6 tegn"); return; }
    if (newPassword !== confirmPassword) { setError("Passordene stemmer ikke overens"); return; }
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(onDone, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl px-4 py-3 text-sm bg-[var(--bg-input)] border border-[var(--border)] " +
    "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 " +
    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border)]">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sett nytt passord</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Velg et nytt passord for kontoen din.</p>
        {success ? (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-green-50 text-green-700 border border-green-200">
            ✓ Passordet er oppdatert! Omdirigerer…
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Nytt passord</label>
              <input type="password" placeholder="Minimum 6 tegn" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className={inputClass} autoComplete="new-password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Bekreft passord</label>
              <input type="password" placeholder="Gjenta passordet" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className={inputClass} autoComplete="new-password" />
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                <span>⚠</span><span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full rounded-xl py-3.5 font-bold text-sm text-white cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }}>
              {loading ? "Oppdaterer…" : "Oppdater passord"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const showDrawing = useConfigStore((s) => s.showDrawing);

  const [session, setSession] = useState(supabase ? undefined : null); // undefined = loading, null = no auth
  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState(null);
  const [showOrgManager, setShowOrgManager] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectDialogTab, setProjectDialogTab] = useState("save");
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Auth listener (only if Supabase is configured)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load user's first org
  useEffect(() => {
    if (!supabase || !session?.user) { setOrgId(null); setOrgName(null); return; }
    (async () => {
      const { data } = await supabase
        .from("org_members")
        .select("org_id, organizations(name)")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();
      if (data) {
        setOrgId(data.org_id);
        setOrgName(data.organizations.name);
      }
    })();
  }, [session?.user?.id]);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  };

  // Still loading auth
  if (session === undefined) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <p>Laster…</p>
      </div>
    );
  }

  // Not logged in (but Supabase is configured)
  if (!session && supabase) {
    return <LoginScreen onLogin={() => {}} />;
  }

  const loggedIn = !!session;
  const userId = session?.user?.id || null;
  const userEmail = session?.user?.email || null;

  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Top header bar (only when logged in) */}
      {loggedIn && (
        <div
          className="fixed top-0 left-80 right-72 h-10 z-30 flex items-center justify-between px-4 border-b"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          <div className="flex items-center gap-3 text-xs">
            <span>👤 {userEmail}</span>
            {orgName && (
              <button
                onClick={() => setShowOrgManager(true)}
                className="px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                🏢 {orgName}
              </button>
            )}
            {!orgName && (
              <button
                onClick={() => setShowOrgManager(true)}
                className="px-2 py-0.5 rounded border border-dashed border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                + Organisasjon
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs opacity-60 hover:opacity-100 hover:text-red-400 transition-colors cursor-pointer"
          >
            Logg ut
          </button>
        </div>
      )}

      {/* Left panel */}
      <Sidebar userId={userId} orgId={orgId} />

      {/* Center – 3D Viewer */}
      <div className={`fixed ${loggedIn ? "top-10" : "top-0"} bottom-0 left-80 right-72`}>
        <Canvas3D />
      </div>

      {/* Right panel */}
      <ActiveFeatures
        loggedIn={loggedIn}
        onSaveProject={() => { setProjectDialogTab("save"); setShowProjectDialog(true); }}
        onLoadProject={() => { setProjectDialogTab("load"); setShowProjectDialog(true); }}
      />

      {/* Drawing overlay */}
      {showDrawing && <DrawingPreview />}

      {/* Dialogs */}
      {showOrgManager && (
        <OrgManager
          userId={userId}
          onClose={() => setShowOrgManager(false)}
          onOrgChange={(id, name) => { setOrgId(id); setOrgName(name); }}
        />
      )}
      {showProjectDialog && (
        <ProjectDialog
          userId={userId}
          orgId={orgId}
          initialTab={projectDialogTab}
          onClose={() => setShowProjectDialog(false)}
        />
      )}
      {passwordRecovery && (
        <ResetPasswordDialog onDone={() => setPasswordRecovery(false)} />
      )}
    </div>
  );
}
