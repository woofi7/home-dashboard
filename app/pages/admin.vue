<script setup lang="ts">
const { needsLogin, editEnabled } = useAuth()
if (import.meta.client && (!editEnabled.value || needsLogin.value)) {
  await navigateTo('/')
}
watch([editEnabled, needsLogin], ([enabled, locked]) => {
  if (!enabled || locked) navigateTo('/')
})

// ── Catalog ────────────────────────────────────────────────────────────────

type FieldDef = { label: string; desc: string }
type CatalogEntry = { name: string; authType: string; fields: FieldDef[] }

const CATALOG: Record<string, CatalogEntry> = {
  audiobookshelf: { name: 'Audiobookshelf',  authType: 'bearer',   fields: [
    { label: 'Audiobooks', desc: 'Total audiobooks across all book libraries' },
    { label: 'Authors',    desc: 'Total unique authors' },
    { label: 'Duration',   desc: 'Total listening duration' },
    { label: 'Size',       desc: 'Total library size' },
  ]},
  bazarr:         { name: 'Bazarr',          authType: 'header',   fields: [
    { label: 'Missing episodes', desc: 'Episodes missing subtitles' },
    { label: 'Missing movies',   desc: 'Movies missing subtitles' },
    { label: 'Providers',        desc: 'Active subtitle providers' },
  ]},
  duplicati:      { name: 'Duplicati',       authType: 'password', fields: [
    { label: 'Last backup',  desc: 'Most recent backup date & status' },
    { label: 'Jobs',         desc: 'Total backup jobs' },
    { label: 'Active',       desc: 'Active tasks' },
    { label: 'Source',       desc: 'Total source size' },
    { label: 'Dest',         desc: 'Total destination size' },
  ]},
  homeassistant:  { name: 'Home Assistant',  authType: 'bearer',   fields: [
    { label: 'Entities',      desc: 'Total entities' },
    { label: 'Automations',   desc: 'Automations' },
    { label: 'Lights',        desc: 'Light entities' },
    { label: 'Switches',      desc: 'Switch entities' },
    { label: 'Sensors',       desc: 'Sensor count' },
    { label: 'Climate',       desc: 'Climate entities' },
    { label: 'Media players', desc: 'Media player entities' },
    { label: 'Scenes',        desc: 'Scene count' },
  ]},
  overseerr:      { name: 'Overseerr',       authType: 'header',   fields: [
    { label: 'Requests',   desc: 'Total requests' },
    { label: 'Pending',    desc: 'Pending requests' },
    { label: 'Approved',   desc: 'Approved requests' },
    { label: 'Available',  desc: 'Available / fulfilled' },
    { label: 'Processing', desc: 'Currently processing' },
    { label: 'Media',      desc: 'Total media items' },
  ]},
  pihole:         { name: 'Pi-hole',         authType: 'password', fields: [
    { label: 'Queries',        desc: 'Total DNS queries' },
    { label: 'Blocked',        desc: 'Blocked queries + %' },
    { label: 'Forwarded',      desc: 'Forwarded queries' },
    { label: 'Cached',         desc: 'Cached responses' },
    { label: 'Domains',        desc: 'Unique domains seen' },
    { label: 'Recent blocked', desc: 'Last blocked domain' },
  ]},
  plex:           { name: 'Plex',            authType: 'query',    fields: [
    { label: 'Movies',  desc: 'Movie library count' },
    { label: 'Shows',   desc: 'TV show library count' },
    { label: 'Streams', desc: 'Active streams' },
  ]},
  portainer:      { name: 'Portainer',       authType: 'bearer',   fields: [
    { label: 'Running',    desc: 'Running containers' },
    { label: 'Stopped',    desc: 'Stopped / exited containers' },
    { label: 'Containers', desc: 'Total containers' },
    { label: 'Stacks',     desc: 'Stack count' },
    { label: 'Volumes',    desc: 'Volume count' },
    { label: 'Images',     desc: 'Image count' },
  ]},
  prowlarr:       { name: 'Prowlarr',        authType: 'query',    fields: [
    { label: 'Indexers', desc: 'Total indexers' },
    { label: 'Grabs',    desc: 'Total grabs' },
    { label: 'Queries',  desc: 'Total queries' },
    { label: 'Failures', desc: 'Failed queries' },
  ]},
  qbittorrent:    { name: 'qBittorrent',     authType: 'basic',    fields: [
    { label: 'DL Speed', desc: 'Download speed' },
    { label: 'UL Speed', desc: 'Upload speed' },
    { label: 'Active',   desc: 'Active torrents' },
    { label: 'Total',    desc: 'Total torrents' },
  ]},
  radarr:         { name: 'Radarr',          authType: 'query',    fields: [
    { label: 'Movies',     desc: 'Total movies' },
    { label: 'Downloaded', desc: 'Movies with files' },
    { label: 'Queued',     desc: 'Download queue' },
    { label: 'Missing',    desc: 'Missing monitored movies' },
  ]},
  readarr:        { name: 'Readarr',         authType: 'query',    fields: [
    { label: 'Books',   desc: 'Total books' },
    { label: 'Missing', desc: 'Missing books' },
    { label: 'Authors', desc: 'Author count' },
    { label: 'Queue',   desc: 'Download queue' },
  ]},
  sonarr:         { name: 'Sonarr',          authType: 'query',    fields: [
    { label: 'Series',       desc: 'Series count' },
    { label: 'Monitored',    desc: 'Monitored series' },
    { label: 'Queued',       desc: 'Download queue' },
    { label: 'Wanted',       desc: 'Missing episodes' },
    { label: 'Cutoff unmet', desc: 'Cutoff unmet episodes' },
  ]},
  tdarr:          { name: 'Tdarr',           authType: 'none',     fields: [
    { label: 'Files', desc: 'Total files processed' },
    { label: 'Done',  desc: 'Completed files' },
    { label: 'Score', desc: 'Tdarr score %' },
  ]},
  traefik:        { name: 'Traefik',         authType: 'basic',    fields: [
    { label: 'Routers',     desc: 'HTTP routers' },
    { label: 'Services',    desc: 'HTTP services' },
    { label: 'Middlewares', desc: 'HTTP middlewares' },
  ]},
  unraid:         { name: 'Unraid',          authType: 'header',   fields: [
    { label: 'Array',  desc: 'Array state (Started / Stopped)' },
    { label: 'Used',   desc: 'Storage used / total' },
    { label: 'Disks',  desc: 'Disk slots used / total' },
    { label: 'Parity', desc: 'Last parity check status & progress' },
    { label: 'CPU',    desc: 'CPU usage %' },
    { label: 'Memory', desc: 'RAM used / total' },
  ]},
}

// ── Data ────────────────────────────────────────────────────────────────────

const { data: fieldConfig, refresh: refreshFields } = await useFetch<Record<string, string[]>>('/api/admin/widget-fields')

const search = ref('')
const saving = ref<string | null>(null)
const pendingFields = ref<Record<string, string[]>>({})

function activeLabels(type: string, entry: CatalogEntry): string[] {
  if (pendingFields.value[type])
    return pendingFields.value[type]
  return fieldConfig.value?.[type] ?? entry.fields.map(f => f.label)
}

function initPending(type: string) {
  if (pendingFields.value[type])
    return
  pendingFields.value[type] = [...activeLabels(type, CATALOG[type]!)]
}

function toggleField(type: string, label: string) {
  initPending(type)
  const list = pendingFields.value[type]!
  const idx = list.indexOf(label)
  if (idx === -1) list.push(label)
  else list.splice(idx, 1)
}

async function saveFields(type: string) {
  saving.value = type
  try {
    await $fetch('/api/admin/widget-fields', {
      method: 'POST',
      body: { type, fields: pendingFields.value[type] ?? [] },
    })
    delete pendingFields.value[type]
    await refreshFields()
  } finally {
    saving.value = null
  }
}

function isDirty(type: string): boolean {
  if (!pendingFields.value[type])
    return false
  const current = fieldConfig.value?.[type] ?? CATALOG[type]?.fields.map(f => f.label) ?? []
  const pending = pendingFields.value[type]!
  return JSON.stringify([...current].sort()) !== JSON.stringify([...pending].sort())
}

const filteredCatalog = computed(() => {
  const q = search.value.trim().toLowerCase()
  return Object.entries(CATALOG).filter(([type, entry]) =>
    !q || type.includes(q) || entry.name.toLowerCase().includes(q)
  )
})

const AUTH_COLORS: Record<string, string> = {
  header:   'var(--color-accent)',
  bearer:   'var(--color-success)',
  basic:    'var(--color-warning)',
  query:    '#a78bfa',
  password: '#f472b6',
  none:     'var(--color-text-muted)',
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">

    <!-- Top bar -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-sm">← Dashboard</NuxtLink>
        <span class="text-[var(--color-border)]">/</span>
        <h1 class="text-sm font-semibold">Widget Registry</h1>
      </div>
      <input
        v-model="search"
        type="text"
        placeholder="Search widgets…"
        class="w-52 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-text-muted)]"
      />
    </div>

    <!-- Card grid -->
    <div class="px-6 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="[type, entry] in filteredCatalog"
        :key="type"
        class="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] flex flex-col"
      >
        <!-- Card header -->
        <div class="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
          <span class="font-semibold text-[var(--color-text-primary)] flex-1">{{ entry.name }}</span>
          <span
            class="px-2 py-0.5 rounded-md text-xs font-medium border"
            :style="{
              color: AUTH_COLORS[entry.authType] ?? AUTH_COLORS.none,
              borderColor: (AUTH_COLORS[entry.authType] ?? AUTH_COLORS.none) + '40',
              background: (AUTH_COLORS[entry.authType] ?? AUTH_COLORS.none) + '15',
            }"
          >{{ entry.authType }}</span>
        </div>

        <!-- Fields -->
        <div class="px-4 py-3 flex-1">
          <p class="text-xs text-[var(--color-text-muted)] mb-2 font-medium uppercase tracking-wide">Fields</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="field in entry.fields"
              :key="field.label"
              :title="field.desc"
              class="cursor-pointer px-2 py-0.5 rounded-md text-xs border transition-colors"
              :class="activeLabels(type, entry).includes(field.label)
                ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)]'"
              @click="toggleField(type, field.label)"
            >{{ field.label }}</button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between px-4 pb-4 pt-2 gap-2">
          <p class="text-xs text-[var(--color-text-muted)]">
            {{ activeLabels(type, entry).filter(l => entry.fields.some(f => f.label === l)).length }} / {{ entry.fields.length }} fields shown
          </p>
          <button
            v-if="isDirty(type)"
            class="cursor-pointer px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            :disabled="saving === type"
            @click="saveFields(type)"
          >{{ saving === type ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
