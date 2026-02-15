// One-time Google Calendar OAuth2 authorization script.
// Run with: node src/auth.js
// This opens a browser for consent, captures the auth code,
// and prints the refresh token to add to your .env file.

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const http = require("http");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || clientId === "your_client_id_here") {
    console.error("Error: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

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

  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    console.error("Error: No refresh token received. Try revoking access and running again.");
    process.exit(1);
  }

  // Update .env file with the refresh token
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(
    /^GOOGLE_REFRESH_TOKEN=.*$/m,
    `GOOGLE_REFRESH_TOKEN=${refreshToken}`
  );
  fs.writeFileSync(envPath, envContent);

  console.log("Refresh token saved to .env!");
  console.log("You can now run: npm start");
}

main().catch((err) => {
  console.error("Auth error:", err);
  process.exit(1);
});
