<script setup lang="ts">
import type { WidgetEntry } from '~/server/api/admin/widgets.get'

const { needsLogin, editEnabled } = useAuth()
if (import.meta.client && (!editEnabled.value || needsLogin.value)) {
  await navigateTo('/')
}
watch([editEnabled, needsLogin], ([enabled, locked]) => {
  if (!enabled || locked) navigateTo('/')
})

// ── Catalog ────────────────────────────────────────────────────────────────

type FieldDef = { label: string; desc: string }
type CatalogEntry = { name: string; kind: 'yaml' | 'dedicated'; fields: FieldDef[] }

const CATALOG: Record<string, CatalogEntry> = {
  unraid:         { name: 'Unraid',          kind: 'dedicated', fields: [
    { label: 'Array',        desc: 'Array state (Started / Stopped)' },
    { label: 'Used',         desc: 'Storage used / total' },
    { label: 'Disks',        desc: 'Disk slots used / total' },
    { label: 'Parity',       desc: 'Last parity check status & progress' },
    { label: 'CPU',          desc: 'CPU usage %' },
    { label: 'Memory',       desc: 'RAM used / total' },
  ]},
  portainer:      { name: 'Portainer',       kind: 'dedicated', fields: [
    { label: 'Running',      desc: 'Running containers' },
    { label: 'Stopped',      desc: 'Stopped / exited containers' },
    { label: 'Containers',   desc: 'Total containers' },
    { label: 'Stacks',       desc: 'Stack count' },
    { label: 'Volumes',      desc: 'Volume count' },
    { label: 'Images',       desc: 'Image count' },
  ]},
  duplicati:      { name: 'Duplicati',       kind: 'dedicated', fields: [
    { label: 'Last backup',  desc: 'Most recent backup date & status' },
    { label: 'Jobs',         desc: 'Total backup jobs' },
    { label: 'Active',       desc: 'Active tasks' },
    { label: 'Source',       desc: 'Total source size' },
    { label: 'Dest',         desc: 'Total destination size' },
  ]},
  homeassistant:  { name: 'Home Assistant',  kind: 'dedicated', fields: [
    { label: 'Entities',     desc: 'Total entities' },
    { label: 'Automations',  desc: 'Automations' },
    { label: 'Lights',       desc: 'Light entities' },
    { label: 'Switches',     desc: 'Switch entities' },
    { label: 'Sensors',      desc: 'Sensor count' },
    { label: 'Climate',      desc: 'Climate entities' },
    { label: 'Media players',desc: 'Media player entities' },
    { label: 'Scenes',       desc: 'Scene count' },
  ]},
  pihole:         { name: 'Pi-hole',         kind: 'dedicated', fields: [
    { label: 'Queries',       desc: 'Total DNS queries' },
    { label: 'Blocked',       desc: 'Blocked queries + %' },
    { label: 'Forwarded',     desc: 'Forwarded queries' },
    { label: 'Cached',        desc: 'Cached responses' },
    { label: 'Domains',       desc: 'Unique domains seen' },
    { label: 'Recent blocked',desc: 'Last blocked domain' },
  ]},
  plex:           { name: 'Plex',            kind: 'yaml', fields: [
    { label: 'Movies',       desc: 'Movie library count' },
    { label: 'Shows',        desc: 'TV show library count' },
    { label: 'Streams',      desc: 'Active streams' },
  ]},
  sonarr:         { name: 'Sonarr',          kind: 'yaml', fields: [
    { label: 'Wanted',       desc: 'Missing episodes' },
    { label: 'Queued',       desc: 'Download queue' },
    { label: 'Series',       desc: 'Series count' },
    { label: 'Monitored',    desc: 'Monitored series' },
    { label: 'Cutoff unmet', desc: 'Cutoff unmet episodes' },
  ]},
  radarr:         { name: 'Radarr',          kind: 'yaml', fields: [
    { label: 'Movies',       desc: 'Total movies' },
    { label: 'Downloaded',   desc: 'Movies with files' },
    { label: 'Queued',       desc: 'Download queue' },
    { label: 'Missing',      desc: 'Missing monitored movies' },
  ]},
  readarr:        { name: 'Readarr',         kind: 'yaml', fields: [
    { label: 'Books',        desc: 'Total books' },
    { label: 'Missing',      desc: 'Missing books' },
    { label: 'Authors',      desc: 'Author count' },
    { label: 'Queue',        desc: 'Download queue' },
  ]},
  prowlarr:       { name: 'Prowlarr',        kind: 'yaml', fields: [
    { label: 'Indexers',     desc: 'Total indexers' },
    { label: 'Grabs',        desc: 'Total grabs' },
    { label: 'Queries',      desc: 'Total queries' },
    { label: 'Failures',     desc: 'Failed queries' },
  ]},
  bazarr:         { name: 'Bazarr',          kind: 'yaml', fields: [
    { label: 'Missing episodes', desc: 'Episodes missing subtitles' },
    { label: 'Missing movies',   desc: 'Movies missing subtitles' },
    { label: 'Providers',        desc: 'Active subtitle providers' },
  ]},
  qbittorrent:    { name: 'qBittorrent',     kind: 'dedicated', fields: [
    { label: 'DL Speed',     desc: 'Download speed' },
    { label: 'UL Speed',     desc: 'Upload speed' },
    { label: 'Active',       desc: 'Active torrents' },
    { label: 'Total',        desc: 'Total torrents' },
  ]},
  audiobookshelf: { name: 'Audiobookshelf',  kind: 'dedicated', fields: [
    { label: 'Audiobooks', desc: 'Total audiobooks across all book libraries' },
    { label: 'Authors',    desc: 'Total unique authors' },
    { label: 'Duration',   desc: 'Total listening duration' },
    { label: 'Size',       desc: 'Total library size' },
  ]},
  tdarr:          { name: 'Tdarr',           kind: 'yaml', fields: [
    { label: 'Files',        desc: 'Total files processed' },
    { label: 'Done',         desc: 'Completed files' },
    { label: 'Score',        desc: 'Tdarr score %' },
  ]},
  overseerr:      { name: 'Overseerr',       kind: 'yaml', fields: [
    { label: 'Requests',     desc: 'Total requests' },
    { label: 'Pending',      desc: 'Pending requests' },
    { label: 'Approved',     desc: 'Approved requests' },
    { label: 'Available',    desc: 'Available / fulfilled' },
    { label: 'Processing',   desc: 'Currently processing' },
    { label: 'Media',        desc: 'Total media items' },
  ]},
  traefik:        { name: 'Traefik',         kind: 'yaml', fields: [
    { label: 'Routers',      desc: 'HTTP routers' },
    { label: 'Services',     desc: 'HTTP services' },
    { label: 'Middlewares',  desc: 'HTTP middlewares' },
  ]},
}

// ── Data ────────────────────────────────────────────────────────────────────

const { data: yamlWidgets, refresh } = await useFetch<WidgetEntry[]>('/api/admin/widgets')
const { data: fieldConfig, refresh: refreshFields } = await useFetch<Record<string, string[]>>('/api/admin/widget-fields')

const search = ref('')
const editing = ref<WidgetEntry | null>(null)
const showAdd = ref(false)
const deleteTarget = ref<string | null>(null)
const deleteLoading = ref(false)
const saving = ref<string | null>(null)

// Per-type pending toggle state (dedicated widgets only)
const pendingFields = ref<Record<string, string[]>>({})

function yamlWidgetByType(type: string) {
  return yamlWidgets.value?.find(w => w.type === type)
}

// For YAML widgets, only show fields that actually exist in the YAML display array
function renderableFields(type: string, entry: CatalogEntry): FieldDef[] {
  if (entry.kind === 'dedicated') return entry.fields
  const yamlLabels = yamlWidgetByType(type)?.displayLabels ?? []
  return entry.fields.filter(f => yamlLabels.includes(f.label))
}

// Active fields for a widget type
function activeLabels(type: string, catalogEntry: CatalogEntry): string[] {
  if (pendingFields.value[type]) return pendingFields.value[type]
  const saved = fieldConfig.value?.[type]
  if (saved) return saved
  if (catalogEntry.kind === 'dedicated') return catalogEntry.fields.map(f => f.label)
  // yaml: default all display labels active
  return yamlWidgetByType(type)?.displayLabels ?? catalogEntry.fields.map(f => f.label)
}

function initPending(type: string) {
  if (pendingFields.value[type]) return
  pendingFields.value[type] = [...activeLabels(type, CATALOG[type])]
}

function toggleField(type: string, label: string) {
  initPending(type)
  const list = pendingFields.value[type]
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
  if (!pendingFields.value[type]) return false
  const current = fieldConfig.value?.[type] ?? CATALOG[type]?.fields.map(f => f.label) ?? []
  const pending = pendingFields.value[type]
  return JSON.stringify([...current].sort()) !== JSON.stringify([...pending].sort())
}

const filteredCatalog = computed(() => {
  const q = search.value.trim().toLowerCase()
  return Object.entries(CATALOG).filter(([type, entry]) =>
    !q || type.includes(q) || entry.name.toLowerCase().includes(q)
  )
})

// Delete
async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch('/api/admin/widgets', { method: 'POST', body: { type: deleteTarget.value, yaml: '', delete: true } })
    deleteTarget.value = null
    await refresh()
  } finally {
    deleteLoading.value = false
  }
}

async function onSave() {
  editing.value = null
  showAdd.value = false
  await refresh()
}

const AUTH_COLORS: Record<string, string> = {
  header: 'var(--color-accent)',
  bearer: 'var(--color-success)',
  basic: 'var(--color-warning)',
  query: '#a78bfa',
  login: '#f472b6',
  none: 'var(--color-text-muted)',
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
      <div class="flex items-center gap-3">
        <input
          v-model="search"
          type="text"
          placeholder="Search widgets…"
          class="w-52 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-text-muted)]"
        />
        <button
          class="cursor-pointer px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          @click="showAdd = true"
        >+ Add Custom</button>
      </div>
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
          <!-- kind badge -->
          <span class="px-2 py-0.5 rounded-md text-xs font-medium border"
            :style="entry.kind === 'dedicated'
              ? 'color:#60a5fa;border-color:#60a5fa40;background:#60a5fa15'
              : 'color:var(--color-success);border-color:color-mix(in srgb,var(--color-success) 40%,transparent);background:color-mix(in srgb,var(--color-success) 15%,transparent)'"
          >{{ entry.kind }}</span>
          <!-- auth badge (yaml only) -->
          <span
            v-if="entry.kind === 'yaml' && yamlWidgetByType(type)"
            class="px-2 py-0.5 rounded-md text-xs font-medium border"
            :style="{
              color: AUTH_COLORS[yamlWidgetByType(type)!.authType] ?? AUTH_COLORS.none,
              borderColor: (AUTH_COLORS[yamlWidgetByType(type)!.authType] ?? AUTH_COLORS.none) + '40',
              background: (AUTH_COLORS[yamlWidgetByType(type)!.authType] ?? AUTH_COLORS.none) + '15',
            }"
          >{{ yamlWidgetByType(type)!.authType }}</span>
          <!-- not installed indicator -->
          <span
            v-if="entry.kind === 'yaml' && !yamlWidgetByType(type)"
            class="px-2 py-0.5 rounded-md text-xs border"
            style="color:var(--color-text-muted);border-color:color-mix(in srgb,var(--color-text-muted) 30%,transparent)"
          >not installed</span>
        </div>

        <!-- Fields -->
        <div class="px-4 py-3 flex-1">
          <p class="text-xs text-[var(--color-text-muted)] mb-2 font-medium uppercase tracking-wide">Fields</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="field in renderableFields(type, entry)"
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
          <p v-if="entry.kind === 'yaml' && !yamlWidgetByType(type)" class="text-xs text-[var(--color-text-muted)]">
            No YAML installed
          </p>
          <p v-else class="text-xs text-[var(--color-text-muted)]">
            {{ activeLabels(type, entry).filter(l => renderableFields(type, entry).some(f => f.label === l)).length }} / {{ renderableFields(type, entry).length }} fields shown
          </p>

          <div class="flex gap-1.5 ml-auto">
            <!-- Save fields (when dirty) -->
            <button
              v-if="isDirty(type)"
              class="cursor-pointer px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
              :disabled="saving === type"
              @click="saveFields(type)"
            >{{ saving === type ? 'Saving…' : 'Save' }}</button>

            <!-- Edit YAML (yaml) -->
            <button
              v-if="entry.kind === 'yaml' && yamlWidgetByType(type)"
              class="cursor-pointer px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-hover)] hover:border-[var(--color-accent)] transition-colors"
              @click="editing = yamlWidgetByType(type)!"
            >Edit YAML</button>

            <!-- Delete (yaml only) -->
            <button
              v-if="entry.kind === 'yaml' && yamlWidgetByType(type)"
              class="cursor-pointer px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
              @click="deleteTarget = type"
            >Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- YAML editor modal -->
    <WidgetEditorModal
      v-if="editing"
      :type="editing.type"
      :initial-yaml="editing.yaml"
      :is-new="false"
      :allow-github-fetch="true"
      @save="onSave"
      @close="editing = null"
    />
    <WidgetEditorModal
      v-if="showAdd"
      :is-new="true"
      :allow-github-fetch="false"
      @save="onSave"
      @close="showAdd = false"
    />

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm mx-4 p-6 space-y-4">
          <h2 class="font-semibold">Delete <span class="font-mono">{{ deleteTarget }}</span>?</h2>
          <p class="text-sm text-[var(--color-text-secondary)]">This removes the widget YAML from your config.</p>
          <div class="flex justify-end gap-2">
            <button class="cursor-pointer px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" @click="deleteTarget = null">Cancel</button>
            <button
              class="cursor-pointer px-4 py-2 rounded-lg bg-[var(--color-danger)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              :disabled="deleteLoading"
              @click="confirmDelete"
            >{{ deleteLoading ? 'Deleting…' : 'Delete' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
