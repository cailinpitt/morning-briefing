function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function renderPolylineBitmap(encoded, maxWidth = 384, maxHeight = 300) {
  const points = decodePolyline(encoded);
  if (points.length < 2) return null;

  // Find bounding box
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // Apply cos(lat) correction for longitude
  const midLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);

  const latRange = maxLat - minLat;
  const lngRange = (maxLng - minLng) * cosLat;

  if (latRange === 0 && lngRange === 0) return null;

  // Add 10% padding
  const padding = 0.1;
  const padLat = latRange * padding || 0.001;
  const padLng = lngRange * padding || 0.001;

  const totalLat = latRange + 2 * padLat;
  const totalLng = lngRange + 2 * padLng;

  // Calculate dimensions maintaining aspect ratio
  let width, height;
  if (totalLng / totalLat > maxWidth / maxHeight) {
    width = maxWidth;
    height = Math.round((totalLat / totalLng) * maxWidth);
  } else {
    height = maxHeight;
    width = Math.round((totalLng / totalLat) * maxHeight);
  }

  // Ensure width is multiple of 8 for bitmap packing
  width = Math.ceil(width / 8) * 8;
  height = Math.max(height, 1);

  const bytesPerRow = width / 8;
  const data = Buffer.alloc(bytesPerRow * height, 0x00); // white = 0

  // Project points to pixel space
  function toPixel(lat, lng) {
    const x = Math.round(((lng - minLng) * cosLat + padLng) / totalLng * (width - 1));
    // Flip Y: higher lat = lower pixel index
    const y = Math.round((1 - (lat - minLat + padLat) / totalLat) * (height - 1));
    return [x, y];
  }

  // Set pixel (black = 1)
  function setPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const byteIndex = y * bytesPerRow + Math.floor(x / 8);
    const bitIndex = 7 - (x % 8); // MSB first
    data[byteIndex] |= 1 << bitIndex;
  }

  // Draw thick dot (3px radius circle-ish)
  function drawThickPixel(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        setPixel(x + dx, y + dy);
      }
    }
  }

  // Bresenham line with thickness
  function drawLine(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      drawThickPixel(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  // Draw all segments
  let [prevX, prevY] = toPixel(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = toPixel(points[i][0], points[i][1]);
    drawLine(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }

  return { width, height, data };
}

module.exports = { decodePolyline, renderPolylineBitmap };
