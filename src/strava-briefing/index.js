require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const fs = require("fs");
const path = require("path");
const { Printer } = require("../printer");
const { fetchRecentActivities } = require("./strava-api");
const { printActivity } = require("./print-activity");

const STATE_FILE = path.join(__dirname, "..", "..", ".last-activity");

function readLastActivityId() {
  try {
    return fs.readFileSync(STATE_FILE, "utf8").trim();
  } catch {
    return null;
  }
}

function writeLastActivityId(id) {
  fs.writeFileSync(STATE_FILE, String(id));
}

async function main() {
  const testMode = process.argv.includes("--test");
  const devicePath = process.env.PRINTER_DEVICE || "/dev/usb/lp0";
  const printer = new Printer(devicePath, { testMode });

  const activities = await fetchRecentActivities();
  if (!activities || activities.length === 0) {
    console.log("No recent activities found.");
    return;
  }

  let lastSeenId = readLastActivityId();

  // First run or empty file: print the most recent activity
  const newActivities = [];
  if (!lastSeenId) {
    newActivities.push(activities[0]);
  } else {
    for (const a of activities) {
      if (String(a.id) === String(lastSeenId)) break;
      newActivities.push(a);
    }
  }

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
    } catch (err) {
      console.error(`Failed to print activity ${activity.id}: ${err.message}`);
    }
  }

  // Update state with the most recent activity ID
  writeLastActivityId(activities[0].id);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
