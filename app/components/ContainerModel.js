"use client";

import { useState } from "react";
import useConfigStore, { CONTAINER } from "../store/useConfigStore";

// Scale: mm -> Three.js units (meters)
const S = 0.001;
const L = CONTAINER.length * S;
const W = CONTAINER.width * S;
const H = CONTAINER.height * S;
const T = CONTAINER.wallThickness * S;

const steelColor = "#94a3b8";
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
  return (
    <mesh position={[L / 2, T / 2, W / 2]} receiveShadow>
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
  return (
    <mesh position={[L / 2, H, W / 2]} receiveShadow>
      <boxGeometry args={[L, T, W]} />
      <meshStandardMaterial color={containerColor} metalness={0.4} roughness={0.6} />
    </mesh>
  );
}

function SlopedRoof() {
  // 6% slope across the width (left z=0 is high side, right z=W is low side)
  const rise = W * 0.06; // ~0.146m
  const roofT = 0.03; // roof panel thickness
  const base = H + T / 2; // sit on top of flat roof

  // 4 vertices: high side at z=0, low side at z=W
  const vertices = new Float32Array([
    0,  base + rise, 0,
    L,  base + rise, 0,
    0,  base,        W,
    L,  base,        W,
  ]);
  const indices = new Uint16Array([0, 2, 1, 1, 2, 3]);
  const normals = new Float32Array([
    0, 1, 0.06,
    0, 1, 0.06,
    0, 1, 0.06,
    0, 1, 0.06,
  ]);

  // Triangular side gables (left z=0 high, right z=W flush)
  const leftGableVerts = new Float32Array([
    0, H, 0,
    0, H, W,
    0, base + rise, 0,
    0, base, W,
  ]);
  const rightGableVerts = new Float32Array([
    L, H, 0,
    L, H, W,
    L, base + rise, 0,
    L, base, W,
  ]);
  const gableIdx = new Uint16Array([0, 1, 2, 2, 1, 3]);

  return (
    <group>
      {/* Sloped panel */}
      <mesh receiveShadow>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={vertices} count={4} itemSize={3} />
          <bufferAttribute attach="attributes-normal" array={normals} count={4} itemSize={3} />
          <bufferAttribute attach="index" array={indices} count={6} itemSize={1} />
        </bufferGeometry>
        <meshStandardMaterial color="#0E0E10" metalness={0.4} roughness={0.6} side={2} />
      </mesh>
      {/* Front gable */}
      <mesh receiveShadow>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={rightGableVerts} count={4} itemSize={3} />
          <bufferAttribute attach="index" array={gableIdx} count={6} itemSize={1} />
        </bufferGeometry>
        <meshStandardMaterial color="#0E0E10" metalness={0.4} roughness={0.6} side={2} />
      </mesh>
      {/* Back gable */}
      <mesh receiveShadow>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={leftGableVerts} count={4} itemSize={3} />
          <bufferAttribute attach="index" array={gableIdx} count={6} itemSize={1} />
        </bufferGeometry>
        <meshStandardMaterial color="#0E0E10" metalness={0.4} roughness={0.6} side={2} />
      </mesh>
    </group>
  );
}

// Render a door element on a wall
function DoorMesh({ el }) {
  const selectedId = useConfigStore((s) => s.selectedId);
  const isSelected = selectedId === el.id;
  const { pos, rot } = getWallTransform(el.wall, el);
  const w = el.width * S;
  const h = el.height * S;

  return (
    <group>
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
  const { pos, rot } = getWallTransform(el.wall, el);
  const vw = el.width * S;
  const vh = el.height * S;

  return (
    <group>
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
function getWallTransform(wall, el) {
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
    default:
      return { pos: [0, 0, 0], rot: [0, 0, 0] };
  }
}

// Generate plank positions for one wall
function generatePlanks(wallLength, wallHeight, direction) {
  const plankSize = 0.15; // 150mm
  const gap = 0.008;      // 8mm gap between planks
  const step = plankSize + gap;
  const planks = [];

  if (direction === "horizontal") {
    const count = Math.floor(wallHeight / step);
    for (let i = 0; i < count; i++) {
      planks.push({
        y: plankSize / 2 + i * step,
        size: [wallLength, plankSize],
      });
    }
  } else {
    const count = Math.floor(wallLength / step);
    for (let i = 0; i < count; i++) {
      planks.push({
        x: plankSize / 2 + i * step,
        size: [plankSize, wallHeight],
      });
    }
  }
  return planks;
}

function Cladding({ cladding }) {
  const { direction, color } = cladding;
  const depth = 0.022; // plank thickness
  const off = T / 2 + depth / 2 + 0.001;

  // Darken the color slightly for the gap shadow effect
  const walls = [
    { name: "back",  len: W, h: H, pos: (p) => [-off,        p.y || H / 2, p.x || W / 2],  boxArgs: (s) => [depth, s[1], s[0]] },
    { name: "front", len: W, h: H, pos: (p) => [L + off,     p.y || H / 2, p.x || W / 2],  boxArgs: (s) => [depth, s[1], s[0]] },
    { name: "left",  len: L, h: H, pos: (p) => [p.x || L / 2, p.y || H / 2, -off],          boxArgs: (s) => [s[0], s[1], depth] },
    { name: "right", len: L, h: H, pos: (p) => [p.x || L / 2, p.y || H / 2, W + off],       boxArgs: (s) => [s[0], s[1], depth] },
  ];

  return (
    <group>
      {walls.map((wall) => {
        const planks = generatePlanks(wall.len, wall.h, direction);
        return planks.map((plank, i) => {
          const posData = {};
          if (direction === "horizontal") {
            posData.y = plank.y;
          } else {
            posData.x = plank.x;
            posData.y = wall.h / 2;
          }
          const pos = wall.pos(posData);
          const args = wall.boxArgs(plank.size);
          return (
            <mesh key={`${wall.name}-${i}`} position={pos} castShadow>
              <boxGeometry args={args} />
              <meshStandardMaterial
                color={color}
                metalness={0.1}
                roughness={0.85}
              />
            </mesh>
          );
        });
      })}
    </group>
  );
}

export default function ContainerModel() {
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const elements = useConfigStore((s) => s.elements);
  const cladding = useConfigStore((s) => s.cladding);

  return (
    <group position={[-L / 2, 0, -W / 2]}>
      <Floor />

      {/* Back wall (x=0) */}
      <ClickableWall wallName="back" position={[0, H / 2, W / 2]} size={[T, H, W]} />

      {/* Left wall (z=0) */}
      <ClickableWall wallName="left" position={[L / 2, H / 2, 0]} size={[L, H, T]} />

      {/* Right wall (z=W) */}
      <ClickableWall wallName="right" position={[L / 2, H / 2, W]} size={[L, H, T]} />

      {/* Front wall (x=L) */}
      <ClickableWall wallName="front" position={[L, H / 2, W / 2]} size={[T, H, W]} />

      {/* Flat roof always shown */}
      <FlatRoof />

      {/* Sloped roof on top */}
      {slopedRoof.enabled && <SlopedRoof />}

      {/* Cladding */}
      {cladding.enabled && <Cladding cladding={cladding} />}

      {/* Render all elements */}
      {elements.map((el) =>
        el.type === "door" ? (
          <DoorMesh key={el.id} el={el} />
        ) : (
          <VentMesh key={el.id} el={el} />
        )
      )}
    </group>
  );
}
