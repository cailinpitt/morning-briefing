const { google } = require("googleapis");

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

  return (res.data.items || []).map((event) => {
    const start = event.start.dateTime || event.start.date;
    let timeStr = "All day";
    if (event.start.dateTime) {
      timeStr = new Date(event.start.dateTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return { time: timeStr, title: event.summary || "(No title)" };
  });
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
  }
}

module.exports = { fetchCalendarEvents, printCalendar };
