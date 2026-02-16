require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { Printer } = require("../printer");
const { printHeader } = require("./sections/header");
const { fetchWeather, printWeather } = require("./sections/weather");
const { fetchCalendarEvents, printCalendar } = require("./sections/calendar");
const { fetchTodos, printTodos } = require("./sections/todos");
const { fetchNews, printNews } = require("./sections/news");
const { fetchParcels, printParcels } = require("./sections/parcels");

async function main() {
  const testMode = process.argv.includes("--test");
  const devicePath = process.env.PRINTER_DEVICE || "/dev/usb/lp0";
  const printer = new Printer(devicePath, { testMode });

  console.log("Fetching data...");

  const [weather, events, todos, headlines, parcels] = await Promise.all([
    fetchWeather().catch((err) => {
      console.error("Weather fetch failed:", err.message);
      return null;
    }),
    fetchCalendarEvents().catch((err) => {
      console.error("Calendar fetch failed:", err.message);
      return null;
    }),
    fetchTodos().catch((err) => {
      console.error("Todos fetch failed:", err.message);
      return null;
    }),
    fetchNews().catch((err) => {
      console.error("News fetch failed:", err.message);
      return null;
    }),
    fetchParcels().catch((err) => {
      console.error("Parcels fetch failed:", err.message);
      return null;
    }),
  ]);

  console.log("Printing briefing...");

  printer.init();
  printHeader(printer);
  printWeather(printer, weather);
  printCalendar(printer, events);
  printTodos(printer, todos);
  await printNews(printer, headlines);
  printParcels(printer, parcels);

  printer.lineFeed(2);
  printer.alignCenter();
  printer.printLine("Have a great day!");
  printer.alignLeft();
  printer.feedAndCut();

  printer.flush();
  console.log("Briefing printed successfully!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
