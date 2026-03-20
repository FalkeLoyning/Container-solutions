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

// Geometry cache: id -> BufferGeometry (kept outside Zustand to avoid proxy overhead)
export const geometryCache = new Map();

export function geometryDataToBufferGeometry(geometryData) {
  const merged = new THREE.BufferGeometry();

  // Calculate total sizes first to use typed arrays (avoids spread stack overflow)
  let totalVerts = 0, totalNorms = 0, totalIdx = 0;
  for (const mesh of geometryData) {
    totalVerts += mesh.vertices.length;
    if (mesh.normals) totalNorms += mesh.normals.length;
    if (mesh.index) totalIdx += mesh.index.length;
  }

  const verts = new Float32Array(totalVerts);
  const norms = totalNorms > 0 ? new Float32Array(totalNorms) : null;
  const indices = totalIdx > 0 ? new Uint32Array(totalIdx) : null;
  let vOff = 0, nOff = 0, iOff = 0, vertexOffset = 0;

  for (const mesh of geometryData) {
    verts.set(mesh.vertices, vOff);
    vOff += mesh.vertices.length;
    if (norms && mesh.normals) {
      norms.set(mesh.normals, nOff);
      nOff += mesh.normals.length;
    }
    if (indices && mesh.index) {
      for (let i = 0; i < mesh.index.length; i++) {
        indices[iOff + i] = mesh.index[i] + vertexOffset;
      }
      iOff += mesh.index.length;
    }
    vertexOffset += mesh.vertices.length / 3;
  }

  merged.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  if (norms) {
    merged.setAttribute("normal", new THREE.BufferAttribute(norms, 3));
  }
  if (indices) {
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
  }
  if (!norms) {
    merged.computeVertexNormals();
  }

  merged.computeBoundingBox();
  const box = merged.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  merged.translate(-center.x, -box.min.y, -center.z);

  return merged;
}
