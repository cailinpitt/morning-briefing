async function fetchNews() {
  const key = process.env.NEWSAPI_KEY;
  if (!key || key === "your_key_here") return null;

  const res = await fetch(
    `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${key}`
  );

  if (!res.ok) return null;

  const data = await res.json();
  return (data.articles || []).map((a) => a.title).filter(Boolean);
}

function printNews(printer, headlines) {
  printer.printSectionTitle("TOP HEADLINES");

  if (!headlines) {
    printer.printLine("  News unavailable.");
    return;
  }

  if (headlines.length === 0) {
    printer.printLine("  No headlines available.");
    return;
  }

  headlines.forEach((headline, i) => {
    printer.printWrapped(`  ${i + 1}. ${headline}`, 40);
    if (i < headlines.length - 1) printer.printLine();
  });
}

module.exports = { fetchNews, printNews };
