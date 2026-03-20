"use client";

import useConfigStore, { CONTAINER } from "../store/useConfigStore";

const CL = CONTAINER.length;
const CW = CONTAINER.width;
const CH = CONTAINER.height;

// SVG viewBox scale: 1mm = 0.1 SVG units
const SC = 0.1;
const PAD = 80; // padding for dimension lines

function DimensionLine({ x1, y1, x2, y2, label, offset = 25 }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);

  const lx = isHorizontal ? mx : x1 - offset;
  const ly = isHorizontal ? y1 - offset : my;

  const ox = isHorizontal ? 0 : -offset;
  const oy = isHorizontal ? -offset : 0;

  return (
    <g className="text-[var(--text-secondary)]">
      {/* Extension lines */}
      <line x1={x1} y1={y1} x2={x1 + ox} y2={y1 + oy} stroke="#475569" strokeWidth={0.5} />
      <line x1={x2} y1={y2} x2={x2 + ox} y2={y2 + oy} stroke="#475569" strokeWidth={0.5} />
      {/* Dimension line */}
      <line
        x1={x1 + ox} y1={y1 + oy}
        x2={x2 + ox} y2={y2 + oy}
        stroke="#94a3b8"
        strokeWidth={0.8}
        markerStart="url(#arrow)"
        markerEnd="url(#arrow)"
      />
      {/* Label */}
      <text
        x={lx + ox}
        y={ly + oy - 4}
        fill="#e2e8f0"
        fontSize={10}
        textAnchor="middle"
        dominantBaseline="auto"
      >
        {label}
      </text>
    </g>
  );
}

function ArrowMarker() {
  return (
    <defs>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
      </marker>
    </defs>
  );
}

function TopView({ door, ventilation }) {
  const w = CL * SC;
  const h = CW * SC;

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">Topp-visning (Top View)</h3>
      <svg
        viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`}
        className="w-full bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]"
        style={{ maxHeight: 300 }}
      >
        <ArrowMarker />

        {/* Container outline */}
        <rect x={0} y={0} width={w} height={h} fill="none" stroke="#6b7280" strokeWidth={2} />

        {/* Container walls (thick lines) */}
        <rect x={0} y={0} width={w} height={h} fill="none" stroke="#94a3b8" strokeWidth={3} />

        {/* Door on front wall (right side in top view = x=length) */}
        {door.enabled && (
          <rect
            x={w - 2}
            y={door.x * SC}
            width={4}
            height={door.width * SC}
            fill="#92400e"
            stroke="#b45309"
            strokeWidth={1}
          />
        )}

        {/* Ventilation on right wall (y=width side) */}
        {ventilation.enabled && (
          <>
            {ventilation.shape === "circle" ? (
              <circle
                cx={ventilation.x * SC + (ventilation.size * SC) / 2}
                cy={h}
                r={ventilation.size * SC / 2}
                fill="none"
                stroke="#60a5fa"
                strokeWidth={1.5}
              />
            ) : (
              <rect
                x={ventilation.x * SC}
                y={h - ventilation.size * SC / 2}
                width={ventilation.size * SC}
                height={ventilation.size * SC / 2}
                fill="none"
                stroke="#60a5fa"
                strokeWidth={1.5}
              />
            )}
          </>
        )}

        {/* Dimension: Length */}
        <DimensionLine
          x1={0} y1={h} x2={w} y2={h}
          label={`${CL} mm`}
          offset={30}
        />
        {/* Dimension: Width */}
        <DimensionLine
          x1={0} y1={0} x2={0} y2={h}
          label={`${CW} mm`}
          offset={30}
        />

        {/* Labels */}
        <text x={w / 2} y={h / 2} fill="#475569" fontSize={12} textAnchor="middle">
          TOPP
        </text>
        <text x={w + 10} y={h / 2} fill="#6b7280" fontSize={8} textAnchor="start">
          Front
        </text>
        <text x={-10} y={h / 2} fill="#6b7280" fontSize={8} textAnchor="end">
          Bak
        </text>
      </svg>
    </div>
  );
}

function SideView({ door, ventilation, slopedRoof }) {
  const w = CL * SC;
  const h = CH * SC;
  const drop = slopedRoof.enabled ? 400 * SC : 0;

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">Side-visning (Side View)</h3>
      <svg
        viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`}
        className="w-full bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]"
        style={{ maxHeight: 300 }}
      >
        <ArrowMarker />

        {/* Container outline */}
        <polygon
          points={`0,0 ${w},${drop} ${w},${h} 0,${h}`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={3}
        />

        {/* Door on front wall */}
        {door.enabled && (
          <rect
            x={w - door.width * SC / 2 - 2}
            y={h - door.height * SC}
            width={door.width * SC / 2}
            height={door.height * SC}
            fill="#92400e"
            fillOpacity={0.4}
            stroke="#b45309"
            strokeWidth={1.5}
          />
        )}

        {/* Ventilation on side wall */}
        {ventilation.enabled && (
          <>
            {ventilation.shape === "circle" ? (
              <circle
                cx={ventilation.x * SC + (ventilation.size * SC) / 2}
                cy={h - ventilation.y * SC - (ventilation.size * SC) / 2}
                r={ventilation.size * SC / 2}
                fill="none"
                stroke="#60a5fa"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            ) : (
              <rect
                x={ventilation.x * SC}
                y={h - ventilation.y * SC - ventilation.size * SC}
                width={ventilation.size * SC}
                height={ventilation.size * SC}
                fill="none"
                stroke="#60a5fa"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            )}
          </>
        )}

        {/* Dimension: Length */}
        <DimensionLine
          x1={0} y1={h} x2={w} y2={h}
          label={`${CL} mm`}
          offset={30}
        />
        {/* Dimension: Height back */}
        <DimensionLine
          x1={0} y1={0} x2={0} y2={h}
          label={`${CH} mm`}
          offset={30}
        />
        {/* Dimension: Height front (if sloped) */}
        {slopedRoof.enabled && (
          <DimensionLine
            x1={w} y1={drop} x2={w} y2={h}
            label={`${CH - 400} mm`}
            offset={-40}
          />
        )}

        {/* Labels */}
        <text x={w / 2} y={h / 2} fill="#475569" fontSize={12} textAnchor="middle">
          SIDE
        </text>
      </svg>
    </div>
  );
}

export default function DrawingPreview() {
  const door = useConfigStore((s) => s.door);
  const ventilation = useConfigStore((s) => s.ventilation);
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const setShowDrawing = useConfigStore((s) => s.setShowDrawing);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => setShowDrawing(false)}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📐 Produksjonstegninger</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              20ft ISO Container – {CL} × {CW} × {CH} mm
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopView door={door} ventilation={ventilation} />
          <SideView door={door} ventilation={ventilation} slopedRoof={slopedRoof} />
        </div>

        <div className="bg-[var(--bg-primary)] rounded-lg p-4 text-sm space-y-2 border border-[var(--border)]">
          <h4 className="font-semibold text-[var(--accent)]">Spesifikasjoner</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">Container type:</span>
            <span>20ft ISO Standard</span>
            <span className="text-[var(--text-secondary)]">Ytre mål:</span>
            <span>{CL} × {CW} × {CH} mm</span>
            {door.enabled && (
              <>
                <span className="text-[var(--text-secondary)]">Dør:</span>
                <span>{door.width} × {door.height} mm @ ({door.x}, {door.y})</span>
              </>
            )}
            {ventilation.enabled && (
              <>
                <span className="text-[var(--text-secondary)]">Ventilasjon:</span>
                <span>{ventilation.shape === "circle" ? "Ø" : ""}{ventilation.size} mm @ ({ventilation.x}, {ventilation.y})</span>
              </>
            )}
            {slopedRoof.enabled && (
              <>
                <span className="text-[var(--text-secondary)]">Tak:</span>
                <span>Skråtak, 400mm fall mot front</span>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] text-center italic">
          Mock tegning – ikke for produksjon
        </p>
      </div>
    </div>
  );
}
