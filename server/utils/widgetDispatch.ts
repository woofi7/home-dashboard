import type { WidgetResult } from '../types'
import type { ServiceCredentials } from './auth'
import { fetchUnraid } from '../api/widget/unraid.get'
import { fetchPortainer } from '../api/widget/portainer.get'
import { fetchDuplicati } from '../api/widget/duplicati.get'
import { fetchHomeAssistant } from '../api/widget/homeassistant.get'
import { fetchPihole } from '../api/widget/pihole.get'
import { fetchQbittorrent } from '../api/widget/qbittorrent.get'
import { fetchAudiobookshelf } from '../api/widget/audiobookshelf.get'
import { fetchBazarr } from '../api/widget/bazarr.get'
import { fetchOverseerr } from '../api/widget/overseerr.get'
import { fetchPlex } from '../api/widget/plex.get'
import { fetchProwlarr } from '../api/widget/prowlarr.get'
import { fetchRadarr } from '../api/widget/radarr.get'
import { fetchSonarr } from '../api/widget/sonarr.get'
import { fetchReadarr } from '../api/widget/readarr.get'
import { fetchTdarr } from '../api/widget/tdarr.get'
import { fetchTraefik } from '../api/widget/traefik.get'

type Fetcher = (creds: ServiceCredentials) => Promise<WidgetResult | null>

export const WIDGETS: Record<string, Fetcher> = {
  unraid:        fetchUnraid,
  portainer:     fetchPortainer,
  duplicati:     fetchDuplicati,
  homeassistant: fetchHomeAssistant,
  pihole:        fetchPihole,
  qbittorrent:   fetchQbittorrent,
  audiobookshelf: fetchAudiobookshelf,
  bazarr:        fetchBazarr,
  overseerr:     fetchOverseerr,
  plex:          fetchPlex,
  prowlarr:      fetchProwlarr,
  radarr:        fetchRadarr,
  sonarr:        fetchSonarr,
  readarr:       fetchReadarr,
  tdarr:         fetchTdarr,
  traefik:       fetchTraefik,
}

export function fetchWidgetForService(
  type: string,
  creds: ServiceCredentials,
): Promise<WidgetResult | null> {
  return (WIDGETS[type]?.(creds) ?? Promise.resolve(null)).catch(() => null)
}
