// Minimal zero-dependency static file server.
// Railway (and any container host) requires a process that binds $PORT —
// a folder of static files is not enough on its own.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildZip } = require("./zip");

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0"; // must not be 127.0.0.1 — the platform routes in from outside

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// The deployable site as one zip, served at /download. Unlinked from the page
// on purpose; built on first request and held in memory, since the files only
// change on a redeploy.
const DOWNLOAD_FILES = ["index.html", "dist", "css", "assets"]; // dist/ for Tailwind, css/ for vanilla
const PUBLIC = DOWNLOAD_FILES.map((p) => "/" + p);
let siteZip;

// `npm run dev` adds live reload; `npm start` (Railway) runs without it.
const live = process.env.LIVE_RELOAD ? require("./live-reload") : null;
live?.watch(ROOT, DOWNLOAD_FILES);

// The shipped copy drops the build's HTML comments (Figma banners, node ids,
// deviation notes). They stay in the repo, where they trace markup to Figma.
const stripComments = (html) =>
  html
    .replace(/^[ \t]*<!--[\s\S]*?-->[ \t]*\n/gm, "") // comment lines, whole
    .replace(/<!--[\s\S]*?-->/g, "") // inline leftovers
    .replace(/\n{3,}/g, "\n\n");

function sendZip(req, res) {
  siteZip ??= buildZip(ROOT, DOWNLOAD_FILES, { "index.html": stripComments });
  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Length": siteZip.length,
    "Content-Disposition": 'attachment; filename="download.zip"',
    "Cache-Control": "no-cache",
    "X-Robots-Tag": "noindex",
  });
  res.end(req.method === "HEAD" ? undefined : siteZip);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end("Method Not Allowed");
  }

  let pathname;
  try {
    // WHATWG URL — the base is a throwaway, we only want the path.
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad Request");
  }

  if (live && pathname === live.PATH) return live.connect(req, res);
  if (pathname === "/download" || pathname === "/download.zip") return sendZip(req, res);
  if (pathname === "/") pathname = "/index.html";

  // Serve the page and its build output only. Everything else in the repo
  // (CLAUDE.md, package.json, server.js, build notes) stays private. The
  // allowlist is checked on the resolved path, so encoded ../ can't escape it.
  const filePath = path.resolve(ROOT, "." + pathname);
  const rel = path.relative(ROOT, filePath).split(path.sep).join("/");
  const allowed = !pathname.includes("\0")
    && !rel.split("/").some((segment) => segment.startsWith("."))
    && PUBLIC.some((p) => "/" + rel === p || ("/" + rel).startsWith(p + "/"));
  if (!allowed) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end("<h1>404 — Not Found</h1>");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>404 — Not Found</h1>");
    }

    const ext = path.extname(filePath).toLowerCase();
    const isHtml = ext === ".html";
    if (live && isHtml) return live.sendHtml(req, res, filePath);

    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      // Revalidate HTML and CSS on every load so a redeploy shows up at once;
      // images keep a one-day cache.
      "Cache-Control": live || isHtml || ext === ".css" ? "no-cache" : "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    });

    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} on http://${HOST}:${PORT}${live ? " (live reload)" : ""}`);
});
