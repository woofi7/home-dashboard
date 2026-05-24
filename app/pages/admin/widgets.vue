<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

watch([() => useAuth().editEnabled.value, () => useAuth().needsLogin.value], ([enabled, locked]) => {
  if (!enabled || locked) navigateTo('/')
})

const { data: fieldConfig, refresh: refreshFields } = await useFetch<Record<string, string[]>>('/api/admin/widget-fields')

const search = ref('')
const saving = ref<string | null>(null)
const pendingFields = ref<Record<string, string[]>>({})

function defaultLabels(type: string): string[] {
  return widgetDefinitions[type]?.fields.map(f => f.label) ?? []
}
function activeLabels(type: string): string[] {
  return pendingFields.value[type] ?? fieldConfig.value?.[type] ?? defaultLabels(type)
}
function initPending(type: string) {
  if (!pendingFields.value[type])
    pendingFields.value[type] = [...activeLabels(type)]
}
function toggleField(type: string, label: string) {
  initPending(type)
  const list = pendingFields.value[type]!
  const idx = list.indexOf(label)
  if (idx === -1)
    list.push(label)
  else
    list.splice(idx, 1)
}
async function saveFields(type: string) {
  saving.value = type
  try {
    await $fetch('/api/admin/widget-fields', { method: 'POST', body: { type, fields: pendingFields.value[type] ?? [] } })
    delete pendingFields.value[type]
    await refreshFields()
  } finally {
    saving.value = null
  }
}
function isDirty(type: string): boolean {
  if (!pendingFields.value[type])
    return false
  const current = fieldConfig.value?.[type] ?? defaultLabels(type)
  const pending = pendingFields.value[type]!
  return JSON.stringify([...current].sort()) !== JSON.stringify([...pending].sort())
}

const filteredCatalog = computed(() => {
  const q = search.value.trim().toLowerCase()
  return Object.entries(widgetDefinitions).filter(([type, def]) =>
    !q || type.includes(q) || def.name.toLowerCase().includes(q)
  )
})

const AUTH_COLORS: Record<string, string> = {
  header: 'var(--color-accent)',
  bearer: 'var(--color-success)',
  basic: 'var(--color-warning)',
  query: '#a78bfa',
  password: '#f472b6',
  none: 'var(--color-muted)',
}
</script>

<template>
  <Teleport to="#admin-header-actions">
    <input
      v-model="search"
      type="text"
      placeholder="Search widgets..."
      class="w-52 rounded-lg bg-elevated border border-border px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted"
    />
  </Teleport>

  <div class="px-6 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    <WidgetCard
      v-for="[type, entry] in filteredCatalog"
      :key="type"
      :type="type"
      :entry="entry"
      :active-labels="activeLabels(type)"
      :is-dirty="isDirty(type)"
      :saving="saving === type"
      :auth-colors="AUTH_COLORS"
      @toggle-field="toggleField(type, $event)"
      @save="saveFields(type)"
    />
  </div>
</template>
