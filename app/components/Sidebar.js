"use client";

import useConfigStore, { CONTAINER } from "../store/useConfigStore";

function NumberInput({ label, value, onChange, min, max, unit = "mm" }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
        <span>{label}</span>
        <span>{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 rounded-lg text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange, icon }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </div>
      <span className="text-sm font-medium group-hover:text-[var(--accent)] transition-colors">
        {icon} {label}
      </span>
    </label>
  );
}

function FeatureSection({ title, children }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
      <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Sidebar() {
  const door = useConfigStore((s) => s.door);
  const ventilation = useConfigStore((s) => s.ventilation);
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const updateDoor = useConfigStore((s) => s.updateDoor);
  const updateVentilation = useConfigStore((s) => s.updateVentilation);
  const toggleSlopedRoof = useConfigStore((s) => s.toggleSlopedRoof);
  const toggleAluminumFloor = useConfigStore((s) => s.toggleAluminumFloor);

  return (
    <aside className="w-80 min-w-80 h-full overflow-y-auto p-4 space-y-4 border-r border-[var(--border)]">
      <div className="mb-2">
        <h2 className="text-lg font-bold">⚙️ Konfigurasjon</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          20ft ISO Container – {CONTAINER.length} × {CONTAINER.width} × {CONTAINER.height} mm
        </p>
      </div>

      {/* Door */}
      <FeatureSection title="🚪 Dør">
        <Toggle
          label="Aktiver dør"
          checked={door.enabled}
          onChange={() => updateDoor({ enabled: !door.enabled })}
        />
        {door.enabled && (
          <div className="space-y-3 pt-2">
            <NumberInput
              label="Posisjon X"
              value={door.x}
              onChange={(v) => updateDoor({ x: v })}
              min={0}
              max={CONTAINER.width - door.width}
            />
            <NumberInput
              label="Posisjon Y"
              value={door.y}
              onChange={(v) => updateDoor({ y: v })}
              min={0}
              max={CONTAINER.height - door.height}
            />
            <NumberInput
              label="Bredde"
              value={door.width}
              onChange={(v) => updateDoor({ width: v })}
              min={400}
              max={CONTAINER.width}
            />
            <NumberInput
              label="Høyde"
              value={door.height}
              onChange={(v) => updateDoor({ height: v })}
              min={500}
              max={CONTAINER.height}
            />
          </div>
        )}
      </FeatureSection>

      {/* Ventilation */}
      <FeatureSection title="🌀 Ventilasjon">
        <Toggle
          label="Aktiver ventilasjon"
          checked={ventilation.enabled}
          onChange={() => updateVentilation({ enabled: !ventilation.enabled })}
        />
        {ventilation.enabled && (
          <div className="space-y-3 pt-2">
            <NumberInput
              label="Posisjon X"
              value={ventilation.x}
              onChange={(v) => updateVentilation({ x: v })}
              min={0}
              max={CONTAINER.length - ventilation.size}
            />
            <NumberInput
              label="Posisjon Y"
              value={ventilation.y}
              onChange={(v) => updateVentilation({ y: v })}
              min={0}
              max={CONTAINER.height - ventilation.size}
            />
            <NumberInput
              label="Størrelse"
              value={ventilation.size}
              onChange={(v) => updateVentilation({ size: v })}
              min={100}
              max={600}
            />
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="vent-shape"
                  checked={ventilation.shape === "circle"}
                  onChange={() => updateVentilation({ shape: "circle" })}
                  className="accent-[var(--accent)]"
                />
                Sirkel
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="vent-shape"
                  checked={ventilation.shape === "square"}
                  onChange={() => updateVentilation({ shape: "square" })}
                  className="accent-[var(--accent)]"
                />
                Firkant
              </label>
            </div>
          </div>
        )}
      </FeatureSection>

      {/* Sloped Roof */}
      <FeatureSection title="📐 Skråtak">
        <Toggle
          label="Aktiver skråtak"
          checked={slopedRoof.enabled}
          onChange={toggleSlopedRoof}
        />
        {slopedRoof.enabled && (
          <p className="text-xs text-[var(--text-secondary)]">
            Taket skråner fra bak (full høyde) mot front (redusert)
          </p>
        )}
      </FeatureSection>

      {/* Aluminum Floor */}
      <FeatureSection title="🪵 Gulvplate">
        <Toggle
          label="Aluminium gulvplate"
          checked={aluminumFloor.enabled}
          onChange={toggleAluminumFloor}
        />
        {aluminumFloor.enabled && (
          <p className="text-xs text-[var(--text-secondary)]">
            Metallisk aluminium-finish på gulvet
          </p>
        )}
      </FeatureSection>
    </aside>
  );
}
