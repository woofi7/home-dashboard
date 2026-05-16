<script setup lang="ts">
type Service = { name: string; url?: string; icon?: string; description?: string; type?: string; apiKey?: string; username?: string; password?: string; container?: string; [key: string]: unknown }
type WidgetField = { label: string; value: string | number | null; suffix?: string }
const props = defineProps<{ service: Service; edit: boolean; pending?: boolean; pendingDelete?: boolean }>()
defineEmits<{ edit: []; delete: []; revert: [] }>()

const widgetFields = ref<WidgetField[] | null>(null)
const widgetError = ref(false)

async function fetchWidget() {
  if (!props.service.type || !props.service.url) return
  try {
    const params: Record<string, string> = { url: props.service.url as string }
    const skip = new Set(['name', 'url', 'icon', 'description', 'type', 'container'])
    for (const [k, v] of Object.entries(props.service)) {
      if (!skip.has(k) && typeof v === 'string' && v) params[k] = v
    }

    const res = await $fetch<{ fields: WidgetField[] }>(`/api/widget/${props.service.type}`, { params })
    widgetFields.value = res.fields
    widgetError.value = false
  } catch {
    widgetError.value = true
  }
}

const { refreshKey } = useWidgetRefresh()

onMounted(() => { if (!props.edit && props.service.type) fetchWidget() })
watch(refreshKey, () => { if (!props.edit && props.service.type) fetchWidget() })
watch(() => props.edit, (editing) => { if (!editing && props.service.type) fetchWidget() })

const { dockerStatus } = useDockerStatus()

const containerState = computed(() => {
  const target = (props.service.container as string | undefined) ?? props.service.name.toLowerCase().replace(/\s+/g, '')
  const key = Object.keys(dockerStatus.value).find(k => k.toLowerCase().includes(target) || target.includes(k.toLowerCase()))
  return key ? dockerStatus.value[key] : null
})

// HTTP ping fallback for services with no Docker container match
const pingUp = ref<boolean | null>(null)

async function doPing() {
  if (containerState.value || !props.service.url || props.edit) return
  try {
    const res = await $fetch<{ up: boolean }>('/api/ping', { params: { url: props.service.url } })
    pingUp.value = res.up
  } catch { pingUp.value = false }
}

onMounted(doPing)
watch(refreshKey, doPing)
watch(containerState, (v) => { if (!v) doPing() })

const statusColor = computed(() => {
  if (containerState.value) {
    const { state, status } = containerState.value
    if (state === 'running') return status.includes('(unhealthy)') ? 'bg-yellow-400' : 'bg-green-400'
    if (state === 'restarting' || state === 'paused') return 'bg-yellow-400'
    return 'bg-red-400'
  }
  if (pingUp.value === true) return 'bg-green-400'
  if (pingUp.value === false) return 'bg-red-400'
  return null
})

const statusTitle = computed(() => {
  if (containerState.value) return containerState.value.status
  if (pingUp.value !== null) return pingUp.value ? 'Reachable' : 'Unreachable'
  return null
})
</script>

<template>
  <component
    :is="!edit && service.url ? 'a' : 'div'"
    v-bind="!edit && service.url ? { href: service.url, target: '_blank', rel: 'noopener' } : {}"
    class="relative group/card rounded-lg bg-black/60 border border-white/10 p-3 flex flex-col gap-2 transition-colors hover:border-white/20"
    :class="[
      !edit && service.url ? 'cursor-pointer' : 'cursor-default',
      pendingDelete ? 'border-[var(--color-danger)]/60 opacity-50' : pending ? 'border-[var(--color-warning)]/60' : 'border-[var(--color-border)]',
    ]"
  >
    <!-- Header row: drag handle + icon + name/desc + edit controls -->
    <div class="flex items-start gap-3">
      <!-- Drag handle -->
      <span v-if="edit" class="service-handle absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-[var(--color-text-muted)] opacity-0 group-hover/card:opacity-100 select-none text-xs">⠿</span>

      <!-- Icon -->
      <img
        v-if="service.icon"
        :src="service.icon"
        :alt="service.name"
        class="w-8 h-8 rounded object-contain flex-shrink-0 mt-0.5"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <div v-else class="w-8 h-8 rounded bg-[var(--color-bg-surface)] flex-shrink-0 mt-0.5" />

      <!-- Docker status dot -->
      <span
        v-if="statusColor"
        :class="['absolute top-2 right-2 w-2 h-2 rounded-full', statusColor]"
        :title="statusTitle ?? undefined"
      />

      <!-- Name + description -->
      <div class="flex-1 min-w-0">
        <span class="text-sm font-medium text-[var(--color-text-primary)] truncate block" :class="!edit && service.url ? 'hover:text-[var(--color-accent-hover)]' : ''">{{ service.name }}</span>
        <p v-if="service.description" class="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{{ service.description }}</p>
      </div>

      <!-- Edit/delete controls -->
      <div v-if="edit" class="flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0">
      <template v-if="pendingDelete">
        <button
          class="cursor-pointer h-8 px-3 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-warning)]/40 flex items-center gap-1.5 text-[var(--color-warning)] hover:border-[var(--color-warning)] transition-colors text-xs font-medium"
          @click.prevent="$emit('revert')"
        >↺ Restore</button>
      </template>
      <template v-else>
        <button
          v-if="pending"
          class="cursor-pointer w-8 h-8 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-warning)]/40 flex items-center justify-center text-[var(--color-warning)] hover:border-[var(--color-warning)] transition-colors text-sm"
          title="Revert changes"
          @click.prevent="$emit('revert')"
        >↺</button>
        <button
          class="cursor-pointer w-8 h-8 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent-hover)] hover:border-[var(--color-accent)] transition-colors"
          @click.prevent="$emit('edit')"
        >✎</button>
        <button
          class="cursor-pointer w-8 h-8 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
          @click.prevent="$emit('delete')"
        >✕</button>
      </template>
    </div>
    </div><!-- end header row -->

    <!-- Widget data: full width below the header -->
    <div v-if="!edit && widgetFields && widgetFields.length" class="flex flex-col gap-0.5">
      <span
        v-for="f in widgetFields"
        :key="f.label"
        class="text-xs text-[var(--color-text-secondary)]"
      >
        <span class="text-[var(--color-text-muted)]">{{ f.label }}:</span>
        {{ f.value ?? '—' }}{{ f.suffix ? ' ' + f.suffix : '' }}
      </span>
    </div>
    <div v-else-if="!edit && service.type && widgetError" class="text-xs text-[var(--color-danger)]/60">Widget unavailable</div>
    <div v-else-if="!edit && service.type && !widgetFields" class="flex gap-2">
      <span v-for="i in 2" :key="i" class="h-3 w-14 rounded bg-[var(--color-bg-surface)] animate-pulse" />
    </div>
  </component>
</template>
