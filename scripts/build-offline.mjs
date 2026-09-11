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
    "",
    "如果公司电脑连 PowerShell 都禁用了：",
    "  用 Chrome 或 Edge 直接打开 index.html",
    "",
    "浏览器用 Chrome / Edge（需要支持 WebGL）。IE 不行。",
    "",
  ].join("\r\n"),
  "utf8",
);

console.log("offline pack ready:", out);
