import { loadConfig } from '../../utils/config'

type WeatherConfig = {
  locationMode: 'ip' | 'custom'
  location: { name?: string; lat?: number; lon?: number }
  units: 'celsius' | 'fahrenheit'
  display: {
    feelsLike: boolean
    humidity: boolean
    wind: boolean
    laterToday: boolean
    tomorrow: boolean
  }
}

export default defineEventHandler((): WeatherConfig => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  const w = (settings.weather as Partial<WeatherConfig> | undefined) ?? {}
  return {
    locationMode: w.locationMode ?? 'ip',
    location: w.location ?? {},
    units: w.units ?? 'celsius',
    display: {
      feelsLike:  w.display?.feelsLike  ?? true,
      humidity:   w.display?.humidity   ?? true,
      wind:       w.display?.wind       ?? true,
      laterToday: w.display?.laterToday ?? true,
      tomorrow:   w.display?.tomorrow   ?? true,
    },
  }
})
