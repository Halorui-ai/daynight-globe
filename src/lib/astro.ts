import * as THREE from "three";
import { getSubsolarPoint, wrapLon } from "@/lib/geo";

/** Scene units: 1 = Earth radius (6371 km). */

export const EARTH_RADIUS_KM = 6371;
export const MOON_RADIUS_KM = 1737.4;
export const SUN_RADIUS_KM = 695_700;
export const MOON_DIST_KM = 384_400;
export const AU_KM = 149_597_870.7;

export const EARTH_R = 1;
export const MOON_R = MOON_RADIUS_KM / EARTH_RADIUS_KM;
export const MOON_DIST = MOON_DIST_KM / EARTH_RADIUS_KM;
export const SUN_R_TRUE = SUN_RADIUS_KM / EARTH_RADIUS_KM;
export const SUN_DIST_TRUE = AU_KM / EARTH_RADIUS_KM;

/**
 * Heliocentric display scale. True AU is 23,455 Earth radii — impossible
 * to frame with a recognizable Earth. Orbits keep the real topology
 * (Earth around Sun, Moon around Earth); distances are compressed.
 */
export const EARTH_ORBIT_SYS = 46;
export const MOON_DIST_SYS = 8.4;
export const SUN_R_SYS = 5.6;
export const EARTH_SCALE_SYS = 2.2;
export const MOON_SCALE_SYS = 1.85;

export const GLOBE_DIST = 2.62;
export const GLOBE_MIN = 1.18;
export const GLOBE_MAX = 8.4;
export const SYSTEM_DIST = 128;
export const SYSTEM_MIN = 28;
export const SYSTEM_MAX = 260;

/** Live world positions, updated each frame. */
export const EARTH_WORLD = new THREE.Vector3();
export const MOON_WORLD = new THREE.Vector3();
export const SUN_WORLD = new THREE.Vector3();

export function daysSinceJ2000(date: Date) {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86_400_000;
}

export type MoonState = {
  lat: number;
  lon: number;
  dist: number;
  elong: number;
  illum: number;
};

/**
 * Sublunar point on a texture-fixed Earth (globe view).
 * Elongation 0 = new, 180 = full.
 */
export function getMoonState(date: Date): MoonState {
  const d = daysSinceJ2000(date);
  const deg = Math.PI / 180;
  const M = (134.963 + 13.064993 * d) * deg;
  const F = (93.272 + 13.22935 * d) * deg;
  const L = 218.316 + 13.176396 * d;
  const sunMean = 280.46 + 0.9856474 * d;
  let elong = (L - sunMean) % 360;
  if (elong < 0) elong += 360;
  const sun = getSubsolarPoint(date);
  const lat = sun.lat * 0.12 + 5.145 * Math.sin(F);
  const lon = wrapLon(sun.lon + elong);
  const dist = MOON_DIST * (1 - 0.0549 * Math.cos(M));
  const illum = 0.5 * (1 - Math.cos(elong * deg));
  return { lat, lon, dist, elong, illum };
}

/** Earth's heliocentric ecliptic direction (unit). Y is north of the ecliptic. */
export function earthHeliocentricDir(date: Date) {
  const d = daysSinceJ2000(date);
  const deg = Math.PI / 180;
  const M = (357.529 + 0.9856003 * d) * deg;
  const L = (280.46 + 0.98564736 * d) * deg;
  const lambdaSun = L + 1.915 * deg * Math.sin(M) + 0.02 * deg * Math.sin(2 * M);
  const lambdaE = lambdaSun + Math.PI;
  return {
    x: Math.cos(lambdaE),
    y: 0,
    z: Math.sin(lambdaE),
    lambda: lambdaE,
    lambdaSun,
  };
}

/** Moon direction relative to Earth in the ecliptic frame (unit) + phase. */
export function moonEclipticDir(date: Date) {
  const d = daysSinceJ2000(date);
  const deg = Math.PI / 180;
  const M = (134.963 + 13.064993 * d) * deg;
  const F = (93.272 + 13.22935 * d) * deg;
  const L = (218.316 + 13.176396 * d) * deg;
  const sunMean = (280.46 + 0.9856474 * d) * deg;
  const lambda = L + 6.289 * deg * Math.sin(M);
  const beta = 5.128 * deg * Math.sin(F);
  const cb = Math.cos(beta);
  let elong = ((lambda - sunMean) / deg) % 360;
  if (elong < 0) elong += 360;
  return {
    x: cb * Math.cos(lambda),
    y: Math.sin(beta),
    z: cb * Math.sin(lambda),
    dist: MOON_DIST * (1 - 0.0549 * Math.cos(M)),
    elong,
    illum: 0.5 * (1 - Math.cos(elong * deg)),
  };
}

export function formatKm(km: number) {
  if (km >= 1_000_000) return `${(km / 100_000_000).toFixed(2)} 亿 km`;
  if (km >= 10_000) return `${(km / 10_000).toFixed(1)} 万 km`;
  return `${Math.round(km).toLocaleString("zh-CN")} km`;
}
