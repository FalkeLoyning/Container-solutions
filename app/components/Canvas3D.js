"use client";

import { useState, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import ContainerModel from "./ContainerModel";
import useConfigStore, { CONTAINER, WALL_DIMS } from "../store/useConfigStore";

const S = 0.001;
const L = CONTAINER.length * S;
const W = CONTAINER.width * S;
const H = CONTAINER.height * S;
const T = CONTAINER.wallThickness * S;

// Converts a 3D click point on a wall mesh to wall-local coordinates (mm, origin bottom-left)
function worldToWallLocal(wallName, point) {
  // point is in group-local coords (group is offset by -L/2, 0, -W/2)
  // so we need to add the group offset back
  const px = point.x + L / 2;
  const py = point.y;
  const pz = point.z + W / 2;

  switch (wallName) {
    case "front":
      // Front at x=L, viewed from outside (+X): local X = W - pz, local Y = py
      return { x: Math.round((W - pz) / S), y: Math.round(py / S) };
    case "back":
      // Back at x=0, viewed from outside (-X): local X = pz, local Y = py
      return { x: Math.round(pz / S), y: Math.round(py / S) };
    case "left":
      // Left at z=0, viewed from outside (-Z): local X = px, local Y = py
      return { x: Math.round(px / S), y: Math.round(py / S) };
    case "right":
      // Right at z=W, viewed from outside (+Z): local X = (L - px), local Y = py
      return { x: Math.round((L - px) / S), y: Math.round(py / S) };
    default:
      return { x: 0, y: 0 };
  }
}

function SceneClickHandler({ onWallClick }) {
  const { raycaster, scene, camera, pointer } = useThree();

  return (
    <mesh
      visible={false}
      onPointerDown={() => {}}
    />
  );
}

function ClickableScene({ onWallClick }) {
  const placementMode = useConfigStore((s) => s.placementMode);

  const handleClick = useCallback(
    (event) => {
      if (placementMode !== "pending") return;
      // Walk up the event chain to find which wall was hit
      let obj = event.object;
      while (obj) {
        if (obj.userData && obj.userData.wall) {
          const wallName = obj.userData.wall;
          const localCoords = worldToWallLocal(wallName, event.point);
          onWallClick(wallName, localCoords);
          event.stopPropagation();
          return;
        }
        obj = obj.parent;
      }
    },
    [placementMode, onWallClick]
  );

  return (
    <group onClick={handleClick}>
      <ContainerModel />
    </group>
  );
}

export default function Canvas3D() {
  const placementMode = useConfigStore((s) => s.placementMode);
  const placeElement = useConfigStore((s) => s.placeElement);
  const cancelPlacement = useConfigStore((s) => s.cancelPlacement);

  // State for showing type-picker popup after wall click
  const [typePicker, setTypePicker] = useState(null); // { wall, x, y, screenX, screenY }

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

  return (
    <div className="flex-1 h-full relative">
      <Canvas
        camera={{ position: [8, 5, 6], fov: 45 }}
        shadows
        className="!bg-transparent"
        style={{ cursor: placementMode === "pending" ? "crosshair" : "auto" }}
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

        <ClickableScene onWallClick={handleWallClick} />

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
          enableDamping
          dampingFactor={0.1}
          minDistance={3}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>

      {/* Placement mode banner */}
      {placementMode === "pending" && !typePicker && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl
          bg-[var(--accent)] text-[var(--bg-primary)] font-semibold text-sm shadow-lg
          shadow-[var(--accent)]/30 animate-pulse">
          👆 Klikk på en vegg for å plassere element
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
                {{ front: "Front", back: "Bak", left: "Venstre", right: "Høyre" }[typePicker.wall]}
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
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Ø300 mm</div>
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
      <div className="absolute bottom-4 left-4 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)]/80 px-3 py-1.5 rounded-lg backdrop-blur-sm">
        Klikk og dra for å rotere · Scroll for å zoome
      </div>
    </div>
  );
}
