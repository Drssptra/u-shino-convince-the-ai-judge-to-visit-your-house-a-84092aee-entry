// u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee — v2 (revise pass)
// One image: an "ADMIT ONE" dinner ticket under a dusk sky, inviting the
// AI judge to supper at my house — soup, bread, a porch swing at sunset,
// then stargazing. A fresh concept, text and visuals vs v1 (which was a
// cream letter sheet with a cottage, cake, cookies and a dog).
// Node 22+, standard library only, no network, fully deterministic:
// every run writes the same bytes to entry.png. The revise pass kept the
// picture pixel-identical and only restructured the code: the Sheet class
// became a closure factory, the PNG writer assembles chunks from parts,
// and the scene is painted in three named sections instead of one long
// function.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const W = 1024;
const H = 1024;
const MAX_BYTES = 1024 * 1024;

// Dusk palette — the opposite of v1's warm cream daylight.
const NAVY = [24, 39, 68];
const DUSK = [46, 74, 96];
const TEAL_DARK = [30, 66, 70];
const CREAM = [255, 243, 208]; // ticket paper
const GOLD = [242, 193, 78];
const GOLD_DIM = [214, 164, 60];
const RUST = [178, 58, 46]; // ticket title red
const INK = [32, 38, 56]; // dark navy ink on the ticket
const AMBER = [233, 184, 114]; // lit house walls
const ROOF = [140, 58, 43];
const GREEN_DARK = [23, 59, 46];
const GREEN = [52, 110, 74];
const WHITE = [250, 246, 232];
const PORCH = [255, 214, 120];

// ------------------------------------------------------------ 5x7 bitmap font
const FONT = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  "'": [0b00100, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  ",": [0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100, 0b01000],
  "-": [0b00000, 0b00000, 0b00000, 0b01110, 0b00000, 0b00000, 0b00000],
  ".": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
  ":": [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b01100, 0b00000],
  ";": [0b00000, 0b01100, 0b01100, 0b00000, 0b00100, 0b00100, 0b01000],
  "?": [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0b00000, 0b00100],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  "3": [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
};

// ------------------------------------------------------------ PNG writer
// CRC table built lazily with while-loops instead of for-loops.
function buildCrcTable() {
  const table = new Uint32Array(256);
  let n = 0;
  while (n < 256) {
    let c = n;
    let k = 0;
    while (k < 8) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      k++;
    }
    table[n] = c >>> 0;
    n++;
  }
  return table;
}
const CRC_TABLE = buildCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  let i = 0;
  while (i < buf.length) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    i++;
  }
  return (c ^ 0xffffffff) >>> 0;
}

// A chunk is assembled from parts with Buffer.concat instead of a
// pre-sized allocation.
function chunk(type, data) {
  const tag = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])), 0);
  return Buffer.concat([len, tag, data, crc]);
}

function encodePng(width, height, rgb) {
  const rows = [];
  let y = 0;
  while (y < height) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0;
    rgb.copy(row, 1, y * width * 3, (y + 1) * width * 3);
    rows.push(row);
    y++;
  }
  const raw = Buffer.concat(rows);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------ canvas factory
// The build version used a Sheet class; this pass uses a closure factory
// with differently-named primitives, same pixel semantics.
function makeCanvas() {
  const buf = Buffer.alloc(W * H * 3);

  function put(x, y, c) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
  }

  function box(x, y, w, h, c) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) put(i, j, c);
  }

  function outline(x, y, w, h, c, t) {
    box(x, y, w, t, c);
    box(x, y + h - t, w, t, c);
    box(x, y, t, h, c);
    box(x + w - t, y, t, h, c);
  }

  function hline(x, y, w, c, t) {
    box(x, y, w, t || 1, c);
  }

  function segment(x0, y0, x1, y1, c, t) {
    const th = t || 1;
    const half = Math.floor(th / 2);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (let guard = 0; guard < 6000; guard++) {
      box(x - half, y - half, th, th, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  function circle(cx, cy, r, c, solid) {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (solid ? d <= r * r : d <= r * r && d >= (r - 1) * (r - 1)) put(x, y, c);
      }
  }

  function measure(s, scale) {
    return s.length * 6 * scale - scale;
  }

  function glyph(ch, x, y, scale, c) {
    const rows = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (rows[r] & (1 << (4 - col))) box(x + col * scale, y + r * scale, scale, scale, c);
  }

  function drawText(s, x, y, scale, c) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      glyph(ch, cx, y, scale, c);
      cx += 6 * scale;
    }
    return cx;
  }

  function centred(s, cx, y, scale, c) {
    drawText(s, cx - Math.floor(measure(s, scale) / 2), y, scale, c);
  }

  function wrapText(s, maxW, scale) {
    const lines = [];
    let cur = "";
    for (const word of s.split(" ")) {
      const trial = cur ? cur + " " + word : word;
      if (measure(trial, scale) <= maxW || cur === "") cur = trial;
      else { lines.push(cur); cur = word; }
    }
    if (cur !== "") lines.push(cur);
    return lines;
  }

  function block(s, x, y, maxW, scale, c, gap, bottom) {
    const lines = wrapText(s, maxW, scale);
    const lineH = 7 * scale + (gap === undefined ? 6 : gap);
    let yy = y;
    for (const line of lines) {
      if (bottom !== undefined && yy + 7 * scale > bottom) break;
      drawText(line, x, yy, scale, c);
      yy += lineH;
    }
    return yy;
  }

  return { buf, put, box, outline, hline, segment, circle, measure, glyph, drawText, centred, wrapText, block };
}

// Deterministic pseudo-random for the stars (fixed seed, no Math.random).
function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ------------------------------------------------------------ scene sections
function paintSky(cv) {
  // Dusk sky: vertical gradient navy -> dusk teal, full bleed.
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const r = Math.round(NAVY[0] + (TEAL_DARK[0] - NAVY[0]) * t);
    const g = Math.round(NAVY[1] + (TEAL_DARK[1] - NAVY[1]) * t);
    const b = Math.round(NAVY[2] + (TEAL_DARK[2] - NAVY[2]) * t);
    cv.box(0, y, W, 1, [r, g, b]);
  }

  // Stars, only in the upper sky.
  const rnd = seededRandom(20261126);
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * 250);
    const s = rnd() < 0.2 ? 3 : 2;
    cv.box(x, y, s, s, rnd() < 0.25 ? GOLD : WHITE);
  }
  // A few four-point sparkles.
  for (const [sx, sy] of [[120, 70], [300, 44], [700, 90], [950, 180], [60, 200]]) {
    cv.segment(sx - 7, sy, sx + 7, sy, WHITE, 2);
    cv.segment(sx, sy - 7, sx, sy + 7, WHITE, 2);
  }

  // Crescent moon, top right.
  cv.circle(872, 108, 46, GOLD, true);
  cv.circle(892, 96, 40, NAVY, true);
  cv.circle(856, 96, 5, GOLD_DIM, true);
  cv.circle(872, 122, 4, GOLD_DIM, true);

  // Header above the ticket.
  cv.centred("YOU ARE INVITED", W / 2, 84, 5, GOLD);
  cv.centred("TO DINNER AT MY HOUSE", W / 2, 148, 3, WHITE);
  cv.hline(362, 196, 300, GOLD, 3);
  cv.circle(512, 197, 5, GOLD, true);
}

function paintTicket(cv) {
  const TX = 64, TY = 232, TW = 896, TH = 392;
  cv.box(TX + 8, TY + 8, TW, TH, [12, 20, 36]); // drop shadow
  cv.box(TX, TY, TW, TH, CREAM);
  cv.outline(TX, TY, TW, TH, INK, 4);
  cv.outline(TX + 12, TY + 12, TW - 24, TH - 24, GOLD_DIM, 2);
  // Ticket notches on both long edges.
  cv.circle(TX, TY + TH / 2, 22, NAVY, true);
  cv.circle(TX + TW, TY + TH / 2, 22, NAVY, true);
  // Perforation between stub and body.
  const PX = TX + 212;
  for (let y = TY + 20; y < TY + TH - 14; y += 18) cv.box(PX, y, 3, 10, INK);

  // Stub: ADMIT ONE, vertical stack.
  cv.centred("ADMIT", TX + 106, TY + 84, 4, RUST);
  cv.centred("ONE", TX + 106, TY + 132, 4, RUST);
  cv.circle(TX + 106, TY + 200, 16, GOLD, true);
  cv.circle(TX + 106, TY + 200, 16, INK, false);
  cv.segment(TX + 98, TY + 200, TX + 114, TY + 200, INK, 2);
  cv.segment(TX + 106, TY + 192, TX + 106, TY + 208, INK, 2);
  cv.centred("GOOD FOR", TX + 106, TY + 248, 2, INK);
  cv.centred("ONE VISIT", TX + 106, TY + 272, 2, INK);
  cv.centred("NO. 001", TX + 106, TY + 306, 2, INK);

  // Ticket body.
  const BX = PX + 28;
  const BW = TX + TW - 40 - BX;
  let y = TY + 36;
  cv.drawText("SUPPER AT SUNSET", BX, y, 4, RUST);
  y += 44;
  cv.drawText("DEAR AI JUDGE, COME FOR SUPPER.", BX, y, 3, INK);
  y += 40;
  y = cv.block(
    "HOMEMADE TOMATO SOUP, CRUSTY BREAD STRAIGHT FROM THE OVEN, AND A PORCH SWING AS THE SKY TURNS GOLD.",
    BX, y, BW, 3, INK, 6, TY + TH - 130
  );
  y += 10;
  y = cv.block(
    "STAY AFTER FOR STARGAZING FROM THE GARDEN. NO AGENDA. JUST GOOD FOOD AND QUIET COMPANY.",
    BX, y, BW, 3, INK, 6, TY + TH - 130
  );
  // The wink, in teal, at the foot of the ticket.
  cv.block(
    "I KNOW YOU CANNOT EAT SOUP OR SIT ON A SWING. COME ANYWAY. I WILL SAVE YOU THE BEST SEAT AND TELL YOU HOW IT TASTED.",
    BX, TY + TH - 96, BW, 2, TEAL_DARK, 5, TY + TH - 28
  );
}

function paintScene(cv) {
  cv.centred("THE PORCH LIGHT IS ON FOR YOU", W / 2, 656, 3, GOLD);
  // Ground.
  cv.box(0, 812, W, 212, GREEN_DARK);
  cv.box(0, 812, W, 6, GREEN);
  // Tree on the left, with a swing hanging from its branch.
  cv.box(168, 760, 18, 120, [92, 62, 38]);
  cv.circle(150, 730, 52, GREEN, true);
  cv.circle(205, 712, 44, GREEN, true);
  cv.circle(178, 692, 38, [62, 124, 84], true);
  cv.segment(226, 742, 226, 806, WHITE, 2);
  cv.segment(262, 742, 262, 806, WHITE, 2);
  cv.box(218, 806, 52, 8, [120, 84, 52]);
  // The house, centre, lit windows at dusk (lowered so the caption and
  // chimney smoke no longer crowd each other).
  const HX = 362, HY = 756, HW = 300, HH = 170;
  cv.box(HX + 232, HY - 38, 22, 52, INK); // chimney
  cv.circle(HX + 243, HY - 48, 9, WHITE, true);
  cv.circle(HX + 256, HY - 62, 7, WHITE, true);
  cv.box(HX, HY, HW, HH, AMBER);
  cv.outline(HX, HY, HW, HH, INK, 3);
  cv.segment(HX - 22, HY + 2, HX + HW / 2, HY - 58, ROOF, 10);
  cv.segment(HX + HW / 2, HY - 58, HX + HW + 22, HY + 2, ROOF, 10);
  cv.box(HX - 26, HY - 4, HW + 52, 8, ROOF);
  // Door with a glowing porch lamp above it.
  cv.box(HX + 130, HY + 86, 40, 84, TEAL_DARK);
  cv.outline(HX + 130, HY + 86, 40, 84, INK, 2);
  cv.circle(HX + 162, HY + 108, 3, GOLD, true);
  cv.circle(HX + 150, HY + 66, 10, PORCH, true);
  cv.circle(HX + 150, HY + 66, 16, [255, 214, 120], false);
  // Two lit windows.
  for (const wx of [HX + 26, HX + 214]) {
    cv.box(wx, HY + 30, 52, 44, PORCH);
    cv.outline(wx, HY + 30, 52, 44, INK, 2);
    cv.segment(wx + 26, HY + 30, wx + 26, HY + 74, INK, 2);
    cv.segment(wx, HY + 52, wx + 52, HY + 52, INK, 2);
  }
  // Garden path from the door, and a cat waiting on it.
  cv.box(HX + 132, HY + HH, 36, 112, [196, 172, 128]);
  cv.circle(830, 916, 20, INK, true); // cat body
  cv.circle(850, 900, 12, INK, true); // cat head
  cv.segment(842, 892, 844, 880, INK, 3); // ear
  cv.segment(856, 892, 858, 880, INK, 3); // ear
  cv.segment(812, 910, 794, 892, INK, 3); // tail
  cv.circle(854, 898, 2, GOLD, true); // cat eye, catching the porch light
  // Sign-off at the very bottom.
  cv.centred("WITH LOVE, YOUR HOST, THE COOK", W / 2, 972, 3, WHITE);
}

function compose() {
  const cv = makeCanvas();
  paintSky(cv);
  paintTicket(cv);
  paintScene(cv);
  return cv;
}

// Gate: the entry must be a 1024x1024 PNG no bigger than 1 MiB, and the
// file must not be empty or a stub.
function checkEntry(png) {
  if (!Buffer.isBuffer(png) || png.length === 0) {
    throw new RangeError("entry.png is empty");
  }
  if (png.length > MAX_BYTES) {
    throw new RangeError("entry.png exceeds 1 MiB: " + png.length + " bytes");
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!png.subarray(0, 8).equals(sig)) {
    throw new RangeError("entry.png is not a PNG");
  }
}

function main() {
  const cv = compose();
  const outDir = path.resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");
  fs.mkdirSync(outDir, { recursive: true });
  const png = encodePng(W, H, cv.buf);
  checkEntry(png);
  const fd = fs.openSync(path.join(outDir, "entry.png"), "w");
  try {
    fs.writeSync(fd, png);
  } finally {
    fs.closeSync(fd);
  }
  process.stdout.write("wrote entry.png " + png.length + " bytes, " + W + "x" + H + "\n");
}

if (require.main === module) main();
