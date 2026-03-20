"use client";

import { useState } from "react";
import useConfigStore, { CONTAINER } from "../store/useConfigStore";

// Scale: mm -> Three.js units (meters)
const S = 0.001;
const L = CONTAINER.length * S;
const W = CONTAINER.width * S;
const H = CONTAINER.height * S;
const T = CONTAINER.wallThickness * S;

const steelColor = "#6b7280";
const steelDark = "#4b5563";
const doorColor = "#92400e";
const ventColor = "#1e1e1e";
const aluminumColor = "#c0c0c0";
const highlightColor = "#38bdf8";

// Element type picker shown after clicking a wall
function WallClickMenu({ position, onSelect, onCancel }) {
  // This is rendered as an HTML overlay, not in 3D
  return null; // handled in Canvas3D overlay instead
}

// Clickable wall component
function ClickableWall({ wallName, position, size, rotation, children }) {
  const placementMode = useConfigStore((s) => s.placementMode);
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
        color={isPlacing ? "#475569" : steelColor}
        metalness={0.4}
        roughness={0.6}
        emissive={isPlacing ? highlightColor : "#000000"}
        emissiveIntensity={isPlacing ? 0.08 : 0}
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
  return (
    <mesh position={[L / 2, H, W / 2]} receiveShadow>
      <boxGeometry args={[L, T, W]} />
      <meshStandardMaterial color={steelDark} metalness={0.4} roughness={0.6} />
    </mesh>
  );
}

function SlopedRoof() {
  const drop = 0.4;
  const vertices = new Float32Array([
    0, H, 0,
    0, H, W,
    L, H - drop, 0,
    L, H - drop, W,
  ]);
  const indices = [0, 2, 1, 1, 2, 3];
  return (
    <mesh receiveShadow>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={vertices} count={4} itemSize={3} />
        <bufferAttribute attach="index" array={new Uint16Array(indices)} count={6} itemSize={1} />
      </bufferGeometry>
      <meshStandardMaterial color={steelDark} metalness={0.4} roughness={0.6} side={2} />
    </mesh>
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

// Render a ventilation cutout on a wall
function VentMesh({ el }) {
  const selectedId = useConfigStore((s) => s.selectedId);
  const isSelected = selectedId === el.id;
  const { pos, rot } = getWallTransform(el.wall, el);
  const sz = el.size * S;

  return (
    <group>
      <mesh position={pos} rotation={rot}>
        {el.shape === "circle" ? (
          <circleGeometry args={[sz / 2, 32]} />
        ) : (
          <planeGeometry args={[sz, sz]} />
        )}
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={pos} rotation={rot}>
        {el.shape === "circle" ? (
          <ringGeometry args={[sz / 2 - 0.015, sz / 2, 32]} />
        ) : (
          <planeGeometry args={[sz - 0.015, sz - 0.015]} />
        )}
        <meshStandardMaterial
          color={isSelected ? highlightColor : ventColor}
          metalness={0.6}
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
  const isVent = el.type === "ventilation";
  const elW = isVent ? el.size * S : el.width * S;
  const elH = isVent ? el.size * S : el.height * S;
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
        rot: [0, 0, 0],
      };
    case "right":
      // Right wall at z=W, viewed from +Z direction
      // Wall-local: left=+X(L), right=0, bottom=0, top=H
      return {
        pos: [L - cx, cy, W + offset],
        rot: [0, Math.PI, 0],
      };
    default:
      return { pos: [0, 0, 0], rot: [0, 0, 0] };
  }
}

export default function ContainerModel() {
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const elements = useConfigStore((s) => s.elements);
  const slopedH = slopedRoof.enabled ? H - 0.4 : H;

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
      <ClickableWall wallName="front" position={[L, slopedH / 2, W / 2]} size={[T, slopedH, W]} />

      {/* Roof */}
      {slopedRoof.enabled ? <SlopedRoof /> : <FlatRoof />}

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
