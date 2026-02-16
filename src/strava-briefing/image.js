const sharp = require("sharp");

async function downloadAndDither(url, maxWidth = 384) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const inputBuf = Buffer.from(arrayBuf);

  // Resize and convert to single-channel grayscale
  const { data, info } = await sharp(inputBuf)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  // Floyd-Steinberg dithering
  const pixels = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) pixels[i] = data[i];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const oldVal = pixels[i];
      const newVal = oldVal < 128 ? 0 : 255;
      pixels[i] = newVal;
      const err = oldVal - newVal;

      if (x + 1 < width) pixels[i + 1] += err * 7 / 16;
      if (y + 1 < height) {
        if (x - 1 >= 0) pixels[(y + 1) * width + (x - 1)] += err * 3 / 16;
        pixels[(y + 1) * width + x] += err * 5 / 16;
        if (x + 1 < width) pixels[(y + 1) * width + (x + 1)] += err * 1 / 16;
      }
    }
  }

  // Pack to 1-bit MSB buffer (black=1, white=0 for thermal printer)
  const packedWidth = Math.ceil(width / 8) * 8;
  const bytesPerRow = packedWidth / 8;
  const packed = Buffer.alloc(bytesPerRow * height, 0x00);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x] < 128) {
        // Black pixel
        const byteIndex = y * bytesPerRow + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);
        packed[byteIndex] |= 1 << bitIndex;
      }
    }
  }

  return { width: packedWidth, height, data: packed };
}

module.exports = { downloadAndDither };
