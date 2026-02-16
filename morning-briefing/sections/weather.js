async function fetchWeather() {
  const key = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.OPENWEATHER_LAT;
  const lon = process.env.OPENWEATHER_LON;
  if (!key || key === "your_key_here") return null;

  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=imperial&exclude=minutely,hourly,alerts&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    // Fall back to 2.5 free tier
    const fallbackUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${key}`;
    const fallbackRes = await fetch(fallbackUrl);
    if (!fallbackRes.ok) {
      console.error(`Weather API error: ${fallbackRes.status} ${fallbackRes.statusText}`);
      const body = await fallbackRes.text().catch(() => "");
      if (body) console.error(body);
      return null;
    }
    const data = await fallbackRes.json();
    return {
      temp: Math.round(data.main.temp),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      description: data.weather[0]?.description || "Unknown",
      conditionCode: data.weather[0]?.id,
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }

  const data = await res.json();
  return {
    temp: Math.round(data.current.temp),
    high: Math.round(data.daily[0].temp.max),
    low: Math.round(data.daily[0].temp.min),
    description: data.current.weather[0]?.description || "Unknown",
    conditionCode: data.current.weather[0]?.id,
    sunset: new Date(data.current.sunset * 1000).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function printWeather(printer, weather) {
  printer.printSectionTitle("WEATHER");

  if (!weather) {
    printer.printLine("  Weather data unavailable.");
    return;
  }

  printer.bold(true);
  printer.sizeDoubleHeight();
  printer.printLine(`  ${weather.temp}\xB0F`);
  printer.sizeNormal();
  printer.bold(false);

  printer.printLine(`  ${weather.description}`);
  printer.printLine(`  High: ${weather.high}\xB0F  Low: ${weather.low}\xB0F`);
  printer.printLine(`  Sunset: ${weather.sunset}`);
}

module.exports = { fetchWeather, printWeather };
