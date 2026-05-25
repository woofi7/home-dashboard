import type { WidgetDefinition } from './types'

export default {
  name: 'Uptime Kuma',
  authType: 'bearer',
  fields: [
    { label: 'Monitors',       desc: 'Total monitors' },
    { label: 'Up',             desc: 'Monitors currently up' },
    { label: 'Down',           desc: 'Monitors currently down' },
    { label: 'Down Services',  desc: 'Names of monitors currently down' },
    { label: 'Pending',        desc: 'Monitors in pending state' },
    { label: 'Maintenance',    desc: 'Monitors in maintenance state' },
    { label: 'Uptime 1d',     desc: 'Average uptime ratio over last 24 h (%)' },
    { label: 'Uptime 30d',    desc: 'Average uptime ratio over last 30 days (%)' },
    { label: 'Uptime 1y',     desc: 'Average uptime ratio over last 365 days (%)' },
    { label: 'Avg Ping',      desc: 'Average response time over last 24 h (ms)' },
    { label: 'Cert Valid',    desc: 'Number of monitors with a valid TLS certificate' },
    { label: 'Min Cert Expiry', desc: 'Fewest days remaining on any monitored certificate' },
  ],
} satisfies WidgetDefinition
