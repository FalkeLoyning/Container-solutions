import { create } from "zustand";

// 20ft ISO container dimensions in mm
export const CONTAINER = {
  length: 6058,
  width: 2438,
  height: 2591,
  wallThickness: 50,
};

// Wall dimensions: width × height (local coords, origin = bottom-left)
export const WALL_DIMS = {
  front: { w: CONTAINER.width, h: CONTAINER.height },
  back:  { w: CONTAINER.width, h: CONTAINER.height },
  left:  { w: CONTAINER.length, h: CONTAINER.height },
  right: { w: CONTAINER.length, h: CONTAINER.height },
};

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

function clampElement(el) {
  const wallDim = WALL_DIMS[el.wall] || { w: 6058, h: 2591 };
  if (el.type === "door") {
    const w = clamp(el.width, 300, wallDim.w);
    const h = clamp(el.height, 400, wallDim.h);
    const x = clamp(el.x, 0, wallDim.w - w);
    const y = clamp(el.y, 0, wallDim.h - h);
    return { ...el, x, y, width: w, height: h };
  }
  // ventilation
  const w = clamp(el.width, 50, wallDim.w);
  const h = clamp(el.height, 50, wallDim.h);
  const x = clamp(el.x, 0, wallDim.w - w);
  const y = clamp(el.y, 0, wallDim.h - h);
  return { ...el, x, y, width: w, height: h };
}

let nextId = 1;

const useConfigStore = create((set, get) => ({
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

  // Start placement mode
  startPlacement: () => set({ placementMode: "pending", selectedId: null }),
  cancelPlacement: () => set({ placementMode: null }),

  // Called when user clicks a wall face in 3D — adds element with defaults
  placeElement: (wall, type, clickX, clickY) => {
    const id = nextId++;
    const base = { id, wall };
    let el;
    if (type === "door") {
      el = clampElement({
        ...base, type: "door",
        x: Math.round(clickX), y: 0,
        width: 1000, height: 2100,
      });
    } else {
      el = clampElement({
        ...base, type: "ventilation",
        x: Math.round(clickX), y: Math.round(clickY),
        width: 400, height: 300, shape: "rectangle",
      });
    }
    set((s) => ({
      elements: [...s.elements, el],
      placementMode: null,
      selectedId: id,
    }));
  },

  // Update an existing element
  updateElement: (id, partial) =>
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? clampElement({ ...el, ...partial }) : el
      ),
    })),

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
}));

export default useConfigStore;
