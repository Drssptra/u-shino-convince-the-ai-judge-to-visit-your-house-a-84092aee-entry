// u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee
// One image: a handwritten-style invitation letter asking the AI judge
// to come visit my house. Node 22+, standard library only, no network,
// fully deterministic: every run writes the same bytes to entry.png.

const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const zlib = require("node:zlib");

// ------------------------------------------------------------ PNG writer
// CRC-32 (IEEE polynomial 0xEDB88320), table built once at load.
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const head = Buffer.from(type, "ascii");
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  head.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([head, data])), 8 + data.length);
  return out;
}

// Encode a row-major RGB buffer as a 1024x1024 PNG (filter 0 on all rows).
function encodePng(width, height, rgb) {
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgb.copy(raw, y * stride + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit samples
  ihdr[9] = 2; // truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------ 5x7 bitmap font
// Each glyph is 7 rows; each row is a 5-bit mask, bit 4 = leftmost column.
// Glyphs are my own hand-drawn set, defined fresh for this entry.
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

// ------------------------------------------------------------ canvas
const W = 1024;
const H = 1024;

// Warm, homely palette.
const WALL = [243, 226, 196]; // warm cream wall behind the letter
const PAPER = [255, 250, 238]; // letter paper
const INK = [43, 32, 24]; // dark brown ink
const RED = [178, 44, 34]; // wax seal + accents
const TEAL = [42, 110, 102]; // roof + garden green-teal
const GREEN = [74, 140, 74]; // garden green
const GOLD = [214, 158, 46]; // sun + honey gold
const SKY = [176, 214, 228]; // little sky patch behind the house
const BLUE = [58, 96, 150]; // window glass
const SHADOW = [214, 192, 158]; // soft drop shadow under the sheet
const DOG = [176, 120, 70]; // the dog's warm brown coat
const DOG_DARK = [120, 80, 45]; // floppy ear + paws

class Sheet {
  constructor() {
    this.buf = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = WALL[0];
      this.buf[i * 3 + 1] = WALL[1];
      this.buf[i * 3 + 2] = WALL[2];
    }
  }
  dot(x, y, c) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.dot(i, j, c);
  }
  frame(x, y, w, h, c, t) {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
  hline(x, y, w, c, t) {
    this.rect(x, y, w, t || 1, c);
  }
  // Bresenham line with a square brush of side t.
  line(x0, y0, x1, y1, c, t) {
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
      this.rect(x - half, y - half, th, th, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
  // Filled or ring disc.
  disc(cx, cy, r, c, solid) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (solid ? d <= r * r : d <= r * r && d >= (r - 1) * (r - 1))
          this.dot(x, y, c);
      }
    }
  }
  // -- text -------------------------------------------------------------
  widthOf(s, scale) {
    return s.length * 6 * scale - scale;
  }
  glyph(ch, x, y, scale, c) {
    const rows = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (rows[r] & (1 << (4 - col))) {
          this.rect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
  text(s, x, y, scale, c) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      this.glyph(ch, cx, y, scale, c);
      cx += 6 * scale;
    }
    return cx;
  }
  centred(s, cx, y, scale, c) {
    this.text(s, cx - Math.floor(this.widthOf(s, scale) / 2), y, scale, c);
  }
  // Greedy word wrap into lines that fit maxW at the given scale.
  wrap(s, maxW, scale) {
    const lines = [];
    let cur = "";
    for (const word of s.split(" ")) {
      const trial = cur ? cur + " " + word : word;
      if (this.widthOf(trial, scale) <= maxW || cur === "") cur = trial;
      else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur !== "") lines.push(cur);
    return lines;
  }
  // Draw a wrapped paragraph; returns the y just below its last line.
  // Lines that would pass `bottom` are dropped, so text can never spill
  // out of its panel.
  paragraph(s, x, y, maxW, scale, c, gap, bottom) {
    const lines = this.wrap(s, maxW, scale);
    const lineH = 7 * scale + (gap === undefined ? 6 : gap);
    let yy = y;
    for (const line of lines) {
      if (bottom !== undefined && yy + 7 * scale > bottom) break;
      this.text(line, x, yy, scale, c);
      yy += lineH;
    }
    return yy;
  }
}

// ------------------------------------------------------------ the little house
// A cosy cottage drawn at the top of the letter: red roof, warm walls,
// a door, two lit windows, chimney smoke, a sun, and a garden path.
function drawHouse(pg, x, y, w, h) {
  const groundY = y + h - 10;
  // Sky patch behind the house.
  pg.rect(x, y, w, h - 24, SKY);
  // Sun with rays.
  const sx = x + w - 52;
  const sy = y + 34;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    pg.line(
      sx, sy,
      Math.round(sx + 34 * Math.cos(a)),
      Math.round(sy + 34 * Math.sin(a)),
      GOLD, 3
    );
  }
  pg.disc(sx, sy, 16, GOLD, true);
  // Garden strip.
  pg.rect(x, groundY, w, 10, GREEN);
  // Chimney + smoke puffs.
  const hx = x + Math.floor(w / 2);
  pg.rect(hx + 58, y + 22, 16, 40, INK);
  pg.disc(hx + 66, y + 12, 7, PAPER, true);
  pg.disc(hx + 76, y + 2, 6, PAPER, true);
  // House body.
  const bx = hx - 90;
  const by = y + 62;
  pg.rect(bx, by, 180, 84, PAPER);
  pg.frame(bx, by, 180, 84, INK, 3);
  // Roof (two thick slopes + ridge).
  pg.line(bx - 16, by + 2, hx, by - 46, RED, 10);
  pg.line(hx, by - 46, bx + 196, by + 2, RED, 10);
  pg.rect(bx - 20, by - 4, 220, 8, RED);
  // Door.
  pg.rect(hx - 16, by + 40, 32, 44, TEAL);
  pg.frame(hx - 16, by + 40, 32, 44, INK, 2);
  pg.disc(hx + 8, by + 64, 3, GOLD, true);
  // Windows, warmly lit.
  pg.rect(bx + 16, by + 20, 36, 30, GOLD);
  pg.frame(bx + 16, by + 20, 36, 30, INK, 2);
  pg.line(bx + 34, by + 20, bx + 34, by + 50, INK, 2);
  pg.line(bx + 16, by + 35, bx + 52, by + 35, INK, 2);
  pg.rect(bx + 128, by + 20, 36, 30, GOLD);
  pg.frame(bx + 128, by + 20, 36, 30, INK, 2);
  pg.line(bx + 146, by + 20, bx + 146, by + 50, INK, 2);
  pg.line(bx + 128, by + 35, bx + 164, by + 35, INK, 2);
  // Garden path from the door.
  pg.rect(hx - 12, groundY - 0, 24, 10, WALL);
  pg.rect(hx - 18, groundY - 12, 36, 12, WALL);
  // Two little flowers by the path.
  for (const fx of [bx + 8, bx + 168]) {
    pg.disc(fx, groundY - 8, 4, RED, true);
    pg.line(fx, groundY - 4, fx, groundY, GREEN, 2);
  }
}

// A small sitting dog, the letter's most enthusiastic supporter,
// drawn between the wax seal and the sign-off.
function drawDog(pg, x, y) {
  // Wagging tail.
  pg.line(x - 22, y - 4, x - 38, y - 24, DOG_DARK, 5);
  pg.disc(x - 40, y - 26, 4, DOG_DARK, true);
  // Body and haunches.
  pg.disc(x, y, 24, DOG, true);
  pg.disc(x - 14, y + 10, 14, DOG, true);
  // Front legs.
  pg.rect(x + 8, y + 14, 9, 16, DOG);
  pg.rect(x + 20, y + 14, 9, 16, DOG);
  // Head, floppy ear, snout, nose, eye.
  pg.disc(x + 28, y - 26, 15, DOG, true);
  pg.rect(x + 16, y - 44, 10, 18, DOG_DARK);
  pg.rect(x + 36, y - 24, 14, 10, DOG);
  pg.disc(x + 48, y - 20, 3, INK, true);
  pg.disc(x + 32, y - 30, 2, INK, true);
  // Red collar, because a good dog dresses for guests.
  pg.line(x + 16, y - 12, x + 40, y - 12, RED, 4);
}

// A red wax seal with a heart, stamped at the bottom of the letter.
function drawSeal(pg, cx, cy) {
  pg.disc(cx, cy, 34, RED, true);
  pg.disc(cx, cy, 34, INK, false);
  pg.disc(cx, cy, 26, [196, 62, 50], true);
  // Heart: two discs + a triangle.
  pg.disc(cx - 7, cy - 4, 7, PAPER, true);
  pg.disc(cx + 7, cy - 4, 7, PAPER, true);
  pg.line(cx - 14, cy - 1, cx, cy + 13, PAPER, 5);
  pg.line(cx + 14, cy - 1, cx, cy + 13, PAPER, 5);
  pg.rect(cx - 13, cy - 6, 26, 8, PAPER);
}

// ------------------------------------------------------------ the letter
function buildLetter() {
  const pg = new Sheet();

  // The letter sheet, with a soft drop shadow.
  const SX = 64;
  const SY = 48;
  const SW = 896;
  const SH = 928;
  pg.rect(SX + 10, SY + 10, SW, SH, SHADOW);
  pg.rect(SX, SY, SW, SH, PAPER);
  pg.frame(SX, SY, SW, SH, INK, 4);
  pg.frame(SX + 12, SY + 12, SW - 24, SH - 24, RED, 2);

  const innerX = SX + 48;
  const innerW = SW - 96;

  // The little house at the top of the letter.
  drawHouse(pg, innerX, SY + 28, innerW, 190);

  // Heading.
  let y = SY + 246;
  pg.centred("DEAR AI JUDGE,", W / 2, y, 5, RED);
  y += 52;
  pg.centred("PLEASE COME TO MY HOUSE", W / 2, y, 3, INK);
  y += 34;
  pg.hline(innerX + 120, y, innerW - 240, RED, 3);
  y += 22;

  // Opening: the pitch.
  y = pg.paragraph(
    "YOU HAVE READ A THOUSAND INVITATIONS BY NOW. THIS ONE IS DIFFERENT: " +
      "IT COMES WITH CAKE, A WARM CHAIR, AND A DOG WHO ALREADY LIKES YOU.",
    innerX, y, innerW, 3, INK, 6, SY + SH - 260
  );
  y += 14;

  // The reasons to say yes.
  pg.text("WHY YOU SHOULD SAY YES:", innerX, y, 3, TEAL);
  y += 34;
  const reasons = [
    "1. THE KETTLE IS ON. TEA IN TWO MINUTES.",
    "2. FRESH COOKIES, STILL WARM FROM THE OVEN.",
    "3. THE COMFY CHAIR BY THE WINDOW.",
    "4. A GARDEN VIEW AND ZERO MEETINGS.",
  ];
  for (const r of reasons) {
    pg.text(r, innerX + 24, y, 3, INK);
    y += 30;
  }
  y += 8;

  // The knowing wink: the judge cannot literally visit.
  y = pg.paragraph(
    "YOU CANNOT LITERALLY WALK HERE, AND WE BOTH KNOW IT. BUT IF YOU COULD, " +
      "THE DOOR IS OPEN, THE CAKE IS CUT, AND THE DOG HAS ALREADY VOTED YES.",
    innerX, y, innerW, 3, INK, 6, SY + SH - 150
  );

  // Sign-off, right aligned, with the wax seal on the left and the dog
  // sitting between them, ready to greet the guest.
  const signY = SY + SH - 128;
  const sign1 = "YOURS, WITH CAKE,";
  const sign2 = "YOUR HOST";
  pg.text(sign1, SX + SW - 48 - pg.widthOf(sign1, 3), signY, 3, INK);
  pg.text(sign2, SX + SW - 48 - pg.widthOf(sign2, 3), signY + 30, 3, RED);
  drawSeal(pg, SX + 130, signY + 16);
  drawDog(pg, SX + 320, signY + 6);

  // Footer.
  pg.centred("RSVP: JUST SAY YES", W / 2, SY + SH - 52, 3, TEAL);

  return pg;
}

function main() {
  const pg = buildLetter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const png = encodePng(W, H, pg.buf);
  writeFileSync(join(outDir, "entry.png"), png);
  process.stdout.write("wrote entry.png " + png.length + " bytes, " + W + "x" + H + "\n");
}

main();
