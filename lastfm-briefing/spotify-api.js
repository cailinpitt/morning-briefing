const fs = require("fs");
const path = require("path");

const BASE_URL = "https://api.spotify.com/v1";
const ENV_PATH = path.join(__dirname, "..", ".env");

let accessToken = process.env.SPOTIFY_ACCESS_TOKEN;

async function refreshAccessToken() {
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status} ${await resp.text()}`);
  }

  const tokens = await resp.json();
  accessToken = tokens.access_token;

  // Persist rotated tokens to .env
  let envContent = fs.readFileSync(ENV_PATH, "utf8");
  const updates = [["SPOTIFY_ACCESS_TOKEN", tokens.access_token]];
  if (tokens.refresh_token) {
    updates.push(["SPOTIFY_REFRESH_TOKEN", tokens.refresh_token]);
  }
  for (const [key, val] of updates) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent = envContent.trimEnd() + `\n${key}=${val}\n`;
    }
  }
  fs.writeFileSync(ENV_PATH, envContent);

  process.env.SPOTIFY_ACCESS_TOKEN = tokens.access_token;
  if (tokens.refresh_token) {
    process.env.SPOTIFY_REFRESH_TOKEN = tokens.refresh_token;
  }
}

async function apiRequest(endpoint, options = {}) {
  let resp = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (resp.status === 401) {
    await refreshAccessToken();
    resp = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  }

  if (!resp.ok) {
    throw new Error(`Spotify API error: ${resp.status} ${await resp.text()}`);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

async function searchTrack(name, artist) {
  const q = encodeURIComponent(`track:${name} artist:${artist}`);
  const data = await apiRequest(`/search?type=track&q=${q}&limit=1`);
  const items = data?.tracks?.items;
  return items?.length ? items[0].uri : null;
}

async function getPlaylistTrackUris(playlistId) {
  const uris = new Set();
  let offset = 0;
  while (true) {
    const data = await apiRequest(
      `/playlists/${playlistId}/tracks?fields=items(track(uri)),next&limit=100&offset=${offset}`
    );
    for (const item of data.items) {
      if (item.track?.uri) uris.add(item.track.uri);
    }
    if (!data.next) break;
    offset += 100;
  }
  return uris;
}

async function addToPlaylist(playlistId, uris) {
  if (!uris.length) return;
  await apiRequest(`/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uris }),
  });
}

async function getPlaylistName(playlistId) {
  const data = await apiRequest(`/playlists/${playlistId}?fields=name`);
  return data?.name || "Spotify";
}

async function addRecommendationsToSpotify(recommendations) {
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
  if (!playlistId || !process.env.SPOTIFY_REFRESH_TOKEN) {
    console.log("Spotify not configured, skipping playlist update.");
    return { added: 0, playlistName: null };
  }

  // Search for each recommendation on Spotify
  const [playlistName, ...searchResults] = await Promise.all([
    getPlaylistName(playlistId),
    ...recommendations.map(async (rec) => {
      const uri = await searchTrack(rec.name, rec.artist).catch(() => null);
      return { ...rec, uri };
    }),
  ]);

  const foundUris = searchResults.filter((r) => r.uri).map((r) => r.uri);
  if (!foundUris.length) {
    console.log("No recommendations found on Spotify.");
    return { added: 0, playlistName };
  }

  // Dedupe against existing playlist tracks
  const existing = await getPlaylistTrackUris(playlistId);
  const newUris = foundUris.filter((uri) => !existing.has(uri));

  if (!newUris.length) {
    console.log("All recommendations already in playlist.");
    return { added: 0, playlistName };
  }

  await addToPlaylist(playlistId, newUris);
  return { added: newUris.length, playlistName };
}

module.exports = { addRecommendationsToSpotify };
