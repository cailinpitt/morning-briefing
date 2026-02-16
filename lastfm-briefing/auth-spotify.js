// One-time Spotify OAuth2 authorization script.
// Run with: npm run spotify:auth

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const http = require("http");
const fs = require("fs");
const path = require("path");

const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;

async function main() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log("\nSpotify setup instructions:");
    console.log("1. Go to https://developer.spotify.com/dashboard, create an app");
    console.log(`2. Set redirect URI to ${REDIRECT_URI}`);
    console.log("3. Copy Client ID and Client Secret to .env:");
    console.log("   SPOTIFY_CLIENT_ID=...");
    console.log("   SPOTIFY_CLIENT_SECRET=...");
    console.log("4. Create an empty playlist in Spotify, copy its ID to .env:");
    console.log("   SPOTIFY_PLAYLIST_ID=...");
    console.log("5. Run: npm run spotify:auth\n");
    process.exit(1);
  }

  const scopes = "playlist-modify-private playlist-modify-public";
  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${clientId}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}`;

  console.log("\nOpen this URL in your browser to authorize:\n");
  console.log(authUrl);
  console.log("\nWaiting for callback...\n");

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${REDIRECT_PORT}`);
      if (url.pathname === "/callback") {
        const authCode = url.searchParams.get("code");
        if (authCode) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<h1>Authorization successful!</h1><p>You can close this tab.</p>");
          server.close();
          resolve(authCode);
        } else {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>Error: No code received</h1>");
          server.close();
          reject(new Error("No auth code in callback"));
        }
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Listening on port ${REDIRECT_PORT} for OAuth callback...`);
    });
  });

  // Exchange code for tokens
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Token exchange failed:", text);
    process.exit(1);
  }

  const tokens = await resp.json();
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  for (const [key, val] of [
    ["SPOTIFY_ACCESS_TOKEN", tokens.access_token],
    ["SPOTIFY_REFRESH_TOKEN", tokens.refresh_token],
  ]) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent = envContent.trimEnd() + `\n${key}=${val}\n`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log("Tokens saved to .env!");
  console.log("You can now run: npm run lastfm");
}

main().catch((err) => {
  console.error("Auth error:", err);
  process.exit(1);
});
