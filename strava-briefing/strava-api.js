const fs = require("fs");
const path = require("path");

const BASE_URL = "https://www.strava.com/api/v3";
const ENV_PATH = path.join(__dirname, "..", ".env");

let accessToken = process.env.STRAVA_ACCESS_TOKEN;

async function refreshAccessToken() {
  const resp = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status} ${await resp.text()}`);
  }

  const tokens = await resp.json();
  accessToken = tokens.access_token;

  // Persist rotated tokens to .env
  let envContent = fs.readFileSync(ENV_PATH, "utf8");
  for (const [key, val] of [
    ["STRAVA_ACCESS_TOKEN", tokens.access_token],
    ["STRAVA_REFRESH_TOKEN", tokens.refresh_token],
  ]) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent = envContent.trimEnd() + `\n${key}=${val}\n`;
    }
  }
  fs.writeFileSync(ENV_PATH, envContent);

  // Update process.env so subsequent refreshes use new refresh token
  process.env.STRAVA_ACCESS_TOKEN = tokens.access_token;
  process.env.STRAVA_REFRESH_TOKEN = tokens.refresh_token;
}

async function apiRequest(endpoint) {
  let resp = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (resp.status === 401) {
    await refreshAccessToken();
    resp = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  if (!resp.ok) {
    throw new Error(`Strava API error: ${resp.status} ${await resp.text()}`);
  }

  return resp.json();
}

function fetchRecentActivities() {
  return apiRequest("/athlete/activities?per_page=5");
}

function fetchActivity(id) {
  return apiRequest(`/activities/${id}`);
}

function fetchActivityPhotos(id) {
  return apiRequest(`/activities/${id}/photos?size=1024&photo_sources=true`);
}

async function fetchSegmentEfforts(segmentId) {
  let page = 1;
  const all = [];
  while (true) {
    const batch = await apiRequest(`/segment_efforts?segment_id=${segmentId}&per_page=200&page=${page}`);
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }
  return all;
}

module.exports = { fetchRecentActivities, fetchActivity, fetchActivityPhotos, fetchSegmentEfforts };
