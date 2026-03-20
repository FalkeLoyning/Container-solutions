"use client";

import useConfigStore, { CONTAINER } from "../store/useConfigStore";

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

export default function ActiveFeatures() {
  const door = useConfigStore((s) => s.door);
  const ventilation = useConfigStore((s) => s.ventilation);
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const setShowDrawing = useConfigStore((s) => s.setShowDrawing);

  const anyActive = door.enabled || ventilation.enabled || slopedRoof.enabled || aluminumFloor.enabled;

  return (
    <aside className="w-72 min-w-72 h-full overflow-y-auto p-4 space-y-4 border-l border-[var(--border)]">
      <h2 className="text-lg font-bold">📋 Aktive Features</h2>

      {!anyActive && (
        <p className="text-sm text-[var(--text-secondary)] italic">
          Ingen features aktivert. Bruk panelet til venstre for å konfigurere containeren.
        </p>
      )}

      {door.enabled && (
        <FeatureRow
          label="🚪 Dør"
          values={[
            ["Posisjon X", `${door.x} mm`],
            ["Posisjon Y", `${door.y} mm`],
            ["Bredde", `${door.width} mm`],
            ["Høyde", `${door.height} mm`],
          ]}
        />
      )}

      {ventilation.enabled && (
        <FeatureRow
          label="🌀 Ventilasjon"
          values={[
            ["Posisjon X", `${ventilation.x} mm`],
            ["Posisjon Y", `${ventilation.y} mm`],
            ["Størrelse", `${ventilation.size} mm`],
            ["Form", ventilation.shape === "circle" ? "Sirkel" : "Firkant"],
          ]}
        />
      )}

      {slopedRoof.enabled && (
        <FeatureRow label="📐 Skråtak" values={[["Type", "Bak → front, 400mm fall"]]} />
      )}

      {aluminumFloor.enabled && (
        <FeatureRow label="🪵 Aluminium gulv" values={[["Materiale", "Aluminium"]]} />
      )}

      <div className="pt-4 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--text-secondary)] mb-3 space-y-1">
          <div className="flex justify-between">
            <span>Container</span>
            <span>20ft ISO Standard</span>
          </div>
          <div className="flex justify-between">
            <span>Mål</span>
            <span>{CONTAINER.length} × {CONTAINER.width} × {CONTAINER.height}</span>
          </div>
        </div>

        <button
          onClick={() => setShowDrawing(true)}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all
            bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]
            hover:shadow-lg hover:shadow-[var(--accent)]/25 active:scale-[0.98]"
        >
          📐 Generer Tegninger
        </button>
      </div>
    </aside>
  );
}
