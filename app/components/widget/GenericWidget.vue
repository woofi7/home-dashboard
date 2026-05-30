<script setup lang="ts">
import { useWidgetCardsStore } from '~/stores/widgetCards'
import { widgetErrorLabel, widgetErrorTooltip } from '~/utils/widgetError'

const props = defineProps<{ widget: Record<string, unknown> }>()
const store = useWidgetCardsStore()
const card = computed(() => store.byName(props.widget.name as string))
const pending = computed(() => !card.value || card.value.status === 'loading')
const error = computed(() => (card.value?.status === 'error' ? card.value.error : null))
const data = computed(() => card.value?.data)
</script>

<template>
  <div class="rounded-xl bg-surface border border-border px-4 py-3 flex-1 min-w-35 sm:flex-none sm:min-w-40">
    <div class="text-xs text-muted mb-2 font-medium uppercase tracking-wide">
      {{ widget.name }}
    </div>
    <div v-if="pending" class="text-muted text-sm">Loading...</div>
    <div
      v-else-if="error"
      class="text-danger text-xs cursor-help"
      :title="error ? widgetErrorTooltip(error) : undefined"
    >{{ error ? widgetErrorLabel(error) : 'Unavailable' }}</div>
    <div v-else-if="data" class="space-y-1">
      <div
        v-for="field in (data as { fields: { label: string; value: unknown; suffix?: string }[] }).fields"
        :key="field.label"
        class="flex justify-between gap-4"
      >
        <span class="text-xs text-muted">{{ field.label }}</span>
        <span class="text-xs font-medium text-primary">
          {{ field.value }}{{ field.suffix ? ` ${field.suffix}` : '' }}
        </span>
      </div>
    </div>
  </div>
</template>
