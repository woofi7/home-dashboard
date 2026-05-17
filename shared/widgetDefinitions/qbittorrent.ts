import type { WidgetDefinition } from './types'

export default {
  name: 'qBittorrent',
  authType: 'basic',
  fields: [
    { label: 'Total', desc: 'Total torrents' },
    { label: 'Active', desc: 'Active torrents' },
    { label: 'DL Speed', desc: 'Download speed' },
    { label: 'UL Speed', desc: 'Upload speed' },
  ],
} satisfies WidgetDefinition
