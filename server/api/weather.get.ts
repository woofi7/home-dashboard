type HourSlot = { time: string; temp: number; feels: number; code: number; description: string; icon: string; precip: number; wind: number }
type DayForecast = { date: string; tempMin: number; tempMax: number; code: number; description: string; icon: string; precip: number; wind: number }
type WeatherData = {
  city: string; temp: number; feels: number
  humidity: number; wind: number; code: number; description: string; icon: string; url: string
  laterToday: HourSlot[]
  tomorrow: DayForecast
}
import { createCache } from '../utils/cache'

const cache = createCache<WeatherData>()
const TTL = 30 * 60 * 1000

const WMO: Record<number, { desc: string; icon: string }> = {
  0:  { desc: 'Clear sky',       icon: '☀️' },
  1:  { desc: 'Mainly clear',    icon: '🌤️' },
  2:  { desc: 'Partly cloudy',   icon: '⛅' },
  3:  { desc: 'Overcast',        icon: '☁️' },
  45: { desc: 'Fog',             icon: '🌫️' },
  48: { desc: 'Icy fog',         icon: '🌫️' },
  51: { desc: 'Light drizzle',   icon: '🌦️' },
  53: { desc: 'Drizzle',         icon: '🌦️' },
  55: { desc: 'Heavy drizzle',   icon: '🌦️' },
  61: { desc: 'Light rain',      icon: '🌧️' },
  63: { desc: 'Rain',            icon: '🌧️' },
  65: { desc: 'Heavy rain',      icon: '🌧️' },
  71: { desc: 'Light snow',      icon: '❄️' },
  73: { desc: 'Snow',            icon: '❄️' },
  75: { desc: 'Heavy snow',      icon: '❄️' },
  80: { desc: 'Rain showers',    icon: '🌧️' },
  81: { desc: 'Rain showers',    icon: '🌧️' },
  82: { desc: 'Heavy showers',   icon: '🌧️' },
  95: { desc: 'Thunderstorm',    icon: '⛈️' },
  96: { desc: 'Thunderstorm',    icon: '⛈️' },
  99: { desc: 'Thunderstorm',    icon: '⛈️' },
}

function wmo(code: number) { return WMO[code] ?? { desc: 'Unknown', icon: '🌡️' } }

export default defineEventHandler(async () => {
  const hit = cache.get(TTL)
  if (hit) return hit

  const geo = await $fetch<{ city: string; regionName: string; lat: number; lon: number }>('http://ip-api.com/json')

  const weather = await $fetch<{
    current: {
      time: string
      temperature_2m: number
      apparent_temperature: number
      relative_humidity_2m: number
      wind_speed_10m: number
      weather_code: number
    }
    hourly: {
      time: string[]
      temperature_2m: number[]
      apparent_temperature: number[]
      weather_code: number[]
      precipitation_probability: number[]
      wind_speed_10m: number[]
    }
    daily: {
      time: string[]
      temperature_2m_min: number[]
      temperature_2m_max: number[]
      weather_code: number[]
      precipitation_probability_max: number[]
      wind_speed_10m_max: number[]
    }
  }>(
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${geo.lat}&longitude=${geo.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m` +
    `&daily=temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max,wind_speed_10m_max` +
    `&temperature_unit=celsius&wind_speed_unit=kmh&forecast_days=2&timezone=auto`
  )

  const c = weather.current
  const { desc, icon } = wmo(c.weather_code)

  const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const meteoUrl = `https://www.meteomedia.com/ca/weather/${slug(geo.regionName)}/${slug(geo.city)}`

  // Later today: next 6 hours, every 3h, after current time, only within today
  const nowHour = new Date(c.time).getHours()
  const todayStr = c.time.slice(0, 10)
  const laterToday: HourSlot[] = []
  for (let i = 0; i < weather.hourly.time.length && laterToday.length < 4; i++) {
    const t = weather.hourly.time[i]
    if (!t.startsWith(todayStr)) continue
    const h = new Date(t).getHours()
    if (h <= nowHour) continue
    if ((h - nowHour) % 3 !== 0 && laterToday.length > 0) continue
    const { desc: hDesc, icon: hIcon } = wmo(weather.hourly.weather_code[i])
    laterToday.push({
      time: `${String(h).padStart(2, '0')}:00`,
      temp: Math.round(weather.hourly.temperature_2m[i]),
      feels: Math.round(weather.hourly.apparent_temperature[i]),
      code: weather.hourly.weather_code[i],
      description: hDesc,
      icon: hIcon,
      precip: weather.hourly.precipitation_probability[i],
      wind: Math.round(weather.hourly.wind_speed_10m[i]),
    })
  }

  // Tomorrow: index 1 in daily
  const tmrIdx = weather.daily.time.findIndex(d => d !== todayStr)
  const tmr = tmrIdx >= 0 ? {
    date: weather.daily.time[tmrIdx],
    tempMin: Math.round(weather.daily.temperature_2m_min[tmrIdx]),
    tempMax: Math.round(weather.daily.temperature_2m_max[tmrIdx]),
    code: weather.daily.weather_code[tmrIdx],
    description: wmo(weather.daily.weather_code[tmrIdx]).desc,
    icon: wmo(weather.daily.weather_code[tmrIdx]).icon,
    precip: weather.daily.precipitation_probability_max[tmrIdx],
    wind: Math.round(weather.daily.wind_speed_10m_max[tmrIdx]),
  } : null

  const data: WeatherData = {
    city: geo.city,
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    wind: Math.round(c.wind_speed_10m),
    code: c.weather_code,
    description: desc,
    icon,
    url: meteoUrl,
    laterToday,
    tomorrow: tmr as DayForecast,
  }

  return cache.set(data)
})
