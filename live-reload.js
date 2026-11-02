// Dev-only live reload, switched on by `npm run dev` (LIVE_RELOAD=1).
// Watches the page files and tells every open tab to reload when one changes.
// The production server (`npm start`, Railway) never loads this file.

const fs = require("fs");
const path = require("path");

const PATH = "/__live-reload";
const SNIPPET = `<script>new EventSource("${PATH}").onmessage = () => location.reload();</script>`;

const clients = new Set();
let timer;

function broadcast() {
  clearTimeout(timer);
  timer = setTimeout(() => clients.forEach((res) => res.write("data: reload\n\n")), 50);
}

function watch(root, entries) {
  entries
    .map((entry) => path.join(root, entry))
    .filter((target) => fs.existsSync(target))
    .forEach((target) => fs.watch(target, { recursive: true }, broadcast));
}

function connect(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");
  clients.add(res);
  req.on("close", () => clients.delete(res));
}

function sendHtml(req, res, filePath) {
  const html = fs.readFileSync(filePath, "utf8").replace("</body>", `${SNIPPET}\n</body>`);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(req.method === "HEAD" ? undefined : html);
}

module.exports = { PATH, watch, connect, sendHtml };
