import type { WidgetDefinition } from './types'

export default {
  name: 'Pi-hole',
  authType: 'password',
  fields: [
    { label: 'Queries', desc: 'Total DNS queries' },
    { label: 'Blocked', desc: 'Blocked queries + %' },
    { label: 'Forwarded', desc: 'Forwarded queries' },
    { label: 'Cached', desc: 'Cached responses' },
    { label: 'Domains', desc: 'Unique domains seen' },
    { label: 'Recent blocked', desc: 'Last blocked domain' },
  ],
} satisfies WidgetDefinition
