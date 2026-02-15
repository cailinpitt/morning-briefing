function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning!";
  if (hour < 17) return "Good afternoon!";
  return "Good evening!";
}

function printHeader(printer) {
  const now = new Date();
  const dateStr = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  printer.alignCenter();
  printer.printLine("*".repeat(42));
  printer.printLine();
  printer.sizeDouble();
  printer.bold(true);
  printer.printLine("DAILY BRIEFING");
  printer.sizeNormal();
  printer.bold(false);
  printer.printLine();
  printer.bold(true);
  printer.printLine(dateStr);
  printer.bold(false);
  printer.printLine(getGreeting());
  printer.printLine();
  printer.printLine("*".repeat(42));
  printer.alignLeft();
}

module.exports = { printHeader };
