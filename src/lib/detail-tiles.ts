/** NASA GIBS geographic (EPSG:4326) Blue Marble, 500 m matrix, 512² tiles. */

export const TILE_PX = 512;
export const MAX_DETAIL_TILES = 80;
const LEVEL0_RES = 0.5625;

export type TileId = { z: number; x: number; y: number };

export type DetailPlan = {
  level: number;
  centerLat: number;
  centerLon: number;
  south: number;
  north: number;
  halfLat: number;
  halfLon: number;
  tiles: TileId[];
};

export function wrapLon(lon: number) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

export function lonDelta(lon: number, center: number) {
  return wrapLon(lon - center);
}

/** Degrees per pixel at a GIBS 500 m matrix level (0–7). */
export function levelResolution(level: number) {
  return LEVEL0_RES / 2 ** level;
}

export function tileSpanDeg(level: number) {
  return levelResolution(level) * TILE_PX;
}

export function matrixSize(level: number) {
  const span = tileSpanDeg(level);
  return {
    tilesX: Math.ceil(360 / span - 1e-9),
    tilesY: Math.ceil(180 / span - 1e-9),
  };
}

export function tileCoord(lat: number, lon: number, level: number): TileId {
  const span = tileSpanDeg(level);
  const { tilesX, tilesY } = matrixSize(level);
  let x = Math.floor((wrapLon(lon) + 180) / span);
  let y = Math.floor((90 - lat) / span);
  if (x < 0) x = 0;
  if (x >= tilesX) x = tilesX - 1;
  if (y < 0) y = 0;
  if (y >= tilesY) y = tilesY - 1;
  return { z: level, x, y };
}

export function tileBounds(level: number, x: number, y: number) {
  const span = tileSpanDeg(level);
  const west = -180 + x * span;
  const north = 90 - y * span;
  return { west, north, span, east: west + span, south: north - span };
}

export function gibsTileUrl(z: number, y: number, x: number) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/${z}/${y}/${x}.jpg`;
}

/**
 * Great-circle angle (degrees) from the sub-camera point to where a ray
 * at `halfFovDeg` from the view axis hits the unit sphere.
 */
export function groundHalfAngleDeg(distance: number, halfFovDeg: number) {
  const d = Math.max(distance, 1.001);
  const limb = Math.asin(Math.min(1, 1 / d));
  const a = Math.min((halfFovDeg * Math.PI) / 180, limb * 0.92);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const disc = d * d * cos * cos - (d * d - 1);
  if (disc <= 0) return (limb * 180) / Math.PI;
  const t = d * cos - Math.sqrt(disc);
  const y = t * sin;
  const z = d - t * cos;
  const len = Math.hypot(y, z) || 1;
  return (Math.acos(Math.min(1, Math.max(-1, z / len))) * 180) / Math.PI;
}

export function horizontalHalfFovDeg(verticalFovDeg: number, aspect: number) {
  const t = Math.tan((verticalFovDeg * Math.PI) / 360) * Math.max(aspect, 0.2);
  return (Math.atan(t) * 180) / Math.PI;
}

/** Null when the local 8K plate is still enough for the screen. */
export function detailLevelForDistance(distance: number): number | null {
  if (!(distance > 0) || distance > 2.35) return null;
  if (distance > 1.9) return 5;
  if (distance > 1.48) return 6;
  return 7;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function buildPlan(
  lat: number,
  lon: number,
  level: number,
  halfLat: number,
  halfLon: number,
): DetailPlan | null {
  const south = clamp(lat - halfLat, -90, 90);
  const north = clamp(lat + halfLat, -90, 90);
  if (north - south < 0.35 || halfLon < 0.2) return null;

  const span = tileSpanDeg(level);
  const { tilesX, tilesY } = matrixSize(level);
  const keys = new Set<number>();
  const yNorth = clamp(Math.floor((90 - north) / span), 0, tilesY - 1);
  const ySouth = clamp(Math.floor((90 - south) / span), 0, tilesY - 1);
  const step = span * 0.5;
  for (let cursor = lon - halfLon; cursor <= lon + halfLon + 1e-6; cursor += step) {
    const wrapped = wrapLon(cursor);
    let x = Math.floor((wrapped + 180) / span);
    if (x < 0) x = 0;
    if (x >= tilesX) x = tilesX - 1;
    for (let y = yNorth; y <= ySouth; y++) keys.add(y * tilesX + x);
  }

  const tiles: TileId[] = [];
  for (const key of keys) {
    const x = key % tilesX;
    const y = (key - x) / tilesX;
    tiles.push({ z: level, x, y });
  }
  if (tiles.length === 0) return null;
  return {
    level,
    centerLat: lat,
    centerLon: wrapLon(lon),
    south,
    north,
    halfLat: (north - south) / 2,
    halfLon,
    tiles,
  };
}

export function planDetail(opts: {
  lat: number;
  lon: number;
  distance: number;
  aspect?: number;
  fovDeg?: number;
}): DetailPlan | null {
  const aspect = opts.aspect ?? 1.6;
  const fov = opts.fovDeg ?? 46;
  let level = detailLevelForDistance(opts.distance);
  if (level == null) return null;

  const pad = 1.16;
  const halfLat = groundHalfAngleDeg(opts.distance, fov / 2) * pad;
  const halfLon = groundHalfAngleDeg(opts.distance, horizontalHalfFovDeg(fov, aspect)) * pad;

  let plan: DetailPlan | null = null;
  for (let attempt = 0; attempt < 4 && level >= 4; attempt++) {
    plan = buildPlan(opts.lat, opts.lon, level, halfLat, halfLon);
    if (!plan) return null;
    if (plan.tiles.length <= MAX_DETAIL_TILES) return plan;
    level -= 1;
  }
  return plan && plan.tiles.length <= MAX_DETAIL_TILES ? plan : null;
}
