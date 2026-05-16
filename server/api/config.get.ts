import { loadConfig } from '../utils/config'

type Settings = Record<string, unknown>
type ServiceGroup = { name: string; services: unknown[] }
type BookmarkGroup = { name: string; bookmarks: unknown[] }
type Widget = Record<string, unknown>

export default defineEventHandler(() => {
  return {
    settings: loadConfig<Settings>('settings.yaml') ?? {},
    services: loadConfig<ServiceGroup[]>('services.yaml') ?? [],
    bookmarks: loadConfig<BookmarkGroup[]>('bookmarks.yaml') ?? [],
    widgets: loadConfig<Widget[]>('widgets.yaml') ?? [],
  }
})
