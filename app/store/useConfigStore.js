import { create } from "zustand";

// Container size options (external dimensions in mm)
// floorHeight = distance from ground to top of internal floor
// forkliftPockets: positions from each end on the long sides
export const CONTAINER_SIZES = {
  "10ft":    { label: "10ft",    length: 2991, width: 2438, height: 2591, wallThickness: 50, floorHeight: 170 },
  "20ft":    { label: "20ft",    length: 6058, width: 2438, height: 2591, wallThickness: 50, floorHeight: 170 },
  "20ft HC": { label: "20ft HC", length: 6058, width: 2438, height: 2896, wallThickness: 50, floorHeight: 170 },
  "40ft":    { label: "40ft",    length: 12192, width: 2438, height: 2591, wallThickness: 50, floorHeight: 170 },
};

// Forklift pocket dimensions (mm)
export const FORKLIFT_POCKET = {
  width: 360,    // opening width along container length
  height: 120,   // opening height
  depth: 100,    // how deep into the bottom rail
  inset: 900,    // distance from each end to pocket center
};

// Default for backwards compat – components should use store.containerSize instead
export const CONTAINER = CONTAINER_SIZES["20ft"];

// Returns customDims if set, otherwise the preset for the given size
export function getActiveDims(state) {
  return state.customDims || CONTAINER_SIZES[state.containerSize];
}

export function getWallDims(c) {
  const internalH = c.height - c.floorHeight;
  return {
    front: { w: c.width,  h: internalH },
    back:  { w: c.width,  h: internalH },
    left:  { w: c.length, h: internalH },
    right: { w: c.length, h: internalH },
    floor: { w: c.length, h: c.width },
    roof:  { w: c.length, h: c.width },
  };
}

// Keep static for legacy references
export const WALL_DIMS = getWallDims(CONTAINER);

export const RAL_COLORS = [
  { code: "1015", name: "Lys elfenben", hex: "#E6D2B5" },
  { code: "1021", name: "Rapsgul", hex: "#F0CA00" },
  { code: "2004", name: "Ren oransje", hex: "#E25303" },
  { code: "3000", name: "Flammrød", hex: "#A72920" },
  { code: "5010", name: "Ensianblå", hex: "#004F7C" },
  { code: "5015", name: "Himmelblå", hex: "#007CB0" },
  { code: "6005", name: "Mosegrønn", hex: "#0F4336" },
  { code: "7001", name: "Sølvgrå", hex: "#8C969D" },
  { code: "7016", name: "Antrasittgrå", hex: "#383E42" },
  { code: "7035", name: "Lysgrå", hex: "#C5C7C4" },
  { code: "7042", name: "Trafikkgrå", hex: "#8F9695" },
  { code: "9002", name: "Gråhvit", hex: "#D7D5CB" },
  { code: "9003", name: "Signalhvit", hex: "#ECECE7" },
  { code: "9005", name: "Dyp sort", hex: "#0E0E10" },
  { code: "9010", name: "Ren hvit", hex: "#F1ECE1" },
];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function clampElement(el, wallDims) {
  const wallDim = wallDims[el.wall] || { w: 6058, h: 2591 };
  if (el.type === "door") {
    const w = clamp(el.width, 1, wallDim.w);
    const h = clamp(el.height, 1, wallDim.h);
    const x = clamp(el.x, 0, wallDim.w - w);
    const y = clamp(el.y, 0, wallDim.h - h);
    return { ...el, x, y, width: w, height: h };
  }
  // ventilation
  const w = clamp(el.width, 1, wallDim.w);
  const h = clamp(el.height, 1, wallDim.h);
  const x = clamp(el.x, 0, wallDim.w - w);
  const y = clamp(el.y, 0, wallDim.h - h);
  return { ...el, x, y, width: w, height: h };
}

let nextId = 1;

const useConfigStore = create((set, get) => ({
  // Container size
  containerSize: "20ft",

  // Custom dimension overrides (null = use preset)
  customDims: null,

  // Array of placed elements
  elements: [],

  // Placement mode: null | "pending" (waiting for wall click)
  placementMode: null,

  // Which element is selected for editing
  selectedId: null,

  // Which element is unlocked for position editing / dragging
  unlockedId: null,

  // Global toggles
  roofType: "flat", // "flat" | "sloped" | "gable"
  aluminumFloor: { enabled: false },

  showDrawing: false,

  containerColor: "#94a3b8",
  containerRal: null,
  paintType: null, // null | "fargeskift" | "epoxy"

  cladding: { enabled: false, direction: "horizontal", color: "#8B7355", ral: null },

  // Section view: which walls are hidden
  hiddenWalls: new Set(),

  // Container door (standard double door)
  containerDoor: { enabled: true, wall: "front" },

  // Interior insulation (perforated panels, 50mm)
  insulation: { enabled: false, walls: new Set(["front", "back", "left", "right", "roof"]) },

  // Interior 3D objects (STEP / GLB uploads)
  interiorObjects: [],
  selectedInteriorId: null,

  // Start placement mode
  startPlacement: () => set({ placementMode: "pending", selectedId: null }),
  cancelPlacement: () => set({ placementMode: null }),

  setContainerSize: (size) => set((s) => {
    const c = CONTAINER_SIZES[size];
    const wd = getWallDims(c);
    return {
      containerSize: size,
      customDims: null,
      elements: s.elements.map((el) => clampElement(el, wd)),
      selectedId: null,
      unlockedId: null,
      placementMode: null,
    };
  }),

  setCustomDim: (dim, value) => {
    const s = get();
    const base = s.customDims || CONTAINER_SIZES[s.containerSize];
    const newDims = { ...base, [dim]: value };
    const wd = getWallDims(newDims);
    set({
      customDims: newDims,
      elements: s.elements.map((el) => clampElement(el, wd)),
      selectedId: s.selectedId,
      unlockedId: null,
      placementMode: null,
    });
  },

  // Called when user clicks a wall face in 3D — adds element with defaults
  placeElement: (wall, type, clickX, clickY, opts) => {
    const id = nextId++;
    const base = { id, wall };
    const c = getActiveDims(get());
    const wd = getWallDims(c);
    let el;
    if (type === "door") {
      const doorW = opts?.doorWidth || 1000;
      const doorH = opts?.doorHeight || 2100;
      const isHorizontal = wall === "floor" || wall === "roof";
      el = clampElement({
        ...base, type: "door",
        x: Math.round(clickX), y: isHorizontal ? Math.round(clickY) : 0,
        width: doorW, height: isHorizontal ? doorW : doorH,
      }, wd);
    } else {
      el = clampElement({
        ...base, type: "ventilation",
        x: Math.round(clickX), y: Math.round(clickY),
        width: opts?.ventWidth || 400, height: opts?.ventHeight || 300,
        shape: "rectangle", grille: false, exhaust: false,
      }, wd);
    }
    set((s) => ({
      elements: [...s.elements, el],
      placementMode: null,
      selectedId: id,
      unlockedId: id,
    }));
  },

  // Update an existing element
  updateElement: (id, partial) =>
    set((s) => {
      const c = getActiveDims(s);
      const wd = getWallDims(c);
      return {
        elements: s.elements.map((el) =>
          el.id === id ? clampElement({ ...el, ...partial }, wd) : el
        ),
      };
    }),

  // Remove element
  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((el) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  selectElement: (id) => set({ selectedId: id, placementMode: null }),

  toggleUnlock: (id) =>
    set((s) => ({ unlockedId: s.unlockedId === id ? null : id })),

  setRoofType: (type) => set({ roofType: type }),

  toggleAluminumFloor: () =>
    set((s) => ({ aluminumFloor: { enabled: !s.aluminumFloor.enabled } })),

  setShowDrawing: (v) => set({ showDrawing: v }),

  setContainerColor: (ral, hex) => set({ containerRal: ral, containerColor: hex }),

  setPaintType: (type) => set({ paintType: type }),

  toggleCladding: () =>
    set((s) => ({ cladding: { ...s.cladding, enabled: !s.cladding.enabled } })),

  setCladdingDirection: (dir) =>
    set((s) => ({ cladding: { ...s.cladding, direction: dir } })),

  setCladdingColor: (ral, hex) =>
    set((s) => ({ cladding: { ...s.cladding, ral, color: hex } })),

  toggleWallVisibility: (wallName) =>
    set((s) => {
      const next = new Set(s.hiddenWalls);
      if (next.has(wallName)) next.delete(wallName);
      else next.add(wallName);
      return { hiddenWalls: next };
    }),

  toggleContainerDoor: () =>
    set((s) => ({ containerDoor: { ...s.containerDoor, enabled: !s.containerDoor.enabled } })),

  setContainerDoorWall: (wall) =>
    set((s) => ({ containerDoor: { ...s.containerDoor, wall } })),

  toggleInsulation: () =>
    set((s) => ({ insulation: { ...s.insulation, enabled: !s.insulation.enabled } })),

  toggleInsulationWall: (wallName) =>
    set((s) => {
      const next = new Set(s.insulation.walls);
      if (next.has(wallName)) next.delete(wallName);
      else next.add(wallName);
      return { insulation: { ...s.insulation, walls: next } };
    }),

  // Interior objects (geometry stored in geometryCache, not in Zustand)
  addInteriorObject: ({ name, geometryData }) => {
    const { geometryCache, geometryDataToBufferGeometry } = require("../lib/stepLoader");
    const id = nextId++;
    geometryCache.set(id, geometryDataToBufferGeometry(geometryData));
    const c = getActiveDims(get());
    const obj = {
      id, name,
      x: c.length / 2,
      y: 0,
      z: c.width / 2,
      rotY: 0,
      scale: 1,
      color: "#78909c",
    };
    set((s) => ({
      interiorObjects: [...s.interiorObjects, obj],
      selectedInteriorId: id,
    }));
  },

  updateInteriorObject: (id, partial) =>
    set((s) => ({
      interiorObjects: s.interiorObjects.map((o) =>
        o.id === id ? { ...o, ...partial } : o
      ),
    })),

  removeInteriorObject: (id) => {
    const { geometryCache } = require("../lib/stepLoader");
    geometryCache.delete(id);
    set((s) => ({
      interiorObjects: s.interiorObjects.filter((o) => o.id !== id),
      selectedInteriorId: s.selectedInteriorId === id ? null : s.selectedInteriorId,
    }));
  },

  selectInteriorObject: (id) => set({ selectedInteriorId: id, selectedId: null }),

  // ── Serialization ────────────────────────────────────────
  exportConfig: () => {
    const s = get();
    return {
      containerSize: s.containerSize,
      elements: s.elements,
      roofType: s.roofType,
      aluminumFloor: s.aluminumFloor,
      containerColor: s.containerColor,
      containerRal: s.containerRal,
      paintType: s.paintType,
      cladding: s.cladding,
      hiddenWalls: [...s.hiddenWalls],
      containerDoor: s.containerDoor,
      insulation: { ...s.insulation, walls: [...s.insulation.walls] },
      interiorObjects: s.interiorObjects,
    };
  },

  importConfig: (data) => {
    set({
      containerSize: data.containerSize,
      elements: data.elements || [],
      roofType: data.roofType || (data.slopedRoof?.enabled ? "sloped" : "flat"),
      aluminumFloor: data.aluminumFloor || { enabled: false },
      containerColor: data.containerColor || "#94a3b8",
      containerRal: data.containerRal || null,
      paintType: data.paintType || null,
      cladding: data.cladding || { enabled: false, direction: "horizontal", color: "#8B7355", ral: null },
      hiddenWalls: new Set(data.hiddenWalls || []),
      containerDoor: data.containerDoor || { enabled: true, wall: "front" },
      insulation: {
        enabled: data.insulation?.enabled || false,
        walls: new Set(data.insulation?.walls || ["front", "back", "left", "right", "roof"]),
      },
      interiorObjects: data.interiorObjects || [],
      selectedId: null,
      selectedInteriorId: null,
      placementMode: null,
      showDrawing: false,
    });
  },
}));

export default useConfigStore;
