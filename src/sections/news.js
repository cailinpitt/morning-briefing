async function fetchHackerNews() {
  const res = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json"
  );
  if (!res.ok) return [];

  const ids = await res.json();
  const top5 = ids.slice(0, 5);

  const stories = await Promise.all(
    top5.map(async (id) => {
      const r = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      );
      if (!r.ok) return null;
      const item = await r.json();
      return item?.title || null;
    })
  );

  return stories.filter(Boolean);
}

async function fetchVerge() {
  // The Verge RSS feed
  const res = await fetch("https://www.theverge.com/rss/index.xml");
  if (!res.ok) return [];

  const xml = await res.text();
  const titles = [];
  const regex = /<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/g;
  let match;
  // Skip the first match (feed title)
  regex.exec(xml);
  while ((match = regex.exec(xml)) !== null && titles.length < 5) {
    const title = match[1]
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();
    if (title) titles.push(title);
  }
  return titles;
}

async function fetchNews() {
  const [hn, verge] = await Promise.all([
    fetchHackerNews().catch(() => []),
    fetchVerge().catch(() => []),
  ]);

  return { hn, verge };
}

function printNews(printer, news) {
  if (!news) {
    printer.printSectionTitle("NEWS");
    printer.printLine("  News unavailable.");
    return;
  }

  if (news.hn.length > 0) {
    printer.printSectionTitle("HACKER NEWS");
    news.hn.forEach((headline, i) => {
      printer.printWrapped(`  ${i + 1}. ${headline}`, 40);
      if (i < news.hn.length - 1) printer.printLine();
    });
  }

  if (news.verge.length > 0) {
    printer.printSectionTitle("THE VERGE");
    news.verge.forEach((headline, i) => {
      printer.printWrapped(`  ${i + 1}. ${headline}`, 40);
      if (i < news.verge.length - 1) printer.printLine();
    });
  }

  if (news.hn.length === 0 && news.verge.length === 0) {
    printer.printSectionTitle("NEWS");
    printer.printLine("  No headlines available.");
  }
}

module.exports = { fetchNews, printNews };
