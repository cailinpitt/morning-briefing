const fs = require("fs");
const path = require("path");
const os = require("os");

function loadTransactions() {
  const dataPath =
    process.env.VENTRA_DATA_PATH ||
    path.join(os.homedir(), "Development/cta-wrapped/ventra_transactions.json");
  const raw = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(raw).transactions;
}

function filterPeriod(transactions, days, endMs = Date.now()) {
  const startMs = endMs - days * 24 * 60 * 60 * 1000;
  return transactions.filter(
    (t) =>
      t.timestamp >= startMs &&
      t.timestamp < endMs &&
      t.transactionType !== "Sale"
  );
}

function analyzeTransactions(transactions) {
  const stats = {
    totalRides: 0,
    rail: { totalRides: 0, lines: {}, stations: {} },
    bus: { totalRides: 0, routes: {} },
    temporal: { byDayOfWeek: {}, byHour: {} },
    spending: { total: 0 },
  };

  for (const t of transactions) {
    stats.totalRides++;

    const date = new Date(t.timestamp);
    const dayOfWeek = date.toLocaleString("en-US", { weekday: "long" });
    const hour = date.getHours();

    stats.temporal.byDayOfWeek[dayOfWeek] =
      (stats.temporal.byDayOfWeek[dayOfWeek] || 0) + 1;
    stats.temporal.byHour[hour] = (stats.temporal.byHour[hour] || 0) + 1;
    stats.spending.total += Math.abs(t.amount / 100);

    if (t.type === "Rail") {
      stats.rail.totalRides++;
      const dashIdx = t.locationRoute.indexOf("-");
      if (dashIdx !== -1) {
        const line = t.locationRoute.slice(0, dashIdx);
        const station = t.locationRoute.slice(dashIdx + 1);
        stats.rail.lines[line] = (stats.rail.lines[line] || 0) + 1;
        stats.rail.stations[station] = (stats.rail.stations[station] || 0) + 1;
      }
    } else if (t.type === "Bus") {
      stats.bus.totalRides++;
      const routeMatch = t.locationRoute.match(/^(\d+)/);
      const route = routeMatch ? routeMatch[1] : t.locationRoute;
      stats.bus.routes[route] = (stats.bus.routes[route] || 0) + 1;
    }
  }

  return stats;
}

function topEntries(obj, n = 5) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function formatHour(h) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function buildStats(current, previous) {
  const curr = analyzeTransactions(current);
  const prev = analyzeTransactions(previous);
  return {
    current: curr,
    previous: prev,
    topRailLines: topEntries(curr.rail.lines, 5),
    topBusRoutes: topEntries(curr.bus.routes, 5),
    topStation: topEntries(curr.rail.stations, 1)[0] || null,
    busiestDay: topEntries(curr.temporal.byDayOfWeek, 1)[0] || null,
    peakHour: topEntries(curr.temporal.byHour, 1)[0] || null,
  };
}

function getTransitStats(days) {
  const all = loadTransactions();
  const now = Date.now();
  const periodMs = days * 24 * 60 * 60 * 1000;
  return buildStats(
    filterPeriod(all, days, now),
    filterPeriod(all, days, now - periodMs)
  );
}

function getCalendarMonthStats(year, month) {
  const all = loadTransactions();
  const startMs = new Date(year, month, 1).getTime();
  const endMs = new Date(year, month + 1, 1).getTime();
  const prevStartMs = new Date(year, month - 1, 1).getTime();
  const current = all.filter(
    (t) => t.timestamp >= startMs && t.timestamp < endMs && t.transactionType !== "Sale"
  );
  const previous = all.filter(
    (t) => t.timestamp >= prevStartMs && t.timestamp < startMs && t.transactionType !== "Sale"
  );
  return buildStats(current, previous);
}

module.exports = { getTransitStats, getCalendarMonthStats, formatHour };
