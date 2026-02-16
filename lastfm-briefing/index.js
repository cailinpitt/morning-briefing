require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { Printer } = require("../printer");
const {
  fetchWeeklyScrobbleCounts,
  fetchTopArtists,
  fetchTopAlbums,
  fetchTopTracks,
  fetchSimilarTracks,
  fetchAllTimeArtists,
  fetchArtistTags,
} = require("./lastfm-api");
const { printBriefing } = require("./print-briefing");
const { addRecommendationsToSpotify } = require("./spotify-api");

async function main() {
  const testMode = process.argv.includes("--test");
  const devicePath = process.env.PRINTER_DEVICE || "/dev/usb/lp0";
  const printer = new Printer(devicePath, { testMode });

  console.log("Fetching Last.fm data...");

  const [scrobbles, topArtists, topAlbums, topTracks] = await Promise.all([
    fetchWeeklyScrobbleCounts(),
    fetchTopArtists(5),
    fetchTopAlbums(5),
    fetchTopTracks(5),
  ]);

  // Fetch tags for each top artist
  const artistTags = {};
  await Promise.all(
    topArtists.map(async (a) => {
      artistTags[a.name] = await fetchArtistTags(a.name).catch(() => []);
    })
  );

  // Fetch all-time artists and similar tracks in parallel
  const [knownArtists, ...similarResults] = await Promise.all([
    fetchAllTimeArtists(200),
    ...topTracks.map((t) =>
      fetchSimilarTracks(t.name, t.artist, 10).catch(() => []).then((similar) => ({ source: t.name, similar }))
    ),
  ]);

  // Build recommendations, excluding artists already listened to
  const recScores = {};
  for (const { source, similar } of similarResults) {
    for (const s of similar) {
      if (knownArtists.has(s.artist.toLowerCase())) continue;
      const key = `${s.artist.toLowerCase()}\0${s.name.toLowerCase()}`;
      if (!recScores[key]) {
        recScores[key] = { name: s.name, artist: s.artist, score: 0, because: [] };
      }
      recScores[key].score += s.match;
      recScores[key].because.push(source);
    }
  }
  const recommendations = Object.values(recScores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  console.log(`${scrobbles.thisWeek} scrobbles this week (${scrobbles.lastWeek} last week), ${topArtists.length} top artists.`);

  let spotify = { added: 0, playlistName: null };
  try {
    spotify = await addRecommendationsToSpotify(recommendations);
    if (spotify.added > 0) console.log(`Added ${spotify.added} track(s) to ${spotify.playlistName} playlist.`);
  } catch (err) {
    console.error("Spotify error (continuing):", err.message);
  }

  printer.init();
  await printBriefing(printer, {
    scrobbles,
    topArtists,
    topAlbums,
    topTracks,
    artistTags,
    recommendations,
    spotify,
  });
  printer.flush();

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
