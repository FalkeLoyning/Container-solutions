"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Html, Line } from "@react-three/drei";
import { Raycaster } from "three";
import ContainerModel from "./ContainerModel";
import useConfigStore, { CONTAINER_SIZES, getWallDims, getActiveDims } from "../store/useConfigStore";

const S = 0.001;

// Converts a 3D click point on a wall mesh to wall-local coordinates (mm, origin bottom-left)
// For vertical walls, Y=0 is at the floor surface (floorHeight above ground)
function worldToWallLocal(wallName, point, L, W, F) {
  // point is in group-local coords (group is offset by -L/2, 0, -W/2)
  // so we need to add the group offset back
  const px = point.x + L / 2;
  const py = point.y;
  const pz = point.z + W / 2;

  switch (wallName) {
    case "front":
      return { x: Math.round((W - pz) / S), y: Math.round((py - F) / S) };
    case "back":
      return { x: Math.round(pz / S), y: Math.round((py - F) / S) };
    case "left":
      return { x: Math.round(px / S), y: Math.round((py - F) / S) };
    case "right":
      return { x: Math.round((L - px) / S), y: Math.round((py - F) / S) };
    case "floor":
      return { x: Math.round(px / S), y: Math.round(pz / S) };
    case "roof":
      return { x: Math.round(px / S), y: Math.round(pz / S) };
    default:
      return { x: 0, y: 0 };
  }
}

function DragHandler({ dragging, onDragMove, onDragEnd }) {
  const { camera, scene, gl } = useThree();
  const rayRef = useRef(null);
  if (!rayRef.current) rayRef.current = new Raycaster();
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);

  useEffect(() => {
    if (!dragging) return;
    const canvas = gl.domElement;
    const ray = rayRef.current;
    const c = customDims || CONTAINER_SIZES[containerSize];
    const cL = c.length * S, cW = c.width * S, cF = c.floorHeight * S;

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
      ray.setFromCamera(mouse, camera);
      const wallMeshes = [];
      scene.traverse((obj) => {
        if (obj.isMesh && obj.userData?.wall === dragging.wall && !obj.userData?.elementId) {
          wallMeshes.push(obj);
        }
      });
      const hits = ray.intersectObjects(wallMeshes, false);
      if (hits.length > 0) {
        onDragMove(worldToWallLocal(dragging.wall, hits[0].point, cL, cW, cF));
      }
    };

    const onUp = () => onDragEnd();

    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, onDragMove, onDragEnd, camera, scene, gl, containerSize]);

  return null;
}

function ClickableScene({ onWallClick, onDragStart, dragging }) {
  const placementMode = useConfigStore((s) => s.placementMode);
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);

  const handlePointerDown = useCallback(
    (event) => {
      const c = customDims || CONTAINER_SIZES[containerSize];
      const cL = c.length * S, cW = c.width * S, cF = c.floorHeight * S;

      if (placementMode === "pending") {
        let obj = event.object;
        while (obj) {
          if (obj.userData?.wall && !obj.userData?.elementId) {
            const wallName = obj.userData.wall;
            const localCoords = worldToWallLocal(wallName, event.point, cL, cW, cF);
            onWallClick(wallName, localCoords);
            event.stopPropagation();
            return;
          }
          obj = obj.parent;
        }
        return;
      }

      let obj = event.object;
      while (obj) {
        if (obj.userData?.interiorId) {
          useConfigStore.getState().selectInteriorObject(obj.userData.interiorId);
          event.stopPropagation();
          return;
        }
        if (obj.userData?.elementId) {
          const elements = useConfigStore.getState().elements;
          const el = elements.find((e) => e.id === obj.userData.elementId);
          if (el) {
            const wallLocal = worldToWallLocal(el.wall, event.point, cL, cW, cF);
            onDragStart(el.id, el.wall, wallLocal.x - el.x, wallLocal.y - el.y);
            event.stopPropagation();
            return;
          }
        }
        obj = obj.parent;
      }
    },
    [placementMode, onWallClick, onDragStart, containerSize]
  );

  return (
    <group onPointerDown={handlePointerDown}>
      <ContainerModel />
    </group>
  );
}

const WALL_LABELS = { front: "Front", back: "Bak", left: "Venstre", right: "Høyre", floor: "Gulv", roof: "Tak" };

// Compute 3D positions for dimension lines on a wall
function getWallDimPositions(wall, el, c) {
  const L = c.length * S, W = c.width * S, H = c.height * S;
  const T = c.wallThickness * S, F = c.floorHeight * S;
  const off = T / 2 + 0.08; // offset outward from wall for dimension lines
  const elW = el.width * S, elH = el.height * S;
  const elX = el.x * S, elY = el.y * S;

  // x-dim: horizontal line from wall left edge to element left edge
  // y-dim: vertical line from wall bottom to element bottom edge
  // We need: wall left-corner 3D pos, element left-edge 3D pos, element bottom 3D pos, wall bottom 3D pos

  switch (wall) {
    case "front": {
      const baseZ = W; // left edge of front wall (viewed from outside) = z=W
      return {
        xStart: [L + off, F, baseZ],
        xEnd:   [L + off, F, baseZ - elX],
        xLabel: [L + off, F - 0.04, baseZ - elX / 2],
        xElEnd: [L + off, F, baseZ - elX - elW],
        yStart: [L + off, F, baseZ - elX - elW / 2],
        yEnd:   [L + off, F + elY, baseZ - elX - elW / 2],
        yLabel: [L + off, F + elY / 2, baseZ - elX - elW / 2 - 0.04],
      };
    }
    case "back": {
      return {
        xStart: [-off, F, 0],
        xEnd:   [-off, F, elX],
        xLabel: [-off, F - 0.04, elX / 2],
        xElEnd: [-off, F, elX + elW],
        yStart: [-off, F, elX + elW / 2],
        yEnd:   [-off, F + elY, elX + elW / 2],
        yLabel: [-off, F + elY / 2, elX + elW / 2 + 0.04],
      };
    }
    case "left": {
      return {
        xStart: [0, F, -off],
        xEnd:   [elX, F, -off],
        xLabel: [elX / 2, F - 0.04, -off],
        xElEnd: [elX + elW, F, -off],
        yStart: [elX + elW / 2, F, -off],
        yEnd:   [elX + elW / 2, F + elY, -off],
        yLabel: [elX + elW / 2 - 0.04, F + elY / 2, -off],
      };
    }
    case "right": {
      return {
        xStart: [L, F, W + off],
        xEnd:   [L - elX, F, W + off],
        xLabel: [L - elX / 2, F - 0.04, W + off],
        xElEnd: [L - elX - elW, F, W + off],
        yStart: [L - elX - elW / 2, F, W + off],
        yEnd:   [L - elX - elW / 2, F + elY, W + off],
        yLabel: [L - elX - elW / 2 + 0.04, F + elY / 2, W + off],
      };
    }
    default:
      return null;
  }
}

function DimensionOverlay() {
  const selectedId = useConfigStore((s) => s.selectedId);
  const unlockedId = useConfigStore((s) => s.unlockedId);
  const elements = useConfigStore((s) => s.elements);
  const updateElement = useConfigStore((s) => s.updateElement);
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);
  const c = customDims || CONTAINER_SIZES[containerSize];
  const wd = getWallDims(c);

  const el = elements.find((e) => e.id === selectedId);
  if (!el || el.wall === "floor" || el.wall === "roof") return null;

  const isUnlocked = unlockedId === el.id;
  const dim = getWallDimPositions(el.wall, el, c);
  if (!dim) return null;

  const wallDim = wd[el.wall];
  const lineColor = isUnlocked ? "#0284c7" : "#94a3b8";
  const tickLen = 0.03;

  // Tick marks (perpendicular to dimension line)
  const xTickDir = [0, tickLen, 0]; // vertical ticks for horizontal line

  const inputStyle = (unlocked) => ({
    width: "72px", textAlign: "center", fontSize: "11px", fontWeight: 700,
    background: unlocked ? "rgba(255,255,255,0.95)" : "rgba(241,245,249,0.9)",
    border: `1.5px solid ${unlocked ? "#0284c7" : "#94a3b8"}`,
    borderRadius: "6px", padding: "2px 4px",
    color: unlocked ? "#0284c7" : "#64748b",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)", outline: "none",
    cursor: unlocked ? "text" : "default",
  });

  // X label position: midpoint of line if x>0, otherwise at element left edge
  const xLabelPos = el.x > 0 ? dim.xLabel : dim.xEnd;
  // Y label position: midpoint of line if y>0, otherwise at element bottom
  const yLabelPos = el.y > 0 ? dim.yLabel : dim.yStart;

  return (
    <group position={[-c.length * S / 2, 0, -c.width * S / 2]}>
      {/* X dimension line (from left wall edge to element left) */}
      {el.x > 0 && (
        <>
          <Line points={[dim.xStart, dim.xEnd]} color={lineColor} lineWidth={2} />
          <Line
            points={[
              [dim.xStart[0], dim.xStart[1] - tickLen, dim.xStart[2]],
              [dim.xStart[0], dim.xStart[1] + tickLen, dim.xStart[2]],
            ]}
            color={lineColor} lineWidth={2}
          />
          <Line
            points={[
              [dim.xEnd[0], dim.xEnd[1] - tickLen, dim.xEnd[2]],
              [dim.xEnd[0], dim.xEnd[1] + tickLen, dim.xEnd[2]],
            ]}
            color={lineColor} lineWidth={2}
          />
        </>
      )}
      {/* X input (always visible) */}
      <Html position={xLabelPos} center style={{ pointerEvents: "auto" }}>
        <input
          type="number"
          value={el.x}
          onChange={(e) => {
            const v = e.target.value;
            updateElement(el.id, { x: v === "" ? 0 : Math.max(0, Math.min(wallDim.w - el.width, parseInt(v) || 0)) });
          }}
          disabled={!isUnlocked}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={inputStyle(isUnlocked)}
          title="X – avstand fra venstre kant (mm)"
        />
      </Html>

      {/* Y dimension line (from bottom to element bottom) */}
      {el.y > 0 && (
        <>
          <Line points={[dim.yStart, dim.yEnd]} color={lineColor} lineWidth={2} />
          <Line
            points={[
              [dim.yStart[0] - tickLen, dim.yStart[1], dim.yStart[2]],
              [dim.yStart[0] + tickLen, dim.yStart[1], dim.yStart[2]],
            ]}
            color={lineColor} lineWidth={2}
          />
          <Line
            points={[
              [dim.yEnd[0] - tickLen, dim.yEnd[1], dim.yEnd[2]],
              [dim.yEnd[0] + tickLen, dim.yEnd[1], dim.yEnd[2]],
            ]}
            color={lineColor} lineWidth={2}
          />
        </>
      )}
      {/* Y input (always visible) */}
      <Html position={yLabelPos} center style={{ pointerEvents: "auto" }}>
        <input
          type="number"
          value={el.y}
          onChange={(e) => {
            const v = e.target.value;
            updateElement(el.id, { y: v === "" ? 0 : Math.max(0, Math.min(wallDim.h - el.height, parseInt(v) || 0)) });
          }}
          disabled={!isUnlocked}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={inputStyle(isUnlocked)}
          title="Y – avstand fra bunn (mm)"
        />
      </Html>
    </group>
  );
}

function ViewMenu() {
  const [open, setOpen] = useState(false);
  const hiddenWalls = useConfigStore((s) => s.hiddenWalls);
  const toggleWallVisibility = useConfigStore((s) => s.toggleWallVisibility);
  const containerDoor = useConfigStore((s) => s.containerDoor);
  const toggleContainerDoor = useConfigStore((s) => s.toggleContainerDoor);
  const setContainerDoorWall = useConfigStore((s) => s.setContainerDoorWall);

  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-3 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
          open ? "bg-[var(--accent)] text-white" : "bg-white/90 text-[var(--text-primary)] hover:bg-white"
        } backdrop-blur-sm`}
      >
        👁 Visning
      </button>
      {open && (
        <div className="mt-2 w-56 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-[var(--border)] p-3 space-y-3">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Snittvisning</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {["front", "back", "left", "right", "floor", "roof"].map((wall) => (
                <button
                  key={wall}
                  onClick={() => toggleWallVisibility(wall)}
                  className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                    hiddenWalls.has(wall)
                      ? "border-red-300 bg-red-50 text-red-500 line-through"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[var(--accent)]"
                  }`}
                >
                  {hiddenWalls.has(wall) ? "🚫" : "👁"} {WALL_LABELS[wall]}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-200 pt-2 space-y-2">
            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Containerdør</h4>
            <button
              onClick={toggleContainerDoor}
              className={`w-full px-2 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                containerDoor.enabled
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-[var(--accent)]"
              }`}
            >
              🚛 {containerDoor.enabled ? "Skjul" : "Vis"} containerdør
            </button>
            {containerDoor.enabled && (
              <div className="flex gap-2">
                {["front", "back"].map((w) => (
                  <button
                    key={w}
                    onClick={() => setContainerDoorWall(w)}
                    className={`flex-1 px-2 py-1 text-[11px] rounded-md border transition-all ${
                      containerDoor.wall === w
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-[var(--accent)]"
                    }`}
                  >
                    {w === "front" ? "Front" : "Bak"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Canvas3D() {
  const placementMode = useConfigStore((s) => s.placementMode);
  const placeElement = useConfigStore((s) => s.placeElement);
  const selectElement = useConfigStore((s) => s.selectElement);
  const updateElement = useConfigStore((s) => s.updateElement);
  const cancelPlacement = useConfigStore((s) => s.cancelPlacement);
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);

  const orbitTarget = useMemo(() => {
    const c = customDims || CONTAINER_SIZES[containerSize];
    return [0, c.height * S / 2, 0];
  }, [containerSize, customDims]);

  const [typePicker, setTypePicker] = useState(null);
  const [ventSizeInput, setVentSizeInput] = useState(null); // { width, height }
  const [dragging, setDragging] = useState(null);

  const handleWallClick = useCallback(
    (wallName, localCoords) => {
      // Show type picker
      setTypePicker({ wall: wallName, ...localCoords });
    },
    []
  );

  const handleTypeSelect = useCallback(
    (type, opts) => {
      if (type === "ventilation") {
        // Show vent size input instead of placing immediately
        setVentSizeInput({ width: 400, height: 300 });
        return;
      }
      if (typePicker) {
        placeElement(typePicker.wall, type, typePicker.x, typePicker.y, opts);
      }
      setTypePicker(null);
    },
    [typePicker, placeElement]
  );

  const handleVentConfirm = useCallback(() => {
    if (typePicker && ventSizeInput) {
      const w = Math.max(1, parseInt(ventSizeInput.width) || 400);
      const h = Math.max(1, parseInt(ventSizeInput.height) || 300);
      placeElement(typePicker.wall, "ventilation", typePicker.x, typePicker.y, {
        ventWidth: w,
        ventHeight: h,
      });
    }
    setVentSizeInput(null);
    setTypePicker(null);
  }, [typePicker, ventSizeInput, placeElement]);

  const handleCancelPicker = useCallback(() => {
    setTypePicker(null);
    setVentSizeInput(null);
  }, []);

  const handleDragStart = useCallback((elementId, wall, offsetX, offsetY) => {
    const unlocked = useConfigStore.getState().unlockedId;
    if (unlocked !== elementId) {
      selectElement(elementId);
      return; // Just select, don't start drag — element is locked
    }
    selectElement(elementId);
    setDragging({ elementId, wall, offsetX, offsetY });
  }, [selectElement]);

  const handleDragMove = useCallback((localCoords) => {
    if (!dragging) return;
    updateElement(dragging.elementId, {
      x: Math.round(localCoords.x - dragging.offsetX),
      y: Math.round(localCoords.y - dragging.offsetY),
    });
  }, [dragging, updateElement]);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [8, 5, 6], fov: 45 }}
        shadows
        style={{ cursor: dragging ? "grabbing" : placementMode === "pending" ? "crosshair" : "auto", background: "#e2e8f0" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />

        <ClickableScene onWallClick={handleWallClick} onDragStart={handleDragStart} dragging={dragging} />
        <DragHandler dragging={dragging} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />
        <DimensionOverlay />

        <Grid
          args={[20, 20]}
          position={[0, 0, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={25}
          infiniteGrid
        />

        <OrbitControls
          makeDefault
          enabled={!dragging}
          enableDamping
          dampingFactor={0.1}
          minDistance={3}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={orbitTarget}
        />
      </Canvas>

      {/* Placement mode banner */}
      {placementMode === "pending" && !typePicker && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl
          bg-[var(--accent)] text-[var(--bg-primary)] font-semibold text-sm shadow-lg
          shadow-[var(--accent)]/30 animate-pulse">
          👆 Klikk på en flate for å plassere element
        </div>
      )}

      {/* Type picker popup */}
      {typePicker && !ventSizeInput && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleCancelPicker}
          />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl z-20 space-y-4 min-w-[280px]">
            <h3 className="text-base font-bold text-center">
              Velg elementtype
            </h3>
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Vegg: <strong className="text-[var(--text-primary)]">
                {{ front: "Front", back: "Bak", left: "Venstre", right: "Høyre", floor: "Gulv", roof: "Tak" }[typePicker.wall]}
              </strong>
              {" · "}Pos: ({typePicker.x}, {typePicker.y}) mm
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTypeSelect("door", { doorWidth: 1000, doorHeight: 2100 })}
                className="py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]
                  hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all text-center group"
              >
                <div className="text-2xl mb-1">🚪</div>
                <div className="text-sm font-semibold group-hover:text-[var(--accent)]">Enkel dør</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">1000 × 2100</div>
              </button>
              <button
                onClick={() => handleTypeSelect("door", { doorWidth: 2000, doorHeight: 2100 })}
                className="py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]
                  hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all text-center group"
              >
                <div className="text-2xl mb-1">🚪🚪</div>
                <div className="text-sm font-semibold group-hover:text-[var(--accent)]">Dobbel dør</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">2000 × 2100</div>
              </button>
              <button
                onClick={() => handleTypeSelect("ventilation")}
                className="col-span-2 py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]
                  hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all text-center group"
              >
                <div className="text-2xl mb-1">🌀</div>
                <div className="text-sm font-semibold group-hover:text-[var(--accent)]">Ventilasjon</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Egendefinert størrelse</div>
              </button>
            </div>
            <button
              onClick={handleCancelPicker}
              className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Ventilation size input popup */}
      {typePicker && ventSizeInput && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleCancelPicker}
          />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl z-20 space-y-4 min-w-[300px]">
            <h3 className="text-base font-bold text-center">
              🌀 Ventilasjon — størrelse
            </h3>
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Oppgi bredde og høyde i millimeter
            </p>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Bredde (mm)</label>
                <input
                  type="number"
                  value={ventSizeInput.width}
                  onChange={(e) => setVentSizeInput((v) => ({ ...v, width: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleVentConfirm()}
                  autoFocus
                  className="w-full rounded-lg px-3 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)]
                    text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Høyde (mm)</label>
                <input
                  type="number"
                  value={ventSizeInput.height}
                  onChange={(e) => setVentSizeInput((v) => ({ ...v, height: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleVentConfirm()}
                  className="w-full rounded-lg px-3 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)]
                    text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelPicker}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)]
                  text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={handleVentConfirm}
                disabled={!parseInt(ventSizeInput.width) || !parseInt(ventSizeInput.height)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                  hover:shadow-lg hover:shadow-[var(--accent)]/25 active:scale-[0.98] transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--accent)" }}
              >
                Plasser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div className="absolute bottom-4 left-4 text-xs text-[var(--text-secondary)] bg-white/80 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-sm">
        Klikk og dra for å rotere · Scroll for å zoome
      </div>

      <ViewMenu />
    </div>
  );
}
