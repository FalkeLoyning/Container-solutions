"use client";

import { useState, useMemo } from "react";
import * as THREE from "three";
import useConfigStore, { CONTAINER_SIZES, getWallDims, FORKLIFT_POCKET } from "../store/useConfigStore";
import InteriorObjects from "./InteriorObjects";

// Scale: mm -> Three.js units (meters)
const S = 0.001;

const steelColor = "#94a3b8";

function useDims() {
  const size = useConfigStore((s) => s.containerSize);
  const c = CONTAINER_SIZES[size];
  return {
    L: c.length * S,
    W: c.width * S,
    H: c.height * S,
    T: c.wallThickness * S,
    F: c.floorHeight * S,
    c,
  };
}
const steelDark = "#78909c";
const doorColor = "#b45309";
const ventColor = "#1e293b";
const aluminumColor = "#d4d4d8";
const highlightColor = "#0284c7";
const holeColor = "#0f172a";

// HUP frame profile dimensions (mm)
const HUP_W = 50;   // profile face width (visible from outside, flush with wall)
const HUP_D = 100;  // profile depth (extends inward from wall)

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
  const { L, W, T, F } = useDims();
  return (
    <mesh position={[L / 2, F, W / 2]} receiveShadow userData={{ wall: "floor" }}>
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

// Bottom steel frame below the floor
function BaseFrame() {
  const containerColor = useConfigStore((s) => s.containerColor);
  const { L, W, F, T } = useDims();
  const railH = F;
  const railD = T; // side rail depth (thickness in Z direction)

  return (
    <group>
      {/* Left bottom rail */}
      <mesh position={[L / 2, railH / 2, 0]} castShadow>
        <boxGeometry args={[L, railH, railD]} />
        <meshStandardMaterial color={containerColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Right bottom rail */}
      <mesh position={[L / 2, railH / 2, W]} castShadow>
        <boxGeometry args={[L, railH, railD]} />
        <meshStandardMaterial color={containerColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Front bottom crossbar */}
      <mesh position={[L, railH / 2, W / 2]} castShadow>
        <boxGeometry args={[railD, railH, W]} />
        <meshStandardMaterial color={containerColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Back bottom crossbar */}
      <mesh position={[0, railH / 2, W / 2]} castShadow>
        <boxGeometry args={[railD, railH, W]} />
        <meshStandardMaterial color={containerColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Cross members (every ~300mm) */}
      {Array.from({ length: Math.floor(L / S / 500) - 1 }, (_, i) => {
        const xPos = (i + 1) * 0.5;
        if (xPos > L - T) return null;
        return (
          <mesh key={i} position={[xPos, railH * 0.4, W / 2]}>
            <boxGeometry args={[0.01, railH * 0.6, W - railD * 2]} />
            <meshStandardMaterial color={steelDark} metalness={0.3} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

// Forklift pocket openings on left/right bottom rails
function ForkliftPockets() {
  const containerColor = useConfigStore((s) => s.containerColor);
  const { L, W, F, T } = useDims();
  const pw = FORKLIFT_POCKET.width * S;
  const ph = FORKLIFT_POCKET.height * S;
  const pd = FORKLIFT_POCKET.depth * S;
  const inset = FORKLIFT_POCKET.inset * S;

  const pocketPositions = [inset, L - inset];
  const pockets = [];

  for (const px of pocketPositions) {
    // Left side (z=0): pocket opening facing -Z
    pockets.push(
      <mesh key={`L-${px}`} position={[px, ph / 2, -0.001]}>
        <boxGeometry args={[pw, ph, pd]} />
        <meshBasicMaterial color={holeColor} />
      </mesh>
    );
    // Right side (z=W): pocket opening facing +Z
    pockets.push(
      <mesh key={`R-${px}`} position={[px, ph / 2, W + 0.001]}>
        <boxGeometry args={[pw, ph, pd]} />
        <meshBasicMaterial color={holeColor} />
      </mesh>
    );
  }

  return <group>{pockets}</group>;
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

// Louver grille (traforist) – angled slats that block rain
function LouverGrille({ width, height }) {
  const slats = useMemo(() => {
    const slatSpacing = 0.025;  // 25mm between slat centers
    const slatThick = 0.002;   // 2mm sheet thickness
    const slatDepth = 0.022;   // 22mm slat depth (projection)
    const angle = -Math.PI / 4; // 45° downward tilt (blocks rain)
    const count = Math.floor(height / slatSpacing);
    const items = [];
    for (let i = 0; i < count; i++) {
      const y = -height / 2 + slatSpacing * 0.5 + i * slatSpacing;
      items.push(
        <mesh key={i} position={[0, y, slatDepth / 2]} rotation={[angle, 0, 0]}>
          <boxGeometry args={[width - 0.004, slatThick, slatDepth]} />
          <meshStandardMaterial color="#d4d4d8" metalness={0.5} roughness={0.3} />
        </mesh>
      );
    }
    return items;
  }, [width, height]);

  return <group>{slats}</group>;
}

// Exhaust pipe: Ø200mm, 400mm protrusion. Horizontal pipes get 60° angled cut.
function ExhaustPipe({ wall }) {
  const radius = 0.100; // Ø200mm = 100mm radius
  const baseLen = 0.400; // 400mm base protrusion (shortest side)
  const isVertical = wall === "roof" || wall === "floor";

  // Build a single geometry: cylinder with angled cut end for horizontal pipes
  const geometry = useMemo(() => {
    const segments = 32;

    if (isVertical) {
      // Straight cylinder, flat ends
      const geo = new THREE.CylinderGeometry(radius, radius, baseLen, segments, 1, false);
      geo.rotateX(Math.PI / 2);
      geo.translate(0, 0, baseLen / 2);
      return geo;
    }

    // Angled cut: 60° from pipe axis means tan(60°) ≈ 1.732
    // Bottom of pipe (y < 0) is shorter (opening), top (y > 0) is longer
    const tanAngle = Math.tan(Math.PI / 3);

    // Build custom BufferGeometry for the angled-cut cylinder
    const positions = [];
    const normals = [];
    const indices = [];

    // Ring at wall (z=0) and ring at cut end (z varies by angle)
    // For each segment, two vertices: base ring and cut ring
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;

      // Base ring at z=0 (wall face)
      positions.push(x, y, 0);
      normals.push(Math.cos(theta), Math.sin(theta), 0);

      // Cut ring: z depends on y position (top longer, bottom shorter)
      const z = baseLen + y * tanAngle;
      positions.push(x, y, z);
      normals.push(Math.cos(theta), Math.sin(theta), 0);
    }

    // Side faces: quads between base and cut rings
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, d, a, d, c);
    }

    // Cap at cut end (triangulated fan from center)
    const capCenterIdx = positions.length / 3;
    // Center of the cut ellipse
    const centerZ = baseLen; // y=0 at center → z = baseLen
    positions.push(0, 0, centerZ);
    // Normal of cut plane: pointing outward along the angled plane
    const cutNx = 0, cutNy = -Math.sin(Math.PI / 3), cutNz = Math.cos(Math.PI / 3);
    normals.push(cutNx, cutNy, cutNz);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      const z = baseLen + y * tanAngle;
      positions.push(x, y, z);
      normals.push(cutNx, cutNy, cutNz);
    }

    for (let i = 0; i < segments; i++) {
      const ci = capCenterIdx;
      const vi = capCenterIdx + 1 + i;
      const vi2 = capCenterIdx + 2 + i;
      indices.push(ci, vi2, vi);
    }

    // Cap at base (z=0), closed
    const baseCenterIdx = positions.length / 3;
    positions.push(0, 0, 0);
    normals.push(0, 0, -1);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      positions.push(x, y, 0);
      normals.push(0, 0, -1);
    }

    for (let i = 0; i < segments; i++) {
      const ci = baseCenterIdx;
      const vi = baseCenterIdx + 1 + i;
      const vi2 = baseCenterIdx + 2 + i;
      indices.push(ci, vi, vi2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }, [radius, baseLen, isVertical]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#8a8a8a" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

// HUP frame: 4 mitered 100x50x3 box-section profiles around an opening
// 50mm face is flush with the wall surface, 100mm depth extends inward
function HupFrame({ innerW, innerH, isSelected }) {
  const containerColor = useConfigStore((s) => s.containerColor);
  const pw = HUP_W * S;  // 50mm face width
  const pd = HUP_D * S;  // 100mm depth inward
  const outerW = innerW + 2 * pw;
  const outerH = innerH + 2 * pw;
  const color = isSelected ? highlightColor : containerColor;
  const emissive = isSelected ? highlightColor : "#000000";
  const emissiveIntensity = isSelected ? 0.15 : 0;

  // Each bar runs the full outer dimension → overlap at corners = mitered look
  const bars = [
    // Bottom
    { pos: [0, -innerH / 2 - pw / 2, -pd / 2], args: [outerW, pw, pd] },
    // Top
    { pos: [0,  innerH / 2 + pw / 2, -pd / 2], args: [outerW, pw, pd] },
    // Left
    { pos: [-innerW / 2 - pw / 2, 0, -pd / 2], args: [pw, outerH, pd] },
    // Right
    { pos: [ innerW / 2 + pw / 2, 0, -pd / 2], args: [pw, outerH, pd] },
  ];

  return (
    <group>
      {bars.map((bar, i) => (
        <mesh key={i} position={bar.pos} castShadow>
          <boxGeometry args={bar.args} />
          <meshStandardMaterial
            color={color}
            metalness={0.5}
            roughness={0.4}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      ))}
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
      {/* Dark cutout (inner opening) */}
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
      {/* HUP 100x50x3 frame */}
      <group position={pos} rotation={rot}>
        <HupFrame innerW={w} innerH={h} isSelected={isSelected} />
      </group>
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
      {/* Dark hole (inner opening) */}
      <mesh position={pos} rotation={rot}>
        {el.shape === "circle" ? (
          <circleGeometry args={[Math.min(vw, vh) / 2, 32]} />
        ) : (
          <planeGeometry args={[vw, vh]} />
        )}
        <meshBasicMaterial color={holeColor} />
      </mesh>
      {/* HUP 100x50x3 frame */}
      <group position={pos} rotation={rot}>
        <HupFrame innerW={vw} innerH={vh} isSelected={isSelected} />
      </group>
      {/* Louver grille (traforist) */}
      {el.grille && (
        <group position={pos} rotation={rot}>
          <LouverGrille width={vw} height={vh} />
        </group>
      )}
      {/* Exhaust pipe */}
      {el.exhaust && (
        <group position={pos} rotation={rot}>
          <ExhaustPipe wall={el.wall} />
        </group>
      )}
    </group>
  );
}

// Convert element position (wall-local mm, origin bottom-left when viewed from outside)
// to 3D world position + rotation
function getWallTransform(wall, el, { L, W, H, T, F }) {
  const elW = el.width * S;
  const elH = el.height * S;
  const cx = el.x * S + elW / 2; // center X in wall-local coords
  const cy = el.y * S + elH / 2; // center Y in wall-local coords (relative to floor)
  const offset = T / 2 + 0.002;

  switch (wall) {
    case "front":
      return {
        pos: [L + offset, F + cy, W - cx],
        rot: [0, Math.PI / 2, 0],
      };
    case "back":
      return {
        pos: [-offset, F + cy, cx],
        rot: [0, -Math.PI / 2, 0],
      };
    case "left":
      return {
        pos: [cx, F + cy, -offset],
        rot: [0, Math.PI, 0],
      };
    case "right":
      return {
        pos: [L - cx, F + cy, W + offset],
        rot: [0, 0, 0],
      };
    case "floor":
      return {
        pos: [cx, F - offset, cy],
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
  const m = HUP_W * S; // frame margin (50mm each side)
  const ew = el.width * S + 2 * m;
  const eh = el.height * S + 2 * m;
  const ey = Math.max(0, el.y * S - m);
  let ex;
  if (wallName === "front") ex = W - (el.x + el.width) * S - m;
  else if (wallName === "right") ex = L - (el.x + el.width) * S - m;
  else ex = Math.max(0, el.x * S - m);
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
  const { L, W, H, T, F } = useDims();
  const wallH = H - F;
  const depth = 0.022;
  const off = T / 2 + depth / 2 + 0.001;

  const walls = [
    { name: "back",  len: W, h: wallH, pos: (p) => [-off,  F + p.y, p.x],  boxArgs: (s) => [depth, s[1], s[0]] },
    { name: "front", len: W, h: wallH, pos: (p) => [L + off, F + p.y, p.x], boxArgs: (s) => [depth, s[1], s[0]] },
    { name: "left",  len: L, h: wallH, pos: (p) => [p.x, F + p.y, -off],    boxArgs: (s) => [s[0], s[1], depth] },
    { name: "right", len: L, h: wallH, pos: (p) => [p.x, F + p.y, W + off],  boxArgs: (s) => [s[0], s[1], depth] },
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
  const { L, W, H, T, F } = useDims();
  const doorW = W;
  const doorH = H - F;
  const lineW = 0.015;
  const off = T / 2 + 0.025 + 0.001;

  const frameMat = <meshBasicMaterial color="#ffffff" />;
  const handleMat = <meshBasicMaterial color="#e2e8f0" />;

  let pos, rotY;
  if (wall === "front") { pos = [L + off, F + doorH / 2, W / 2]; rotY = Math.PI / 2; }
  else if (wall === "back") { pos = [-off, F + doorH / 2, W / 2]; rotY = -Math.PI / 2; }
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
      <mesh position={[-0.06, doorH * 0.42, 0.001]}>
        <planeGeometry args={[0.03, 0.12]} />{handleMat}
      </mesh>
      <mesh position={[0.06, doorH * 0.42, 0.001]}>
        <planeGeometry args={[0.03, 0.12]} />{handleMat}
      </mesh>
    </group>
  );
}

// Perforated insulation panel geometry with element cutouts
function useInsulationGeometry(panelW, panelH, depth, rects) {
  return useMemo(() => {
    const outer = new THREE.Shape();
    outer.moveTo(0, 0);
    outer.lineTo(panelW, 0);
    outer.lineTo(panelW, panelH);
    outer.lineTo(0, panelH);
    outer.closePath();

    // Cut out element openings
    for (const r of rects) {
      const xMin = Math.max(0, r.xMin);
      const xMax = Math.min(panelW, r.xMax);
      const yMin = Math.max(0, r.yMin);
      const yMax = Math.min(panelH, r.yMax);
      if (xMax <= xMin || yMax <= yMin) continue;
      const hole = new THREE.Path();
      hole.moveTo(xMin, yMin);
      hole.lineTo(xMax, yMin);
      hole.lineTo(xMax, yMax);
      hole.lineTo(xMin, yMax);
      hole.closePath();
      outer.holes.push(hole);
    }

    const geo = new THREE.ExtrudeGeometry(outer, {
      depth,
      bevelEnabled: false,
    });
    return geo;
  }, [panelW, panelH, depth, rects]);
}

// Create a repeating perforation alpha texture (procedural)
function usePerforationTexture() {
  return useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    // Fill white (opaque)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    // Draw dark circle in center (hole = transparent)
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, []);
}

// Insulation rendered on the inside face of walls / ceiling
function InsulationPanels({ insulation, elements, hiddenWalls }) {
  const { L, W, H, T, F } = useDims();
  const wallH = H - F;
  const depth = 0.05; // 50mm
  const insulColor = "#e8e8e0";

  // For each wall, compute element cutout rects (same coords as cladding but inner side)
  const wallDefs = [
    { name: "back",  panelW: W, panelH: wallH },
    { name: "front", panelW: W, panelH: wallH },
    { name: "left",  panelW: L, panelH: wallH },
    { name: "right", panelW: L, panelH: wallH },
    { name: "roof",  panelW: L, panelH: W },
  ];

  return (
    <group>
      {wallDefs.filter((w) => insulation.walls.has(w.name) && !hiddenWalls.has(w.name)).map((wall) => {
        const rects = elements
          .filter((el) => el.wall === wall.name)
          .map((el) => elementToCladdingRect(wall.name, el, { L, W }));
        return (
          <InsulationPanel
            key={wall.name}
            wallName={wall.name}
            panelW={wall.panelW}
            panelH={wall.panelH}
            depth={depth}
            rects={rects}
            color={insulColor}
            L={L} W={W} H={H} T={T} F={F}
          />
        );
      })}
    </group>
  );
}

function InsulationPanel({ wallName, panelW, panelH, depth, rects, color, L, W, H, T, F }) {
  const geometry = useInsulationGeometry(panelW, panelH, depth, rects);
  const alphaMap = usePerforationTexture();

  // Repeat the perforation pattern based on panel size (one hole every ~25mm)
  const repeatX = Math.round(panelW / 0.025);
  const repeatY = Math.round(panelH / 0.025);
  const material = useMemo(() => {
    const tex = alphaMap.clone();
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.4,
      roughness: 0.3,
      alphaMap: tex,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
  }, [alphaMap, repeatX, repeatY, color]);
  const wallH = H - F;

  // Position panel on inner face of each wall
  // ExtrudeGeometry goes in +Z from the shape plane
  let position, rotation;
  switch (wallName) {
    case "back":
      // Inner face of back wall: X = T/2, panel spans Z (width) and Y (height)
      position = [T / 2, F, W];
      rotation = [0, Math.PI / 2, 0];
      break;
    case "front":
      // Inner face of front wall: X = L - T/2, panel faces -X
      position = [L - T / 2, F, 0];
      rotation = [0, -Math.PI / 2, 0];
      break;
    case "left":
      // Inner face of left wall: Z = T/2, panel faces +Z
      position = [0, F, T / 2];
      rotation = [0, 0, 0];
      break;
    case "right":
      // Inner face of right wall: Z = W - T/2, panel faces -Z
      position = [L, F, W - T / 2];
      rotation = [0, Math.PI, 0];
      break;
    case "roof":
      // Inner face of roof: Y = H - T/2, panel faces downward
      position = [0, H - T / 2, 0];
      rotation = [Math.PI / 2, 0, 0];
      break;
    default:
      position = [0, 0, 0];
      rotation = [0, 0, 0];
  }

  return (
    <mesh geometry={geometry} material={material} position={position} rotation={rotation} />
  );
}

export default function ContainerModel() {
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const elements = useConfigStore((s) => s.elements);
  const cladding = useConfigStore((s) => s.cladding);
  const hiddenWalls = useConfigStore((s) => s.hiddenWalls);
  const containerDoor = useConfigStore((s) => s.containerDoor);
  const insulation = useConfigStore((s) => s.insulation);
  const { L, W, H, T, F } = useDims();
  const wallH = H - F; // internal wall height (above floor)

  const isHidden = (w) => hiddenWalls.has(w);

  return (
    <group position={[-L / 2, 0, -W / 2]}>
      {/* Base frame + forklift pockets (always visible) */}
      <BaseFrame />
      <ForkliftPockets />

      {!isHidden("floor") && <Floor />}

      {!isHidden("back") && <ClickableWall wallName="back" position={[0, F + wallH / 2, W / 2]} size={[T, wallH, W]} />}
      {!isHidden("left") && <ClickableWall wallName="left" position={[L / 2, F + wallH / 2, 0]} size={[L, wallH, T]} />}
      {!isHidden("right") && <ClickableWall wallName="right" position={[L / 2, F + wallH / 2, W]} size={[L, wallH, T]} />}
      {!isHidden("front") && <ClickableWall wallName="front" position={[L, F + wallH / 2, W / 2]} size={[T, wallH, W]} />}

      {!isHidden("roof") && (slopedRoof.enabled ? <SlopedRoof /> : <FlatRoof />)}

      {cladding.enabled && <Cladding cladding={cladding} elements={elements} hiddenWalls={hiddenWalls} />}

      {insulation.enabled && <InsulationPanels insulation={insulation} elements={elements} hiddenWalls={hiddenWalls} />}

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
