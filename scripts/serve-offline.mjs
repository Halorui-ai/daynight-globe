#!/usr/bin/env node
/**
 * Zero-dependency static server for the offline pack.
 * Run from inside offline-dist:  node serve.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.existsSync(path.join(here, "index.html"))
  ? here
  : fs.existsSync(path.join(here, "offline.html"))
    ? here
    : path.join(here, "..", "offline-dist");
const port = Number(process.env.PORT || 8080);
const host = "127.0.0.1";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${host}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  if (rel === "/offline.html") rel = "/index.html";
  const file = path.normalize(path.join(dir, rel));
  if (!file.startsWith(dir)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      if (rel !== "/index.html") {
        fs.readFile(path.join(dir, "index.html"), (err2, html) => {
          if (err2) {
            res.writeHead(404);
            res.end("not found");
            return;
          }
          res.writeHead(200, { "content-type": mime[".html"] });
          res.end(html);
        });
        return;
      }
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "content-type": mime[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`昼夜地球（离线） http://${host}:${port}`);
});
