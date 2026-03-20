"use client";

import { useState } from "react";
import useConfigStore, { CONTAINER, WALL_DIMS, RAL_COLORS } from "../store/useConfigStore";
import { loadStepFile, loadGlbFile } from "../lib/stepLoader";

const WALL_LABELS = { front: "Front", back: "Bak", left: "Venstre", right: "Høyre", floor: "Gulv", roof: "Tak" };

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

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-3 cursor-pointer group w-full text-left"
    >
      <div
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
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
        {label}
      </span>
    </button>
  );
}

function ElementEditor({ el }) {
  const updateElement = useConfigStore((s) => s.updateElement);
  const removeElement = useConfigStore((s) => s.removeElement);
  const wallDim = WALL_DIMS[el.wall];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">
          Vegg: <strong className="text-[var(--text-primary)]">{WALL_LABELS[el.wall]}</strong>
        </span>
        <button
          onClick={() => removeElement(el.id)}
          className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-300 hover:bg-red-800 transition-colors"
        >
          🗑 Slett
        </button>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)] italic">
        Origo: nederste venstre hjørne av veggen (sett utenfra)
      </p>

      <NumberInput
        label="X – avstand fra venstre kant"
        value={el.x}
        onChange={(v) => updateElement(el.id, { x: v })}
        min={0}
        max={wallDim.w - el.width}
      />
      <NumberInput
        label="Y – avstand fra bunn"
        value={el.y}
        onChange={(v) => updateElement(el.id, { y: v })}
        min={0}
        max={wallDim.h - el.height}
      />

      <div className="flex gap-2">
        <button
          onClick={() => updateElement(el.id, { x: Math.round((wallDim.w - el.width) / 2) })}
          className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          ↔ Sentrer X
        </button>
        <button
          onClick={() => updateElement(el.id, { y: Math.round((wallDim.h - el.height) / 2) })}
          className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          ↕ Sentrer Y
        </button>
      </div>

      {el.type === "door" && (
        <>
          <NumberInput
            label="Bredde"
            value={el.width}
            onChange={(v) => updateElement(el.id, { width: v })}
            min={1}
            max={wallDim.w}
          />
          <NumberInput
            label="Høyde"
            value={el.height}
            onChange={(v) => updateElement(el.id, { height: v })}
            min={1}
            max={wallDim.h}
          />
        </>
      )}

      {el.type === "ventilation" && (
        <>
          <NumberInput
            label="Bredde"
            value={el.width}
            onChange={(v) => updateElement(el.id, { width: v })}
            min={1}
            max={wallDim.w}
          />
          <NumberInput
            label="Høyde"
            value={el.height}
            onChange={(v) => updateElement(el.id, { height: v })}
            min={1}
            max={wallDim.h}
          />
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={el.shape === "circle"}
                onChange={() => updateElement(el.id, { shape: "circle" })}
                className="accent-[var(--accent)]"
              />
              Sirkel
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={el.shape === "rectangle"}
                onChange={() => updateElement(el.id, { shape: "rectangle" })}
                className="accent-[var(--accent)]"
              />
              Rektangel
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function ElementCard({ el, isSelected }) {
  const selectElement = useConfigStore((s) => s.selectElement);
  const icon = el.type === "door" ? "🚪" : "🌀";

  return (
    <div
      onClick={() => selectElement(el.id)}
      className={`rounded-xl border p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-md shadow-[var(--accent)]/10"
          : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">
          {icon} {el.type === "door" ? "Dør" : "Ventilasjon"} #{el.id}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)]">
          {WALL_LABELS[el.wall]}
        </span>
      </div>
      <div className="text-xs text-[var(--text-secondary)]">
        Pos: ({el.x}, {el.y}) mm · {el.width}×{el.height}
      </div>

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <ElementEditor el={el} />
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const elements = useConfigStore((s) => s.elements);
  const selectedId = useConfigStore((s) => s.selectedId);
  const placementMode = useConfigStore((s) => s.placementMode);
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const startPlacement = useConfigStore((s) => s.startPlacement);
  const cancelPlacement = useConfigStore((s) => s.cancelPlacement);
  const toggleSlopedRoof = useConfigStore((s) => s.toggleSlopedRoof);
  const toggleAluminumFloor = useConfigStore((s) => s.toggleAluminumFloor);
  const containerColor = useConfigStore((s) => s.containerColor);
  const containerRal = useConfigStore((s) => s.containerRal);
  const setContainerColor = useConfigStore((s) => s.setContainerColor);
  const cladding = useConfigStore((s) => s.cladding);
  const toggleCladding = useConfigStore((s) => s.toggleCladding);
  const setCladdingDirection = useConfigStore((s) => s.setCladdingDirection);
  const setCladdingColor = useConfigStore((s) => s.setCladdingColor);

  // Interior objects
  const interiorObjects = useConfigStore((s) => s.interiorObjects);
  const selectedInteriorId = useConfigStore((s) => s.selectedInteriorId);
  const addInteriorObject = useConfigStore((s) => s.addInteriorObject);
  const updateInteriorObject = useConfigStore((s) => s.updateInteriorObject);
  const removeInteriorObject = useConfigStore((s) => s.removeInteriorObject);
  const selectInteriorObject = useConfigStore((s) => s.selectInteriorObject);
  const [uploading, setUploading] = useState(false);

  const doors = elements.filter((e) => e.type === "door");
  const vents = elements.filter((e) => e.type === "ventilation");

  return (
    <aside className="w-80 min-w-80 h-full overflow-y-auto p-4 space-y-4 border-r border-[var(--border)]">
      <div className="mb-2">
        <h2 className="text-lg font-bold">⚙️ Konfigurasjon</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          20ft ISO – {CONTAINER.length} × {CONTAINER.width} × {CONTAINER.height} mm
        </p>
      </div>

      {/* Add element button */}
      <div className="space-y-2">
        {placementMode === "pending" ? (
          <div className="rounded-xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/5 p-4 text-center space-y-2">
            <p className="text-sm font-medium text-[var(--accent)]">
              👆 Klikk på en flate i 3D-visningen
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Velg flaten der elementet skal plasseres
            </p>
            <button
              onClick={cancelPlacement}
              className="text-xs px-3 py-1 rounded-lg bg-[var(--border)] hover:bg-[var(--border-hover)] transition-colors"
            >
              Avbryt
            </button>
          </div>
        ) : (
          <button
            onClick={startPlacement}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all
              bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]
              hover:shadow-lg hover:shadow-[var(--accent)]/25 active:scale-[0.98]"
          >
            + Legg til element
          </button>
        )}
      </div>

      {/* Element list */}
      {elements.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            🚪 Dører ({doors.length})
          </h3>
          {doors.map((el) => (
            <ElementCard key={el.id} el={el} isSelected={selectedId === el.id} />
          ))}
          {doors.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)] italic pl-2">Ingen dører</p>
          )}

          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mt-3">
            🌀 Utsparringer ({vents.length})
          </h3>
          {vents.map((el) => (
            <ElementCard key={el.id} el={el} isSelected={selectedId === el.id} />
          ))}
          {vents.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)] italic pl-2">Ingen utsparringer</p>
          )}
        </div>
      )}

      {elements.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)] text-center py-6 italic">
          Ingen elementer lagt til ennå.<br />
          Trykk knappen over for å starte.
        </p>
      )}

      {/* Interior 3D objects */}
      <div className="pt-4 border-t border-[var(--border)] space-y-2">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          📦 Interiørobjekter
        </h3>
        <label
          className={`block w-full py-2 px-4 rounded-xl font-semibold text-sm text-center transition-all cursor-pointer
            ${uploading
              ? "bg-[var(--border)] text-[var(--text-secondary)]"
              : "bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 border border-dashed border-[var(--accent)]"
            }`}
        >
          {uploading ? "Laster…" : "+ Last opp 3D-fil"}
          <input
            type="file"
            accept=".step,.stp,.glb,.gltf"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const ext = file.name.split(".").pop().toLowerCase();
                let geometryData;
                if (ext === "glb" || ext === "gltf") {
                  geometryData = await loadGlbFile(file);
                } else {
                  geometryData = await loadStepFile(file);
                }
                if (geometryData && geometryData.length > 0) {
                  addInteriorObject({ name: file.name, geometryData });
                }
              } catch (err) {
                console.error("Failed to load 3D file:", err);
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
        </label>
        <p className="text-[10px] text-[var(--text-secondary)]">
          Støtter: .step, .stp, .glb, .gltf
        </p>

        {interiorObjects.map((obj) => {
          const isSel = selectedInteriorId === obj.id;
          return (
            <div
              key={obj.id}
              onClick={() => selectInteriorObject(obj.id)}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                isSel
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-md shadow-[var(--accent)]/10"
                  : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">📦 {obj.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeInteriorObject(obj.id); }}
                  className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-300 hover:bg-red-800 transition-colors"
                >
                  🗑
                </button>
              </div>
              {isSel && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
                  <NumberInput
                    label="X (mm fra bak-vegg)"
                    value={Math.round(obj.x)}
                    onChange={(v) => updateInteriorObject(obj.id, { x: v })}
                    min={0}
                    max={CONTAINER.length}
                  />
                  <NumberInput
                    label="Y (mm fra gulv)"
                    value={Math.round(obj.y)}
                    onChange={(v) => updateInteriorObject(obj.id, { y: v })}
                    min={0}
                    max={CONTAINER.height}
                  />
                  <NumberInput
                    label="Z (mm fra venstre vegg)"
                    value={Math.round(obj.z)}
                    onChange={(v) => updateInteriorObject(obj.id, { z: v })}
                    min={0}
                    max={CONTAINER.width}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Rotasjon Y</span>
                      <span>{Math.round((obj.rotY * 180) / Math.PI)}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={628}
                      value={Math.round(obj.rotY * 100)}
                      onChange={(e) => updateInteriorObject(obj.id, { rotY: Number(e.target.value) / 100 })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Skala</span>
                      <span>{obj.scale.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={500}
                      value={Math.round(obj.scale * 100)}
                      onChange={(e) => updateInteriorObject(obj.id, { scale: Number(e.target.value) / 100 })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-secondary)]">Farge:</span>
                    <input
                      type="color"
                      value={obj.color}
                      onChange={(e) => updateInteriorObject(obj.id, { color: e.target.value })}
                      className="w-8 h-6 rounded border border-[var(--border)] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Container color */}
      <div className="pt-4 border-t border-[var(--border)] space-y-2">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          🎨 Container farge
        </h3>
        {containerRal ? (
          <p className="text-xs text-[var(--text-primary)]">
            RAL {containerRal} – {RAL_COLORS.find((r) => r.code === containerRal)?.name || "Egendefinert"}
          </p>
        ) : (
          <p className="text-xs text-[var(--text-secondary)] italic">Standard stålgrå</p>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="RAL-kode (f.eks. 5010)"
            className="flex-1 px-2 py-1.5 rounded-lg text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const code = e.target.value.trim();
                const match = RAL_COLORS.find((r) => r.code === code);
                if (match) {
                  setContainerColor(match.code, match.hex);
                  e.target.value = "";
                }
              }
            }}
          />
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {RAL_COLORS.map((ral) => (
            <button
              key={ral.code}
              onClick={() => setContainerColor(ral.code, ral.hex)}
              title={`RAL ${ral.code} – ${ral.name}`}
              className={`aspect-square rounded-lg border-2 transition-all ${
                containerRal === ral.code
                  ? "border-[var(--accent)] scale-110 shadow-md"
                  : "border-transparent hover:border-[var(--border-hover)]"
              }`}
              style={{ backgroundColor: ral.hex }}
            />
          ))}
        </div>
        {containerRal && (
          <button
            onClick={() => setContainerColor(null, "#94a3b8")}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            ↩ Tilbakestill til standard
          </button>
        )}
      </div>

      {/* Global options */}
      <div className="pt-4 border-t border-[var(--border)] space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Globale valg
        </h3>
        <Toggle label="📐 Skråtak" checked={slopedRoof.enabled} onChange={toggleSlopedRoof} />
        {slopedRoof.enabled && (
          <p className="text-xs text-[var(--text-secondary)] pl-[52px]">
            6% fall langside · Alltid sort
          </p>
        )}
        <Toggle label="🪵 Aluminium gulvplate" checked={aluminumFloor.enabled} onChange={toggleAluminumFloor} />
      </div>

      {/* Cladding */}
      <div className="pt-4 border-t border-[var(--border)] space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          🪨 Kledning
        </h3>
        <Toggle label="Aktiver kledning" checked={cladding.enabled} onChange={toggleCladding} />
        {cladding.enabled && (
          <>
            <div className="flex gap-3 pl-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={cladding.direction === "horizontal"}
                  onChange={() => setCladdingDirection("horizontal")}
                  className="accent-[var(--accent)]"
                />
                Liggende
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={cladding.direction === "vertical"}
                  onChange={() => setCladdingDirection("vertical")}
                  className="accent-[var(--accent)]"
                />
                Stående
              </label>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Kledningsfarge: {cladding.ral ? `RAL ${cladding.ral}` : "Standard"}
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="RAL-kode"
                className="flex-1 px-2 py-1.5 rounded-lg text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const code = e.target.value.trim();
                    const match = RAL_COLORS.find((r) => r.code === code);
                    if (match) {
                      setCladdingColor(match.code, match.hex);
                      e.target.value = "";
                    }
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {RAL_COLORS.map((ral) => (
                <button
                  key={ral.code}
                  onClick={() => setCladdingColor(ral.code, ral.hex)}
                  title={`RAL ${ral.code} – ${ral.name}`}
                  className={`aspect-square rounded-lg border-2 transition-all ${
                    cladding.ral === ral.code
                      ? "border-[var(--accent)] scale-110 shadow-md"
                      : "border-transparent hover:border-[var(--border-hover)]"
                  }`}
                  style={{ backgroundColor: ral.hex }}
                />
              ))}
            </div>
            {cladding.ral && (
              <button
                onClick={() => setCladdingColor(null, "#94a3b8")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              >
                ↩ Tilbakestill kledningsfarge
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
