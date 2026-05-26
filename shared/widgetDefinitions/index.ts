import type { WidgetDefinition } from './types'
import asf from './asf'
import audiobookshelf from './audiobookshelf'
import backrest from './backrest'
import bazarr from './bazarr'
import beszel from './beszel'
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
import restic from './restic'
import sonarr from './sonarr'
import tdarr from './tdarr'
import traefik from './traefik'
import tugtainer from './tugtainer'
import unraid from './unraid'
import uptimekuma from './uptimekuma'

export const widgetDefinitions: Record<string, WidgetDefinition> = {
  asf,
  backrest,
  audiobookshelf,
  bazarr,
  beszel,
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
  restic,
  sonarr,
  tdarr,
  traefik,
  tugtainer,
  unraid,
  uptimekuma,
}
