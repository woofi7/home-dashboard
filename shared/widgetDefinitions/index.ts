import type { WidgetDefinition } from './types'
import audiobookshelf from './audiobookshelf'
import bazarr from './bazarr'
import duplicati from './duplicati'
import homeassistant from './homeassistant'
import overseerr from './overseerr'
import pihole from './pihole'
import plex from './plex'
import portainer from './portainer'
import prowlarr from './prowlarr'
import qbittorrent from './qbittorrent'
import radarr from './radarr'
import readarr from './readarr'
import sonarr from './sonarr'
import tdarr from './tdarr'
import traefik from './traefik'
import unraid from './unraid'

export const widgetDefinitions: Record<string, WidgetDefinition> = {
  audiobookshelf,
  bazarr,
  duplicati,
  homeassistant,
  overseerr,
  pihole,
  plex,
  portainer,
  prowlarr,
  qbittorrent,
  radarr,
  readarr,
  sonarr,
  tdarr,
  traefik,
  unraid,
}
