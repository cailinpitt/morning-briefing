const HEADERS = {
  "User-Agent": `morning-briefing/1.0 (username: ${process.env.CHESS_USERNAME})`,
};

function gameDuration(game) {
  const tcMatch = game.pgn?.match(/\[TimeControl "(\d+)(?:\+(\d+))?"\]/);
  if (!tcMatch) return 0;
  const initial = parseInt(tcMatch[1]);
  const increment = parseInt(tcMatch[2] || 0);

  const clocks = [...(game.pgn?.matchAll(/\[%clk (\d+):(\d+):(\d+)\]/g) || [])];
  if (clocks.length < 2) return 0;

  const toSecs = (m) => parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);

  // Even-indexed annotations are white's clock, odd are black's
  const lastWhite = toSecs(clocks[clocks.length % 2 === 0 ? clocks.length - 2 : clocks.length - 1]);
  const lastBlack = toSecs(clocks[clocks.length % 2 === 0 ? clocks.length - 1 : clocks.length - 2]);
  const whiteMoves = Math.ceil(clocks.length / 2);
  const blackMoves = Math.floor(clocks.length / 2);

  const whiteUsed = initial + whiteMoves * increment - lastWhite;
  const blackUsed = initial + blackMoves * increment - lastBlack;
  return Math.max(0, whiteUsed + blackUsed);
}

async function fetchChess() {
  const username = process.env.CHESS_USERNAME;
  if (!username) return null;

  const [statsRes, gamesRes] = await Promise.all([
    fetch(`https://api.chess.com/pub/player/${username}/stats`, { headers: HEADERS }),
    fetchYesterdayGames(username),
  ]);

  if (!statsRes.ok) return null;
  const stats = await statsRes.json();
  const blitz = stats.chess_blitz?.last?.rating || null;

  const { games, prevRating } = gamesRes;
  const ratingChange = blitz && prevRating ? blitz - prevRating : null;

  let wins = 0, losses = 0, draws = 0, totalSeconds = 0;
  for (const g of games) {
    const isWhite = g.white.username.toLowerCase() === username;
    const result = isWhite ? g.white.result : g.black.result;
    if (result === "win") wins++;
    else if (["draw", "stalemate", "repetition", "agreed", "insufficient", "timevsinsufficient", "50move"].includes(result)) draws++;
    else losses++;
    totalSeconds += gameDuration(g);
  }

  return {
    blitzRating: blitz,
    ratingChange,
    gamesPlayed: games.length,
    wins,
    losses,
    draws,
    playMinutes: Math.round(totalSeconds / 60),
  };
}

async function fetchYesterdayGames(username) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const yStr = yesterday.toISOString().split("T")[0];

  const res = await fetch(
    `https://api.chess.com/pub/player/${username}/games/${year}/${month}`,
    { headers: HEADERS },
  );
  if (!res.ok) return { games: [], prevRating: null };

  const data = await res.json();
  const allGames = data.games || [];

  const yesterdayGames = allGames.filter(
    (g) => new Date(g.end_time * 1000).toISOString().split("T")[0] === yStr,
  );

  // Find last blitz game before yesterday to get previous rating
  let prevRating = null;
  const beforeYesterday = allGames.filter(
    (g) =>
      g.time_class === "blitz" &&
      new Date(g.end_time * 1000).toISOString().split("T")[0] < yStr,
  );

  if (beforeYesterday.length) {
    const last = beforeYesterday[beforeYesterday.length - 1];
    const isWhite = last.white.username.toLowerCase() === username;
    prevRating = isWhite ? last.white.rating : last.black.rating;
  } else if (yesterday.getDate() <= 2) {
    // Check previous month if we're early in the month
    const prevMonth = new Date(yesterday);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const py = prevMonth.getFullYear();
    const pm = String(prevMonth.getMonth() + 1).padStart(2, "0");
    try {
      const prevRes = await fetch(
        `https://api.chess.com/pub/player/${username}/games/${py}/${pm}`,
        { headers: HEADERS },
      );
      if (prevRes.ok) {
        const prevData = await prevRes.json();
        const prevBlitz = (prevData.games || []).filter((g) => g.time_class === "blitz");
        if (prevBlitz.length) {
          const last = prevBlitz[prevBlitz.length - 1];
          const isWhite = last.white.username.toLowerCase() === username;
          prevRating = isWhite ? last.white.rating : last.black.rating;
        }
      }
    } catch {
      // skip
    }
  }

  return { games: yesterdayGames, prevRating };
}

function printChess(printer, chess) {
  printer.printSectionTitle("CHESS.COM");

  if (!chess) {
    printer.printLine("  Chess data unavailable.");
    return;
  }

  printer.bold(true);
  printer.sizeDoubleHeight();
  let ratingLine = `  ${chess.blitzRating}`;
  if (chess.ratingChange != null && chess.ratingChange !== 0) {
    const sign = chess.ratingChange > 0 ? "+" : "";
    ratingLine += ` (${sign}${chess.ratingChange})`;
  }
  printer.printLine(ratingLine);
  printer.sizeNormal();
  printer.bold(false);
  printer.printLine("  Blitz rating");

  if (chess.gamesPlayed > 0) {
    printer.printLine("");
    let timePlayed = "";
    if (chess.playMinutes >= 60) {
      const hrs = Math.floor(chess.playMinutes / 60);
      const mins = chess.playMinutes % 60;
      timePlayed = mins > 0 ? ` (${hrs}h ${mins}m)` : ` (${hrs}h)`;
    } else if (chess.playMinutes > 0) {
      timePlayed = ` (${chess.playMinutes}m)`;
    }
    printer.printLine(`  Yesterday: ${chess.gamesPlayed} games${timePlayed}`);
    printer.printLine(`  W: ${chess.wins}  L: ${chess.losses}  D: ${chess.draws}`);
  } else {
    printer.printLine("");
    printer.printLine("  No games yesterday.");
  }
}

module.exports = { fetchChess, printChess };
