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
      if (!item?.title) return null;
      return {
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${id}`,
      };
    })
  );

  return stories.filter(Boolean);
}

async function fetchVerge() {
  // The Verge RSS feed
  const res = await fetch("https://www.theverge.com/rss/index.xml");
  if (!res.ok) return [];

  const xml = await res.text();
  const items = [];
  // Match each <entry> block to extract title and link together
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;
  while ((entryMatch = entryRegex.exec(xml)) !== null && items.length < 5) {
    const entry = entryMatch[1];
    const titleMatch = entry.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/);
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/);
    const title = titleMatch
      ? titleMatch[1]
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .trim()
      : null;
    const url = linkMatch ? linkMatch[1] : null;
    if (title) items.push({ title, url });
  }
  return items;
}

async function fetchArs() {
  const res = await fetch("https://feeds.arstechnica.com/arstechnica/index");
  if (!res.ok) return [];

  const xml = await res.text();
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
    const entry = match[1];
    const titleMatch = entry.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/);
    const linkMatch = entry.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/);
    const title = titleMatch
      ? titleMatch[1]
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .trim()
      : null;
    const url = linkMatch ? linkMatch[1].trim() : null;
    if (title) items.push({ title, url });
  }
  return items;
}

async function fetchNews() {
  const [hn, verge, ars] = await Promise.all([
    fetchHackerNews().catch(() => []),
    fetchVerge().catch(() => []),
    fetchArs().catch(() => []),
  ]);

  return { hn, verge, ars };
}

async function printNews(printer, news) {
  if (!news) {
    printer.printSectionTitle("NEWS");
    printer.printLine("  News unavailable.");
    return;
  }

  async function printArticles(items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      printer.printWrapped(`  ${i + 1}. ${item.title}`, 40);
      if (i < items.length - 1) printer.printLine();
    }
  }

  if (news.hn.length > 0) {
    printer.printSectionTitle("HACKER NEWS");
    await printArticles(news.hn);
  }

  if (news.verge.length > 0) {
    printer.printSectionTitle("THE VERGE");
    await printArticles(news.verge);
  }

  if (news.ars.length > 0) {
    printer.printSectionTitle("ARS TECHNICA");
    await printArticles(news.ars);
  }

  if (news.hn.length === 0 && news.verge.length === 0 && news.ars.length === 0) {
    printer.printSectionTitle("NEWS");
    printer.printLine("  No headlines available.");
  }
}

module.exports = { fetchNews, printNews };
