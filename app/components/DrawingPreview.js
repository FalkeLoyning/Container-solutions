"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import ContainerModel from "./ContainerModel";
import useConfigStore, { CONTAINER_SIZES, getWallDims } from "../store/useConfigStore";

const SC = 0.1; // mm -> SVG units
const PAD = 80;

const WALL_LABELS = { front: "Front", back: "Bak", left: "Venstre", right: "Høyre" };

// ── 3D Snapshot camera views ──────────────────────────────────────────
function getSnapshotViews(L, W, H) {
  const S = 0.001;
  const cl = L * S, cw = W * S, ch = H * S;
  const d = Math.max(cl, cw, ch) * 1.8;
  const cy = ch * 0.45;
  return [
    { label: "Front-høyre (ISO)", pos: [cl * 0.5 + d * 0.7, cy + d * 0.5, cw * 0.5 + d * 0.7], target: [0, cy, 0] },
    { label: "Front-venstre (ISO)", pos: [cl * 0.5 + d * 0.7, cy + d * 0.5, cw * 0.5 - d * 0.7], target: [0, cy, 0] },
    { label: "Bak-høyre (ISO)", pos: [cl * 0.5 - d * 0.7, cy + d * 0.5, cw * 0.5 + d * 0.7], target: [0, cy, 0] },
    { label: "Bak-venstre (ISO)", pos: [cl * 0.5 - d * 0.7, cy + d * 0.5, cw * 0.5 - d * 0.7], target: [0, cy, 0] },
    { label: "Topp skrå", pos: [cl * 0.3, cy + d * 1.2, cw * 0.3], target: [0, 0, 0] },
  ];
}

// Component inside Canvas that captures snapshots
function SnapshotCapture({ views, onCapture }) {
  const { gl, scene, camera } = useThree();
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) return;
    // Wait a frame for the scene to render
    const timer = setTimeout(() => {
      const results = [];
      const cam = camera.clone();
      cam.aspect = 4 / 3;
      cam.updateProjectionMatrix();

      // Temporarily set render target size
      const origSize = new THREE.Vector2();
      gl.getSize(origSize);
      gl.setSize(800, 600, false);

      for (const view of views) {
        cam.position.set(...view.pos);
        cam.lookAt(...view.target);
        cam.updateProjectionMatrix();
        gl.render(scene, cam);
        results.push({ label: view.label, dataUrl: gl.domElement.toDataURL("image/png") });
      }

      gl.setSize(origSize.x, origSize.y, false);
      captured.current = true;
      onCapture(results);
    }, 200);
    return () => clearTimeout(timer);
  }, [views, gl, scene, camera, onCapture]);

  return null;
}

// Off-screen Canvas that renders snapshots
function SnapshotRenderer({ onSnapshots }) {
  const views = useMemo(() => {
    const size = useConfigStore.getState().containerSize;
    const c = CONTAINER_SIZES[size];
    return getSnapshotViews(c.length, c.width, c.height);
  }, []);

  return (
    <div style={{ position: "absolute", left: -9999, top: -9999, width: 800, height: 600 }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [8, 5, 6], fov: 45 }}
        style={{ width: 800, height: 600, background: "#e2e8f0" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        <ContainerModel />
        <SnapshotCapture views={views} onCapture={onSnapshots} />
      </Canvas>
    </div>
  );
}

function ArrowMarker() {
  return (
    <defs>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
      </marker>
      <marker id="dimArrow" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="#60a5fa" />
      </marker>
      <marker id="dimArrowY" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
        <path d="M0,0 L5,2.5 L0,5 Z" fill="#f59e0b" />
      </marker>
    </defs>
  );
}

function DimensionLine({ x1, y1, x2, y2, label, offset = 25 }) {
  const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const ox = isHorizontal ? 0 : -offset;
  const oy = isHorizontal ? -offset : 0;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x1 + ox} y2={y1 + oy} stroke="#475569" strokeWidth={0.5} />
      <line x1={x2} y1={y2} x2={x2 + ox} y2={y2 + oy} stroke="#475569" strokeWidth={0.5} />
      <line
        x1={x1 + ox} y1={y1 + oy}
        x2={x2 + ox} y2={y2 + oy}
        stroke="#94a3b8" strokeWidth={0.8}
        markerStart="url(#arrow)" markerEnd="url(#arrow)"
      />
      <text
        x={mx + ox} y={my + oy - 4}
        fill="#e2e8f0" fontSize={10} textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

// Dimension annotations for a single element on a wall
function ElementDimensions({ el, viewW, viewH }) {
  const x = el.x * SC;
  const y = viewH - el.y * SC;
  const w = el.width * SC;
  const h = el.height * SC;
  const dimColor = "#60a5fa";
  const dimFontSize = 7;
  const extensionGap = 4;

  return (
    <g>
      {/* ── Width dimension (horizontal, above element) ── */}
      <line x1={x} y1={y - h} x2={x} y2={y - h - 18} stroke={dimColor} strokeWidth={0.4} />
      <line x1={x + w} y1={y - h} x2={x + w} y2={y - h - 18} stroke={dimColor} strokeWidth={0.4} />
      <line x1={x} y1={y - h - 14} x2={x + w} y2={y - h - 14}
        stroke={dimColor} strokeWidth={0.6}
        markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)" />
      <text x={x + w / 2} y={y - h - 17} fill={dimColor} fontSize={dimFontSize} textAnchor="middle">
        {el.width}
      </text>

      {/* ── Height dimension (vertical, right of element) ── */}
      <line x1={x + w} y1={y} x2={x + w + 18} y2={y} stroke={dimColor} strokeWidth={0.4} />
      <line x1={x + w} y1={y - h} x2={x + w + 18} y2={y - h} stroke={dimColor} strokeWidth={0.4} />
      <line x1={x + w + 14} y1={y} x2={x + w + 14} y2={y - h}
        stroke={dimColor} strokeWidth={0.6}
        markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)" />
      <text x={x + w + 17} y={y - h / 2 + 2} fill={dimColor} fontSize={dimFontSize} textAnchor="start">
        {el.height}
      </text>

      {/* ── X position from left edge ── */}
      {el.x > 0 && (
        <>
          <line x1={0} y1={y + 10} x2={x} y2={y + 10}
            stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="2,2"
            markerStart="url(#dimArrowY)" markerEnd="url(#dimArrowY)" />
          <text x={x / 2} y={y + 8} fill="#f59e0b" fontSize={6} textAnchor="middle">
            x={el.x}
          </text>
        </>
      )}

      {/* ── Y position from bottom edge ── */}
      {el.y > 0 && (
        <>
          <line x1={x - 10} y1={viewH} x2={x - 10} y2={y}
            stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="2,2"
            markerStart="url(#dimArrowY)" markerEnd="url(#dimArrowY)" />
          <text x={x - 13} y={viewH - (viewH - y) / 2 + 2} fill="#f59e0b" fontSize={6} textAnchor="end">
            y={el.y}
          </text>
        </>
      )}
    </g>
  );
}

// Renders elements on a specific wall in a 2D view
function WallElements({ elements, wallName, viewW, viewH, flip = false }) {
  const wallEls = elements.filter((e) => e.wall === wallName);

  return wallEls.map((el) => {
    const x = flip ? viewW - el.x * SC : el.x * SC;
    const y = viewH - el.y * SC; // flip Y for SVG (SVG Y goes down)

    if (el.type === "door") {
      const w = el.width * SC;
      const h = el.height * SC;
      return (
        <g key={el.id}>
          <rect
            x={flip ? x - w : x}
            y={y - h}
            width={w}
            height={h}
            fill="#92400e"
            fillOpacity={0.3}
            stroke="#b45309"
            strokeWidth={1.5}
          />
          <text
            x={flip ? x - w / 2 : x + w / 2}
            y={y - h / 2}
            fill="#e2e8f0"
            fontSize={7}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            D#{el.id}
          </text>
        </g>
      );
    }
    // ventilation
    const vw = el.width * SC;
    const vh = el.height * SC;
    if (el.shape === "circle") {
      const r = Math.min(vw, vh) / 2;
      return (
        <g key={el.id}>
          <circle
            cx={flip ? x - vw / 2 : x + vw / 2}
            cy={y - vh / 2}
            r={r}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1.5}
          />
          <text
            x={flip ? x - vw / 2 : x + vw / 2}
            y={y - vh / 2}
            fill="#1e293b"
            fontSize={6}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            V#{el.id}
          </text>
        </g>
      );
    }
    return (
      <g key={el.id}>
        <rect
          x={flip ? x - vw : x}
          y={y - vh}
          width={vw}
          height={vh}
          fill="none"
          stroke="#2563eb"
          strokeWidth={1.5}
        />
        <text
          x={flip ? x - vw / 2 : x + vw / 2}
          y={y - vh / 2}
          fill="#1e293b"
          fontSize={6}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          V#{el.id}
        </text>
      </g>
    );
  });
}

function WallView({ title, wallName, wallW, wallH, elements, slopedRoof }) {
  const w = wallW * SC;
  const h = wallH * SC;
  const isFront = wallName === "front";
  const drop = slopedRoof && isFront ? 400 * SC : 0;
  const wallEls = elements.filter((e) => e.wall === wallName);

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">{title}</h3>
      <svg
        viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`}
        className="w-full bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]"
        style={{ maxHeight: 320 }}
      >
        <ArrowMarker />
        <rect x={0} y={drop} width={w} height={h - drop} fill="none" stroke="#94a3b8" strokeWidth={3} />

        <WallElements elements={elements} wallName={wallName} viewW={w} viewH={h} />

        {/* Element dimension annotations */}
        {wallEls.map((el) => (
          <ElementDimensions key={`dim-${el.id}`} el={el} viewW={w} viewH={h} />
        ))}

        {/* Wall dimensions */}
        <DimensionLine x1={0} y1={h} x2={w} y2={h} label={`${wallW} mm`} offset={30} />
        <DimensionLine x1={0} y1={drop} x2={0} y2={h} label={`${wallH - (slopedRoof && isFront ? 400 : 0)} mm`} offset={30} />

        {/* Origin marker */}
        <circle cx={0} cy={h} r={3} fill="#34d399" />
        <text x={5} y={h - 5} fill="#34d399" fontSize={8}>Origo</text>

        <text x={w / 2} y={-PAD / 2 + 10} fill="#475569" fontSize={10} textAnchor="middle">
          {WALL_LABELS[wallName]} vegg
        </text>
      </svg>
    </div>
  );
}

function TopView({ elements, slopedRoof, CL, CW }) {
  const w = CL * SC;
  const h = CW * SC;

  // For top view we show elements on all walls projected
  const frontEls = elements.filter((e) => e.wall === "front");
  const backEls = elements.filter((e) => e.wall === "back");
  const leftEls = elements.filter((e) => e.wall === "left");
  const rightEls = elements.filter((e) => e.wall === "right");

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">Topp-visning (Top View)</h3>
      <svg
        viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`}
        className="w-full bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]"
        style={{ maxHeight: 200 }}
      >
        <ArrowMarker />
        <rect x={0} y={0} width={w} height={h} fill="none" stroke="#94a3b8" strokeWidth={3} />

        {/* Front wall elements (at x=L, shown at right side) */}
        {frontEls.map((el) => (
          <rect
            key={el.id}
            x={w - 4}
            y={el.x * SC}
            width={6}
            height={el.width * SC}
            fill={el.type === "door" ? "#92400e" : "#2563eb"}
            fillOpacity={0.6}
          />
        ))}

        {/* Back wall elements (at x=0, shown at left side) */}
        {backEls.map((el) => (
          <rect
            key={el.id}
            x={-2}
            y={el.x * SC}
            width={6}
            height={el.width * SC}
            fill={el.type === "door" ? "#92400e" : "#2563eb"}
            fillOpacity={0.6}
          />
        ))}

        {/* Left wall elements (at z=0, shown at top) */}
        {leftEls.map((el) => (
          <rect
            key={el.id}
            x={el.x * SC}
            y={-2}
            width={el.width * SC}
            height={6}
            fill={el.type === "door" ? "#92400e" : "#2563eb"}
            fillOpacity={0.6}
          />
        ))}

        {/* Right wall elements (at z=W, shown at bottom) */}
        {rightEls.map((el) => (
          <rect
            key={el.id}
            x={(CL - el.x) * SC - el.width * SC}
            y={h - 4}
            width={el.width * SC}
            height={6}
            fill={el.type === "door" ? "#92400e" : "#2563eb"}
            fillOpacity={0.6}
          />
        ))}

        <DimensionLine x1={0} y1={h} x2={w} y2={h} label={`${CL} mm`} offset={30} />
        <DimensionLine x1={0} y1={0} x2={0} y2={h} label={`${CW} mm`} offset={30} />

        {/* Wall labels */}
        <text x={w + 15} y={h / 2} fill="#6b7280" fontSize={8} textAnchor="start">Front</text>
        <text x={-15} y={h / 2} fill="#6b7280" fontSize={8} textAnchor="end">Bak</text>
        <text x={w / 2} y={-10} fill="#6b7280" fontSize={8} textAnchor="middle">Venstre</text>
        <text x={w / 2} y={h + 20} fill="#6b7280" fontSize={8} textAnchor="middle">Høyre</text>
      </svg>
    </div>
  );
}

export default function DrawingPreview() {
  const elements = useConfigStore((s) => s.elements);
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const setShowDrawing = useConfigStore((s) => s.setShowDrawing);
  const containerSize = useConfigStore((s) => s.containerSize);
  const c = CONTAINER_SIZES[containerSize];
  const CL = c.length, CW = c.width, CH = c.height;
  const wallDims = getWallDims(c);

  const doors = elements.filter((e) => e.type === "door");
  const vents = elements.filter((e) => e.type === "ventilation");

  const [snapshots, setSnapshots] = useState(null);

  // All 4 side walls always shown
  const allWalls = ["front", "back", "left", "right"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => setShowDrawing(false)}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📐 Produksjonstegninger</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {containerSize} ISO Container – {CL} × {CW} × {CH} mm · {elements.length} elementer
            </p>
          </div>
          <button
            onClick={() => setShowDrawing(false)}
            className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]
              hover:border-[var(--border-hover)] transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* ── 3D Snapshot views ── */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">📸 3D-visninger (ISO-perspektiv)</h3>
          {!snapshots ? (
            <div className="text-center py-8 text-sm text-[var(--text-secondary)]">
              <div className="animate-pulse mb-2">⏳</div>
              Genererer 3D-bilder fra alle sider...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {snapshots.map((snap, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-[var(--border)]">
                  <img src={snap.dataUrl} alt={snap.label} className="w-full" />
                  <div className="text-xs text-center py-1.5 bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                    {snap.label}
                  </div>
                </div>
              ))}
            </div>
          )}
          <SnapshotRenderer onSnapshots={setSnapshots} />
        </div>

        {/* Top view */}
        <TopView elements={elements} slopedRoof={slopedRoof.enabled} CL={CL} CW={CW} />

        {/* All 4 wall views with element dimensions */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">📏 Veggvisninger med mål</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {allWalls.map((wall) => (
              <WallView
                key={wall}
                title={`${WALL_LABELS[wall]} vegg`}
                wallName={wall}
                wallW={wallDims[wall].w}
                wallH={wallDims[wall].h}
                elements={elements}
                slopedRoof={slopedRoof.enabled}
              />
            ))}
          </div>
        </div>

        {/* Specs table */}
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 text-sm space-y-2 border border-[var(--border)]">
          <h4 className="font-semibold text-[var(--accent)]">Spesifikasjoner</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <span className="text-[var(--text-secondary)]">Container type:</span>
            <span>{containerSize} ISO{containerSize.includes("HC") ? " High Cube" : " Standard"}</span>
            <span className="text-[var(--text-secondary)]">Ytre mål:</span>
            <span>{CL} × {CW} × {CH} mm</span>
            {slopedRoof.enabled && (
              <>
                <span className="text-[var(--text-secondary)]">Tak:</span>
                <span>Skråtak, 400mm fall mot front</span>
              </>
            )}
          </div>

          {doors.length > 0 && (
            <div className="mt-2">
              <h5 className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Dører ({doors.length})</h5>
              {doors.map((d) => (
                <div key={d.id} className="text-xs grid grid-cols-2 gap-x-8">
                  <span className="text-[var(--text-secondary)]">#{d.id} ({WALL_LABELS[d.wall]}):</span>
                  <span>{d.width} × {d.height} mm @ ({d.x}, {d.y})</span>
                </div>
              ))}
            </div>
          )}

          {vents.length > 0 && (
            <div className="mt-2">
              <h5 className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Utsparringer ({vents.length})</h5>
              {vents.map((v) => (
                <div key={v.id} className="text-xs grid grid-cols-2 gap-x-8">
                  <span className="text-[var(--text-secondary)]">#{v.id} ({WALL_LABELS[v.wall]}):</span>
                  <span>{v.width} × {v.height} mm ({v.shape === "circle" ? "sirkel" : "rekt."}) @ ({v.x}, {v.y})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--text-secondary)] text-center italic">
          Mock tegning – ikke for produksjon · Origo = nederste venstre hjørne per vegg
        </p>
      </div>
    </div>
  );
}
