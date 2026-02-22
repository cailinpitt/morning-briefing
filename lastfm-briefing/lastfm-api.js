const API_KEY = process.env.LASTFM_API_KEY;
const USERNAME = process.env.LASTFM_USERNAME;
const BASE = "https://ws.audioscrobbler.com/2.0/";

async function apiCall(params) {
  const url = new URL(BASE);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);
  return res.json();
}

async function fetchScrobbleCount(from, to) {
  const data = await apiCall({
    method: "user.getRecentTracks",
    user: USERNAME,
    from,
    to,
    limit: 1,
  });
  return parseInt(data.recenttracks["@attr"].total, 10);
}

async function fetchWeeklyScrobbleCounts() {
  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 24 * 60 * 60;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60;
  const [thisWeek, lastWeek] = await Promise.all([
    fetchScrobbleCount(weekAgo, now),
    fetchScrobbleCount(twoWeeksAgo, weekAgo),
  ]);
  return { thisWeek, lastWeek };
}

async function fetchMonthlyScrobbleCounts() {
  const now = Math.floor(Date.now() / 1000);
  const monthAgo = now - 30 * 24 * 60 * 60;
  const twoMonthsAgo = now - 60 * 24 * 60 * 60;
  const [thisMonth, lastMonth] = await Promise.all([
    fetchScrobbleCount(monthAgo, now),
    fetchScrobbleCount(twoMonthsAgo, monthAgo),
  ]);
  return { thisMonth, lastMonth };
}

async function fetchTopArtists(limit = 5, period = "7day") {
  const data = await apiCall({
    method: "user.getTopArtists",
    user: USERNAME,
    period,
    limit,
  });
  return data.topartists.artist.map((a) => ({
    name: a.name,
    playcount: parseInt(a.playcount, 10),
  }));
}

async function fetchTopAlbums(limit = 5, period = "7day") {
  const data = await apiCall({
    method: "user.getTopAlbums",
    user: USERNAME,
    period,
    limit,
  });
  return data.topalbums.album.map((a) => ({
    name: a.name,
    artist: a.artist.name,
    playcount: parseInt(a.playcount, 10),
  }));
}

async function fetchTopTracks(limit = 5, period = "7day") {
  const data = await apiCall({
    method: "user.getTopTracks",
    user: USERNAME,
    period,
    limit,
  });
  return data.toptracks.track.map((t) => ({
    name: t.name,
    artist: t.artist.name,
    playcount: parseInt(t.playcount, 10),
  }));
}

async function fetchSimilarTracks(track, artist, limit = 5) {
  const data = await apiCall({
    method: "track.getSimilar",
    track,
    artist,
    limit,
  });
  if (!data.similartracks || !data.similartracks.track) return [];
  return data.similartracks.track.map((t) => ({
    name: t.name,
    artist: t.artist.name,
    match: parseFloat(t.match),
  }));
}

async function fetchAllTimeArtists() {
  const pageSize = 1000;
  const firstPage = await apiCall({
    method: "user.getTopArtists",
    user: USERNAME,
    period: "overall",
    limit: pageSize,
    page: 1,
  });
  const totalPages = parseInt(firstPage.topartists["@attr"].totalPages, 10);
  const artists = firstPage.topartists.artist.map((a) => a.name.toLowerCase());

  if (totalPages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        apiCall({
          method: "user.getTopArtists",
          user: USERNAME,
          period: "overall",
          limit: pageSize,
          page: i + 2,
        }).then((d) => d.topartists.artist.map((a) => a.name.toLowerCase()))
      )
    );
    for (const page of remaining) artists.push(...page);
  }

  return new Set(artists);
}

async function fetchAllTimeTracks() {
  const pageSize = 1000;
  const firstPage = await apiCall({
    method: "user.getTopTracks",
    user: USERNAME,
    period: "overall",
    limit: pageSize,
    page: 1,
  });
  const totalPages = parseInt(firstPage.toptracks["@attr"].totalPages, 10);
  const tracks = firstPage.toptracks.track.map(
    (t) => `${t.artist.name.toLowerCase()}\0${t.name.toLowerCase()}`
  );

  if (totalPages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        apiCall({
          method: "user.getTopTracks",
          user: USERNAME,
          period: "overall",
          limit: pageSize,
          page: i + 2,
        }).then((d) =>
          d.toptracks.track.map(
            (t) => `${t.artist.name.toLowerCase()}\0${t.name.toLowerCase()}`
          )
        )
      )
    );
    for (const page of remaining) tracks.push(...page);
  }

  return new Set(tracks);
}

async function fetchArtistTags(artist) {
  const data = await apiCall({
    method: "artist.getTopTags",
    artist,
  });
  if (!data.toptags || !data.toptags.tag) return [];
  return data.toptags.tag.slice(0, 3).map((t) => t.name.toLowerCase());
}

module.exports = {
  apiCall,
  fetchWeeklyScrobbleCounts,
  fetchMonthlyScrobbleCounts,
  fetchTopArtists,
  fetchTopAlbums,
  fetchTopTracks,
  fetchSimilarTracks,
  fetchAllTimeArtists,
  fetchAllTimeTracks,
  fetchArtistTags,
};
