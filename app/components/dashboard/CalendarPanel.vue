<script setup lang="ts">
type CalEvent = { id: string; summary: string; url: string; start?: string; end?: string; allDay?: boolean }
type CalendarData = { authorized: boolean; todayAllDay: CalEvent[]; todayTimed: CalEvent[]; tomorrow: CalEvent[] }

defineProps<{ calendar?: CalendarData | null }>()

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>

<template>
  <div class="space-y-1.5 order-2 md:order-1">
    <div>
      <div v-if="!calendar" class="space-y-2 animate-pulse">
        <div class="h-2.5 w-8 rounded bg-white/10 mb-3" />
        <div class="h-10 rounded-lg bg-white/10" />
        <div class="h-10 rounded-lg bg-white/10" />
        <div class="h-10 rounded-lg bg-white/10" />
      </div>
      <div v-else>
        <template v-if="calendar.authorized">
          <p class="text-[10px] text-white/50 uppercase tracking-widest mb-2">Today</p>
          <a
            v-for="e in calendar.todayAllDay"
            :key="e.id"
            :href="e.url"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 text-left hover:border-white/25 transition-colors no-underline group"
          >
            <div class="w-1 self-stretch rounded-full bg-purple-400/70 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-white/80 font-medium truncate">{{ e.summary }}</p>
              <p class="text-[10px] text-white/55">All day</p>
            </div>
            <svg class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <a
            v-for="e in calendar.todayTimed"
            :key="e.id"
            :href="e.url"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 text-left hover:border-white/25 transition-colors no-underline group"
          >
            <div class="w-1 self-stretch rounded-full bg-accent shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-white/80 font-medium truncate">{{ e.summary }}</p>
              <p class="text-[10px] text-white/55">{{ formatTime(e.start!) }} – {{ formatTime(e.end!) }}</p>
            </div>
            <svg class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <p v-if="!calendar.todayAllDay.length && !calendar.todayTimed.length" class="text-xs text-white/50 italic">No events today</p>
          <template v-if="calendar.tomorrow?.length">
            <p class="text-[10px] text-white/50 uppercase tracking-widest mt-3 mb-2">Tomorrow</p>
            <a
              v-for="e in calendar.tomorrow"
              :key="'tmr-' + e.id"
              :href="e.url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/8 text-left hover:border-white/20 transition-colors no-underline group"
            >
              <div class="w-1 self-stretch rounded-full bg-white/25 shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-xs text-white/70 font-medium truncate">{{ e.summary }}</p>
                <p class="text-[10px] text-white/45">{{ e.allDay ? 'All day' : `${formatTime(e.start!)} – ${formatTime(e.end!)}` }}</p>
              </div>
              <svg class="w-3 h-3 text-white/15 group-hover:text-white/40 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </template>
        </template>
        <NuxtLink v-else-if="calendar.authorized === false" to="/admin/calendar" class="text-xs text-white/30 hover:text-white/60 transition-colors">Set up Google Calendar →</NuxtLink>
      </div>
    </div>
  </div>
</template>
