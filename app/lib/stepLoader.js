"use client";

import * as THREE from "three";

let occtInitPromise = null;

async function getOcct() {
  if (!occtInitPromise) {
    occtInitPromise = (async () => {
      const occtImport = await import("occt-import-js");
      const occt = await occtImport.default({
        locateFile: () => "/occt-import-js.wasm",
      });
      return occt;
    })();
  }
  return occtInitPromise;
}

export async function loadStepFile(file) {
  const occt = await getOcct();
  const buffer = await file.arrayBuffer();
  const result = occt.ReadStepFile(new Uint8Array(buffer), null);

  if (!result.success || result.meshes.length === 0) {
    throw new Error("Kunne ikke lese STEP-fil");
  }

  const geometryData = [];
  for (const mesh of result.meshes) {
    const vertices = Array.from(mesh.attributes.position.array);
    const normals = mesh.attributes.normal
      ? Array.from(mesh.attributes.normal.array)
      : null;
    const index = mesh.index ? Array.from(mesh.index.array) : null;
    geometryData.push({ vertices, normals, index });
  }
  return geometryData;
}

export async function loadGlbFile(file) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  const buffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    loader.parse(buffer, "", (gltf) => {
      const geometryData = [];
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const pos = child.geometry.attributes.position;
          const norm = child.geometry.attributes.normal;
          const idx = child.geometry.index;
          geometryData.push({
            vertices: Array.from(pos.array),
            normals: norm ? Array.from(norm.array) : null,
            index: idx ? Array.from(idx.array) : null,
          });
        }
      });
      if (geometryData.length === 0) reject(new Error("Ingen mesh funnet i GLB-fil"));
      else resolve(geometryData);
    }, reject);
  });
}

export function geometryDataToBufferGeometry(geometryData) {
  const merged = new THREE.BufferGeometry();
  const allVerts = [];
  const allNorms = [];
  const allIndices = [];
  let vertexOffset = 0;

  for (const mesh of geometryData) {
    allVerts.push(...mesh.vertices);
    if (mesh.normals) allNorms.push(...mesh.normals);
    if (mesh.index) {
      for (const i of mesh.index) allIndices.push(i + vertexOffset);
    }
    vertexOffset += mesh.vertices.length / 3;
  }

  merged.setAttribute("position", new THREE.Float32BufferAttribute(allVerts, 3));
  if (allNorms.length > 0) {
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(allNorms, 3));
  }
  if (allIndices.length > 0) {
    merged.setIndex(allIndices);
  }
  if (allNorms.length === 0) {
    merged.computeVertexNormals();
  }

  merged.computeBoundingBox();
  const box = merged.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  merged.translate(-center.x, -box.min.y, -center.z);

  return merged;
}
