import type { WidgetDefinition } from './types'

export default {
  name: 'Overseerr',
  authType: 'header',
  fields: [
    { label: 'Requests', desc: 'Total requests' },
    { label: 'Pending', desc: 'Pending requests' },
    { label: 'Approved', desc: 'Approved requests' },
    { label: 'Available', desc: 'Available / fulfilled' },
    { label: 'Processing', desc: 'Currently processing' },
    { label: 'Media', desc: 'Total media items' },
  ],
} satisfies WidgetDefinition
