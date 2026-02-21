const { apiCall } = require("../../lastfm-briefing/lastfm-api");

const USERNAME = process.env.LASTFM_USERNAME;

async function fetchOnThisDay() {
  if (!USERNAME) return null;

  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const currentYear = now.getFullYear();
  const startYear = currentYear - 10;

  const yearPromises = [];
  for (let year = startYear; year < currentYear; year++) {
    const from = Math.floor(new Date(year, month, day).getTime() / 1000);
    const to = Math.floor(new Date(year, month, day + 1).getTime() / 1000);
    yearPromises.push(
      fetchTracksForDay(from, to, year).catch(() => [])
    );
  }

  const yearResults = await Promise.all(yearPromises);
  const trackMap = new Map();

  for (const tracks of yearResults) {
    for (const { artist, name, year } of tracks) {
      const key = `${artist.toLowerCase()}\t${name.toLowerCase()}`;
      if (!trackMap.has(key)) {
        trackMap.set(key, { artist, name, count: 0, years: new Set() });
      }
      const entry = trackMap.get(key);
      entry.count++;
      entry.years.add(year);
    }
  }

  const sorted = [...trackMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((t) => ({
      name: t.name,
      artist: t.artist,
      count: t.count,
      years: [...t.years].sort(),
    }));

  return sorted;
}

async function fetchTracksForDay(from, to, year) {
  const tracks = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await apiCall({
      method: "user.getRecentTracks",
      user: USERNAME,
      from,
      to,
      limit: 200,
      page,
    });

    const rt = data.recenttracks;
    totalPages = parseInt(rt["@attr"].totalPages, 10);

    for (const t of rt.track || []) {
      if (t["@attr"]?.nowplaying) continue;
      tracks.push({
        artist: t.artist["#text"],
        name: t.name,
        year,
      });
    }
    page++;
  }

  return tracks;
}

function printOnThisDay(printer, tracks) {
  printer.printSectionTitle("MUSIC ON THIS DAY");

  if (!tracks || tracks.length === 0) {
    printer.printLine("  No listening history for this date.");
    return;
  }

  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const day = now.getDate();
  printer.printLine(`  ${monthName} ${day} across the years`);
  printer.printLine("");

  tracks.forEach((t, i) => {
    const years = t.years.join(", ");
    printer.printLine(`  ${i + 1}. ${t.name}`);
    printer.printLine(`     ${t.artist} (${t.count}x - ${years})`);
  });
}

module.exports = { fetchOnThisDay, printOnThisDay };
