import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, renameSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const out = join(root, "offline-dist");

const run = spawnSync(
  process.execPath,
  [join(root, "node_modules", "vite", "bin", "vite.js"), "build", "--config", "vite.offline.config.ts"],
  { cwd: root, stdio: "inherit", env: process.env },
);
if (run.status !== 0) process.exit(run.status ?? 1);

mkdirSync(out, { recursive: true });

const htmlSrc = join(out, "offline.html");
const htmlDst = join(out, "index.html");
if (existsSync(htmlSrc)) renameSync(htmlSrc, htmlDst);

let html = readFileSync(htmlDst, "utf8");
html = html
  .replace(/\s*type="module"/g, "")
  .replace(/\s*crossorigin(?:="[^"]*")?/g, "")
  .replace("<script src=", '<script defer src=');
writeFileSync(htmlDst, html);

copyFileSync(join(root, "scripts", "serve-offline.mjs"), join(out, "serve.mjs"));
copyFileSync(join(root, "scripts", "serve-offline.ps1"), join(out, "serve.ps1"));
copyFileSync(join(root, "scripts", "start-offline.bat"), join(out, "启动地球.bat"));

writeFileSync(
  join(out, "使用说明.txt"),
  [
    "昼夜地球 · 完全离线版",
    "",
    "不需要安装 Node、Python，也不需要联网。",
    "",
    "Windows：",
    "  双击「启动地球.bat」",
    "  它会用系统自带的 PowerShell 打开 http://127.0.0.1:8080",
    "  并强制用 Edge 或 Chrome（不要用 360 / IE）",
    "  保持黑色命令窗口开着，关掉就停。",
    "",
    "不要直接双击 index.html。",
    "Chrome / Edge 把本地文件当成不安全来源，会拦截地球贴图，",
    "所以打开后是全黑的。必须走上面的本地网页地址。",
    "",
    "浏览器用 Chrome / Edge（需要 WebGL）。IE / 360 兼容模式不行。",
    "",
  ].join("\r\n"),
  "utf8",
);

console.log("offline pack ready:", out);
