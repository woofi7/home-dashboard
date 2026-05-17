<script setup lang="ts">
const { needsLogin, editEnabled } = useAuth()
if (import.meta.client && (!editEnabled.value || needsLogin.value)) {
  await navigateTo('/')
}
watch([editEnabled, needsLogin], ([enabled, locked]) => {
  if (!enabled || locked) navigateTo('/')
})


// ── Data ────────────────────────────────────────────────────────────────────

const { data: fieldConfig, refresh: refreshFields } = await useFetch<Record<string, string[]>>('/api/admin/widget-fields')

const search = ref('')
const saving = ref<string | null>(null)
const pendingFields = ref<Record<string, string[]>>({})

function defaultLabels(type: string): string[] {
  return widgetDefinitions[type]?.fields.map(f => f.label) ?? []
}

function activeLabels(type: string): string[] {
  if (pendingFields.value[type])
    return pendingFields.value[type]
  return fieldConfig.value?.[type] ?? defaultLabels(type)
}

function initPending(type: string) {
  if (pendingFields.value[type])
    return
  pendingFields.value[type] = [...activeLabels(type)]
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
              :class="activeLabels(type).includes(field.label)
                ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)]'"
              @click="toggleField(type, field.label)"
            >{{ field.label }}</button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between px-4 pb-4 pt-2 gap-2">
          <p class="text-xs text-[var(--color-text-muted)]">
            {{ activeLabels(type).filter(l => entry.fields.some(f => f.label === l)).length }} / {{ entry.fields.length }} fields shown
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
