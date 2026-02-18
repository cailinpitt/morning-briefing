const { google } = require("googleapis");

async function geocode(location) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", location);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": "morning-briefing/1.0" },
  });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function buildLegSummary(legs) {
  return legs
    .map((leg) => {
      const mins = Math.round(leg.duration / 60);
      if (leg.leg_mode === "walk") {
        return `Walk ${mins} min`;
      }
      if (leg.leg_mode === "personal_bike") {
        return `Bike ${mins} min`;
      }
      const route = leg.routes?.[0];
      if (!route) return "Transit";
      const short = route.route_short_name || route.route_long_name;
      let mode = route.mode_name;
      if (mode === "'L'") mode = "Line";
      const headsign = route.itineraries?.[0]?.headsign;
      const label = short && mode ? `${short} ${mode}` : short || mode || "Transit";
      return headsign ? `${label} to ${headsign}` : label;
    })
    .join(" > ");
}

function normalizeStreet(name) {
  return name
    .replace(/ Bikeway$/, "")
    .replace(/^(North|South|East|West) /, "")
    .trim();
}

function buildBikeSummary(directions) {
  if (!directions?.length) return null;
  // Merge consecutive segments on the same street
  const merged = [];
  for (const d of directions) {
    const raw = (d.way_name || "").trim();
    if (!raw) continue;
    const name = normalizeStreet(raw);
    const last = merged[merged.length - 1];
    if (last && last.name === name) {
      last.distance += d.length;
    } else {
      merged.push({ name, distance: d.length });
    }
  }
  if (!merged.length) return null;
  return merged.map((s) => s.name).join(" > ");
}

async function fetchTransitPlan(toLat, toLon, mode = "transit") {
  const apiKey = process.env.TRANSIT_API_KEY;
  const homeLat = process.env.HOME_LAT;
  const homeLon = process.env.HOME_LON;
  if (!apiKey || !homeLat || !homeLon) return null;

  const url = new URL("https://external.transitapp.com/v3/public/plan");
  url.searchParams.set("from_lat", homeLat);
  url.searchParams.set("from_lon", homeLon);
  url.searchParams.set("to_lat", toLat);
  url.searchParams.set("to_lon", toLon);
  url.searchParams.set("mode", mode);
  url.searchParams.set("num_result", "1");
  if (mode === "personal_bike") {
    url.searchParams.set("should_include_directions", "true");
  }

  const res = await fetch(url, {
    headers: { apiKey },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;

  const legs = result.legs || [];
  let summary = buildLegSummary(legs);
  if (mode === "personal_bike" && legs[0]?.directions) {
    const route = buildBikeSummary(legs[0].directions);
    if (route) summary += ": " + route;
  }

  return {
    travelMinutes: Math.round(result.duration / 60),
    transitSummary: summary,
  };
}

async function addTravelInfo(event) {
  if (!event.location) return;
  try {
    const coords = await geocode(event.location);
    if (!coords) return;
    const mode = event.bike ? "personal_bike" : "transit";
    const plan = await fetchTransitPlan(coords.lat, coords.lon, mode);
    if (!plan) return;
    event.travelMinutes = plan.travelMinutes;
    event.transitSummary = plan.transitSummary;
  } catch {
    // silently skip
  }
}

async function fetchCalendarEvents() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || clientId === "your_client_id_here" || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = (res.data.items || []).map((event) => {
    const start = event.start.dateTime || event.start.date;
    let timeStr = "All day";
    if (event.start.dateTime) {
      timeStr = new Date(event.start.dateTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    const desc = event.description || "";
    return {
      time: timeStr,
      startDateTime: event.start.dateTime || null,
      title: event.summary || "(No title)",
      location: event.location || null,
      bike: /\[bike\]/i.test(desc),
    };
  });

  await Promise.all(events.map(addTravelInfo));

  return events;
}

function printCalendar(printer, events) {
  printer.printSectionTitle("CALENDAR");

  if (!events) {
    printer.printLine("  Calendar unavailable.");
    return;
  }

  if (events.length === 0) {
    printer.printLine("  No events today.");
    return;
  }

  for (const event of events) {
    printer.bold(true);
    printer.printLine(`  ${event.time}`);
    printer.bold(false);
    printer.printWrapped(`    ${event.title}`, 40);
    if (event.travelMinutes != null) {
      let leaveBy = "";
      if (event.startDateTime) {
        const leave = new Date(new Date(event.startDateTime).getTime() - event.travelMinutes * 60000);
        leaveBy = ` (leave ${leave.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})`;
      }
      printer.printWrapped(
        `      ${event.travelMinutes} min${leaveBy}: ${event.transitSummary}`,
        40,
      );
    }
  }
}

module.exports = { fetchCalendarEvents, printCalendar };
