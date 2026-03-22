"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import useConfigStore from "../../store/useConfigStore";

const ShareViewer3D = dynamic(() => import("./ShareViewer3D"), { ssr: false });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function SharePage() {
  const { id } = useParams();
  const importConfig = useConfigStore((s) => s.importConfig);

  const [status, setStatus] = useState("loading"); // loading | expired | error | ready
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!url || !key || !id) { setStatus("error"); return; }

    (async () => {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(url, key);
      const { data, error } = await supabase
        .from("shared_configs")
        .select("config, project_name, customer_name, expires_at")
        .eq("id", id)
        .single();

      if (error || !data) {
        setStatus("error");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      importConfig(data.config);
      setMeta({
        projectName: data.project_name,
        customerName: data.customer_name,
        expiresAt: data.expires_at,
      });
      setStatus("ready");
    })();
  }, [id, importConfig]);

  if (status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">📦</div>
          <p className="text-sm text-[var(--text-secondary)]">Laster konfigurasjon…</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center space-y-3 max-w-md px-6">
          <div className="text-4xl">⏰</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Lenken har utløpt</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Denne delings-lenken var gyldig i 14 dager og har nå utløpt.
            Kontakt avsenderen for en ny lenke.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center space-y-3 max-w-md px-6">
          <div className="text-4xl">❌</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Fant ikke konfigurasjonen</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Lenken er ugyldig eller konfigurasjonen er slettet.
          </p>
        </div>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(meta.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-[var(--border)] bg-[var(--bg-card)] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-[var(--text-primary)]">📦 Container Solutions</span>
          {meta.projectName && (
            <span className="text-sm text-[var(--text-secondary)]">
              — {meta.customerName ? `${meta.customerName} · ` : ""}{meta.projectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>🔗 Delt visning</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
            {daysLeft} {daysLeft === 1 ? "dag" : "dager"} igjen
          </span>
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="flex-1 relative">
        <ShareViewer3D />
      </div>
    </div>
  );
}
