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
function InsulationPanels({ insulation, elements }) {
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
      {wallDefs.filter((w) => insulation.walls.has(w.name)).map((wall) => {
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
      position = [T / 2, F, 0];
      rotation = [0, Math.PI / 2, 0];
      break;
    case "front":
      // Inner face of front wall: X = L - T/2, panel faces -X
      position = [L - T / 2, F, W];
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
      rotation = [-Math.PI / 2, 0, 0];
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

      {insulation.enabled && <InsulationPanels insulation={insulation} elements={elements} />}

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
