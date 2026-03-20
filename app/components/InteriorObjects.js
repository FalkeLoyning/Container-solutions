"use client";

import { useMemo } from "react";
import useConfigStore from "../store/useConfigStore";
import { geometryCache } from "../lib/stepLoader";

const S = 0.001;
const highlightColor = "#0284c7";

function InteriorMesh({ obj }) {
  const selectedId = useConfigStore((s) => s.selectedInteriorId);
  const isSelected = selectedId === obj.id;

  const geometry = useMemo(() => {
    return geometryCache.get(obj.id) || null;
  }, [obj.id]);

  if (!geometry) return null;

  return (
    <group
      userData={{ interiorId: obj.id }}
      position={[obj.x * S, obj.y * S, obj.z * S]}
      rotation={[0, obj.rotY, 0]}
      scale={[obj.scale * S, obj.scale * S, obj.scale * S]}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={isSelected ? highlightColor : obj.color}
          metalness={0.3}
          roughness={0.6}
          emissive={isSelected ? highlightColor : "#000000"}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
    </group>
  );
}

export default function InteriorObjects() {
  const objects = useConfigStore((s) => s.interiorObjects);
  return (
    <>
      {objects.map((obj) => (
        <InteriorMesh key={obj.id} obj={obj} />
      ))}
    </>
  );
}
