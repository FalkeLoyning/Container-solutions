"use client";

import { useState, useMemo } from "react";
import useConfigStore, { CONTAINER_SIZES, getWallDims } from "../store/useConfigStore";
import InteriorObjects from "./InteriorObjects";

// Scale: mm -> Three.js units (meters)
const S = 0.001;

const steelColor = "#94a3b8";

function useDims() {
  const size = useConfigStore((s) => s.containerSize);
  const c = CONTAINER_SIZES[size];
  return { L: c.length * S, W: c.width * S, H: c.height * S, T: c.wallThickness * S, c };
}
const steelDark = "#78909c";
const doorColor = "#b45309";
const ventColor = "#1e293b";
const aluminumColor = "#d4d4d8";
const highlightColor = "#0284c7";
const holeColor = "#0f172a";

// Element type picker shown after clicking a wall
function WallClickMenu({ position, onSelect, onCancel }) {
  // This is rendered as an HTML overlay, not in 3D
  return null; // handled in Canvas3D overlay instead
}

// Clickable wall component
function ClickableWall({ wallName, position, size, rotation, children }) {
  const placementMode = useConfigStore((s) => s.placementMode);
  const containerColor = useConfigStore((s) => s.containerColor);
  const isPlacing = placementMode === "pending";

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      castShadow
      userData={{ wall: wallName }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={isPlacing ? "#b0bec5" : containerColor}
        metalness={0.3}
        roughness={0.55}
        emissive={isPlacing ? highlightColor : "#000000"}
        emissiveIntensity={isPlacing ? 0.12 : 0}
      />
      {children}
    </mesh>
  );
}

function Floor() {
  const aluminumFloor = useConfigStore((s) => s.aluminumFloor);
  const { L, W, T } = useDims();
  return (
    <mesh position={[L / 2, T / 2, W / 2]} receiveShadow userData={{ wall: "floor" }}>
      <boxGeometry args={[L, T, W]} />
      <meshStandardMaterial
        color={aluminumFloor.enabled ? aluminumColor : steelDark}
        metalness={aluminumFloor.enabled ? 0.8 : 0.3}
        roughness={aluminumFloor.enabled ? 0.2 : 0.7}
      />
    </mesh>
  );
}

function FlatRoof() {
  const containerColor = useConfigStore((s) => s.containerColor);
  const { L, W, H, T } = useDims();
  return (
    <mesh position={[L / 2, H, W / 2]} receiveShadow userData={{ wall: "roof" }}>
      <boxGeometry args={[L, T, W]} />
      <meshStandardMaterial color={containerColor} metalness={0.4} roughness={0.6} />
    </mesh>
  );
}

function SlopedRoof() {
  const { L, W, H } = useDims();
  // 6% slope across width (left z=0 high, right z=W low)
  const rise = W * 0.06;
  const roofMat = <meshStandardMaterial color="#0E0E10" metalness={0.4} roughness={0.6} side={2} />;

  const panelVerts = new Float32Array([
    0, H + rise, 0,
    L, H + rise, 0,
    0, H, W,
    L, H, W,
  ]);
  const panelIdx = new Uint16Array([0, 2, 1, 1, 2, 3]);

  const backGableVerts = new Float32Array([
    0, H, 0,
    0, H + rise, 0,
    0, H, W,
  ]);
  const gableIdx = new Uint16Array([0, 1, 2]);

  const frontGableVerts = new Float32Array([
    L, H, 0,
    L, H + rise, 0,
    L, H, W,
  ]);

  return (
    <group>
      <mesh receiveShadow>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={panelVerts} count={4} itemSize={3} />
          <bufferAttribute attach="index" array={panelIdx} count={6} itemSize={1} />
        </bufferGeometry>
        {roofMat}
      </mesh>
      <mesh>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={backGableVerts} count={3} itemSize={3} />
          <bufferAttribute attach="index" array={gableIdx} count={3} itemSize={1} />
        </bufferGeometry>
        {roofMat}
      </mesh>
      <mesh>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={frontGableVerts} count={3} itemSize={3} />
          <bufferAttribute attach="index" array={gableIdx} count={3} itemSize={1} />
        </bufferGeometry>
        {roofMat}
      </mesh>
    </group>
  );
}

// Render a door element on a wall
function DoorMesh({ el }) {
  const selectedId = useConfigStore((s) => s.selectedId);
  const isSelected = selectedId === el.id;
  const dims = useDims();
  const { pos, rot } = getWallTransform(el.wall, el, dims);
  const w = el.width * S;
  const h = el.height * S;

  return (
    <group userData={{ elementId: el.id, wall: el.wall }}>
      {/* Dark cutout */}
      <mesh position={pos} rotation={rot}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Door panel */}
      <mesh position={[pos[0] + (rot[1] !== 0 ? 0 : 0), pos[1], pos[2]]} rotation={rot}>
        <planeGeometry args={[w - 0.015, h - 0.015]} />
        <meshStandardMaterial
          color={isSelected ? highlightColor : doorColor}
          metalness={0.2}
          roughness={0.8}
          emissive={isSelected ? highlightColor : "#000000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
    </group>
  );
}

// Render a ventilation cutout (hole) on a wall
function VentMesh({ el }) {
  const selectedId = useConfigStore((s) => s.selectedId);
  const isSelected = selectedId === el.id;
  const dims = useDims();
  const { pos, rot } = getWallTransform(el.wall, el, dims);
  const vw = el.width * S;
  const vh = el.height * S;

  return (
    <group userData={{ elementId: el.id, wall: el.wall }}>
      {/* Dark hole */}
      <mesh position={pos} rotation={rot}>
        {el.shape === "circle" ? (
          <circleGeometry args={[Math.min(vw, vh) / 2, 32]} />
        ) : (
          <planeGeometry args={[vw, vh]} />
        )}
        <meshBasicMaterial color={holeColor} />
      </mesh>
      {/* Rim / frame around the hole */}
      <mesh position={pos} rotation={rot}>
        {el.shape === "circle" ? (
          <ringGeometry args={[Math.min(vw, vh) / 2 - 0.008, Math.min(vw, vh) / 2 + 0.008, 32]} />
        ) : (
          <planeGeometry args={[vw + 0.016, vh + 0.016]} />
        )}
        <meshStandardMaterial
          color={isSelected ? highlightColor : ventColor}
          metalness={0.5}
          roughness={0.4}
          emissive={isSelected ? highlightColor : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>
    </group>
  );
}

// Convert element position (wall-local mm, origin bottom-left when viewed from outside)
// to 3D world position + rotation
function getWallTransform(wall, el, { L, W, H, T }) {
  const elW = el.width * S;
  const elH = el.height * S;
  const cx = el.x * S + elW / 2; // center X in wall-local coords
  const cy = el.y * S + elH / 2; // center Y in wall-local coords
  const offset = T / 2 + 0.002;

  switch (wall) {
    case "front":
      // Front wall at x=L, viewed from +X direction
      // Wall-local: left=+Z(W), right=0, bottom=0, top=H
      return {
        pos: [L + offset, cy, W - cx],
        rot: [0, Math.PI / 2, 0],
      };
    case "back":
      // Back wall at x=0, viewed from -X direction
      // Wall-local: left=0, right=+Z(W), bottom=0, top=H
      return {
        pos: [-offset, cy, cx],
        rot: [0, -Math.PI / 2, 0],
      };
    case "left":
      // Left wall at z=0, viewed from -Z direction
      // Wall-local: left=0, right=+X(L), bottom=0, top=H
      return {
        pos: [cx, cy, -offset],
        rot: [0, Math.PI, 0],
      };
    case "right":
      // Right wall at z=W, viewed from +Z direction
      // Wall-local: left=+X(L), right=0, bottom=0, top=H
      return {
        pos: [L - cx, cy, W + offset],
        rot: [0, 0, 0],
      };
    case "floor":
      return {
        pos: [cx, -offset, cy],
        rot: [-Math.PI / 2, 0, 0],
      };
    case "roof":
      return {
        pos: [cx, H + offset, cy],
        rot: [-Math.PI / 2, 0, 0],
      };
    default:
      return { pos: [0, 0, 0], rot: [0, 0, 0] };
  }
}

// Convert element position to cladding-local rectangle (3D units)
function elementToCladdingRect(wallName, el, { L, W }) {
  const ew = el.width * S;
  const eh = el.height * S;
  const ey = el.y * S;
  let ex;
  if (wallName === "front") ex = W - (el.x + el.width) * S;
  else if (wallName === "right") ex = L - (el.x + el.width) * S;
  else ex = el.x * S;
  return { xMin: ex, xMax: ex + ew, yMin: ey, yMax: ey + eh };
}

function clipSegments(segments, cutMin, cutMax) {
  const result = [];
  for (const [sMin, sMax] of segments) {
    if (cutMax <= sMin || cutMin >= sMax) {
      result.push([sMin, sMax]);
    } else {
      if (sMin < cutMin) result.push([sMin, cutMin]);
      if (sMax > cutMax) result.push([cutMax, sMax]);
    }
  }
  return result;
}

// Generate plank positions with cutouts for elements
function generatePlanks(wallLength, wallHeight, direction, rects) {
  const plankSize = 0.15;
  const gap = 0.008;
  const step = plankSize + gap;
  const planks = [];

  if (direction === "horizontal") {
    const count = Math.floor(wallHeight / step);
    for (let i = 0; i < count; i++) {
      const py = plankSize / 2 + i * step;
      const pyMin = py - plankSize / 2;
      const pyMax = py + plankSize / 2;
      let segs = [[0, wallLength]];
      for (const r of rects) {
        if (r.yMin < pyMax && r.yMax > pyMin) {
          segs = clipSegments(segs, r.xMin, r.xMax);
        }
      }
      for (const [sMin, sMax] of segs) {
        const segW = sMax - sMin;
        if (segW > 0.005) {
          planks.push({ x: sMin + segW / 2, y: py, size: [segW, plankSize] });
        }
      }
    }
  } else {
    const count = Math.floor(wallLength / step);
    for (let i = 0; i < count; i++) {
      const px = plankSize / 2 + i * step;
      const pxMin = px - plankSize / 2;
      const pxMax = px + plankSize / 2;
      let segs = [[0, wallHeight]];
      for (const r of rects) {
        if (r.xMin < pxMax && r.xMax > pxMin) {
          segs = clipSegments(segs, r.yMin, r.yMax);
        }
      }
      for (const [sMin, sMax] of segs) {
        const segH = sMax - sMin;
        if (segH > 0.005) {
          planks.push({ x: px, y: sMin + segH / 2, size: [plankSize, segH] });
        }
      }
    }
  }
  return planks;
}

function Cladding({ cladding, elements, hiddenWalls }) {
  const { direction, color } = cladding;
  const { L, W, H, T } = useDims();
  const depth = 0.022;
  const off = T / 2 + depth / 2 + 0.001;

  const walls = [
    { name: "back",  len: W, h: H, pos: (p) => [-off,  p.y, p.x],  boxArgs: (s) => [depth, s[1], s[0]] },
    { name: "front", len: W, h: H, pos: (p) => [L + off, p.y, p.x], boxArgs: (s) => [depth, s[1], s[0]] },
    { name: "left",  len: L, h: H, pos: (p) => [p.x, p.y, -off],    boxArgs: (s) => [s[0], s[1], depth] },
    { name: "right", len: L, h: H, pos: (p) => [p.x, p.y, W + off],  boxArgs: (s) => [s[0], s[1], depth] },
  ];

  return (
    <group>
      {walls.filter((w) => !hiddenWalls.has(w.name)).map((wall) => {
        const rects = elements
          .filter((el) => el.wall === wall.name)
          .map((el) => elementToCladdingRect(wall.name, el, { L, W }));
        const planks = generatePlanks(wall.len, wall.h, direction, rects);
        return planks.map((plank, i) => (
          <mesh key={`${wall.name}-${i}`} position={wall.pos(plank)} castShadow>
            <boxGeometry args={wall.boxArgs(plank.size)} />
            <meshStandardMaterial color={color} metalness={0.1} roughness={0.85} />
          </mesh>
        ));
      })}
    </group>
  );
}

// Container door outline rendered on top of cladding
function ContainerDoorOutline({ wall }) {
  const { L, W, H, T } = useDims();
  const doorW = W;
  const doorH = H;
  const lineW = 0.015;
  const off = T / 2 + 0.025 + 0.001;

  const frameMat = <meshBasicMaterial color="#ffffff" />;
  const handleMat = <meshBasicMaterial color="#e2e8f0" />;

  let pos, rotY;
  if (wall === "front") { pos = [L + off, H / 2, W / 2]; rotY = Math.PI / 2; }
  else if (wall === "back") { pos = [-off, H / 2, W / 2]; rotY = -Math.PI / 2; }
  else return null;

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, doorH / 2 - lineW / 2, 0]}>
        <planeGeometry args={[doorW, lineW]} />{frameMat}
      </mesh>
      <mesh position={[0, -doorH / 2 + lineW / 2, 0]}>
        <planeGeometry args={[doorW, lineW]} />{frameMat}
      </mesh>
      <mesh position={[-doorW / 2 + lineW / 2, 0, 0]}>
        <planeGeometry args={[lineW, doorH]} />{frameMat}
      </mesh>
      <mesh position={[doorW / 2 - lineW / 2, 0, 0]}>
        <planeGeometry args={[lineW, doorH]} />{frameMat}
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[lineW, doorH - lineW * 2]} />{frameMat}
      </mesh>
      <mesh position={[-0.06, H * 0.42, 0.001]}>
        <planeGeometry args={[0.03, 0.12]} />{handleMat}
      </mesh>
      <mesh position={[0.06, H * 0.42, 0.001]}>
        <planeGeometry args={[0.03, 0.12]} />{handleMat}
      </mesh>
    </group>
  );
}

export default function ContainerModel() {
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const elements = useConfigStore((s) => s.elements);
  const cladding = useConfigStore((s) => s.cladding);
  const hiddenWalls = useConfigStore((s) => s.hiddenWalls);
  const containerDoor = useConfigStore((s) => s.containerDoor);
  const { L, W, H, T } = useDims();

  const isHidden = (w) => hiddenWalls.has(w);

  return (
    <group position={[-L / 2, 0, -W / 2]}>
      {!isHidden("floor") && <Floor />}

      {!isHidden("back") && <ClickableWall wallName="back" position={[0, H / 2, W / 2]} size={[T, H, W]} />}
      {!isHidden("left") && <ClickableWall wallName="left" position={[L / 2, H / 2, 0]} size={[L, H, T]} />}
      {!isHidden("right") && <ClickableWall wallName="right" position={[L / 2, H / 2, W]} size={[L, H, T]} />}
      {!isHidden("front") && <ClickableWall wallName="front" position={[L, H / 2, W / 2]} size={[T, H, W]} />}

      {!isHidden("roof") && (slopedRoof.enabled ? <SlopedRoof /> : <FlatRoof />)}

      {cladding.enabled && <Cladding cladding={cladding} elements={elements} hiddenWalls={hiddenWalls} />}

      {containerDoor.enabled && <ContainerDoorOutline wall={containerDoor.wall} />}

      {elements.map((el) =>
        el.type === "door" ? (
          <DoorMesh key={el.id} el={el} />
        ) : (
          <VentMesh key={el.id} el={el} />
        )
      )}

      <InteriorObjects />
    </group>
  );
}
