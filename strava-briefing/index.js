require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { Printer } = require("../printer");
const { fetchRecentActivities } = require("./strava-api");
const { printActivity } = require("./print-activity");

const STATE_FILE = path.join(__dirname, "..", ".seen-activities");

function readSeenIds() {
  try {
    const content = fs.readFileSync(STATE_FILE, "utf8").trim();
    if (!content) return new Set();
    return new Set(content.split("\n").map((s) => s.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeSeenIds(seenIds) {
  fs.writeFileSync(STATE_FILE, [...seenIds].join("\n") + "\n");
}

async function main() {
  const testMode = process.argv.includes("--test");
  const devicePath = process.env.PRINTER_DEVICE || "/dev/usb/lp0";
  const printer = new Printer(devicePath, { testMode });

  // Manual mode: print a specific activity by ID
  const idFlagIndex = process.argv.indexOf("--id");
  if (idFlagIndex !== -1) {
    const activityId = process.argv[idFlagIndex + 1];
    if (!activityId) {
      console.error("Usage: --id <activity_id>");
      process.exit(1);
    }
    console.log(`Printing activity ${activityId}...`);
    printer.init();
    await printActivity(printer, activityId);
    printer.flush();
    console.log("Done.");
    return;
  }

  // Auto mode: check for new activities
  const activities = await fetchRecentActivities();
  if (!activities || activities.length === 0) {
    console.log("No recent activities found.");
    return;
  }

  const seenIds = readSeenIds();

  // First run or empty file: print the most recent activity, mark all others as seen
  if (seenIds.size === 0) {
    for (let i = 1; i < activities.length; i++) {
      seenIds.add(String(activities[i].id));
    }
  }

  const newActivities = activities.filter((a) => !seenIds.has(String(a.id)));

  if (newActivities.length === 0) {
    console.log("No new activities.");
    return;
  }

  // Print oldest first
  newActivities.reverse();

  console.log(`Found ${newActivities.length} new activit${newActivities.length === 1 ? "y" : "ies"}.`);

  for (const activity of newActivities) {
    console.log(`Printing: ${activity.name} (${activity.sport_type || activity.type})`);
    printer.init();
    try {
      await printActivity(printer, activity.id);
      printer.flush();
      seenIds.add(String(activity.id));
      writeSeenIds(seenIds);
    } catch (err) {
      console.error(`Failed to print activity ${activity.id}: ${err.message}`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
