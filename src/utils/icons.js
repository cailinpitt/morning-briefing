// Pre-rendered 24x24 1-bit bitmap icons for receipt printer
// Each icon is stored as { width, height, data } where data is a Buffer
// of packed 1-bit pixels (MSB first), row by row.
// 24px wide = 3 bytes per row, 24 rows = 72 bytes total per icon.

function icon(hexString) {
  return {
    width: 24,
    height: 24,
    data: Buffer.from(hexString, "hex"),
  };
}

// Sun icon — circle with rays
const sun = icon(
  "000000" +
  "000000" +
  "010010" +
  "002400" +
  "003c00" +
  "007e00" +
  "0e7e38" +
  "07ff80" +
  "03ffc0" +
  "03ffc0" +
  "01ffe0" +
  "79ffe0" +
  "79ffe0" +
  "01ffe0" +
  "03ffc0" +
  "03ffc0" +
  "07ff80" +
  "0e7e38" +
  "007e00" +
  "003c00" +
  "002400" +
  "010010" +
  "000000" +
  "000000"
);

// Cloud icon
const cloud = icon(
  "000000" +
  "000000" +
  "000000" +
  "000000" +
  "000000" +
  "000000" +
  "01f000" +
  "03f800" +
  "07fc00" +
  "0ffe00" +
  "1fff00" +
  "3fff80" +
  "7fffc0" +
  "ffffe0" +
  "fffff0" +
  "fffff0" +
  "7fffe0" +
  "3fffc0" +
  "000000" +
  "000000" +
  "000000" +
  "000000" +
  "000000" +
  "000000"
);

// Rain icon — cloud with drops
const rain = icon(
  "000000" +
  "000000" +
  "000000" +
  "01f000" +
  "03f800" +
  "07fc00" +
  "0ffe00" +
  "1fff00" +
  "3fff80" +
  "7fffc0" +
  "fffff0" +
  "fffff0" +
  "7fffe0" +
  "3fffc0" +
  "000000" +
  "040810" +
  "040810" +
  "000000" +
  "102040" +
  "102040" +
  "000000" +
  "040810" +
  "000000" +
  "000000"
);

// Checkbox (empty)
const checkbox = icon(
  "000000" +
  "000000" +
  "3fffc0" +
  "3fffc0" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "300060" +
  "3fffc0" +
  "3fffc0" +
  "000000" +
  "000000"
);

// Calendar icon
const calendar = icon(
  "000000" +
  "000000" +
  "0c1800" +
  "0c1800" +
  "3fffe0" +
  "3fffe0" +
  "3fffe0" +
  "3fffe0" +
  "300060" +
  "300060" +
  "336660" +
  "336660" +
  "300060" +
  "300060" +
  "336660" +
  "336660" +
  "300060" +
  "300060" +
  "336660" +
  "336660" +
  "300060" +
  "3fffe0" +
  "000000" +
  "000000"
);

// Map weather condition codes to icons
function getWeatherIcon(conditionCode) {
  if (!conditionCode) return sun;
  const code = String(conditionCode);
  if (code.startsWith("2") || code.startsWith("3") || code.startsWith("5")) return rain;
  if (code.startsWith("8") && code !== "800") return cloud;
  return sun;
}

module.exports = { sun, cloud, rain, checkbox, calendar, getWeatherIcon };
