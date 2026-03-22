"use client";

import { useState, useEffect } from "react";
import useConfigStore, { CONTAINER_SIZES, getWallDims, getActiveDims, RAL_COLORS } from "../store/useConfigStore";
import { loadStepFile, loadGlbFile } from "../lib/stepLoader";
import { supabase } from "../lib/supabase";

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
  const unlockedId = useConfigStore((s) => s.unlockedId);
  const toggleUnlock = useConfigStore((s) => s.toggleUnlock);
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);
  const wallDim = getWallDims(customDims || CONTAINER_SIZES[containerSize])[el.wall];
  const isUnlocked = unlockedId === el.id;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">
          Vegg: <strong className="text-[var(--text-primary)]">{WALL_LABELS[el.wall]}</strong>
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => toggleUnlock(el.id)}
            className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
              isUnlocked
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            {isUnlocked ? "🔓 Låst opp" : "🔒 Lås opp"}
          </button>
          <button
            onClick={() => removeElement(el.id)}
            className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-300 hover:bg-red-800 transition-colors"
          >
            🗑 Slett
          </button>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)] italic">
        {isUnlocked ? "Plassering redigeres i 3D-visningen · Dra elementet for å flytte" : "🔒 Lås opp for å endre plassering"}
      </p>

      <div className="flex gap-2 text-xs text-[var(--text-secondary)]">
        <span>X: {el.x} mm</span>
        <span>·</span>
        <span>Y: {el.y} mm</span>
      </div>

      {isUnlocked && (
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
      )}

      {el.type === "door" && (
        <>
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Størrelse</p>
            <div className="flex gap-2">
              {[
                { w: 1000, h: 2100, label: "Enkel (1000×2100)" },
                { w: 2000, h: 2100, label: "Dobbel (2000×2100)" },
              ].map(({ w, h, label }) => (
                <button
                  key={w}
                  onClick={() => updateElement(el.id, { width: w, height: h })}
                  className={`flex-1 text-xs py-2 rounded-lg border transition-all cursor-pointer ${
                    el.width === w && el.height === h
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                      : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)] text-[var(--text-secondary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
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
          <Toggle
            label="Traforist"
            checked={!!el.grille}
            onChange={() => updateElement(el.id, { grille: !el.grille })}
          />
          <Toggle
            label="Eksos"
            checked={!!el.exhaust}
            onChange={() => updateElement(el.id, { exhaust: !el.exhaust })}
          />
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

export default function Sidebar({ userId, orgId, open, onClose }) {
  const elements = useConfigStore((s) => s.elements);
  const selectedId = useConfigStore((s) => s.selectedId);
  const placementMode = useConfigStore((s) => s.placementMode);
  const roofType = useConfigStore((s) => s.roofType);
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const startPlacement = useConfigStore((s) => s.startPlacement);
  const cancelPlacement = useConfigStore((s) => s.cancelPlacement);
  const setRoofType = useConfigStore((s) => s.setRoofType);
  const toggleAluminumFloor = useConfigStore((s) => s.toggleAluminumFloor);
  const containerColor = useConfigStore((s) => s.containerColor);
  const containerRal = useConfigStore((s) => s.containerRal);
  const setContainerColor = useConfigStore((s) => s.setContainerColor);
  const paintType = useConfigStore((s) => s.paintType);
  const setPaintType = useConfigStore((s) => s.setPaintType);
  const cladding = useConfigStore((s) => s.cladding);
  const toggleCladding = useConfigStore((s) => s.toggleCladding);
  const setCladdingDirection = useConfigStore((s) => s.setCladdingDirection);
  const setCladdingColor = useConfigStore((s) => s.setCladdingColor);
  const insulation = useConfigStore((s) => s.insulation);
  const toggleInsulation = useConfigStore((s) => s.toggleInsulation);
  const toggleInsulationWall = useConfigStore((s) => s.toggleInsulationWall);
  const containerSize = useConfigStore((s) => s.containerSize);
  const setContainerSize = useConfigStore((s) => s.setContainerSize);
  const customDims = useConfigStore((s) => s.customDims);
  const setCustomDim = useConfigStore((s) => s.setCustomDim);
  const cont = customDims || CONTAINER_SIZES[containerSize];

  // Interior objects
  const interiorObjects = useConfigStore((s) => s.interiorObjects);
  const selectedInteriorId = useConfigStore((s) => s.selectedInteriorId);
  const addInteriorObject = useConfigStore((s) => s.addInteriorObject);
  const updateInteriorObject = useConfigStore((s) => s.updateInteriorObject);
  const removeInteriorObject = useConfigStore((s) => s.removeInteriorObject);
  const selectInteriorObject = useConfigStore((s) => s.selectInteriorObject);
  const [uploading, setUploading] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);

  // Load STEP library files
  useEffect(() => {
    if (!supabase || !userId || !showLibrary) return;
    (async () => {
      let query = supabase
        .from("step_library")
        .select("id, file_name, storage_path, owner_id")
        .order("created_at", { ascending: false });
      if (orgId) {
        query = query.or(`owner_id.eq.${userId},org_id.eq.${orgId}`);
      } else {
        query = query.eq("owner_id", userId);
      }
      const { data } = await query;
      setLibraryFiles(data || []);
    })();
  }, [userId, orgId, showLibrary]);

  const saveToLibrary = async (file) => {
    if (!supabase || !userId) return;
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("step-files").upload(path, file);
    if (upErr) { console.error("Upload failed:", upErr); return; }
    await supabase.from("step_library").insert({
      owner_id: userId,
      org_id: orgId || null,
      file_name: file.name,
      storage_path: path,
    });
    // Refresh library list
    setShowLibrary(true);
    const { data } = await supabase
      .from("step_library")
      .select("id, file_name, storage_path, owner_id")
      .order("created_at", { ascending: false })
      .or(orgId ? `owner_id.eq.${userId},org_id.eq.${orgId}` : `owner_id.eq.${userId}`);
    setLibraryFiles(data || []);
  };

  const loadFromLibrary = async (entry) => {
    if (!supabase) return;
    setUploading(true);
    try {
      const { data, error } = await supabase.storage.from("step-files").download(entry.storage_path);
      if (error) throw error;
      const file = new File([data], entry.file_name);
      const ext = entry.file_name.split(".").pop().toLowerCase();
      let geometryData;
      if (ext === "glb" || ext === "gltf") {
        geometryData = await loadGlbFile(file);
      } else {
        geometryData = await loadStepFile(file);
      }
      if (geometryData && geometryData.length > 0) {
        addInteriorObject({ name: entry.file_name, geometryData });
      }
    } catch (err) {
      console.error("Failed to load from library:", err);
    } finally {
      setUploading(false);
    }
  };

  const doors = elements.filter((e) => e.type === "door");
  const vents = elements.filter((e) => e.type === "ventilation");

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`fixed top-0 left-0 bottom-0 w-80 overflow-y-auto p-4 space-y-4 border-r border-[var(--border)] bg-[var(--bg-card)] z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-20 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] lg:hidden z-10"
          aria-label="Lukk"
        >
          ✕
        </button>
      <div className="mb-2">
        <h2 className="text-lg font-bold">⚙️ Konfigurasjon</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {customDims ? "Egendefinert" : containerSize + " ISO"} – {cont.length} × {cont.width} × {cont.height} mm
        </p>
      </div>

      {/* Container size picker */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          📦 Containerstørrelse
        </h3>
        <div className="grid grid-cols-4 gap-1.5">
          {Object.keys(CONTAINER_SIZES).map((key) => (
            <button
              key={key}
              onClick={() => setContainerSize(key)}
              className={`px-2 py-2 text-xs font-semibold rounded-lg border transition-all ${
                containerSize === key && !customDims
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {[
            { key: "length", label: "L" },
            { key: "width", label: "B" },
            { key: "height", label: "H" },
          ].map(({ key, label }) => (
            <div key={key} className="flex flex-col">
              <label className="text-[10px] text-[var(--text-secondary)] mb-0.5">{label} (mm)</label>
              <input
                type="number"
                min={1000}
                value={cont[key]}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (v > 0) setCustomDim(key, v);
                }}
                className="w-full px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
              />
            </div>
          ))}
        </div>
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
          {uploading ? "Behandler fil…" : "+ Last opp 3D-fil"}
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
                  // Save to Supabase library if logged in
                  if (userId) saveToLibrary(file);
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

        {/* STEP Library */}
        {userId && (
          <div className="mt-2">
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="w-full text-xs py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              📚 {showLibrary ? "Skjul bibliotek" : "Vis 3D-bibliotek"}
            </button>
            {showLibrary && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {libraryFiles.length === 0 && (
                  <p className="text-[10px] text-[var(--text-secondary)]">Ingen lagrede filer ennå</p>
                )}
                {libraryFiles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => loadFromLibrary(f)}
                    disabled={uploading}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[var(--accent)]/10 transition-colors truncate cursor-pointer"
                    title={f.file_name}
                  >
                    📄 {f.file_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
                    max={cont.length}
                  />
                  <NumberInput
                    label="Y (mm fra gulv)"
                    value={Math.round(obj.y)}
                    onChange={(v) => updateInteriorObject(obj.id, { y: v })}
                    min={0}
                    max={cont.height}
                  />
                  <NumberInput
                    label="Z (mm fra venstre vegg)"
                    value={Math.round(obj.z)}
                    onChange={(v) => updateInteriorObject(obj.id, { z: v })}
                    min={0}
                    max={cont.width}
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

        {/* Paint type selector */}
        <div className="flex gap-2">
          {[{ key: "fargeskift", label: "Fargeskift" }, { key: "epoxy", label: "Epoxy" }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPaintType(paintType === key ? null : key)}
              className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                paintType === key
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {paintType && (
          <p className="text-[10px] text-[var(--text-secondary)] italic">
            {paintType === "epoxy" ? "Epoxy – høy slitestyrke, matt finish" : "Fargeskift – standard lakkering"}
          </p>
        )}
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
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)] mb-1.5">Taktype</p>
          <div className="flex gap-1.5">
            {[
              { value: "flat", label: "Flat" },
              { value: "sloped", label: "Skråtak" },
              { value: "gable", label: "Saltak" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRoofType(opt.value)}
                className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                  roofType === opt.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {roofType === "sloped" && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              6% fall langside · Renne + nedløp
            </p>
          )}
          {roofType === "gable" && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Saltak med møne · Renne + nedløp begge sider
            </p>
          )}
        </div>
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
                onClick={() => setCladdingColor(null, "#8B7355")}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              >
                ↩ Tilbakestill kledningsfarge
              </button>
            )}
          </>
        )}
      </div>

      {/* Insulation */}
      <div className="pt-4 border-t border-[var(--border)] space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          🧱 Isolasjon
        </h3>
        <Toggle label="Perforert isolasjon (50 mm)" checked={insulation.enabled} onChange={toggleInsulation} />
        {insulation.enabled && (
          <div className="space-y-2 pl-1">
            <p className="text-xs text-[var(--text-secondary)]">Velg flater med isolasjon:</p>
            <div className="flex flex-wrap gap-2">
              {["front", "back", "left", "right", "roof"].map((wall) => (
                <button
                  key={wall}
                  onClick={() => toggleInsulationWall(wall)}
                  className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                    insulation.walls.has(wall)
                      ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  {insulation.walls.has(wall) ? "✓ " : ""}{WALL_LABELS[wall]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]">
              Utsparringer og dører skjæres automatisk ut
            </p>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
