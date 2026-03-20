"use client";

import dynamic from "next/dynamic";
import Sidebar from "./components/Sidebar";
import ActiveFeatures from "./components/ActiveFeatures";
import DrawingPreview from "./components/DrawingPreview";
import useConfigStore from "./store/useConfigStore";

// Dynamically import Canvas3D to avoid SSR issues with Three.js
const Canvas3D = dynamic(() => import("./components/Canvas3D"), { ssr: false });

export default function Home() {
  const showDrawing = useConfigStore((s) => s.showDrawing);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left panel – Feature controls */}
      <Sidebar />

      {/* Center – 3D Viewer */}
      <Canvas3D />

      {/* Right panel – Active features + generate */}
      <ActiveFeatures />

      {/* Drawing overlay */}
      {showDrawing && <DrawingPreview />}
    </div>
  );
}
