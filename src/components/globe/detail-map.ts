import * as THREE from "three";
import {
  TILE_PX,
  gibsTileUrl,
  lonDelta,
  planDetail,
  tileBounds,
  tileSpanDeg,
  type DetailPlan,
} from "@/lib/detail-tiles";

const CACHE_LIMIT = 96;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(url));
    img.src = url;
  });
}

/**
 * Pulls NASA GIBS tiles for the ground under the camera and paints them into
 * one canvas the earth shader high-passes over the local plate.
 */
export class DetailComposer {
  readonly texture: THREE.CanvasTexture;
  targetStrength = 0;
  onCommit: ((plan: DetailPlan) => void) | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private token = 0;
  private last: DetailPlan | null = null;
  private inflight: DetailPlan | null = null;
  private readonly cache = new Map<string, HTMLImageElement>();
  private readonly cacheOrder: string[] = [];
  private offlineUntil = 0;

  constructor(anisotropy: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 2;
    this.canvas.height = 2;
    const ctx = this.canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = anisotropy;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.premultiplyAlpha = false;
    this.texture.needsUpdate = true;
  }

  update(view: { lat: number; lon: number; distance: number; aspect: number }) {
    if (performance.now() < this.offlineUntil) {
      this.targetStrength = 0;
      return;
    }
    const plan = planDetail(view);
    if (!plan) {
      this.targetStrength = 0;
      return;
    }
    if (this.last && this.covered(plan, this.last)) {
      this.targetStrength = 1;
      return;
    }
    if (this.inflight && this.covered(plan, this.inflight)) return;
    this.inflight = plan;
    void this.compose(plan);
  }

  dispose() {
    this.token += 1;
    this.texture.dispose();
    this.cache.clear();
  }

  private covered(next: DetailPlan, prev: DetailPlan) {
    if (next.level !== prev.level) return false;
    const movedLat = Math.abs(next.centerLat - prev.centerLat);
    const movedLon = Math.abs(lonDelta(next.centerLon, prev.centerLon));
    return movedLat < prev.halfLat * 0.34 && movedLon < prev.halfLon * 0.34;
  }

  private async compose(plan: DetailPlan) {
    const token = ++this.token;
    const loaded = await Promise.all(
      plan.tiles.map(async (tile) => {
        const key = `${tile.z}/${tile.y}/${tile.x}`;
        const cached = this.cache.get(key);
        if (cached) return { tile, img: cached };
        try {
          const img = await loadImage(gibsTileUrl(tile.z, tile.y, tile.x));
          this.remember(key, img);
          return { tile, img };
        } catch {
          return { tile, img: null };
        }
      }),
    );
    if (token !== this.token) return;
    this.inflight = null;
    const drawn = loaded.filter((item) => item.img).length;
    if (drawn === 0) {
      this.offlineUntil = performance.now() + 45_000;
      this.targetStrength = 0;
      return;
    }
    this.paint(plan, loaded);
    this.last = plan;
    this.targetStrength = 1;
    this.onCommit?.(plan);
  }

  private remember(key: string, img: HTMLImageElement) {
    if (this.cache.has(key)) return;
    this.cache.set(key, img);
    this.cacheOrder.push(key);
    while (this.cacheOrder.length > CACHE_LIMIT) {
      const drop = this.cacheOrder.shift();
      if (drop) this.cache.delete(drop);
    }
  }

  private paint(
    plan: DetailPlan,
    loaded: { tile: DetailPlan["tiles"][number]; img: HTMLImageElement | null }[],
  ) {
    const span = tileSpanDeg(plan.level);
    const pxPerDeg = TILE_PX / span;
    let w = Math.max(2, Math.round(plan.halfLon * 2 * pxPerDeg));
    let h = Math.max(2, Math.round((plan.north - plan.south) * pxPerDeg));
    const down = Math.min(1, 4096 / w, 4096 / h);
    w = Math.max(2, Math.round(w * down));
    h = Math.max(2, Math.round(h * down));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = down < 0.98;
    const lonSpan = plan.halfLon * 2;
    const latSpan = plan.north - plan.south;
    for (const { tile, img } of loaded) {
      if (!img) continue;
      const bounds = tileBounds(tile.z, tile.x, tile.y);
      const relWest = lonDelta(bounds.west, plan.centerLon);
      const x = ((relWest + plan.halfLon) / lonSpan) * w;
      const dw = (span / lonSpan) * w;
      const y = ((plan.north - bounds.north) / latSpan) * h;
      const dh = (span / latSpan) * h;
      ctx.drawImage(img, x, y, dw, dh);
    }
    this.texture.needsUpdate = true;
  }
}
