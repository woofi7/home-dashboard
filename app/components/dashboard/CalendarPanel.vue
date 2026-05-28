<script setup lang="ts">
type CalEvent = { id: string; summary: string; url: string; start?: string; end?: string; color?: string }
type CalDay   = { label: string; date: string; timed: CalEvent[]; allDay: CalEvent[] }
type CalTask  = { id: string; title: string; due?: string; notes?: string; url: string }
type CalendarData = { authorized: boolean; days: CalDay[]; tasks: CalTask[] }

const props = defineProps<{ calendar?: CalendarData | null }>()

const { cardStyle } = useAppearanceSettings()

// Filter to days that actually have events. originalIndex tracks position in the full
// days array so today (index 0) gets distinct styling regardless of empty leading days.
const visibleDays = computed(() =>
  (props.calendar?.days ?? [])
    .map((d, originalIndex) => ({ ...d, originalIndex }))
    .filter(d => d.timed.length || d.allDay.length)
)

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDue(d: string) {
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="cal-scroll order-2 md:order-1 max-h-[250px] overflow-y-auto">

    <!-- Loading skeleton -->
    <div v-if="!calendar" class="animate-pulse space-y-2 ltr">
      <div class="h-2 w-8 rounded bg-elevated/50 mb-3" />
      <div class="h-10 rounded-lg border border-border/40" :style="cardStyle" />
      <div class="h-10 rounded-lg border border-border/40" :style="cardStyle" />
      <div class="h-10 rounded-lg border border-border/40" :style="cardStyle" />
    </div>

    <!-- Loaded -->
    <div v-else class="ltr">
      <template v-if="calendar.authorized">

          <!-- Event days -->
          <template v-for="(day, i) in visibleDays" :key="day.date">
            <p class="text-[10px] text-secondary uppercase tracking-widest mb-2" :class="i > 0 ? 'mt-3' : ''">{{ day.label }}</p>
            <a
              v-for="e in day.allDay"
              :key="e.id"
              :href="e.url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-border text-left hover:border-accent/40 transition-colors no-underline group mb-1"
              :style="cardStyle"
            >
              <div class="w-1 self-stretch rounded-full shrink-0" :style="{ backgroundColor: e.color ?? 'var(--color-accent)' }" />
              <div class="min-w-0 flex-1">
                <p class="text-xs text-secondary font-medium truncate">{{ e.summary }}</p>
                <p class="text-[10px] text-muted">All day</p>
              </div>
              <svg class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            <a
              v-for="e in day.timed"
              :key="e.id"
              :href="e.url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 rounded-lg px-3 py-1.5 border text-left hover:border-accent/40 transition-colors no-underline group mb-1"
              :class="day.originalIndex === 0 ? 'border-border' : 'border-border/60'"
              :style="cardStyle"
            >
              <div class="w-1 self-stretch rounded-full shrink-0" :style="{ backgroundColor: e.color ?? (day.originalIndex === 0 ? 'var(--color-accent)' : 'rgba(255,255,255,0.25)') }" />
              <div class="min-w-0 flex-1">
                <p class="text-xs text-secondary font-medium truncate">{{ e.summary }}</p>
                <p class="text-[10px] text-muted">{{ formatTime(e.start!) }} - {{ formatTime(e.end!) }}</p>
              </div>
              <svg class="w-3 h-3 transition-colors shrink-0" :class="day.originalIndex === 0 ? 'text-white/20 group-hover:text-white/50' : 'text-white/15 group-hover:text-white/40'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </template>

          <p
            v-if="calendar.days.length && !visibleDays.length"
            class="text-xs text-muted italic"
          >No events</p>

          <!-- Tasks -->
          <template v-if="calendar.tasks?.length">
            <p class="text-[10px] text-secondary uppercase tracking-widest mt-3 mb-2">Tasks</p>
            <a
              v-for="t in calendar.tasks"
              :key="t.id"
              :href="t.url || undefined"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-border text-left hover:border-accent/40 transition-colors no-underline group mb-1"
              :style="cardStyle"
            >
              <div class="w-1 self-stretch rounded-full bg-emerald-400/70 shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-xs text-secondary font-medium truncate">{{ t.title }}</p>
                <p class="text-[10px] text-muted">{{ t.due ? formatDue(t.due) : 'No due date' }}</p>
              </div>
              <FaIcon icon="check" class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0 text-[10px]" />
            </a>
          </template>

        </template>

        <NuxtLink v-else-if="calendar.authorized === false" to="/admin/calendar" class="text-xs text-muted hover:text-secondary transition-colors">Set up Google Calendar</NuxtLink>
    </div>

  </div>
</template>

<style scoped>
.cal-scroll {
  direction: rtl;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.cal-scroll::-webkit-scrollbar {
  width: 4px;
}
.cal-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.cal-scroll::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 2px;
}
.cal-scroll::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-accent);
}
.ltr {
  direction: ltr;
}
</style>
