import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { countryAlpha2, countryNameEn, countryNameZh } from "@/lib/countries";
import {
  geometryAreaHint,
  geometryCentroid,
  pointInGeometry,
  type GeoGeometry,
} from "@/lib/geo";
import atlasJson from "../../public/data/countries-110m.json";

export type Country = {
  id: string;
  iso2: string;
  nameEn: string;
  nameZh: string;
  lat: number;
  lon: number;
  geometry: GeoGeometry;
  areaHint: number;
};

type Atlas = Topology<{ countries: GeometryCollection<{ name: string }> }>;

function parseCountries(topology: Atlas): Country[] {
  const fc = feature(topology, topology.objects.countries);
  return fc.features.map((f) => {
    const nameRaw = f.properties?.name ?? "Unknown";
    const rawId = f.id != null ? String(f.id) : nameRaw;
    const geometry = f.geometry as GeoGeometry;
    const centroid = geometryCentroid(geometry);
    return {
      id: rawId,
      iso2: countryAlpha2(f.id != null ? String(f.id) : undefined, nameRaw),
      nameEn: countryNameEn(nameRaw),
      nameZh: countryNameZh(f.id != null ? String(f.id) : undefined, nameRaw),
      lat: centroid.lat,
      lon: centroid.lon,
      geometry,
      areaHint: geometryAreaHint(geometry),
    };
  });
}

export async function loadCountries(): Promise<Country[]> {
  return parseCountries(atlasJson as unknown as Atlas);
}

export function findCountryAt(countries: Country[], lon: number, lat: number) {
  return countries.find((c) => pointInGeometry(lon, lat, c.geometry)) ?? null;
}
