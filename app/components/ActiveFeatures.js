"use client";

import { useState } from "react";
import useConfigStore, { CONTAINER_SIZES, RAL_COLORS } from "../store/useConfigStore";
import { supabase } from "../lib/supabase";

const WALL_LABELS = { front: "Front", back: "Bak", left: "Venstre", right: "Høyre" };

function FeatureRow({ label, values }) {
  return (
    <div className="bg-[var(--bg-primary)] rounded-lg p-3 space-y-1">
      <div className="text-sm font-medium text-[var(--accent)]">{label}</div>
      {values.map(([k, v]) => (
        <div key={k} className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>{k}</span>
          <span className="text-[var(--text-primary)]">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ShareButton() {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const exportConfig = useConfigStore((s) => s.exportConfig);

  const handleShare = async () => {
    setError(null);
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) throw new Error("Ikke innlogget");

      const config = exportConfig();
      const res = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Feil ved deling");
      }

      const { id } = await res.json();
      const url = `${window.location.origin}/share/${id}`;
      setShareUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (shareUrl) {
    return (
      <div className="mt-2 p-3 rounded-xl border border-green-200 bg-green-50 space-y-2">
        <p className="text-[11px] font-semibold text-green-700">🔗 Delings-lenke (gyldig 14 dager)</p>
        <div className="flex gap-1.5">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-white border border-green-200 text-[var(--text-primary)] font-mono"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shrink-0"
          >
            {copied ? "✓ Kopiert!" : "Kopier"}
          </button>
        </div>
        <button
          onClick={() => setShareUrl(null)}
          className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Lukk
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleShare}
        disabled={loading}
        className="w-full py-2 px-3 rounded-xl font-semibold text-xs transition-all
          border border-green-300 text-green-700 hover:bg-green-50 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Genererer lenke…" : "🔗 Del med kunde"}
      </button>
      {error && (
        <p className="text-[10px] text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

export default function ActiveFeatures({ onSaveProject, onLoadProject, loggedIn, open, onClose }) {
  const elements = useConfigStore((s) => s.elements);
  const roofType = useConfigStore((s) => s.roofType);
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const containerRal = useConfigStore((s) => s.containerRal);
  const cladding = useConfigStore((s) => s.cladding);
  const insulation = useConfigStore((s) => s.insulation);
  const setShowDrawing = useConfigStore((s) => s.setShowDrawing);
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);
  const cont = customDims || CONTAINER_SIZES[containerSize];

  const doors = elements.filter((e) => e.type === "door");
  const vents = elements.filter((e) => e.type === "ventilation");

  const anyActive = elements.length > 0 || roofType !== "flat" || aluminumFloor.enabled || containerRal || cladding.enabled || insulation.enabled;

  return (
<>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`fixed top-0 right-0 bottom-0 w-72 overflow-y-auto p-4 space-y-4 border-l border-[var(--border)] bg-[var(--bg-card)] z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-20 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] lg:hidden z-10"
          aria-label="Lukk"
        >
          ✕
        </button>
      <h2 className="text-lg font-bold">📋 Oppsummering</h2>

      {!anyActive && (
        <p className="text-sm text-[var(--text-secondary)] italic">
          Ingen features konfigurert ennå.
        </p>
      )}

      {doors.map((el) => (
        <FeatureRow
          key={el.id}
          label={`🚪 Dør #${el.id}`}
          values={[
            ["Vegg", WALL_LABELS[el.wall]],
            ["Posisjon", `(${el.x}, ${el.y}) mm`],
            ["Bredde × Høyde", `${el.width} × ${el.height} mm`],
          ]}
        />
      ))}

      {vents.map((el) => (
        <FeatureRow
          key={el.id}
          label={`🌀 Ventilasjon #${el.id}`}
          values={[
            ["Vegg", WALL_LABELS[el.wall]],
            ["Posisjon", `(${el.x}, ${el.y}) mm`],
            ["Bredde × Høyde", `${el.width} × ${el.height} mm`],
            ["Form", el.shape === "circle" ? "Sirkel" : "Rektangel"],
          ]}
        />
      ))}

      {roofType === "sloped" && (
        <FeatureRow label="📐 Skråtak" values={[["Type", "400mm fall mot front"]]} />
      )}

      {roofType === "gable" && (
        <FeatureRow label="🏠 Saltak" values={[["Type", "Saltak med møne, renne begge sider"]]} />
      )}

      {aluminumFloor.enabled && (
        <FeatureRow label="🪵 Aluminium gulv" values={[["Materiale", "Aluminium"]]} />
      )}

      {containerRal && (
        <FeatureRow
          label="🎨 Container farge"
          values={[
            ["RAL", containerRal],
            ["Farge", RAL_COLORS.find((r) => r.code === containerRal)?.name || "Egendefinert"],
          ]}
        />
      )}

      {cladding.enabled && (
        <FeatureRow
          label="🪨 Kledning"
          values={[
            ["Retning", cladding.direction === "horizontal" ? "Liggende" : "Stående"],
            ["Farge", cladding.ral ? `RAL ${cladding.ral}` : "Standard"],
          ]}
        />
      )}

      {insulation.enabled && (
        <FeatureRow
          label="🧱 Isolasjon"
          values={[
            ["Type", "Perforert 50 mm"],
            ["Flater", [...insulation.walls].map((w) => WALL_LABELS[w]).join(", ") || "Ingen"],
          ]}
        />
      )}

      <div className="pt-4 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--text-secondary)] mb-3 space-y-1">
          <div className="flex justify-between">
            <span>Container</span>
            <span>{containerSize} ISO</span>
          </div>
          <div className="flex justify-between">
            <span>Mål</span>
            <span>{cont.length} × {cont.width} × {cont.height}</span>
          </div>
          <div className="flex justify-between">
            <span>Gulvhøyde</span>
            <span>{cont.floorHeight} mm</span>
          </div>
          <div className="flex justify-between">
            <span>Innvendig høyde</span>
            <span>{cont.height - cont.floorHeight} mm</span>
          </div>
          <div className="flex justify-between">
            <span>Elementer</span>
            <span>{elements.length} stk</span>
          </div>
        </div>

        <button
          onClick={() => setShowDrawing(true)}
          disabled={!anyActive}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all
            bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]
            hover:shadow-lg hover:shadow-[var(--accent)]/25 active:scale-[0.98]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          📐 Generer Tegninger
        </button>

        {loggedIn && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={onSaveProject}
              className="flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition-all
                border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 cursor-pointer"
            >
              💾 Lagre prosjekt
            </button>
            <button
              onClick={onLoadProject}
              className="flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition-all
                border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
            >
              📂 Mine prosjekter
            </button>
          </div>
        )}

        {loggedIn && <ShareButton />}
      </div>
    </aside>
    </>
  );
}
