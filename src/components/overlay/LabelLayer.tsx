import type { MutableRefObject } from "react";
import { CITIES } from "@/data/cities";
import { cn } from "@/lib/utils";
import type { Country } from "@/lib/world-data";
import { useGlobeStore } from "@/store/globe-store";

type NodesRef = MutableRefObject<Map<string, HTMLElement>>;

export function LabelLayer({
  countries,
  nodesRef,
}: {
  countries: Country[];
  nodesRef: NodesRef;
}) {
  const setSelected = useGlobeStore((s) => s.setSelected);
  const requestFlyTo = useGlobeStore((s) => s.requestFlyTo);
  const requestView = useGlobeStore((s) => s.requestView);
  const selected = useGlobeStore((s) => s.selected);

  const bind = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) nodesRef.current.set(key, el);
    else nodesRef.current.delete(key);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <button
        type="button"
        ref={bind("b:earth")}
        className="geo-label geo-label-body"
        style={{ opacity: 0, pointerEvents: "none" }}
        onClick={(e) => {
          e.stopPropagation();
          requestView("globe");
        }}
      >
        地球
      </button>
      <button
        type="button"
        ref={bind("b:moon")}
        className="geo-label geo-label-body"
        style={{ opacity: 0, pointerEvents: "none" }}
        onClick={(e) => {
          e.stopPropagation();
          requestView("system");
        }}
      >
        月球
      </button>
      <button
        type="button"
        ref={bind("b:sun")}
        className="geo-label geo-label-body"
        style={{ opacity: 0, pointerEvents: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        太阳
      </button>
      {countries.map((c) => {
        const on = selected?.kind === "country" && selected.id === c.id;
        return (
          <button
            key={`c:${c.id}`}
            type="button"
            ref={bind(`c:${c.id}`)}
            className={cn("geo-label geo-label-country", on && "geo-label-on")}
            style={{ opacity: 0, pointerEvents: "none" }}
            onClick={(e) => {
              e.stopPropagation();
              setSelected({ kind: "country", id: c.id });
              requestFlyTo(c.lat, c.lon, 2.2);
            }}
          >
            {c.nameZh}
          </button>
        );
      })}
      {CITIES.map((city) => {
        const on = selected?.kind === "city" && selected.id === city.id;
        return (
          <button
            key={`p:${city.id}`}
            type="button"
            ref={bind(`p:${city.id}`)}
            className={cn("geo-label geo-label-city", on && "geo-label-on")}
            style={{ opacity: 0, pointerEvents: "none" }}
            onClick={(e) => {
              e.stopPropagation();
              setSelected({ kind: "city", id: city.id });
              requestFlyTo(city.lat, city.lon, 1.85);
            }}
          >
            {city.nameZh}
          </button>
        );
      })}
    </div>
  );
}
