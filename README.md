# briefings

Receipt printer scripts for Epson TM-T20III. Runs on a Raspberry Pi.

## Setup

```
npm install
cp .env.example .env  # then fill in your values
```

### Environment variables

```
# Printer
PRINTER_DEVICE=/dev/usb/lp0

# Morning briefing
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
OPENWEATHER_API_KEY=
OPENWEATHER_LAT=
OPENWEATHER_LON=
TODOIST_API_TOKEN=

# Strava briefing
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_ACCESS_TOKEN=
STRAVA_REFRESH_TOKEN=
```

## Morning briefing

Prints weather, calendar events, todos, and news headlines.

### Auth

Google Calendar requires a one-time OAuth flow:

1. Create a project in Google Cloud Console, enable the Calendar API, and create OAuth credentials
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
3. Run `npm run auth`
4. Open the printed URL in a browser and authorize
5. The refresh token is saved to `.env` automatically

Google's refresh tokens don't expire or rotate. The `googleapis` library handles access token refresh automatically on every request. No manual re-auth needed.

### Run

```
npm run morning          # print to receipt printer
npm run morning:test     # ASCII output to terminal
```

### Example output

```
+--------------------------------------------+
| ****************************************** |
|                                            |
|              DAILY BRIEFING                |
|                                            |
|           SUNDAY, FEB 15, 2026             |
|               Good morning!                |
|                                            |
| ****************************************** |
|                                            |
| WEATHER                                    |
| ------------------------------------------ |
|   44F                                      |
|   clear sky                                |
|   High: 45F  Low: 38F                      |
|   Sunset: 5:23 PM                          |
|                                            |
| CALENDAR                                   |
| ------------------------------------------ |
|   8:30 PM                                  |
|     Jazz                                   |
|                                            |
| TODAY'S TASKS                              |
| ------------------------------------------ |
|   No tasks for today!                      |
|                                            |
| HACKER NEWS                                |
| ------------------------------------------ |
| 1. I'm joining OpenAI                      |
|                                            |
| 2. Magnus Carlsen Wins the Freestyle       |
| (Chess960) World Championship              |
|                                            |
| 3. Pink noise reduces REM sleep and may    |
| harm sleep quality                         |
|                                            |
|                                            |
|             Have a great day!              |
|                                            |
+--------------------------------------------+
 \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/
```

## Strava briefing

Checks for new Strava activities and prints a summary. Bike rides and walks get a route map rendered from the GPS polyline. Weight training sessions get Hevy workout photos. Segments show PR badges and time comparisons.

### Auth

1. Go to https://www.strava.com/settings/api and create an application
2. Set "Authorization Callback Domain" to `localhost`
3. Set `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` in `.env`
4. Run `npm run strava:auth`
5. Open the printed URL in a browser and authorize
6. Access and refresh tokens are saved to `.env` automatically

Access tokens expire every 6 hours. The script automatically refreshes them using the refresh token and saves the new tokens to `.env`. No manual re-auth needed.

### Run

```
npm run strava           # print new activities to receipt printer
npm run strava:test      # ASCII output to terminal
npm run strava:test -- --id <activity_id>  # print a specific activity
```

On first run, it prints the most recent activity and marks the rest as seen. Subsequent runs only print new activities. Seen activity IDs are tracked in `.seen-activities`.

### Example output

```
+--------------------------------------------+
|                  STRAVA                    |
|                   RIDE                     |
|           Sun, Feb 15, 11:41 AM            |
|                                            |
| Top 10 "never kill yourself" days          |
| ------------------------------------------ |
| Distance ......................... 27.9 mi |
| Moving Time ........................ 2h 2m |
| Avg Speed ....................... 13.6 mph |
| Max Speed ....................... 21.7 mph |
| Avg Power .......................... 179 W |
| Elevation ......................... 177 ft |
|                                            |
|                 [route map]                |
|                                            |
| Segments                                   |
| ------------------------------------------ |
| MapQuest                                   |
|   1m 38s  |  0.49 mi                       |
|   +16s from top 3                          |
| Parasamgate - Chaotic Evil * 2nd           |
|   47s  |  0.20 mi                          |
| Lincoln: Belmont -> Irving ** PR!          |
|   5m 40s  |  1.13 mi                       |
|                                            |
| 0.37 new miles -- From Wandrer             |
|                                            |
|                 [QR code]                  |
|                                            |
+--------------------------------------------+
 \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/
```

## Test mode

Both scripts accept `--test` to print ASCII receipts to the terminal instead of the printer.
