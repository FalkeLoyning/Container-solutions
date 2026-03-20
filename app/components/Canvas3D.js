"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import ContainerModel from "./ContainerModel";

export default function Canvas3D() {
  return (
    <div className="flex-1 h-full relative">
      <Canvas
        camera={{ position: [8, 5, 6], fov: 45 }}
        shadows
        className="!bg-transparent"
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
        />
      </Canvas>

      {/* Overlay info */}
      <div className="absolute bottom-4 left-4 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)]/80 px-3 py-1.5 rounded-lg backdrop-blur-sm">
        Klikk og dra for å rotere · Scroll for å zoome
      </div>
    </div>
  );
}
