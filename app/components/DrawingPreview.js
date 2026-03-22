"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import ContainerModel from "./ContainerModel";
import useConfigStore, { CONTAINER_SIZES, getWallDims, getActiveDims, RAL_COLORS } from "../store/useConfigStore";

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
    const customDims = useConfigStore.getState().customDims;
    const c = customDims || CONTAINER_SIZES[size];
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
      <marker id="dimStart" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
        <path d="M6,0 L0,3 L6,6 Z" fill="#1e293b" />
      </marker>
      <marker id="dimEnd" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#1e293b" />
      </marker>
    </defs>
  );
}

function DimensionLine({ x1, y1, x2, y2, label, offset = 30, color = "#1e293b", fontSize = 9 }) {
  const dx = x2 - x1, dy = y2 - y1;
  const isHorizontal = Math.abs(dy) < Math.abs(dx);

  // Extension lines perpendicular to the dimension direction
  const ex = isHorizontal ? 0 : (offset > 0 ? -1 : 1) * Math.abs(offset);
  const ey = isHorizontal ? (offset > 0 ? -1 : 1) * Math.abs(offset) : 0;
  const mx = (x1 + x2) / 2 + ex;
  const my = (y1 + y2) / 2 + ey;

  // Text offset to avoid overlapping line
  const textOff = isHorizontal ? -4 : 6;

  return (
    <g>
      {/* Extension lines */}
      <line x1={x1} y1={y1} x2={x1 + ex} y2={y1 + ey} stroke={color} strokeWidth={0.4} />
      <line x1={x2} y1={y2} x2={x2 + ex} y2={y2 + ey} stroke={color} strokeWidth={0.4} />
      {/* Dimension line with arrows */}
      <line
        x1={x1 + ex} y1={y1 + ey}
        x2={x2 + ex} y2={y2 + ey}
        stroke={color} strokeWidth={0.6}
        markerStart="url(#dimStart)" markerEnd="url(#dimEnd)"
      />
      {/* Label */}
      {isHorizontal ? (
        <text x={mx} y={my + textOff} fill={color} fontSize={fontSize} textAnchor="middle" fontFamily="monospace">
          {label}
        </text>
      ) : (
        <text x={mx + textOff} y={my + 3} fill={color} fontSize={fontSize} textAnchor={offset > 0 ? "end" : "start"} fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );
}

// Dimension annotations for a single element on a wall
function ElementDimensions({ el, viewW, viewH }) {
  const x = el.x * SC;
  const y = viewH - el.y * SC;
  const w = el.width * SC;
  const h = el.height * SC;
  const dimColor = "#1e293b";
  const posColor = "#0369a1";
  const fontSize = 7;

  return (
    <g>
      {/* ── Element width dimension (horizontal, above element) ── */}
      <line x1={x} y1={y - h} x2={x} y2={y - h - 16} stroke={dimColor} strokeWidth={0.3} />
      <line x1={x + w} y1={y - h} x2={x + w} y2={y - h - 16} stroke={dimColor} strokeWidth={0.3} />
      <line x1={x} y1={y - h - 12} x2={x + w} y2={y - h - 12}
        stroke={dimColor} strokeWidth={0.5}
        markerStart="url(#dimStart)" markerEnd="url(#dimEnd)" />
      <text x={x + w / 2} y={y - h - 15} fill={dimColor} fontSize={fontSize} textAnchor="middle" fontFamily="monospace">
        {el.width}
      </text>

      {/* ── Element height dimension (vertical, right of element) ── */}
      <line x1={x + w} y1={y} x2={x + w + 16} y2={y} stroke={dimColor} strokeWidth={0.3} />
      <line x1={x + w} y1={y - h} x2={x + w + 16} y2={y - h} stroke={dimColor} strokeWidth={0.3} />
      <line x1={x + w + 12} y1={y} x2={x + w + 12} y2={y - h}
        stroke={dimColor} strokeWidth={0.5}
        markerStart="url(#dimStart)" markerEnd="url(#dimEnd)" />
      <text x={x + w + 15} y={y - h / 2 + 2} fill={dimColor} fontSize={fontSize} textAnchor="start" fontFamily="monospace">
        {el.height}
      </text>

      {/* ── Distance from left edge (X position) ── */}
      {el.x > 0 && (
        <g>
          <line x1={0} y1={y + 12} x2={x} y2={y + 12}
            stroke={posColor} strokeWidth={0.5}
            markerStart="url(#dimStart)" markerEnd="url(#dimEnd)" />
          <line x1={0} y1={y} x2={0} y2={y + 15} stroke={posColor} strokeWidth={0.3} />
          <line x1={x} y1={y} x2={x} y2={y + 15} stroke={posColor} strokeWidth={0.3} />
          <text x={x / 2} y={y + 10} fill={posColor} fontSize={6} textAnchor="middle" fontFamily="monospace">
            {el.x}
          </text>
        </g>
      )}

      {/* ── Distance from bottom edge (Y position) ── */}
      {el.y > 0 && (
        <g>
          <line x1={x - 12} y1={viewH} x2={x - 12} y2={y}
            stroke={posColor} strokeWidth={0.5}
            markerStart="url(#dimStart)" markerEnd="url(#dimEnd)" />
          <line x1={x} y1={viewH} x2={x - 15} y2={viewH} stroke={posColor} strokeWidth={0.3} />
          <line x1={x} y1={y} x2={x - 15} y2={y} stroke={posColor} strokeWidth={0.3} />
          <text x={x - 15} y={viewH - (viewH - y) / 2 + 2} fill={posColor} fontSize={6} textAnchor="end" fontFamily="monospace">
            {el.y}
          </text>
        </g>
      )}

      {/* ── Distance from right edge ── */}
      {(() => {
        const rightDist = Math.round(viewW / SC - el.x - el.width);
        if (rightDist > 0) {
          const rxStart = x + w;
          const rxEnd = viewW;
          return (
            <g>
              <line x1={rxStart} y1={y + 24} x2={rxEnd} y2={y + 24}
                stroke={posColor} strokeWidth={0.4} strokeDasharray="2,2"
                markerStart="url(#dimStart)" markerEnd="url(#dimEnd)" />
              <line x1={rxStart} y1={y} x2={rxStart} y2={y + 27} stroke={posColor} strokeWidth={0.2} />
              <line x1={rxEnd} y1={y} x2={rxEnd} y2={y + 27} stroke={posColor} strokeWidth={0.2} />
              <text x={(rxStart + rxEnd) / 2} y={y + 22} fill={posColor} fontSize={5.5} textAnchor="middle" fontFamily="monospace">
                {rightDist}
              </text>
            </g>
          );
        }
        return null;
      })()}
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

function WallView({ title, wallName, wallW, wallH, elements, roofType }) {
  const w = wallW * SC;
  const h = wallH * SC;
  const isFront = wallName === "front";
  const drop = roofType === "sloped" && isFront ? 400 * SC : 0;
  const wallEls = elements.filter((e) => e.wall === wallName);
  const floorH = 170; // floorHeight in mm

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      <svg
        viewBox={`${-PAD - 20} ${-PAD - 10} ${w + PAD * 2 + 40} ${h + PAD * 2 + 20}`}
        className="w-full rounded-lg border border-[var(--border)]"
        style={{ maxHeight: 350, background: "#ffffff" }}
      >
        <ArrowMarker />

        {/* Wall outline */}
        <rect x={0} y={drop} width={w} height={h - drop} fill="none" stroke="#334155" strokeWidth={2} />

        {/* Ground line (dashed) */}
        <line x1={-20} y1={h} x2={w + 20} y2={h} stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="6,3" />

        {/* Elements */}
        <WallElements elements={elements} wallName={wallName} viewW={w} viewH={h} />

        {/* Element dimension annotations */}
        {wallEls.map((el) => (
          <ElementDimensions key={`dim-${el.id}`} el={el} viewW={w} viewH={h} />
        ))}

        {/* ── Overall wall width ── */}
        <DimensionLine x1={0} y1={h} x2={w} y2={h} label={`${wallW}`} offset={40} />

        {/* ── Overall wall height ── */}
        <DimensionLine x1={0} y1={drop} x2={0} y2={h} label={`${wallH - (roofType === "sloped" && isFront ? 400 : 0)}`} offset={40} />

        {/* Wall label */}
        <text x={w / 2} y={-PAD / 2 + 5} fill="#334155" fontSize={11} textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
          {WALL_LABELS[wallName]} vegg — {wallW} × {wallH} mm
        </text>

        {/* Origin marker */}
        <circle cx={0} cy={h} r={2.5} fill="#0284c7" />
        <text x={5} y={h - 4} fill="#0284c7" fontSize={7} fontFamily="monospace">(0,0)</text>

        {/* Centerline */}
        <line x1={w / 2} y1={drop - 5} x2={w / 2} y2={h + 5} stroke="#94a3b8" strokeWidth={0.3} strokeDasharray="4,4" />
        <text x={w / 2} y={drop - 8} fill="#94a3b8" fontSize={5} textAnchor="middle">CL</text>
      </svg>
    </div>
  );
}

function TopView({ elements, roofType, CL, CW }) {
  const w = CL * SC;
  const h = CW * SC;

  const frontEls = elements.filter((e) => e.wall === "front");
  const backEls = elements.filter((e) => e.wall === "back");
  const leftEls = elements.filter((e) => e.wall === "left");
  const rightEls = elements.filter((e) => e.wall === "right");

  const elColor = (type) => (type === "door" ? "#92400e" : "#0369a1");

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Plantegning (Top View)</h3>
      <svg
        viewBox={`${-PAD - 20} ${-PAD - 10} ${w + PAD * 2 + 40} ${h + PAD * 2 + 20}`}
        className="w-full rounded-lg border border-[var(--border)]"
        style={{ maxHeight: 220, background: "#ffffff" }}
      >
        <ArrowMarker />

        {/* Container outline */}
        <rect x={0} y={0} width={w} height={h} fill="none" stroke="#334155" strokeWidth={2} />

        {/* Centerlines */}
        <line x1={w / 2} y1={-5} x2={w / 2} y2={h + 5} stroke="#94a3b8" strokeWidth={0.3} strokeDasharray="4,4" />
        <line x1={-5} y1={h / 2} x2={w + 5} y2={h / 2} stroke="#94a3b8" strokeWidth={0.3} strokeDasharray="4,4" />

        {/* Front wall elements (right side) */}
        {frontEls.map((el) => (
          <rect key={el.id} x={w - 4} y={el.x * SC} width={6} height={el.width * SC}
            fill={elColor(el.type)} fillOpacity={0.7} stroke={elColor(el.type)} strokeWidth={0.5} />
        ))}

        {/* Back wall elements (left side) */}
        {backEls.map((el) => (
          <rect key={el.id} x={-2} y={el.x * SC} width={6} height={el.width * SC}
            fill={elColor(el.type)} fillOpacity={0.7} stroke={elColor(el.type)} strokeWidth={0.5} />
        ))}

        {/* Left wall elements (top) */}
        {leftEls.map((el) => (
          <rect key={el.id} x={el.x * SC} y={-2} width={el.width * SC} height={6}
            fill={elColor(el.type)} fillOpacity={0.7} stroke={elColor(el.type)} strokeWidth={0.5} />
        ))}

        {/* Right wall elements (bottom) */}
        {rightEls.map((el) => (
          <rect key={el.id} x={(CL - el.x) * SC - el.width * SC} y={h - 4} width={el.width * SC} height={6}
            fill={elColor(el.type)} fillOpacity={0.7} stroke={elColor(el.type)} strokeWidth={0.5} />
        ))}

        {/* Dimensions */}
        <DimensionLine x1={0} y1={h} x2={w} y2={h} label={`${CL}`} offset={40} />
        <DimensionLine x1={0} y1={0} x2={0} y2={h} label={`${CW}`} offset={40} />

        {/* Wall labels */}
        <text x={w + 18} y={h / 2} fill="#334155" fontSize={8} textAnchor="start" fontWeight="bold" fontFamily="sans-serif">Front</text>
        <text x={-18} y={h / 2} fill="#334155" fontSize={8} textAnchor="end" fontWeight="bold" fontFamily="sans-serif">Bak</text>
        <text x={w / 2} y={-12} fill="#334155" fontSize={8} textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">Venstre</text>
        <text x={w / 2} y={h + 22} fill="#334155" fontSize={8} textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">Høyre</text>

        {/* Overall dims label */}
        <text x={w / 2} y={-PAD / 2 + 5} fill="#334155" fontSize={11} textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
          Plantegning — {CL} × {CW} mm
        </text>
      </svg>
    </div>
  );
}

function SpecRow({ label, value, icon }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-[var(--text-secondary)] min-w-[140px] shrink-0">{icon && `${icon} `}{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function FeatureList({ elements, containerSize, customDims, containerColor, containerRal, paintType, cladding, roofType, aluminumFloor, containerDoor, insulation, CL, CW, CH }) {
  const doors = elements.filter((e) => e.type === "door");
  const vents = elements.filter((e) => e.type === "ventilation");
  const grilles = vents.filter((v) => v.grille);
  const exhausts = vents.filter((v) => v.exhaust);

  const ralName = containerRal ? RAL_COLORS.find((r) => r.code === containerRal)?.name || "" : "";
  const claddingRalName = cladding.ral ? RAL_COLORS.find((r) => r.code === cladding.ral)?.name || "" : "";

  const paintLabel = paintType === "fargeskift" ? "Fargeskift (standard)" : paintType === "epoxy" ? "Epoxy (premium)" : "Ingen";

  return (
    <div className="bg-white rounded-lg p-5 border border-[var(--border)] print:break-inside-avoid">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2">
        Spesifikasjon og feature-liste
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
        {/* Container base */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-1.5">Container</h4>
          <SpecRow icon="📦" label="Type" value={`${containerSize} ISO${containerSize.includes("HC") ? " High Cube" : " Standard"}`} />
          <SpecRow icon="📐" label="Ytre mål (L×B×H)" value={`${CL} × ${CW} × ${CH} mm`} />
          {customDims && <SpecRow icon="✏️" label="Tilpassede mål" value="Ja (egendefinerte)" />}
        </div>

        {/* Paint */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-1.5">Overflatebehandling</h4>
          <SpecRow icon="🎨" label="Malingstype" value={paintLabel} />
          {containerRal && (
            <SpecRow icon="🔢" label="RAL-farge" value={`RAL ${containerRal} – ${ralName}`} />
          )}
          <SpecRow icon="🖌️" label="Farge" value={
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ background: containerColor }} />
              {containerColor}
            </span>
          } />
        </div>

        {/* Cladding */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-1.5">Kledning</h4>
          <SpecRow icon="🪵" label="Kledning" value={cladding.enabled ? "Ja" : "Nei"} />
          {cladding.enabled && (
            <>
              <SpecRow icon="↔️" label="Retning" value={cladding.direction === "horizontal" ? "Horisontal" : "Vertikal"} />
              {cladding.ral && (
                <SpecRow icon="🔢" label="Kledning RAL" value={`RAL ${cladding.ral} – ${claddingRalName}`} />
              )}
              <SpecRow icon="🎨" label="Kledning farge" value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ background: cladding.color }} />
                  {cladding.color}
                </span>
              } />
            </>
          )}
        </div>

        {/* Roof & Floor */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-1.5">Tak og gulv</h4>
          <SpecRow icon="🏗️" label="Taktype" value={roofType === "sloped" ? "Skråtak – 400 mm fall mot front" : roofType === "gable" ? "Saltak med møne" : "Flat"} />
          <SpecRow icon="🪨" label="Aluminiumsgulv" value={aluminumFloor.enabled ? "Ja" : "Nei"} />
        </div>

        {/* Insulation */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-1.5">Isolasjon</h4>
          <SpecRow icon="🧱" label="Isolasjon" value={insulation.enabled ? "Ja (50 mm perforerte plater)" : "Nei"} />
          {insulation.enabled && (
            <SpecRow icon="📋" label="Isolerte vegger" value={[...insulation.walls].map((w) => WALL_LABELS[w] || w).join(", ")} />
          )}
        </div>

        {/* Container door */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-1.5">Containerdør</h4>
          <SpecRow icon="🚪" label="Standard containerdør" value={containerDoor.enabled ? `Ja – ${WALL_LABELS[containerDoor.wall]} vegg` : "Nei"} />
        </div>
      </div>

      {/* Doors */}
      {doors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-2">🚪 Dører ({doors.length} stk)</h4>
          <div className="space-y-1">
            {doors.map((d, i) => (
              <SpecRow key={d.id} label={`Dør ${i + 1} (${WALL_LABELS[d.wall]})`}
                value={`${d.width} × ${d.height} mm — pos (${d.x}, ${d.y}) mm`} />
            ))}
          </div>
        </div>
      )}

      {/* Ventilation / Cutouts */}
      {vents.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <h4 className="text-xs font-semibold text-[var(--accent)] mb-2">🌀 Utsparringer / Ventilasjon ({vents.length} stk)</h4>
          <div className="space-y-1">
            {vents.map((v, i) => (
              <SpecRow key={v.id} label={`Utsparing ${i + 1} (${WALL_LABELS[v.wall]})`}
                value={`${v.width} × ${v.height} mm ${v.shape === "circle" ? "(sirkel)" : "(rektangulær)"} — pos (${v.x}, ${v.y}) mm${v.grille ? " + traforist" : ""}${v.exhaust ? " + avtrekksrør" : ""}`} />
            ))}
          </div>
        </div>
      )}

      {/* Summary line: grilles & exhausts */}
      {(grilles.length > 0 || exhausts.length > 0) && (
        <div className="mt-3 pt-2 border-t border-[var(--border)] flex gap-6">
          {grilles.length > 0 && <SpecRow icon="🔲" label="Traforister" value={`${grilles.length} stk`} />}
          {exhausts.length > 0 && <SpecRow icon="🔩" label="Avtrekksrør" value={`${exhausts.length} stk`} />}
        </div>
      )}
    </div>
  );
}

export default function DrawingPreview() {
  const elements = useConfigStore((s) => s.elements);
  const roofType = useConfigStore((s) => s.roofType);
  const setShowDrawing = useConfigStore((s) => s.setShowDrawing);
  const containerSize = useConfigStore((s) => s.containerSize);
  const customDims = useConfigStore((s) => s.customDims);
  const containerColor = useConfigStore((s) => s.containerColor);
  const containerRal = useConfigStore((s) => s.containerRal);
  const paintType = useConfigStore((s) => s.paintType);
  const cladding = useConfigStore((s) => s.cladding);
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const containerDoor = useConfigStore((s) => s.containerDoor);
  const insulation = useConfigStore((s) => s.insulation);

  const c = customDims || CONTAINER_SIZES[containerSize];
  const CL = c.length, CW = c.width, CH = c.height;
  const wallDims = getWallDims(c);

  const [snapshots, setSnapshots] = useState(null);

  const allWalls = ["front", "back", "left", "right"];

  const today = new Date().toLocaleDateString("nb-NO", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => setShowDrawing(false)}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Produksjonstegninger</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {containerSize} ISO Container — {CL} × {CW} × {CH} mm — {elements.length} elementer — Dato: {today}
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

        {/* ── Feature / Spec list ── */}
        <FeatureList
          elements={elements}
          containerSize={containerSize}
          customDims={customDims}
          containerColor={containerColor}
          containerRal={containerRal}
          paintType={paintType}
          cladding={cladding}
          roofType={roofType}
          aluminumFloor={aluminumFloor}
          containerDoor={containerDoor}
          insulation={insulation}
          CL={CL} CW={CW} CH={CH}
        />

        {/* ── 3D Snapshot views ── */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">3D-visninger (ISO-perspektiv)</h3>
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

        {/* ── Top view ── */}
        <TopView elements={elements} roofType={roofType} CL={CL} CW={CW} />

        {/* ── All 4 wall views with element dimensions ── */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Veggvisninger med mål</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {allWalls.map((wall) => (
              <WallView
                key={wall}
                title={`${WALL_LABELS[wall]} vegg`}
                wallName={wall}
                wallW={wallDims[wall].w}
                wallH={wallDims[wall].h}
                elements={elements}
                roofType={roofType}
              />
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-xs text-[var(--text-secondary)] text-center border-t border-[var(--border)] pt-3 space-y-0.5">
          <p className="font-medium">Alle mål i millimeter (mm) · Origo = nederste venstre hjørne per vegg</p>
          <p>Blå mål = avstand fra kant · Svarte mål = elementstørrelse · Stiplede = avstand fra høyre kant</p>
          <p>Generert {today}</p>
        </div>
      </div>
    </div>
  );
}
