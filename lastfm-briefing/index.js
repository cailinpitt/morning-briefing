require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { Printer } = require("../printer");
const {
  fetchWeeklyScrobbleCounts,
  fetchTopArtists,
  fetchTopAlbums,
  fetchTopTracks,
  fetchSimilarTracks,
  fetchAllTimeTracks,
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
    fetchTopArtists(10),
    fetchTopAlbums(10),
    fetchTopTracks(10),
  ]);

  // Fetch tags for each top artist
  const artistTags = {};
  await Promise.all(
    topArtists.map(async (a) => {
      artistTags[a.name] = await fetchArtistTags(a.name).catch(() => []);
    })
  );

  // Fetch all-time tracks and similar tracks in parallel
  const [knownTracks, ...similarResults] = await Promise.all([
    fetchAllTimeTracks(),
    ...topTracks.map((t) =>
      fetchSimilarTracks(t.name, t.artist, 10).catch(() => []).then((similar) => ({ source: `${t.name} by ${t.artist}`, similar }))
    ),
  ]);

  // Build recommendations, excluding tracks already listened to
  const recScores = {};
  for (const { source, similar } of similarResults) {
    for (const s of similar) {
      const key = `${s.artist.toLowerCase()}\0${s.name.toLowerCase()}`;
      if (knownTracks.has(key)) continue;
      if (!recScores[key]) {
        recScores[key] = { name: s.name, artist: s.artist, score: 0, because: [] };
      }
      recScores[key].score += s.match;
      recScores[key].because.push(source);
    }
  }
  const recommendations = Object.values(recScores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  console.log(`${scrobbles.thisWeek} scrobbles this week (${scrobbles.lastWeek} last week), ${topArtists.length} top artists.`);

  let spotify = { added: 0, playlistName: null };
  if (testMode) {
    console.log(`[testMode] Would try to add ${recommendations.length} tracks to Spotify platlist`);
  } else {
    try {
      spotify = await addRecommendationsToSpotify(recommendations);
      if (spotify.added > 0) console.log(`Added ${spotify.added} track(s) to ${spotify.playlistName} playlist.`);
    } catch (err) {
      console.error("Spotify error (continuing):", err.message);
    }
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
