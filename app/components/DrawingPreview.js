"use client";

import useConfigStore, { CONTAINER, WALL_DIMS } from "../store/useConfigStore";

const CL = CONTAINER.length;
const CW = CONTAINER.width;
const CH = CONTAINER.height;
const SC = 0.1; // mm -> SVG units
const PAD = 80;

const WALL_LABELS = { front: "Front", back: "Bak", left: "Venstre", right: "Høyre" };

function ArrowMarker() {
  return (
    <defs>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
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

function WallView({ title, wallName, wallW, wallH, elements, slopedRoof, cladding, containerDoor }) {
  const w = wallW * SC;
  const h = wallH * SC;
  const isLeft = wallName === "left";
  const isRight = wallName === "right";
  const rise = CW * 0.06 * SC; // 6% of width in SVG units

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">{title}</h3>
      <svg
        viewBox={`${-PAD} ${-PAD - (slopedRoof ? rise + 10 : 0)} ${w + PAD * 2} ${h + PAD * 2 + (slopedRoof ? rise + 10 : 0)}`}
        className="w-full bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]"
        style={{ maxHeight: 280 }}
      >
        <ArrowMarker />
        {/* Wall outline */}
        <rect x={0} y={0} width={w} height={h} fill="none" stroke="#94a3b8" strokeWidth={3} />

        {/* Cladding indication */}
        {cladding && cladding.enabled && (
          <g>
            {cladding.direction === "horizontal" ? (
              // Horizontal lines
              Array.from({ length: Math.floor(h / 15) }, (_, i) => (
                <line key={`cl${i}`} x1={2} y1={i * 15 + 7} x2={w - 2} y2={i * 15 + 7}
                  stroke={cladding.color} strokeWidth={0.5} strokeOpacity={0.35} />
              ))
            ) : (
              // Vertical lines
              Array.from({ length: Math.floor(w / 15) }, (_, i) => (
                <line key={`cl${i}`} x1={i * 15 + 7} y1={2} x2={i * 15 + 7} y2={h - 2}
                  stroke={cladding.color} strokeWidth={0.5} strokeOpacity={0.35} />
              ))
            )}
            <text x={w - 5} y={15} fill={cladding.color} fontSize={6} textAnchor="end" opacity={0.5}>
              Kledning
            </text>
          </g>
        )}

        {/* Sloped roof on side walls */}
        {slopedRoof && (isLeft || isRight) && (
          <g>
            <line x1={0} y1={-rise} x2={0} y2={0} stroke="#0E0E10" strokeWidth={2} />
            <line x1={0} y1={-rise} x2={w} y2={0} stroke="#0E0E10" strokeWidth={2} />
            <polygon
              points={`0,${-rise} ${w},0 0,0`}
              fill="#0E0E10" fillOpacity={0.15}
            />
            <text x={w / 4} y={-rise / 2 - 3} fill="#475569" fontSize={6} textAnchor="middle">
              Skråtak 6%
            </text>
          </g>
        )}

        {/* Container door */}
        {containerDoor && containerDoor.enabled && containerDoor.wall === wallName && (
          <g>
            {/* Double door outline */}
            <rect x={w * 0.05} y={h * 0.08} width={w * 0.9} height={h * 0.92}
              fill="#78909c" fillOpacity={0.15} stroke="#78909c" strokeWidth={2} />
            {/* Center split */}
            <line x1={w / 2} y1={h * 0.08} x2={w / 2} y2={h}
              stroke="#4a5568" strokeWidth={1.5} />
            {/* Handles */}
            <rect x={w / 2 - 8} y={h * 0.5} width={3} height={12} fill="#4a5568" />
            <rect x={w / 2 + 5} y={h * 0.5} width={3} height={12} fill="#4a5568" />
            <text x={w / 2} y={h * 0.5 - 5} fill="#475569" fontSize={7} textAnchor="middle">
              Containerdør
            </text>
          </g>
        )}

        <WallElements elements={elements} wallName={wallName} viewW={w} viewH={h} />

        {/* Dimensions */}
        <DimensionLine x1={0} y1={h} x2={w} y2={h} label={`${wallW} mm`} offset={30} />
        <DimensionLine x1={0} y1={0} x2={0} y2={h} label={`${wallH} mm`} offset={30} />

        {/* Origin marker */}
        <circle cx={0} cy={h} r={3} fill="#34d399" />
        <text x={5} y={h - 5} fill="#34d399" fontSize={8}>Origo</text>

        <text x={w / 2} y={-PAD / 2 + 10 - (slopedRoof && (isLeft || isRight) ? rise : 0)} fill="#475569" fontSize={10} textAnchor="middle">
          {WALL_LABELS[wallName]} vegg
        </text>
      </svg>
    </div>
  );
}

function TopView({ elements, slopedRoof, cladding, containerDoor }) {
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

        {/* Sloped roof indication */}
        {slopedRoof && (
          <g>
            {/* Arrow showing slope direction (top to bottom = left wall to right wall) */}
            <line x1={w / 2} y1={8} x2={w / 2} y2={h - 8}
              stroke="#0E0E10" strokeWidth={1} strokeDasharray="4,3"
              markerEnd="url(#arrow)" />
            <text x={w / 2 + 8} y={h / 2} fill="#475569" fontSize={7} textAnchor="start">
              6% ↓
            </text>
          </g>
        )}

        {/* Cladding border indication */}
        {cladding && cladding.enabled && (
          <rect x={-3} y={-3} width={w + 6} height={h + 6}
            fill="none" stroke={cladding.color} strokeWidth={2} strokeDasharray="6,3" strokeOpacity={0.5} />
        )}

        {/* Container door indication */}
        {containerDoor && containerDoor.enabled && (
          containerDoor.wall === "back" ? (
            <g>
              <rect x={-6} y={h * 0.05} width={8} height={h * 0.9}
                fill="#78909c" fillOpacity={0.3} stroke="#78909c" strokeWidth={1} />
              <line x1={-2} y1={h / 2} x2={-2} y2={h / 2}
                stroke="#4a5568" strokeWidth={1} />
            </g>
          ) : (
            <g>
              <rect x={w - 2} y={h * 0.05} width={8} height={h * 0.9}
                fill="#78909c" fillOpacity={0.3} stroke="#78909c" strokeWidth={1} />
            </g>
          )
        )}

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
  const cladding = useConfigStore((s) => s.cladding);
  const containerDoor = useConfigStore((s) => s.containerDoor);
  const setShowDrawing = useConfigStore((s) => s.setShowDrawing);

  const doors = elements.filter((e) => e.type === "door");
  const vents = elements.filter((e) => e.type === "ventilation");

  // Get unique walls that have elements, plus containerDoor wall, plus side walls if slopedRoof
  const wallsWithStuff = new Set(elements.map((e) => e.wall));
  if (containerDoor.enabled) wallsWithStuff.add(containerDoor.wall);
  if (slopedRoof.enabled) { wallsWithStuff.add("left"); wallsWithStuff.add("right"); }
  const wallsToShow = [...wallsWithStuff];

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
              20ft ISO Container – {CL} × {CW} × {CH} mm · {elements.length} elementer
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

        {/* Top view */}
        <TopView elements={elements} slopedRoof={slopedRoof.enabled} cladding={cladding} containerDoor={containerDoor} />

        {/* Individual wall views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {wallsToShow.map((wall) => (
            <WallView
              key={wall}
              title={`${WALL_LABELS[wall]} vegg`}
              wallName={wall}
              wallW={WALL_DIMS[wall].w}
              wallH={WALL_DIMS[wall].h}
              elements={elements}
              slopedRoof={slopedRoof.enabled}
              cladding={cladding}
              containerDoor={containerDoor}
            />
          ))}
        </div>

        {/* Specs table */}
        <div className="bg-[var(--bg-primary)] rounded-lg p-4 text-sm space-y-2 border border-[var(--border)]">
          <h4 className="font-semibold text-[var(--accent)]">Spesifikasjoner</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
            <span className="text-[var(--text-secondary)]">Container type:</span>
            <span>20ft ISO Standard</span>
            <span className="text-[var(--text-secondary)]">Ytre mål:</span>
            <span>{CL} × {CW} × {CH} mm</span>
            {slopedRoof.enabled && (
              <>
                <span className="text-[var(--text-secondary)]">Tak:</span>
                <span>Skråtak, 6% helling venstre → høyre</span>
              </>
            )}
            {cladding.enabled && (
              <>
                <span className="text-[var(--text-secondary)]">Kledning:</span>
                <span>{cladding.direction === "horizontal" ? "Liggende" : "Stående"}{cladding.ral ? ` · RAL ${cladding.ral}` : ""}</span>
              </>
            )}
            {containerDoor.enabled && (
              <>
                <span className="text-[var(--text-secondary)]">Containerdør:</span>
                <span>Standard dobbeltdør, {containerDoor.wall === "back" ? "bak" : "front"}vegg</span>
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
