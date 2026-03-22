"use client";

import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import ContainerModel from "../../components/ContainerModel";
import useConfigStore, { CONTAINER_SIZES } from "../../store/useConfigStore";

const S = 0.001;
const WALL_LABELS = { front: "Front", back: "Bak", left: "Venstre", right: "Høyre", floor: "Gulv", roof: "Tak" };

function ViewMenu() {
  const [open, setOpen] = useState(false);
  const hiddenWalls = useConfigStore((s) => s.hiddenWalls);
  const toggleWallVisibility = useConfigStore((s) => s.toggleWallVisibility);

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
        <div className="mt-2 w-52 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-[var(--border)] p-3 space-y-2">
          <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Snittvisning</h4>
          <p className="text-[10px] text-[var(--text-secondary)]">Skjul vegger/tak for å se inni</p>
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
      )}
    </div>
  );
}

export default function ShareViewer3D() {
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);

  const orbitTarget = useMemo(() => {
    const c = customDims || CONTAINER_SIZES[containerSize];
    return [0, c.height * S / 2, 0];
  }, [containerSize, customDims]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [8, 5, 6], fov: 45 }}
        shadows
        style={{ background: "#e2e8f0" }}
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

        <ContainerModel />

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
          target={orbitTarget}
        />
      </Canvas>

      <ViewMenu />

      <div className="absolute bottom-4 left-4 text-xs text-[var(--text-secondary)] bg-white/80 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-sm">
        Klikk og dra for å rotere · Scroll for å zoome
      </div>
    </div>
  );
}
