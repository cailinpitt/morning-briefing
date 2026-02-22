const { PAPER_WIDTH } = require("../printer");

function formatDateRange(days = 7) {
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

function aggregateGenres(artistTags) {
  const counts = {};
  for (const [, tags] of Object.entries(artistTags)) {
    for (const tag of tags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
}

async function printBriefing(printer, data) {
  const { scrobbles, topArtists, topAlbums, topTracks, artistTags, recommendations, spotify } = data;
  const title = data.title || "WEEKLY REPORT";
  const days = data.days || 7;
  const periodLabel = days <= 7 ? "last week" : "last month";
  const currentLabel = days <= 7 ? "thisWeek" : "thisMonth";
  const previousLabel = days <= 7 ? "lastWeek" : "lastMonth";

  // Header
  printer.alignCenter();
  printer.bold(true);
  printer.sizeDoubleWidth();
  printer.printLine("LAST.FM");
  printer.sizeNormal();
  printer.printLine(title);
  printer.bold(false);
  printer.printLine(formatDateRange(days));
  printer.alignLeft();

  // Total scrobbles
  printer.printSectionTitle("Total Scrobbles");
  printer.alignCenter();
  printer.sizeDouble();
  printer.bold(true);
  printer.printLine(String(scrobbles[currentLabel]));
  printer.sizeNormal();
  printer.bold(false);
  if (scrobbles[previousLabel] > 0) {
    const diff = scrobbles[currentLabel] - scrobbles[previousLabel];
    const pct = Math.round((diff / scrobbles[previousLabel]) * 100);
    const sign = pct >= 0 ? "+" : "";
    printer.printLine(`${sign}${pct}% from ${periodLabel} (${scrobbles[previousLabel]})`);
  }
  printer.alignLeft();

  // Top Artists
  if (topArtists.length > 0) {
    printer.printSectionTitle("Top Artists");
    for (let i = 0; i < topArtists.length; i++) {
      const a = topArtists[i];
      const num = String(i + 1).padStart(2);
      const label = `${num}. ${a.name}`;
      const value = `${a.playcount}`;
      if (label.length + value.length + 2 > PAPER_WIDTH) {
        printer.printLine(`${num}. ${a.name}`);
        printer.printLine(leaderLine("    ", value));
      } else {
        printer.printLine(leaderLine(label, value));
      }
    }
  }

  // Top Albums
  if (topAlbums.length > 0) {
    printer.printSectionTitle("Top Albums");
    for (let i = 0; i < topAlbums.length; i++) {
      const a = topAlbums[i];
      const num = String(i + 1).padStart(2);
      const label = `${num}. ${a.name}`;
      const value = `${a.playcount}`;
      if (label.length + value.length + 2 > PAPER_WIDTH) {
        printer.printLine(`${num}. ${a.name}`);
        printer.printLine(leaderLine(`    ${a.artist}`, value));
      } else {
        printer.printLine(leaderLine(label, value));
        printer.printLine(`    ${a.artist}`);
      }
    }
  }

  // Top Tracks
  if (topTracks.length > 0) {
    printer.printSectionTitle("Top Tracks");
    for (let i = 0; i < topTracks.length; i++) {
      const t = topTracks[i];
      const num = String(i + 1).padStart(2);
      const label = `${num}. ${t.name}`;
      const value = `${t.playcount}`;
      if (label.length + value.length + 2 > PAPER_WIDTH) {
        printer.printLine(`${num}. ${t.name}`);
        printer.printLine(leaderLine(`    ${t.artist}`, value));
      } else {
        printer.printLine(leaderLine(label, value));
        printer.printLine(`    ${t.artist}`);
      }
    }
  }

  // Top Genres
  const genres = aggregateGenres(artistTags);
  if (genres.length > 0) {
    printer.printSectionTitle("Top Genres");
    for (let i = 0; i < genres.length; i++) {
      printer.printLine(`${String(i + 1).padStart(2)}. ${genres[i]}`);
    }
  }

  // Recommendations
  if (recommendations && recommendations.length > 0) {
    printer.printSectionTitle("Recommended");
    for (let i = 0; i < recommendations.length; i++) {
      const r = recommendations[i];
      const num = String(i + 1).padStart(2);
      printer.printLine(`${num}. ${r.name}`);
      printer.printLine(`    ${r.artist}`);
      const sources = [...new Set(r.because)].slice(0, 2).join(", ");
      printer.printLine(`    via ${sources}`);
    }
    if (spotify?.added > 0) {
      const name = spotify.playlistName.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
      printer.printLine(`Added ${spotify.added} to ${name} playlist.`);
    }
  }

  printer.feedAndCut();
}

module.exports = { printBriefing };
