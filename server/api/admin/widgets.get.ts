export type WidgetEntry = {
  type: string
  name: string
  authType: string
  displayLabels: string[]
}

const WIDGET_ENTRIES: WidgetEntry[] = [
  { type: 'audiobookshelf', name: 'Audiobookshelf', authType: 'bearer',   displayLabels: ['Audiobooks', 'Authors', 'Duration', 'Size'] },
  { type: 'bazarr',         name: 'Bazarr',         authType: 'header',   displayLabels: ['Missing episodes', 'Missing movies', 'Providers'] },
  { type: 'duplicati',      name: 'Duplicati',      authType: 'password', displayLabels: ['Last backup', 'Jobs', 'Active', 'Source', 'Dest'] },
  { type: 'homeassistant',  name: 'Home Assistant', authType: 'bearer',   displayLabels: ['Entities', 'Automations', 'Lights', 'Switches', 'Sensors', 'Climate', 'Media players', 'Scenes'] },
  { type: 'overseerr',      name: 'Overseerr',      authType: 'header',   displayLabels: ['Requests', 'Pending', 'Approved', 'Available', 'Processing', 'Media'] },
  { type: 'pihole',         name: 'Pi-hole',        authType: 'password', displayLabels: ['Queries', 'Blocked', 'Forwarded', 'Cached', 'Domains', 'Recent blocked'] },
  { type: 'plex',           name: 'Plex',           authType: 'query',    displayLabels: ['Movies', 'Shows', 'Streams'] },
  { type: 'portainer',      name: 'Portainer',      authType: 'bearer',   displayLabels: ['Running', 'Stopped', 'Containers', 'Stacks', 'Volumes', 'Images'] },
  { type: 'prowlarr',       name: 'Prowlarr',       authType: 'query',    displayLabels: ['Indexers', 'Grabs', 'Queries', 'Failures'] },
  { type: 'qbittorrent',    name: 'qBittorrent',    authType: 'basic',    displayLabels: ['DL Speed', 'UL Speed', 'Active', 'Total'] },
  { type: 'radarr',         name: 'Radarr',         authType: 'query',    displayLabels: ['Movies', 'Downloaded', 'Queued', 'Missing'] },
  { type: 'readarr',        name: 'Readarr',        authType: 'query',    displayLabels: ['Books', 'Missing', 'Authors', 'Queue'] },
  { type: 'sonarr',         name: 'Sonarr',         authType: 'query',    displayLabels: ['Series', 'Monitored', 'Queued', 'Wanted', 'Cutoff unmet'] },
  { type: 'tdarr',          name: 'Tdarr',          authType: 'none',     displayLabels: ['Files', 'Done', 'Score'] },
  { type: 'traefik',        name: 'Traefik',        authType: 'basic',    displayLabels: ['Routers', 'Services', 'Middlewares'] },
  { type: 'unraid',         name: 'Unraid',         authType: 'header',   displayLabels: ['Array', 'Used', 'Disks', 'Parity', 'CPU', 'Memory'] },
]

export default defineEventHandler((): WidgetEntry[] => WIDGET_ENTRIES)
