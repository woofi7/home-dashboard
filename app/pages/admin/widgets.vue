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
function updateFields(type: string, labels: string[]) {
  pendingFields.value[type] = labels
}

function cancelFields(type: string) {
  delete pendingFields.value[type]
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
  return JSON.stringify(current) !== JSON.stringify(pending)
}

const filteredCatalog = computed(() => {
  const q = search.value.trim().toLowerCase()
  return Object.entries(widgetDefinitions)
    .filter(([type, def]) => !q || type.includes(q) || def.name.toLowerCase().includes(q))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
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
      @update-fields="updateFields(type, $event)"
      @cancel="cancelFields(type)"
      @save="saveFields(type)"
    />
  </div>
</template>
