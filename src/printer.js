const fs = require("fs");

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]),
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

class Printer {
  constructor(devicePath) {
    this.devicePath = devicePath;
    this.buffer = [];
  }

  write(data) {
    if (typeof data === "string") {
      this.buffer.push(Buffer.from(data, "utf8"));
    } else {
      this.buffer.push(data);
    }
    return this;
  }

  init() {
    return this.write(CMD.INIT);
  }

  bold(on = true) {
    return this.write(on ? CMD.BOLD_ON : CMD.BOLD_OFF);
  }

  underline(on = true) {
    return this.write(on ? CMD.UNDERLINE_ON : CMD.UNDERLINE_OFF);
  }

  alignLeft() {
    return this.write(CMD.ALIGN_LEFT);
  }

  alignCenter() {
    return this.write(CMD.ALIGN_CENTER);
  }

  alignRight() {
    return this.write(CMD.ALIGN_RIGHT);
  }

  sizeNormal() {
    return this.write(CMD.SIZE_NORMAL);
  }

  sizeDoubleHeight() {
    return this.write(CMD.SIZE_DOUBLE_HEIGHT);
  }

  sizeDoubleWidth() {
    return this.write(CMD.SIZE_DOUBLE_WIDTH);
  }

  sizeDouble() {
    return this.write(CMD.SIZE_DOUBLE);
  }

  lineFeed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.write(CMD.LINE_FEED);
    }
    return this;
  }

  printLine(text = "") {
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

  // Print a 1-bit raster image
  // imageData: { width, height, data } where data is a Buffer of raw 1-bit pixel rows
  printImage(imageData) {
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
    return this.write(CMD.FEED_AND_CUT);
  }

  flush() {
    const output = Buffer.concat(this.buffer);
    fs.writeFileSync(this.devicePath, output);
    this.buffer = [];
  }
}

module.exports = { Printer, CMD, PAPER_WIDTH };
