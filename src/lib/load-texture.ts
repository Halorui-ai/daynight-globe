import * as THREE from "three";
import { isFileProtocol } from "@/lib/asset-url";

export function applyColorMap(tex: THREE.Texture, anisotropy: number) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
}

function loadWithImage(url: string, anisotropy: number): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        applyColorMap(tex, anisotropy);
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

export function loadColorMap(url: string, anisotropy: number): Promise<THREE.Texture> {
  if (isFileProtocol()) return loadWithImage(url, anisotropy);
  return new Promise((resolve, reject) => {
    const loader = new THREE.ImageBitmapLoader();
    loader.setCrossOrigin("anonymous");
    loader.setOptions({ imageOrientation: "flipY" });
    loader.load(
      url,
      (bmp) => {
        const tex = new THREE.Texture(bmp);
        applyColorMap(tex, anisotropy);
        resolve(tex);
      },
      undefined,
      () => {
        loadWithImage(url, anisotropy).then(resolve, reject);
      },
    );
  });
}

export function afterPaint(fn: () => void, delay = 500) {
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    const id = ric(() => fn(), { timeout: delay });
    return () => window.cancelIdleCallback(id);
  }
  const t = window.setTimeout(fn, delay);
  return () => window.clearTimeout(t);
}
