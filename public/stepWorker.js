/* Web Worker for parsing STEP/STP files using occt-import-js */
importScripts("occt-import-js.js");

let occtReady = null;

function initOcct() {
  if (!occtReady) {
    occtReady = occtimportjs({
      locateFile: (path) => path,
    });
  }
  return occtReady;
}

onmessage = async function (e) {
  try {
    const occt = await initOcct();
    const fileBuffer = new Uint8Array(e.data);
    const result = occt.ReadStepFile(fileBuffer, null);

    if (!result.success || result.meshes.length === 0) {
      postMessage({ error: "Kunne ikke lese STEP-fil" });
      return;
    }

    const meshes = [];
    const transferables = [];

    for (const mesh of result.meshes) {
      const pos = mesh.attributes.position.array;
      const vertices = new Float32Array(pos.length);
      vertices.set(pos);
      transferables.push(vertices.buffer);

      let normals = null;
      if (mesh.attributes.normal) {
        normals = new Float32Array(mesh.attributes.normal.array.length);
        normals.set(mesh.attributes.normal.array);
        transferables.push(normals.buffer);
      }

      let index = null;
      if (mesh.index) {
        index = new Uint32Array(mesh.index.array.length);
        index.set(mesh.index.array);
        transferables.push(index.buffer);
      }

      meshes.push({ vertices, normals, index });
    }

    postMessage({ meshes }, transferables);
  } catch (err) {
    postMessage({ error: err.message || "Ukjent feil ved parsing av STEP-fil" });
  }
};
