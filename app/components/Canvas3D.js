"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Raycaster } from "three";
import ContainerModel from "./ContainerModel";
import useConfigStore, { CONTAINER_SIZES } from "../store/useConfigStore";

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

  useEffect(() => {
    if (!dragging) return;
    const canvas = gl.domElement;
    const ray = rayRef.current;
    const c = CONTAINER_SIZES[containerSize];
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

  const handlePointerDown = useCallback(
    (event) => {
      const c = CONTAINER_SIZES[containerSize];
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

  const orbitTarget = useMemo(() => {
    const c = CONTAINER_SIZES[containerSize];
    return [0, c.height * S / 2, 0];
  }, [containerSize]);

  const [typePicker, setTypePicker] = useState(null);
  const [dragging, setDragging] = useState(null);

  const handleWallClick = useCallback(
    (wallName, localCoords) => {
      // Show type picker
      setTypePicker({ wall: wallName, ...localCoords });
    },
    []
  );

  const handleTypeSelect = useCallback(
    (type) => {
      if (typePicker) {
        placeElement(typePicker.wall, type, typePicker.x, typePicker.y);
      }
      setTypePicker(null);
    },
    [typePicker, placeElement]
  );

  const handleCancelPicker = useCallback(() => {
    setTypePicker(null);
  }, []);

  const handleDragStart = useCallback((elementId, wall, offsetX, offsetY) => {
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
      {typePicker && (
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
            <div className="flex gap-3">
              <button
                onClick={() => handleTypeSelect("door")}
                className="flex-1 py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]
                  hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all text-center group"
              >
                <div className="text-2xl mb-1">🚪</div>
                <div className="text-sm font-semibold group-hover:text-[var(--accent)]">Dør</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">1000 × 2100 mm</div>
              </button>
              <button
                onClick={() => handleTypeSelect("ventilation")}
                className="flex-1 py-4 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]
                  hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all text-center group"
              >
                <div className="text-2xl mb-1">🌀</div>
                <div className="text-sm font-semibold group-hover:text-[var(--accent)]">Ventilasjon</div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">400 × 300 mm</div>
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

      {/* Bottom hint */}
      <div className="absolute bottom-4 left-4 text-xs text-[var(--text-secondary)] bg-white/80 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-sm">
        Klikk og dra for å rotere · Scroll for å zoome
      </div>

      <ViewMenu />
    </div>
  );
}
