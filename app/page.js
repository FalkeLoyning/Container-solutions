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

export default function Home() {
  const showDrawing = useConfigStore((s) => s.showDrawing);

  const [session, setSession] = useState(supabase ? undefined : null); // undefined = loading, null = no auth
  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState(null);
  const [showOrgManager, setShowOrgManager] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectDialogTab, setProjectDialogTab] = useState("save");

  // Auth listener (only if Supabase is configured)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
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
    </div>
  );
}
