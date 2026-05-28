<script setup lang="ts">
import { resolveContainerState } from '~/utils/dockerLookup'

type Service = { name: string; url?: string; icon?: string; description?: string; type?: string; container?: string; server?: string; healthcheck?: string; [key: string]: unknown }
type WidgetField = { label: string; value: unknown; suffix?: string }
const props = defineProps<{ service: Service; edit: boolean; pending?: boolean; pendingDelete?: boolean }>()
defineEmits<{ edit: []; delete: []; revert: [] }>()

const { dockerStatus, pingStatus, widgetData } = useRefreshData()
const { cardStyle } = useAppearanceSettings()
const { settings } = useGlobalSettings()
const linkTarget = computed(() => settings.value?.linkTarget === 'same-tab' ? '_self' : '_blank')

const hc = computed(() => props.service.healthcheck ?? '')

const pingUrl = computed(() => {
  if (hc.value === 'none' || hc.value === 'docker')
    return null
  if (hc.value && hc.value !== 'http')
    return hc.value
  return props.service.url ?? null
})

const containerState = computed(() => {
  if (hc.value === 'http' || (hc.value && hc.value !== 'docker' && hc.value !== 'none'))
    return null
  return resolveContainerState(
    dockerStatus.value,
    props.service.name,
    props.service.container,
    props.service.server,
  )
})

const statusColor = computed(() => {
  if (hc.value === 'none')
    return null
  if (containerState.value) {
    const { state, status } = containerState.value
    if (state === 'running')
      return status.includes('(unhealthy)') ? 'bg-yellow-400' : 'bg-green-400'
    if (state === 'restarting' || state === 'paused')
      return 'bg-yellow-400'
    return 'bg-red-400'
  }
  if (pingUrl.value !== null) {
    const up = pingStatus.value[pingUrl.value]
    if (up === true)
      return 'bg-green-400'
    if (up === false)
      return 'bg-red-400'
  }
  return null
})

const statusTitle = computed(() => {
  if (hc.value === 'none')
    return null
  if (containerState.value)
    return containerState.value.status
  if (pingUrl.value !== null) {
    const up = pingStatus.value[pingUrl.value]
    if (up !== undefined) {
      const label = up ? 'Reachable' : 'Unreachable'
      const isCustomUrl = hc.value && hc.value !== 'http' && hc.value !== 'none' && hc.value !== 'docker'
      return isCustomUrl ? `${label}: ${pingUrl.value}` : label
    }
  }
  return null
})

const widgetResult = computed(() => widgetData.value[props.service.name])
const widgetLoading = computed(() => props.service.type && !(props.service.name in widgetData.value))
const widgetFields = computed(() => widgetResult.value?.fields as WidgetField[] | undefined)
</script>

<template>
  <component
    :is="!edit && service.url ? 'a' : 'div'"
    v-bind="!edit && service.url ? { href: service.url, target: linkTarget, rel: 'noopener' } : {}"
    class="relative group/card rounded-lg border p-3 flex flex-col gap-2 transition-colors"
    :style="cardStyle"
    :class="[
      !edit && service.url ? 'cursor-pointer' : 'cursor-default',
      pendingDelete ? 'border-danger/60 opacity-50' : pending ? 'border-warning/60 hover:border-warning/80' : 'border-border hover:border-accent/40',
    ]"
  >
    <div class="flex items-start gap-3">
      <span v-if="edit" class="service-handle absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-muted select-none text-xs rounded p-0.5 hover:bg-elevated hover:text-primary transition-colors"><FaIcon icon="grip-vertical" /></span>

      <img
        v-if="service.icon"
        :src="service.icon"
        :alt="service.name"
        class="w-8 h-8 rounded object-contain flex-shrink-0 mt-0.5"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <div v-else class="w-8 h-8 rounded bg-surface flex-shrink-0 mt-0.5" />

      <span
        v-if="statusColor"
        :class="['absolute top-2 right-2 w-2 h-2 rounded-full', statusColor]"
        :title="statusTitle ?? undefined"
      />

      <div class="flex-1 min-w-0">
        <span class="text-sm font-medium text-primary truncate block transition-colors" :class="!edit && service.url ? 'group-hover/card:text-accent' : ''">{{ service.name }}</span>
        <p v-if="service.description" class="text-xs text-muted truncate mt-0.5">{{ service.description }}</p>
      </div>

      <div v-if="edit" class="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
      <template v-if="pendingDelete">
        <button
          class="cursor-pointer h-8 px-3 rounded-lg bg-surface border border-warning/40 flex items-center gap-1.5 text-warning hover:border-warning transition-colors text-xs font-medium"
          @click.prevent="$emit('revert')"
        ><FaIcon icon="rotate-left" /> Restore</button>
      </template>
      <template v-else>
        <button
          v-if="pending"
          class="cursor-pointer w-8 h-8 rounded-lg bg-surface border border-warning/40 flex items-center justify-center text-warning hover:border-warning transition-colors text-sm"
          title="Revert changes"
          @click.prevent="$emit('revert')"
        ><FaIcon icon="rotate-left" /></button>
        <button
          class="cursor-pointer w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-accent-hover hover:border-accent transition-colors"
          @click.prevent="$emit('edit')"
        ><FaIcon icon="pencil" /></button>
        <button
          class="cursor-pointer w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted hover:text-danger hover:border-danger transition-colors"
          @click.prevent="$emit('delete')"
        ><FaIcon icon="xmark" /></button>
      </template>
    </div>
    </div>

    <div v-if="!edit && widgetFields?.length" class="flex flex-col gap-0.5">
      <span
        v-for="f in widgetFields"
        :key="f.label"
        class="text-xs text-secondary"
      >
        <span class="text-muted">{{ f.label }}:</span>
        {{ f.value ?? '-' }}{{ (f.suffix) ? ' ' + f.suffix : '' }}
      </span>
    </div>
    <div v-else-if="!edit && service.type && widgetResult === null" class="text-xs text-danger/60">Widget unavailable</div>
  </component>
</template>
