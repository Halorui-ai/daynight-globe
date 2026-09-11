import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, renameSync, existsSync, writeFileSync } from "node:fs";
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

copyFileSync(join(root, "scripts", "serve-offline.mjs"), join(out, "serve.mjs"));
copyFileSync(join(root, "scripts", "start-offline.bat"), join(out, "启动地球.bat"));

writeFileSync(
  join(out, "使用说明.txt"),
  [
    "昼夜地球 · 完全离线版",
    "",
    "这个文件夹已经包含全部贴图、国界数据和程序，拷到没有网的电脑即可。",
    "",
    "Windows：双击「启动地球.bat」",
    "  （需要已安装 Python 3 或 Node.js，装软件时用离线安装包，运行地球不联网。）",
    "",
    "其它系统：",
    "  python3 -m http.server 8080 --bind 127.0.0.1",
    "  或  node serve.mjs",
    "",
    "然后用 Chrome / Edge 打开 http://127.0.0.1:8080",
    "不要直接双击 index.html，浏览器会拦截本地贴图。",
    "",
  ].join("\r\n"),
  "utf8",
);

console.log("offline pack ready:", out);
