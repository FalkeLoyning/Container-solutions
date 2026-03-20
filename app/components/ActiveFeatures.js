"use client";

import useConfigStore, { CONTAINER } from "../store/useConfigStore";

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

export default function ActiveFeatures() {
  const elements = useConfigStore((s) => s.elements);
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const setShowDrawing = useConfigStore((s) => s.setShowDrawing);

  const doors = elements.filter((e) => e.type === "door");
  const vents = elements.filter((e) => e.type === "ventilation");

  const anyActive = elements.length > 0 || slopedRoof.enabled || aluminumFloor.enabled;

  return (
    <aside className="w-72 min-w-72 h-full overflow-y-auto p-4 space-y-4 border-l border-[var(--border)]">
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
            ["Størrelse", `${el.shape === "circle" ? "Ø" : "□"}${el.size} mm`],
          ]}
        />
      ))}

      {slopedRoof.enabled && (
        <FeatureRow label="📐 Skråtak" values={[["Type", "400mm fall mot front"]]} />
      )}

      {aluminumFloor.enabled && (
        <FeatureRow label="🪵 Aluminium gulv" values={[["Materiale", "Aluminium"]]} />
      )}

      <div className="pt-4 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--text-secondary)] mb-3 space-y-1">
          <div className="flex justify-between">
            <span>Container</span>
            <span>20ft ISO</span>
          </div>
          <div className="flex justify-between">
            <span>Mål</span>
            <span>{CONTAINER.length} × {CONTAINER.width} × {CONTAINER.height}</span>
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
      </div>
    </aside>
  );
}
