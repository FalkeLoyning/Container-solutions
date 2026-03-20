import { create } from "zustand";

// Container size options (internal dimensions in mm)
export const CONTAINER_SIZES = {
  "10ft":    { label: "10ft",    length: 2991, width: 2438, height: 2591, wallThickness: 50 },
  "20ft":    { label: "20ft",    length: 6058, width: 2438, height: 2591, wallThickness: 50 },
  "20ft HC": { label: "20ft HC", length: 6058, width: 2438, height: 2896, wallThickness: 50 },
  "40ft":    { label: "40ft",    length: 12192, width: 2438, height: 2591, wallThickness: 50 },
};

// Default for backwards compat – components should use store.containerSize instead
export const CONTAINER = CONTAINER_SIZES["20ft"];

export function getWallDims(c) {
  return {
    front: { w: c.width, h: c.height },
    back:  { w: c.width, h: c.height },
    left:  { w: c.length, h: c.height },
    right: { w: c.length, h: c.height },
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

  // Array of placed elements
  elements: [],

  // Placement mode: null | "pending" (waiting for wall click)
  placementMode: null,

  // Which element is selected for editing
  selectedId: null,

  // Global toggles
  slopedRoof: { enabled: false },
  aluminumFloor: { enabled: false },

  showDrawing: false,

  containerColor: "#94a3b8",
  containerRal: null,

  cladding: { enabled: false, direction: "horizontal", color: "#94a3b8", ral: null },

  // Section view: which walls are hidden
  hiddenWalls: new Set(),

  // Container door (standard double door)
  containerDoor: { enabled: false, wall: "front" },

  // Interior 3D objects (STEP / GLB uploads)
  interiorObjects: [],
  selectedInteriorId: null,

  // Start placement mode
  startPlacement: () => set({ placementMode: "pending", selectedId: null }),
  cancelPlacement: () => set({ placementMode: null }),

  setContainerSize: (size) => set({
    containerSize: size,
    elements: [],
    selectedId: null,
    placementMode: null,
  }),

  // Called when user clicks a wall face in 3D — adds element with defaults
  placeElement: (wall, type, clickX, clickY) => {
    const id = nextId++;
    const base = { id, wall };
    const c = CONTAINER_SIZES[get().containerSize];
    const wd = getWallDims(c);
    let el;
    if (type === "door") {
      const isHorizontal = wall === "floor" || wall === "roof";
      el = clampElement({
        ...base, type: "door",
        x: Math.round(clickX), y: isHorizontal ? Math.round(clickY) : 0,
        width: 1000, height: isHorizontal ? 1000 : 2100,
      }, wd);
    } else {
      el = clampElement({
        ...base, type: "ventilation",
        x: Math.round(clickX), y: Math.round(clickY),
        width: 400, height: 300, shape: "rectangle",
      }, wd);
    }
    set((s) => ({
      elements: [...s.elements, el],
      placementMode: null,
      selectedId: id,
    }));
  },

  // Update an existing element
  updateElement: (id, partial) =>
    set((s) => {
      const c = CONTAINER_SIZES[s.containerSize];
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

  toggleSlopedRoof: () =>
    set((s) => ({ slopedRoof: { enabled: !s.slopedRoof.enabled } })),

  toggleAluminumFloor: () =>
    set((s) => ({ aluminumFloor: { enabled: !s.aluminumFloor.enabled } })),

  setShowDrawing: (v) => set({ showDrawing: v }),

  setContainerColor: (ral, hex) => set({ containerRal: ral, containerColor: hex }),

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

  // Interior objects (geometry stored in geometryCache, not in Zustand)
  addInteriorObject: ({ name, geometryData }) => {
    const { geometryCache, geometryDataToBufferGeometry } = require("../lib/stepLoader");
    const id = nextId++;
    geometryCache.set(id, geometryDataToBufferGeometry(geometryData));
    const c = CONTAINER_SIZES[get().containerSize];
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
}));

export default useConfigStore;
