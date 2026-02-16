const QRCode = require("qrcode");
const { PAPER_WIDTH } = require("../printer");
const { fetchActivity, fetchActivityPhotos } = require("./strava-api");
const { getStatsForActivity, formatDuration, formatDistance } = require("./format-stats");
const { renderPolylineBitmap } = require("./polyline");
const { downloadAndDither } = require("./image");

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

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sportTypeLabel(sportType) {
  const labels = {
    Ride: "RIDE",
    VirtualRide: "VIRTUAL RIDE",
    EBikeRide: "E-BIKE RIDE",
    GravelRide: "GRAVEL RIDE",
    MountainBikeRide: "MTB RIDE",
    Run: "RUN",
    TrailRun: "TRAIL RUN",
    VirtualRun: "VIRTUAL RUN",
    Walk: "WALK",
    Hike: "HIKE",
    WeightTraining: "WEIGHT TRAINING",
  };
  return labels[sportType] || sportType.toUpperCase();
}

async function printActivity(printer, activityId) {
  const activity = await fetchActivity(activityId);
  const sportType = activity.sport_type || activity.type;

  // Header
  printer.alignCenter();
  printer.bold(true);
  printer.sizeDoubleWidth();
  printer.printLine("STRAVA");
  printer.sizeNormal();
  printer.printLine(sportTypeLabel(sportType));
  printer.bold(false);
  printer.printLine(formatDate(activity.start_date_local));
  printer.alignLeft();
  printer.lineFeed(1);

  // Activity name
  printer.bold(true);
  printer.printWrapped(activity.name);
  printer.bold(false);
  printer.printDivider("-");

  // Stats table
  const stats = getStatsForActivity(activity);
  for (const { label, value } of stats) {
    const dots = ".".repeat(Math.max(1, PAPER_WIDTH - label.length - value.length - 2));
    printer.printLine(`${label} ${dots} ${value}`);
  }

  // Segment efforts
  if (activity.segment_efforts && activity.segment_efforts.length > 0) {
    printer.lineFeed(1);
    printer.bold(true);
    printer.printLine("Segments");
    printer.bold(false);
    printer.printDivider("-");

    for (const effort of activity.segment_efforts) {
      // Segment name with PR badge
      let badge = "";
      if (effort.pr_rank === 1) badge = " ** PR!";
      else if (effort.pr_rank === 2) badge = " * 2nd";
      else if (effort.pr_rank === 3) badge = " * 3rd";

      printer.bold(!!effort.pr_rank);
      printer.printWrapped(effort.name + badge);
      printer.bold(false);

      // Time and distance on one line
      const time = formatDuration(effort.elapsed_time);
      const dist = formatDistance(effort.segment.distance);
      printer.printLine(`  ${time}  |  ${dist}`);
    }
  }

  // Route map for activities with GPS data
  if (activity.map && activity.map.summary_polyline) {
    printer.lineFeed(1);
    const bitmap = renderPolylineBitmap(activity.map.summary_polyline);
    if (bitmap) {
      printer.alignCenter();
      printer.printImage(bitmap);
      printer.alignLeft();
    }
  }

  // Photos for weight training (Hevy syncs photos to Strava)
  if (sportType === "WeightTraining") {
    try {
      const photos = await fetchActivityPhotos(activityId);
      if (photos && photos.length > 0) {
        printer.lineFeed(1);
        printer.bold(true);
        printer.printLine("Workout Photos");
        printer.bold(false);
        printer.printDivider("-");

        for (const photo of photos) {
          const url = photo.urls && (photo.urls["600"] || photo.urls["0"] || Object.values(photo.urls)[0]);
          if (!url) continue;
          try {
            const bitmap = await downloadAndDither(url);
            printer.alignCenter();
            printer.printImage(bitmap);
            printer.alignLeft();
            printer.lineFeed(1);
          } catch (err) {
            console.error(`Failed to print photo: ${err.message}`);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch activity photos: ${err.message}`);
    }
  }

  // Footer
  printer.lineFeed(1);
  if (activity.description) {
    printer.alignLeft();
    printer.printWrapped(activity.description, PAPER_WIDTH);
    printer.lineFeed(1);
  }
  printer.alignCenter();
  const qr = await renderQrBitmap(`https://www.strava.com/activities/${activityId}`);
  printer.printImage(qr);
  printer.alignLeft();
  printer.feedAndCut();
}

module.exports = { printActivity };
