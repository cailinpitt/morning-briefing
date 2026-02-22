const { PAPER_WIDTH } = require("../printer");
const { formatHour } = require("./data");

function rollingDateRange(days) {
  const now = new Date();
  const start = new Date(now - days * 24 * 60 * 60 * 1000);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} - ${fmt(now)}`;
}

function leaderLine(label, value) {
  const dots = ".".repeat(
    Math.max(1, PAPER_WIDTH - label.length - value.length - 2)
  );
  return `${label} ${dots} ${value}`;
}

async function printBriefing(printer, data, options = {}) {
  const { current, previous, topRailLines, topBusRoutes, topStation, busiestDay, peakHour } = data;
  const title = options.title || "WEEKLY REPORT";
  const periodLabel = options.periodLabel || "last week";
  const dateRange = options.dateRangeStr || rollingDateRange(options.days || 7);

  // Header
  printer.alignCenter();
  printer.bold(true);
  printer.sizeDoubleWidth();
  printer.printLine("TRANSIT");
  printer.sizeNormal();
  printer.printLine(title);
  printer.bold(false);
  printer.printLine(dateRange);
  printer.alignLeft();

  // Total rides
  printer.printSectionTitle("Total Rides");
  printer.alignCenter();
  printer.sizeDouble();
  printer.bold(true);
  printer.printLine(String(current.totalRides));
  printer.sizeNormal();
  printer.bold(false);
  if (previous.totalRides > 0) {
    const diff = current.totalRides - previous.totalRides;
    const pct = Math.round((diff / previous.totalRides) * 100);
    const sign = pct >= 0 ? "+" : "";
    printer.printLine(`${sign}${pct}% from ${periodLabel} (${previous.totalRides})`);
  }
  printer.alignLeft();

  // Rail vs Bus split
  if (current.totalRides > 0) {
    printer.printSectionTitle("Rail vs Bus");
    const railPct = Math.round((current.rail.totalRides / current.totalRides) * 100);
    const busPct = 100 - railPct;
    printer.printLine(leaderLine("Rail", `${current.rail.totalRides} (${railPct}%)`));
    printer.printLine(leaderLine("Bus", `${current.bus.totalRides} (${busPct}%)`));
  }

  // Top rail lines
  if (topRailLines.length > 0) {
    printer.printSectionTitle("Top Rail Lines");
    for (let i = 0; i < topRailLines.length; i++) {
      const [line, count] = topRailLines[i];
      printer.printLine(leaderLine(`${i + 1}. ${line} Line`, String(count)));
    }
  }

  // Top bus routes
  if (topBusRoutes.length > 0) {
    printer.printSectionTitle("Top Bus Routes");
    for (let i = 0; i < topBusRoutes.length; i++) {
      const [route, count] = topBusRoutes[i];
      printer.printLine(leaderLine(`${i + 1}. Route ${route}`, String(count)));
    }
  }

  // Highlights
  const highlights = [];
  if (topStation) highlights.push(leaderLine("Top Rail Station", topStation[0]));
  if (busiestDay) highlights.push(leaderLine("Busiest Day", busiestDay[0]));
  if (peakHour) highlights.push(leaderLine("Peak Hour", formatHour(Number(peakHour[0]))));

  if (highlights.length > 0) {
    printer.printSectionTitle("Highlights");
    for (const line of highlights) printer.printLine(line);
  }

  // Spending
  if (current.spending.total > 0) {
    printer.printSectionTitle("Spending");
    printer.printLine(leaderLine("Total", `$${current.spending.total.toFixed(2)}`));
    if (previous.spending.total > 0) {
      const diff = current.spending.total - previous.spending.total;
      const sign = diff >= 0 ? "+" : "";
      printer.printLine(`${sign}$${diff.toFixed(2)} from ${periodLabel}`);
    }
  }

  printer.feedAndCut();
}

module.exports = { printBriefing };
