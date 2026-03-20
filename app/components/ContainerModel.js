"use client";

import useConfigStore, { CONTAINER } from "../store/useConfigStore";

// Scale: mm -> Three.js units (meters)
const S = 0.001;
const L = CONTAINER.length * S;
const W = CONTAINER.width * S;
const H = CONTAINER.height * S;
const T = CONTAINER.wallThickness * S; // wall thickness

const steelColor = "#6b7280";
const steelDark = "#4b5563";
const doorColor = "#92400e";
const ventColor = "#1e1e1e";
const aluminumColor = "#c0c0c0";

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

function BackWall() {
  return (
    <mesh position={[0, H / 2, W / 2]} castShadow>
      <boxGeometry args={[T, H, W]} />
      <meshStandardMaterial color={steelColor} metalness={0.4} roughness={0.6} />
    </mesh>
  );
}

function LeftWall() {
  return (
    <mesh position={[L / 2, H / 2, 0]} castShadow>
      <boxGeometry args={[L, H, T]} />
      <meshStandardMaterial color={steelColor} metalness={0.4} roughness={0.6} />
    </mesh>
  );
}

function RightWall() {
  return (
    <mesh position={[L / 2, H / 2, W]} castShadow>
      <boxGeometry args={[L, H, T]} />
      <meshStandardMaterial color={steelColor} metalness={0.4} roughness={0.6} />
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
  // Roof slopes from back (full height) to front (reduced by 400mm)
  const drop = 0.4; // 400mm drop at front
  const vertices = new Float32Array([
    // Back-left top
    0, H, 0,
    // Back-right top
    0, H, W,
    // Front-left top (lower)
    L, H - drop, 0,
    // Front-right top (lower)
    L, H - drop, W,
  ]);
  const indices = [0, 2, 1, 1, 2, 3];

  return (
    <mesh receiveShadow>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={vertices}
          count={4}
          itemSize={3}
        />
        <bufferAttribute
          attach="index"
          array={new Uint16Array(indices)}
          count={6}
          itemSize={1}
        />
      </bufferGeometry>
      <meshStandardMaterial
        color={steelDark}
        metalness={0.4}
        roughness={0.6}
        side={2}
      />
    </mesh>
  );
}

function FrontWall() {
  const door = useConfigStore((s) => s.door);
  const slopedRoof = useConfigStore((s) => s.slopedRoof);
  const wallH = slopedRoof.enabled ? H - 0.4 : H;

  return (
    <group>
      {/* Front wall */}
      <mesh position={[L, wallH / 2, W / 2]} castShadow>
        <boxGeometry args={[T, wallH, W]} />
        <meshStandardMaterial
          color={steelColor}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Door opening (dark cutout) */}
      {door.enabled && (
        <mesh
          position={[
            L + T / 2 + 0.001,
            door.y * S + (door.height * S) / 2,
            (W - door.x * S) - (door.width * S) / 2,
          ]}
        >
          <planeGeometry args={[door.width * S, door.height * S]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      )}

      {/* Door panel */}
      {door.enabled && (
        <mesh
          position={[
            L + T / 2 + 0.003,
            door.y * S + (door.height * S) / 2,
            (W - door.x * S) - (door.width * S) / 2,
          ]}
        >
          <planeGeometry
            args={[door.width * S - 0.02, door.height * S - 0.02]}
          />
          <meshStandardMaterial
            color={doorColor}
            metalness={0.2}
            roughness={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

function VentilationCutout() {
  const vent = useConfigStore((s) => s.ventilation);
  if (!vent.enabled) return null;

  const sz = vent.size * S;
  const px = vent.x * S + sz / 2;
  const py = vent.y * S + sz / 2;

  return (
    <group>
      {/* Dark cutout on right wall */}
      <mesh position={[px, py, W + T / 2 + 0.001]} rotation={[0, 0, 0]}>
        {vent.shape === "circle" ? (
          <circleGeometry args={[sz / 2, 32]} />
        ) : (
          <planeGeometry args={[sz, sz]} />
        )}
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Vent grille */}
      <mesh position={[px, py, W + T / 2 + 0.003]}>
        {vent.shape === "circle" ? (
          <ringGeometry args={[sz / 2 - 0.02, sz / 2, 32]} />
        ) : (
          <planeGeometry args={[sz - 0.02, sz - 0.02]} />
        )}
        <meshStandardMaterial color={ventColor} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function ContainerModel() {
  const slopedRoof = useConfigStore((s) => s.slopedRoof);

  return (
    <group position={[-L / 2, 0, -W / 2]}>
      <Floor />
      <BackWall />
      <LeftWall />
      <RightWall />
      <FrontWall />
      {slopedRoof.enabled ? <SlopedRoof /> : <FlatRoof />}
      <VentilationCutout />
    </group>
  );
}
