import { loadConfig } from '../utils/config'
import { createCache } from '../utils/cache'

type HourSlot = { time: string; temp: number; feels: number; code: number; description: string; icon: string; precip: number; wind: number }
type DayForecast = { date: string; tempMin: number; tempMax: number; code: number; description: string; icon: string; precip: number; wind: number }
type WeatherConfig = {
  locationMode?: 'ip' | 'custom'
  location?: { name?: string; lat?: number; lon?: number; admin1?: string; countryCode?: string }
  units?: 'celsius' | 'fahrenheit'
  display?: { feelsLike?: boolean; humidity?: boolean; wind?: boolean; laterToday?: boolean; tomorrow?: boolean }
}
type WeatherData = {
  city: string; temp: number; feels: number
  humidity: number; wind: number; code: number; description: string; icon: string; url: string
  unit: string
  display: { feelsLike: boolean; humidity: boolean; wind: boolean; laterToday: boolean; tomorrow: boolean }
  laterToday: HourSlot[]
  tomorrow: DayForecast | null
}

export const weatherCache = createCache<WeatherData>()
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
  const hit = weatherCache.get()
  if (hit)
    return hit

  const settings = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  const cfg = (settings.weather as WeatherConfig | undefined) ?? {}
  const locationMode = cfg.locationMode ?? 'ip'
  const units = cfg.units ?? 'celsius'
  const display = {
    feelsLike:  cfg.display?.feelsLike  ?? true,
    humidity:   cfg.display?.humidity   ?? true,
    wind:       cfg.display?.wind       ?? true,
    laterToday: cfg.display?.laterToday ?? true,
    tomorrow:   cfg.display?.tomorrow   ?? true,
  }
  const windUnit = units === 'fahrenheit' ? 'mph' : 'kmh'
  const unitLabel = units === 'fahrenheit' ? 'F' : 'C'

  let lat: number
  let lon: number
  let cityName: string
  let province: string | undefined
  let countryCode: string | undefined

  if (locationMode === 'custom' && cfg.location?.lat != null && cfg.location?.lon != null) {
    lat = cfg.location.lat
    lon = cfg.location.lon
    cityName = cfg.location.name?.split(',')[0]?.trim() ?? `${lat}, ${lon}`
    province = cfg.location.admin1
    countryCode = cfg.location.countryCode
  } else {
    const geo = await $fetch<{ city: string; regionName: string; lat: number; lon: number; countryCode: string }>('http://ip-api.com/json')
    lat = geo.lat
    lon = geo.lon
    cityName = geo.city
    province = geo.regionName
    countryCode = geo.countryCode.toLowerCase()
  }

  type WeatherResponse = {
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
  }

  const weatherQuery =
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m` +
    `&daily=temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max,wind_speed_10m_max` +
    `&temperature_unit=${units}&wind_speed_unit=${windUnit}&forecast_days=2&timezone=auto`

  const openMeteoHosts = ['api.open-meteo.com', 'api1.open-meteo.com', 'api2.open-meteo.com']
  let weather: WeatherResponse | undefined
  let lastError: unknown
  for (const host of openMeteoHosts) {
    try {
      weather = await $fetch<WeatherResponse>(`https://${host}/v1/forecast${weatherQuery}`)
      break
    } catch (e) {
      lastError = e
    }
  }
  if (!weather)
    throw lastError

  const c = weather.current
  const { desc, icon } = wmo(c.weather_code)

  const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const meteoUrl = (province && countryCode)
    ? `https://www.meteomedia.com/fr/ville/${countryCode}/${slug(province)}/${slug(cityName)}/actuelle`
    : `https://www.meteomedia.com/fr/meteo/${slug(cityName)}`

  const nowHour = new Date(c.time).getHours()
  const todayStr = c.time.slice(0, 10)
  const laterToday: HourSlot[] = []
  if (display.laterToday) {
    for (let i = 0; i < weather.hourly.time.length && laterToday.length < 4; i++) {
      const t = weather.hourly.time[i]!
      if (!t.startsWith(todayStr))
        continue
      const h = new Date(t).getHours()
      if (h <= nowHour)
        continue
      if ((h - nowHour) % 3 !== 0 && laterToday.length > 0)
        continue
      const code = weather.hourly.weather_code[i]!
      const { desc: hDesc, icon: hIcon } = wmo(code)
      laterToday.push({
        time: `${String(h).padStart(2, '0')}:00`,
        temp: Math.round(weather.hourly.temperature_2m[i]!),
        feels: Math.round(weather.hourly.apparent_temperature[i]!),
        code,
        description: hDesc,
        icon: hIcon,
        precip: weather.hourly.precipitation_probability[i]!,
        wind: Math.round(weather.hourly.wind_speed_10m[i]!),
      })
    }
  }

  let tomorrow: DayForecast | null = null
  if (display.tomorrow) {
    const tmrIdx = weather.daily.time.findIndex(d => d !== todayStr)
    if (tmrIdx >= 0) {
      tomorrow = {
        date: weather.daily.time[tmrIdx]!,
        tempMin: Math.round(weather.daily.temperature_2m_min[tmrIdx]!),
        tempMax: Math.round(weather.daily.temperature_2m_max[tmrIdx]!),
        code: weather.daily.weather_code[tmrIdx]!,
        description: wmo(weather.daily.weather_code[tmrIdx]!).desc,
        icon: wmo(weather.daily.weather_code[tmrIdx]!).icon,
        precip: weather.daily.precipitation_probability_max[tmrIdx]!,
        wind: Math.round(weather.daily.wind_speed_10m_max[tmrIdx]!),
      }
    }
  }

  const data: WeatherData = {
    city: cityName,
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    wind: Math.round(c.wind_speed_10m),
    code: c.weather_code,
    description: desc,
    icon,
    url: meteoUrl,
    unit: unitLabel,
    display,
    laterToday,
    tomorrow,
  }

  return weatherCache.set(data, TTL)
})
