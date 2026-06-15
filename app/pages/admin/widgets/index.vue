<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

type WidgetEnabled = { calendar: boolean; weather: boolean; publictransit: boolean }
type WidgetKey = keyof WidgetEnabled

const { data: enabled, refresh } = useFetch<WidgetEnabled>('/api/admin/widget-enabled')

async function toggle(widget: WidgetKey, value: boolean) {
  await $fetch('/api/admin/widget-enabled', {
    method: 'POST',
    body: { widget, enabled: value },
  })
  await refresh()
}

function isEnabled(widget: WidgetKey): boolean {
  return enabled.value?.[widget] ?? true
}
</script>

<template>
  <div class="px-6 py-8">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">

      <NuxtLink
        to="/admin/widgets/calendar"
        class="group relative rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <button
          class="absolute top-3 right-3 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
          :class="isEnabled('calendar') ? 'bg-accent' : 'bg-border'"
          @click.prevent.stop="toggle('calendar', !isEnabled('calendar'))"
        >
          <span
            class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
            :class="isEnabled('calendar') ? 'translate-x-[18px]' : 'translate-x-0.5'"
          />
        </button>
        <FaIcon icon="calendar-days" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Google Calendar</p>
        <p class="text-xs text-muted mt-1">Connect your Google account to show today's events</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/widgets/publictransit"
        class="group relative rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <button
          class="absolute top-3 right-3 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
          :class="isEnabled('publictransit') ? 'bg-accent' : 'bg-border'"
          @click.prevent.stop="toggle('publictransit', !isEnabled('publictransit'))"
        >
          <span
            class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
            :class="isEnabled('publictransit') ? 'translate-x-[18px]' : 'translate-x-0.5'"
          />
        </button>
        <FaIcon icon="ticket" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Public Transit</p>
        <p class="text-xs text-muted mt-1">Transit card URL for remaining pass counts</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/widgets/weather"
        class="group relative rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <button
          class="absolute top-3 right-3 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
          :class="isEnabled('weather') ? 'bg-accent' : 'bg-border'"
          @click.prevent.stop="toggle('weather', !isEnabled('weather'))"
        >
          <span
            class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
            :class="isEnabled('weather') ? 'translate-x-[18px]' : 'translate-x-0.5'"
          />
        </button>
        <FaIcon icon="cloud-sun-rain" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Weather</p>
        <p class="text-xs text-muted mt-1">Location source, units and widget display options</p>
      </NuxtLink>

    </div>
  </div>
</template>
