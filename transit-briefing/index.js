require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { Printer } = require("../printer");
const { getTransitStats } = require("./data");
const { printBriefing } = require("./print-briefing");

const DAYS = 7;

async function main() {
  const testMode = process.argv.includes("--test");
  const devicePath = process.env.PRINTER_DEVICE || "/dev/usb/lp0";
  const printer = new Printer(devicePath, { testMode });

  console.log("Reading transit data...");
  const data = getTransitStats(DAYS);
  console.log(`${data.current.totalRides} rides this week (${data.previous.totalRides} last week).`);

  printer.init();
  await printBriefing(printer, data, DAYS);
  printer.flush();

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
