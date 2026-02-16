const fs = require("fs");

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]),
  // Select Code Page 858 (Western European with euro sign + degree symbol at 0xF8)
  CODEPAGE_858: Buffer.from([ESC, 0x74, 0x13]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  UNDERLINE_ON: Buffer.from([ESC, 0x2d, 0x01]),
  UNDERLINE_OFF: Buffer.from([ESC, 0x2d, 0x00]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
  SIZE_NORMAL: Buffer.from([GS, 0x21, 0x00]),
  SIZE_DOUBLE_HEIGHT: Buffer.from([GS, 0x21, 0x01]),
  SIZE_DOUBLE_WIDTH: Buffer.from([GS, 0x21, 0x10]),
  SIZE_DOUBLE: Buffer.from([GS, 0x21, 0x11]),
  FEED_AND_CUT: Buffer.from([GS, 0x56, 0x41, 0x03]),
  LINE_FEED: Buffer.from([0x0a]),
};

const PAPER_WIDTH = 42; // characters at normal size

// Replace common Unicode characters with ASCII equivalents
// and strip anything else non-ASCII
function sanitize(text) {
  return text
    .replace(/[\u2018\u2019\u201A]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')    // smart double quotes
    .replace(/\u2026/g, "...")                 // ellipsis
    .replace(/[\u2013\u2014]/g, "-")           // en/em dash
    .replace(/\u00B0/g, "\xF8")                 // degree symbol -> CP858 0xF8
    .replace(/\u00A0/g, " ")                   // non-breaking space
    .replace(/\u2022/g, "*")                   // bullet
    .replace(/[^\x20-\x7E\x0A\x0D]/g, "");   // strip remaining non-ASCII
}

class Printer {
  constructor(devicePath, { testMode = false } = {}) {
    this.devicePath = devicePath;
    this.testMode = testMode;
    this.buffer = [];
    // test mode state
    this._lines = [];
    this._align = "left";
    this._bold = false;
    this._wide = false;
  }

  _writeRaw(data) {
    if (typeof data === "string") {
      this.buffer.push(Buffer.from(sanitize(data), "latin1"));
    } else {
      this.buffer.push(data);
    }
  }

  write(data) {
    if (typeof data === "string") {
      this._writeRaw(data);
    } else {
      this.buffer.push(data);
    }
    return this;
  }

  _receiptLine(text) {
    const w = this._wide ? Math.floor(PAPER_WIDTH / 2) : PAPER_WIDTH;
    const content = text.slice(0, w);
    let padded;
    if (this._align === "center") {
      const pad = Math.max(0, Math.floor((PAPER_WIDTH - content.length) / 2));
      padded = " ".repeat(pad) + content;
    } else if (this._align === "right") {
      const pad = Math.max(0, PAPER_WIDTH - content.length);
      padded = " ".repeat(pad) + content;
    } else {
      padded = content;
    }
    padded = padded.padEnd(PAPER_WIDTH);
    if (this._bold) padded = `\x1b[1m${padded}\x1b[0m`;
    this._lines.push(padded);
  }

  init() {
    if (!this.testMode) {
      this._writeRaw(CMD.INIT);
      this._writeRaw(CMD.CODEPAGE_858);
    }
    return this;
  }

  bold(on = true) {
    if (this.testMode) { this._bold = on; return this; }
    return this.write(on ? CMD.BOLD_ON : CMD.BOLD_OFF);
  }

  underline(on = true) {
    if (this.testMode) return this;
    return this.write(on ? CMD.UNDERLINE_ON : CMD.UNDERLINE_OFF);
  }

  alignLeft() {
    if (this.testMode) { this._align = "left"; return this; }
    return this.write(CMD.ALIGN_LEFT);
  }

  alignCenter() {
    if (this.testMode) { this._align = "center"; return this; }
    return this.write(CMD.ALIGN_CENTER);
  }

  alignRight() {
    if (this.testMode) { this._align = "right"; return this; }
    return this.write(CMD.ALIGN_RIGHT);
  }

  sizeNormal() {
    if (this.testMode) { this._wide = false; return this; }
    return this.write(CMD.SIZE_NORMAL);
  }

  sizeDoubleHeight() {
    if (this.testMode) return this;
    return this.write(CMD.SIZE_DOUBLE_HEIGHT);
  }

  sizeDoubleWidth() {
    if (this.testMode) { this._wide = true; return this; }
    return this.write(CMD.SIZE_DOUBLE_WIDTH);
  }

  sizeDouble() {
    if (this.testMode) { this._wide = true; return this; }
    return this.write(CMD.SIZE_DOUBLE);
  }

  lineFeed(lines = 1) {
    if (this.testMode) {
      for (let i = 0; i < lines; i++) this._receiptLine("");
      return this;
    }
    for (let i = 0; i < lines; i++) this.write(CMD.LINE_FEED);
    return this;
  }

  printLine(text = "") {
    if (this.testMode) {
      this._receiptLine(sanitize(text));
      return this;
    }
    return this.write(text + "\n");
  }

  printWrapped(text, maxWidth = PAPER_WIDTH) {
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      if (line.length + word.length + 1 > maxWidth) {
        this.printLine(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    }
    if (line) this.printLine(line);
    return this;
  }

  printDivider(char = "-") {
    return this.printLine(char.repeat(PAPER_WIDTH));
  }

  printHeader(text) {
    this.alignCenter();
    this.bold(true);
    this.sizeDoubleHeight();
    this.printLine(text);
    this.sizeNormal();
    this.bold(false);
    this.alignLeft();
    return this;
  }

  printSectionTitle(text) {
    this.lineFeed(1);
    this.bold(true);
    this.printLine(text);
    this.bold(false);
    this.printDivider("-");
    return this;
  }

  printImage(imageData) {
    if (this.testMode) {
      this._receiptLine("[icon]");
      return this;
    }
    const { width, height, data } = imageData;
    const bytesPerRow = Math.ceil(width / 8);

    // GS v 0 — raster bit image
    const header = Buffer.from([
      GS,
      0x76,
      0x30,
      0x00, // normal mode
      bytesPerRow & 0xff,
      (bytesPerRow >> 8) & 0xff,
      height & 0xff,
      (height >> 8) & 0xff,
    ]);
    this.write(header);
    this.write(data);
    return this;
  }

  feedAndCut() {
    this.lineFeed(3);
    if (this.testMode) return this;
    return this.write(CMD.FEED_AND_CUT);
  }

  flush() {
    if (this.testMode) {
      const border = "+" + "-".repeat(PAPER_WIDTH + 2) + "+";
      const out = [border];
      for (const line of this._lines) {
        out.push(`| ${line} |`);
      }
      out.push(border);
      const edge = ("\\/  ").repeat(11).trimEnd();
      out.push(" " + edge);
      process.stdout.write(out.join("\n") + "\n");
      this._lines = [];
    } else {
      const output = Buffer.concat(this.buffer);
      fs.writeFileSync(this.devicePath, output);
    }
    this.buffer = [];
  }
}

module.exports = { Printer, CMD, PAPER_WIDTH };
