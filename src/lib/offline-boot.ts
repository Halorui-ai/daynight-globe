export type BootBlock = {
  title: string;
  detail: string;
};

export function detectBootBlock(): BootBlock | null {
  if (typeof window === "undefined") return null;
  if (location.protocol === "file:") {
    return {
      title: "地球贴图被浏览器拦住了",
      detail:
        "请双击「启动地球.bat」，用 http://127.0.0.1 打开。直接双击 index.html 时，Chrome / Edge 会拦截本地贴图，Three.js 读不到白天/夜景图，所以画面是全黑的。",
    };
  }
  if (!hasWebGL()) {
    return {
      title: "这个浏览器没有 WebGL",
      detail:
        "请用 Microsoft Edge 或 Google Chrome 打开。公司电脑默认的 360、IE、兼容模式，或远程桌面关掉硬件加速，都会得到全黑画面。",
    };
  }
  return null;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
