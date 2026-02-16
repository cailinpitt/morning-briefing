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
PARCEL_API_KEY=

# Strava briefing
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_ACCESS_TOKEN=
STRAVA_REFRESH_TOKEN=

# Last.fm briefing
LASTFM_API_KEY=
LASTFM_USERNAME=
```

## Morning briefing

Prints weather, calendar events, todos, news headlines, and active parcel shipments.

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

Checks for new Strava activities and prints a summary. Bike rides and walks get a route map rendered from the GPS polyline. Weight training sessions get Hevy workout photos. Segments show PR badges and time comparisons. Activity descriptions and kudos counts are included when available.

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

## Last.fm briefing

Prints a weekly music listening summary: total scrobbles with week-over-week comparison, top artists, albums, tracks, and genres. Includes track recommendations based on your listening history, sourced from artists you haven't listened to before.

### Setup

1. Go to https://www.last.fm/api/account/create and create an application
2. Set `LASTFM_API_KEY` and `LASTFM_USERNAME` in `.env`

No OAuth needed — Last.fm's read endpoints just use an API key and username.

### Run

```
npm run lastfm           # print to receipt printer
npm run lastfm:test      # ASCII output to terminal
```

### Example output

```
+--------------------------------------------+
|                  LAST.FM                   |
|              WEEKLY REPORT                 |
|              Feb 9 - Feb 16               |
|                                            |
| Total Scrobbles                            |
| ------------------------------------------ |
|                   593                      |
|          +6% from last week (559)          |
|                                            |
| Top Artists                                |
| ------------------------------------------ |
| 1. Turnstile .......................... 44 |
| 2. provoker ........................... 27 |
| 3. Wet Leg ............................ 24 |
| 4. Moon Tide Gallery .................. 21 |
| 5. Casino Hearts ...................... 15 |
|                                            |
| Top Albums                                 |
| ------------------------------------------ |
| 1. NEVER ENOUGH ....................... 43 |
|    Turnstile                               |
| 2. Mausoleum .......................... 27 |
|    provoker                                |
| 3. moisturizer ........................ 24 |
|    Wet Leg                                 |
|                                            |
| Top Tracks                                 |
| ------------------------------------------ |
| 1. Down ............................... 11 |
|    Triathalon                              |
| 2. What Happened ....................... 8 |
|    Moon Tide Gallery                       |
| 3. A Dream Goes On Forever ............. 8 |
|    Vegyn                                   |
|                                            |
| Top Genres                                 |
| ------------------------------------------ |
| 1. post-punk                               |
| 2. darkwave                                |
| 3. coldwave                                |
|                                            |
| Recommended                                |
| ------------------------------------------ |
| 1. Here It Comes Again                     |
|    Sports Team                             |
|    via Famous                              |
| 2. Camel Crew                              |
|    Sports Team                             |
|    via Famous                              |
|                                            |
|                 [QR code]                  |
|                                            |
+--------------------------------------------+
 \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/
```

## Test mode

All scripts accept `--test` to print ASCII receipts to the terminal instead of the printer.
