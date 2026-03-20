import { create } from "zustand";

// 20ft ISO container dimensions in mm
export const CONTAINER = {
  length: 6058,
  width: 2438,
  height: 2591,
  wallThickness: 50,
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function clampDoor(door) {
  const w = clamp(door.width, 400, CONTAINER.width);
  const h = clamp(door.height, 500, CONTAINER.height);
  const x = clamp(door.x, 0, CONTAINER.width - w);
  const y = clamp(door.y, 0, CONTAINER.height - h);
  return { ...door, x, y, width: w, height: h };
}

function clampVent(vent) {
  const size = clamp(vent.size, 100, 600);
  const x = clamp(vent.x, 0, CONTAINER.length - size);
  const y = clamp(vent.y, 0, CONTAINER.height - size);
  return { ...vent, x, y, size };
}

const useConfigStore = create((set) => ({
  door: { enabled: false, x: 700, y: 0, width: 1000, height: 2100 },
  ventilation: { enabled: false, x: 3000, y: 1500, size: 300, shape: "circle" },
  slopedRoof: { enabled: false },
  aluminumFloor: { enabled: false },
  showDrawing: false,

  updateDoor: (partial) =>
    set((s) => ({ door: clampDoor({ ...s.door, ...partial }) })),

  updateVentilation: (partial) =>
    set((s) => ({ ventilation: clampVent({ ...s.ventilation, ...partial }) })),

  toggleSlopedRoof: () =>
    set((s) => ({ slopedRoof: { enabled: !s.slopedRoof.enabled } })),

  toggleAluminumFloor: () =>
    set((s) => ({ aluminumFloor: { enabled: !s.aluminumFloor.enabled } })),

  setShowDrawing: (v) => set({ showDrawing: v }),
}));

export default useConfigStore;
