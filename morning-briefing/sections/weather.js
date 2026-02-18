const TARGET_HOURS = [9, 12, 15, 18, 21];

const CONDITION_LABELS = {
  thunderstorm: "stormy",
  drizzle: "drizzly",
  rain: "rainy",
  snow: "snowy",
  clear: "sunny",
  clouds: "cloudy",
  mist: "misty",
  fog: "foggy",
  haze: "hazy",
};

function filterHourly(list) {
  return list
    .filter((h) => TARGET_HOURS.includes(new Date(h.dt * 1000).getHours()))
    .slice(0, 5)
    .map((h) => ({
      hour: new Date(h.dt * 1000).toLocaleTimeString("en-US", { hour: "numeric" }),
      temp: Math.round(h.main?.temp ?? h.temp),
      desc: h.weather[0]?.main || "",
    }));
}

async function fetchWeather() {
  const key = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.OPENWEATHER_LAT;
  const lon = process.env.OPENWEATHER_LON;
  if (!key || key === "your_key_here") return null;

  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=imperial&exclude=minutely&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    // Fall back to 2.5 free tier
    const [fallbackRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${key}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&cnt=8&appid=${key}`).catch(() => null),
    ]);
    if (!fallbackRes.ok) {
      console.error(`Weather API error: ${fallbackRes.status} ${fallbackRes.statusText}`);
      const body = await fallbackRes.text().catch(() => "");
      if (body) console.error(body);
      return null;
    }
    const data = await fallbackRes.json();
    const fmt = { hour: "numeric", minute: "2-digit" };
    const forecast = forecastRes?.ok ? await forecastRes.json() : null;
    return {
      temp: Math.round(data.main.temp),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      description: data.weather[0]?.description || "Unknown",
      conditionCode: data.weather[0]?.id,
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString("en-US", fmt),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString("en-US", fmt),
      hourly: filterHourly(forecast?.list || []),
    };
  }

  const data = await res.json();
  const fmt = { hour: "numeric", minute: "2-digit" };
  return {
    temp: Math.round(data.current.temp),
    high: Math.round(data.daily[0].temp.max),
    low: Math.round(data.daily[0].temp.min),
    description: data.current.weather[0]?.description || "Unknown",
    conditionCode: data.current.weather[0]?.id,
    sunrise: new Date(data.current.sunrise * 1000).toLocaleTimeString("en-US", fmt),
    sunset: new Date(data.current.sunset * 1000).toLocaleTimeString("en-US", fmt),
    alerts: (data.alerts || []).map((a) => a.event),
    hourly: filterHourly((data.hourly || []).map((h) => ({
      dt: h.dt,
      main: { temp: h.temp },
      weather: h.weather,
    }))),
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
  printer.printLine(`  Sunrise: ${weather.sunrise}  Sunset: ${weather.sunset}`);
  if (weather.alerts?.length) {
    for (const alert of weather.alerts) {
      printer.printWrapped(`  ! ${alert}`, 40);
    }
  }
  if (weather.hourly?.length) {
    printer.printLine("");
    for (const h of weather.hourly) {
      const time = h.hour.padStart(5);
      const temp = `${h.temp}\xB0F`.padStart(5);
      const cond = CONDITION_LABELS[h.desc.toLowerCase()] || h.desc.toLowerCase();
      printer.printLine(`  ${time}  ${temp}  ${cond}`);
    }
  }
}

module.exports = { fetchWeather, printWeather };
