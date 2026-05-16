<script setup lang="ts">
const props = defineProps<{ widget: Record<string, unknown> }>()
const type = computed(() => props.widget.type as string)
const url = computed(() => props.widget.url as string)

const { data, pending, error } = await useFetch(() =>
  `/api/widget/${type.value}?url=${encodeURIComponent(url.value)}`,
  { key: `widget-${props.widget.name}` }
)
</script>

<template>
  <div class="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-4 py-3 flex-1 min-w-[140px] sm:flex-none sm:min-w-[160px]">
    <div class="text-xs text-[var(--color-text-muted)] mb-2 font-medium uppercase tracking-wide">
      {{ widget.name }}
    </div>
    <div v-if="pending" class="text-[var(--color-text-muted)] text-sm">Loading…</div>
    <div v-else-if="error" class="text-[var(--color-danger)] text-xs">Unavailable</div>
    <div v-else-if="data" class="space-y-1">
      <div
        v-for="field in (data as { fields: { label: string; value: unknown; suffix?: string }[] }).fields"
        :key="field.label"
        class="flex justify-between gap-4"
      >
        <span class="text-xs text-[var(--color-text-muted)]">{{ field.label }}</span>
        <span class="text-xs font-medium text-[var(--color-text-primary)]">
          {{ field.value }}{{ field.suffix ? ` ${field.suffix}` : '' }}
        </span>
      </div>
    </div>
  </div>
</template>
