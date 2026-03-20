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
}));

export default useConfigStore;
