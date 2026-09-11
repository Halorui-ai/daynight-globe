import * as THREE from "three";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type Ring = number[][];
export type PolygonCoords = Ring[];
export type GeoGeometry =
  | { type: "Polygon"; coordinates: PolygonCoords }
  | { type: "MultiPolygon"; coordinates: PolygonCoords[] };

/** Convert geodetic lat/lon (degrees) to a point on a Y-up sphere matching SphereGeometry UVs. */
export function latLonToVec3(lat: number, lon: number, radius = 1, target = new THREE.Vector3()) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  const s = Math.sin(phi);
  return target.set(-radius * s * Math.cos(theta), radius * Math.cos(phi), radius * s * Math.sin(theta));
}

export function vec3ToLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const r = v.length() || 1;
  const lat = Math.asin(THREE.MathUtils.clamp(v.y / r, -1, 1)) * RAD;
  const lon = Math.atan2(v.z, -v.x) * RAD - 180;
  return { lat, lon: wrapLon(lon) };
}

export function wrapLon(lon: number) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Great-circle distance in kilometres. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6371;
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Solar altitude in degrees at a location given the subsolar point. */
export function solarAltitude(lat: number, lon: number, sunLat: number, sunLon: number) {
  const dist = haversineKm(lat, lon, sunLat, sunLon);
  const angular = (dist / 6371) * RAD;
  return 90 - angular;
}

export function isDaylight(lat: number, lon: number, sunLat: number, sunLon: number) {
  return solarAltitude(lat, lon, sunLat, sunLon) > 0;
}

export function localSolarTime(date: Date, lon: number) {
  const utc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let hours = utc + lon / 15;
  hours = ((hours % 24) + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return { hours, h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

export function formatCoord(lat: number, lon: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}  ${Math.abs(lon).toFixed(2)}°${ew}`;
}

/**
 * Approximate subsolar point (declination + equation of time).
 * Accurate enough for a visual terminator.
 */
export function getSubsolarPoint(date: Date): { lat: number; lon: number } {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - yearStart) / 86_400_000;
  const B = (360 / 365.242) * (dayOfYear - 81) * DEG;
  const lat = 23.44 * Math.sin(B);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3_600_000;
  const lon = wrapLon(-15 * (utcHours - 12) - eot / 4);
  return { lat, lon };
}

export function forEachRing(geometry: GeoGeometry, fn: (ring: Ring, isHole: boolean) => void) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring, i) => fn(ring, i > 0));
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      poly.forEach((ring, i) => fn(ring, i > 0));
    }
  }
}

export function pointInRing(lon: number, lat: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(lon: number, lat: number, geometry: GeoGeometry): boolean {
  if (geometry.type === "Polygon") {
    if (!pointInRing(lon, lat, geometry.coordinates[0]!)) return false;
    for (let i = 1; i < geometry.coordinates.length; i++) {
      if (pointInRing(lon, lat, geometry.coordinates[i]!)) return false;
    }
    return true;
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => {
      if (!pointInRing(lon, lat, poly[0]!)) return false;
      for (let i = 1; i < poly.length; i++) {
        if (pointInRing(lon, lat, poly[i]!)) return false;
      }
      return true;
    });
  }
  return false;
}

function ringArea(ring: Ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j]![0]! * ring[i]![1]! - ring[i]![0]! * ring[j]![1]!;
  }
  return Math.abs(a / 2);
}

export function geometryAreaHint(geometry: GeoGeometry) {
  let best = 0;
  forEachRing(geometry, (ring, isHole) => {
    if (!isHole) best = Math.max(best, ringArea(ring));
  });
  return best;
}

/** Centroid of the largest exterior ring — keeps labels on the mainland. */
export function geometryCentroid(geometry: GeoGeometry): { lat: number; lon: number } {
  let best: Ring | null = null;
  let bestArea = -1;
  forEachRing(geometry, (ring, isHole) => {
    if (isHole) return;
    const a = ringArea(ring);
    if (a > bestArea) {
      bestArea = a;
      best = ring;
    }
  });
  if (!best || (best as Ring).length === 0) return { lat: 0, lon: 0 };
  let sx = 0;
  let sy = 0;
  let sz = 0;
  const ring = best as Ring;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const lon = ring[i]![0]!;
    const lat = ring[i]![1]!;
    const phi = lat * DEG;
    const lam = lon * DEG;
    sx += Math.cos(phi) * Math.cos(lam);
    sy += Math.cos(phi) * Math.sin(lam);
    sz += Math.sin(phi);
  }
  const lon = Math.atan2(sy, sx) * RAD;
  const hyp = Math.hypot(sx, sy);
  const lat = Math.atan2(sz, hyp) * RAD;
  return { lat, lon };
}

/** `pop` is stored in thousands. */
export function formatPopThousands(thousands: number) {
  if (thousands >= 10_000) return `${(thousands / 1000).toFixed(1)} 百万`;
  if (thousands >= 10) return `${(thousands / 10).toFixed(thousands >= 100 ? 0 : 1)} 万`;
  return `${Math.round(thousands * 1000).toLocaleString("zh-CN")} 人`;
}

export function formatUtc(date: Date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return { date: `${y}.${mo}.${d}`, time: `${h}:${mi}:${s}` };
}
