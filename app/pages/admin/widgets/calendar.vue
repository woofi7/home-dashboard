<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

type WidgetEnabled = { calendar: boolean; weather: boolean; publictransit: boolean }

const { data: enabledData, refresh: refreshEnabled } = useFetch<WidgetEnabled>('/api/admin/widget-enabled')

const enabled = computed(() => enabledData.value?.calendar ?? true)

async function toggleEnabled() {
  await $fetch('/api/admin/widget-enabled', {
    method: 'POST',
    body: { widget: 'calendar', enabled: !enabled.value },
  })
  await refreshEnabled()
}
</script>

<template>
  <div class="px-4 md:px-6 py-6 space-y-6">
    <div class="rounded-xl border border-border bg-surface overflow-hidden max-w-xl">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">Enable</p>
      </div>
      <div class="px-6 py-4 flex items-center justify-between">
        <span class="text-sm text-primary">Show this widget on the dashboard</span>
        <button
          class="inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
          :class="enabled ? 'bg-accent' : 'bg-border'"
          @click="toggleEnabled"
        >
          <span
            class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
            :class="enabled ? 'translate-x-[18px]' : 'translate-x-0.5'"
          />
        </button>
      </div>
    </div>
    <GoogleCalendarPanel />
  </div>
</template>
