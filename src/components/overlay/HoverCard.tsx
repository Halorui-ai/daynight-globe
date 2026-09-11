import { CITIES, CITY_BY_ID } from "@/data/cities";
import {
  formatCoord,
  isDaylight,
  localSolarTime,
} from "@/lib/geo";
import type { Country } from "@/lib/world-data";
import { useGlobeStore } from "@/store/globe-store";
import { useEffect, useState } from "react";

function useSimClock() {
  const [t, setT] = useState(() => useGlobeStore.getState().simTime);
  useEffect(() => {
    const id = window.setInterval(() => setT(useGlobeStore.getState().simTime), 250);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

export function HoverCard({ countries }: { countries: Country[] | null }) {
  const hover = useGlobeStore((s) => s.hover);
  const viewMode = useGlobeStore((s) => s.viewMode);
  const sunLat = useGlobeStore((s) => s.sunLat);
  const sunLon = useGlobeStore((s) => s.sunLon);
  const simTime = useSimClock();

  if (!hover || viewMode === "system") return null;

  const country = hover.countryId
    ? countries?.find((c) => c.id === hover.countryId)
    : null;
  const city = hover.cityId ? CITY_BY_ID.get(hover.cityId) : undefined;
  const day = isDaylight(hover.lat, hover.lon, sunLat, sunLon);
  const local = localSolarTime(new Date(simTime), hover.lon);
  const title = city?.nameZh ?? country?.nameZh ?? "海洋 / 未标注";
  const sub = city
    ? `${city.name}${city.capital ? " · 首都" : ""}`
    : (country?.nameEn ?? "");

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(hover.x + 14, vw - 220);
  const top = Math.min(hover.y + 16, vh - 120);

  return (
    <div
      className="pointer-events-none absolute z-30 w-52 rounded-lg border border-border bg-surface/92 px-3 py-2.5"
      style={{ left, top }}
    >
      <p className="text-sm font-medium tracking-tight text-fg">{title}</p>
      {sub ? <p className="text-2xs text-muted">{sub}</p> : null}
      <p className="mt-1.5 font-medium tabular-nums text-2xs text-fg">
        {formatCoord(hover.lat, hover.lon)}
      </p>
      <p className="mt-0.5 text-2xs text-muted">
        {day ? "白昼" : "夜晚"} · 太阳时 {local.label}
      </p>
    </div>
  );
}

export function pickHoverCity(lat: number, lon: number, maxKm: number) {
  let best: (typeof CITIES)[number] | null = null;
  let bestD = maxKm;
  for (const city of CITIES) {
    const dLat = city.lat - lat;
    const dLon = city.lon - lon;
    if (dLat * dLat + dLon * dLon > 16) continue;
    const d = Math.hypot(dLat * 111, dLon * 111 * Math.cos((lat * Math.PI) / 180));
    if (d < bestD) {
      bestD = d;
      best = city;
    }
  }
  return best;
}
