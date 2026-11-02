// Zero-dependency ZIP writer for the /download route.
// Deflates each file with Node's zlib and writes the standard local-header /
// central-directory / end-record layout (PKWARE APPNOTE 4.3). Small on purpose:
// no ZIP64, no streaming — the whole site is a few megabytes.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Every file under each entry, as paths relative to root, in a stable order.
function collect(root, entries) {
  return entries.flatMap((entry) => {
    const full = path.join(root, entry);
    if (!fs.existsSync(full)) return [];
    if (!fs.statSync(full).isDirectory()) return [entry];
    return fs
      .readdirSync(full)
      .filter((name) => !name.startsWith("."))
      .sort()
      .flatMap((name) => collect(root, [path.posix.join(entry, name)]));
  });
}

function header(size, fields) {
  const buf = Buffer.alloc(size);
  let offset = 0;
  for (const [bytes, value] of fields) {
    bytes === 4 ? buf.writeUInt32LE(value, offset) : buf.writeUInt16LE(value, offset);
    offset += bytes;
  }
  return buf;
}

// Build a zip of `entries` (files or directories) under `root`, in memory.
// `transforms` maps a relative path to a function that rewrites its bytes.
function buildZip(root, entries, transforms = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const name of collect(root, entries)) {
    const raw = fs.readFileSync(path.join(root, name));
    const data = transforms[name] ? Buffer.from(transforms[name](raw.toString("utf8"))) : raw;
    const packed = zlib.deflateRawSync(data);
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    // version 20, UTF-8 names (bit 11), deflate, zero DOS time/date
    const common = [[2, 20], [2, 0x0800], [2, 8], [2, 0], [2, 0], [4, crc], [4, packed.length], [4, data.length], [2, nameBuf.length], [2, 0]];

    const local = Buffer.concat([header(30, [[4, 0x04034b50], ...common]), nameBuf, packed]);
    centrals.push(Buffer.concat([
      header(46, [[4, 0x02014b50], [2, 20], ...common, [2, 0], [2, 0], [2, 0], [4, 0], [4, offset]]),
      nameBuf,
    ]));
    locals.push(local);
    offset += local.length;
  }

  const central = Buffer.concat(centrals);
  const end = header(22, [[4, 0x06054b50], [2, 0], [2, 0], [2, centrals.length], [2, centrals.length], [4, central.length], [4, offset], [2, 0]]);
  return Buffer.concat([...locals, central, end]);
}

module.exports = { buildZip };
