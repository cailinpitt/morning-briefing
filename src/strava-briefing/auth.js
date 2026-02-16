// One-time Strava OAuth2 authorization script.
// Run with: npm run strava:auth

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const http = require("http");
const fs = require("fs");
const path = require("path");

const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

async function main() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Error: Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env first.");
    process.exit(1);
  }

  const authUrl =
    `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&approval_prompt=force&scope=read,activity:read_all`;

  console.log("\nOpen this URL in your browser to authorize:\n");
  console.log(authUrl);
  console.log("\nWaiting for callback...\n");

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
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
  const resp = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Token exchange failed:", text);
    process.exit(1);
  }

  const tokens = await resp.json();
  const envPath = path.join(__dirname, "..", "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  // Update or append tokens
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

  fs.writeFileSync(envPath, envContent);
  console.log("Tokens saved to .env!");
  console.log("You can now run: npm run strava:test");
}

main().catch((err) => {
  console.error("Auth error:", err);
  process.exit(1);
});
