const QRCode = require("qrcode");

async function renderQrBitmap(text, moduleSize = 3) {
  const modules = QRCode.create(text, { errorCorrectionLevel: "L" }).modules;
  const size = modules.size;
  const width = Math.ceil((size * moduleSize) / 8) * 8; // align to 8
  const height = size * moduleSize;
  const bytesPerRow = width / 8;
  const data = Buffer.alloc(bytesPerRow * height, 0x00);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules.get(row, col)) {
        for (let dy = 0; dy < moduleSize; dy++) {
          for (let dx = 0; dx < moduleSize; dx++) {
            const x = col * moduleSize + dx;
            const y = row * moduleSize + dy;
            const byteIndex = y * bytesPerRow + Math.floor(x / 8);
            data[byteIndex] |= 1 << (7 - (x % 8));
          }
        }
      }
    }
  }

  return { width, height, data };
}

module.exports = { renderQrBitmap };
