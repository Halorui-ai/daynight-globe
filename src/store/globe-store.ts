import { create } from "zustand";

export type Selection =
  | { kind: "country"; id: string }
  | { kind: "city"; id: string }
  | null;

export type FlyTo = { lat: number; lon: number; distance: number; key: number };

export type ViewRequest = { kind: "globe" | "system"; key: number };

export type HoverInfo = {
  lat: number;
  lon: number;
  countryId: string | null;
  cityId: string | null;
  x: number;
  y: number;
} | null;

type GlobeState = {
  speed: number;
  paused: boolean;
  simTime: number;
  showBorders: boolean;
  showCountries: boolean;
  showCities: boolean;
  showClouds: boolean;
  showGraticule: boolean;
  showAtmosphere: boolean;
  autoRotate: boolean;
  viewMode: "globe" | "system";
  viewRequest: ViewRequest | null;
  cameraDist: number;
  selected: Selection;
  hover: HoverInfo;
  query: string;
  flyTo: FlyTo | null;
  sunLat: number;
  sunLon: number;
  moonLat: number;
  moonLon: number;
  moonIllum: number;
  setSpeed: (speed: number) => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setSimTime: (simTime: number) => void;
  advance: (ms: number) => void;
  setShowBorders: (v: boolean) => void;
  setShowCountries: (v: boolean) => void;
  setShowCities: (v: boolean) => void;
  setShowClouds: (v: boolean) => void;
  setShowGraticule: (v: boolean) => void;
  setShowAtmosphere: (v: boolean) => void;
  setAutoRotate: (v: boolean) => void;
  setViewMode: (viewMode: "globe" | "system") => void;
  requestView: (kind: "globe" | "system") => void;
  clearViewRequest: () => void;
  setCameraDist: (cameraDist: number) => void;
  setSelected: (selected: Selection) => void;
  setHover: (hover: HoverInfo) => void;
  setQuery: (query: string) => void;
  requestFlyTo: (lat: number, lon: number, distance?: number) => void;
  clearFlyTo: () => void;
  setSun: (lat: number, lon: number) => void;
  setMoon: (lat: number, lon: number, illum: number) => void;
  resetTime: () => void;
};

export const SPEED_PRESETS = [
  { label: "实时", value: 1 },
  { label: "60×", value: 60 },
  { label: "1 时/秒", value: 3600 },
  { label: "1 日/分", value: 1440 },
  { label: "1 日/秒", value: 86400 },
] as const;

export const useGlobeStore = create<GlobeState>((set) => ({
  speed: 1440,
  paused: false,
  simTime: Date.now(),
  showBorders: true,
  showCountries: true,
  showCities: true,
  showClouds: true,
  showGraticule: false,
  showAtmosphere: true,
  autoRotate: false,
  viewMode: "globe",
  viewRequest: null,
  cameraDist: 2.62,
  selected: null,
  hover: null,
  query: "",
  flyTo: null,
  sunLat: 0,
  sunLon: 0,
  moonLat: 0,
  moonLon: 0,
  moonIllum: 0.5,
  setSpeed: (speed) => set({ speed }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setSimTime: (simTime) => set({ simTime }),
  advance: (ms) => set((s) => ({ simTime: s.simTime + ms })),
  setShowBorders: (showBorders) => set({ showBorders }),
  setShowCountries: (showCountries) => set({ showCountries }),
  setShowCities: (showCities) => set({ showCities }),
  setShowClouds: (showClouds) => set({ showClouds }),
  setShowGraticule: (showGraticule) => set({ showGraticule }),
  setShowAtmosphere: (showAtmosphere) => set({ showAtmosphere }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setViewMode: (viewMode) => set({ viewMode }),
  requestView: (kind) =>
    set((s) => ({
      viewMode: kind,
      viewRequest: { kind, key: (s.viewRequest?.key ?? 0) + 1 },
      autoRotate: false,
      flyTo: null,
      selected: kind === "system" ? null : s.selected,
    })),
  clearViewRequest: () => set({ viewRequest: null }),
  setCameraDist: (cameraDist) => set({ cameraDist }),
  setSelected: (selected) => set({ selected }),
  setHover: (hover) =>
    set((s) => {
      if (!s.hover && !hover) return s;
      if (
        s.hover &&
        hover &&
        s.hover.countryId === hover.countryId &&
        s.hover.cityId === hover.cityId &&
        Math.abs(s.hover.lat - hover.lat) < 0.08 &&
        Math.abs(s.hover.lon - hover.lon) < 0.08 &&
        Math.abs(s.hover.x - hover.x) < 3 &&
        Math.abs(s.hover.y - hover.y) < 3
      ) {
        return s;
      }
      return { hover };
    }),
  setQuery: (query) => set({ query }),
  requestFlyTo: (lat, lon, distance = 2.15) =>
    set((s) => ({
      flyTo: { lat, lon, distance, key: (s.flyTo?.key ?? 0) + 1 },
      viewMode: "globe",
      autoRotate: false,
    })),
  clearFlyTo: () => set({ flyTo: null }),
  setSun: (sunLat, sunLon) => set({ sunLat, sunLon }),
  setMoon: (moonLat, moonLon, moonIllum) => set({ moonLat, moonLon, moonIllum }),
  resetTime: () => set({ simTime: Date.now(), speed: 1, paused: false }),
}));
