<script setup lang="ts">
type CalEvent = { id: string; summary: string; url: string; start?: string; end?: string; allDay?: boolean }
type CalDay   = { label: string; date: string; timed: CalEvent[]; allDay: CalEvent[] }
type CalTask  = { id: string; title: string; due?: string; notes?: string; url: string }
type CalendarData = { authorized: boolean; days: CalDay[]; tasks: CalTask[] }

defineProps<{ calendar?: CalendarData | null }>()

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDue(d: string) {
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })
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

          <!-- Event days -->
          <template v-for="(day, i) in calendar.days" :key="day.date">
            <template v-if="day.timed.length || day.allDay.length">
              <p class="text-[10px] text-white/50 uppercase tracking-widest mb-2" :class="i > 0 ? 'mt-3' : ''">{{ day.label }}</p>
              <a
                v-for="e in day.allDay"
                :key="e.id"
                :href="e.url"
                target="_blank"
                rel="noopener"
                class="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 text-left hover:border-white/25 transition-colors no-underline group mb-1"
              >
                <div class="w-1 self-stretch rounded-full bg-purple-400/70 shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-white/80 font-medium truncate">{{ e.summary }}</p>
                  <p class="text-[10px] text-white/55">All day</p>
                </div>
                <svg class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
              <a
                v-for="e in day.timed"
                :key="e.id"
                :href="e.url"
                target="_blank"
                rel="noopener"
                class="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 text-left hover:border-white/25 transition-colors no-underline group mb-1"
                :class="i === 0 ? 'border-white/10' : 'bg-black/20 border-white/8'"
              >
                <div class="w-1 self-stretch rounded-full shrink-0" :class="i === 0 ? 'bg-accent' : 'bg-white/25'" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium truncate" :class="i === 0 ? 'text-white/80' : 'text-white/70'">{{ e.summary }}</p>
                  <p class="text-[10px]" :class="i === 0 ? 'text-white/55' : 'text-white/45'">{{ formatTime(e.start!) }} - {{ formatTime(e.end!) }}</p>
                </div>
                <svg class="w-3 h-3 transition-colors shrink-0" :class="i === 0 ? 'text-white/20 group-hover:text-white/50' : 'text-white/15 group-hover:text-white/40'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </template>
          </template>

          <p
            v-if="calendar.days.length && calendar.days.every(d => !d.timed.length && !d.allDay.length)"
            class="text-xs text-white/50 italic"
          >No events</p>

          <!-- Tasks -->
          <template v-if="calendar.tasks?.length">
            <p class="text-[10px] text-white/50 uppercase tracking-widest mt-3 mb-2">Tasks</p>
            <a
              v-for="t in calendar.tasks"
              :key="t.id"
              :href="t.url || undefined"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 text-left hover:border-white/25 transition-colors no-underline group mb-1"
            >
              <div class="w-1 self-stretch rounded-full bg-emerald-400/70 shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-xs text-white/80 font-medium truncate">{{ t.title }}</p>
                <p class="text-[10px] text-white/55">{{ t.due ? formatDue(t.due) : 'No due date' }}</p>
              </div>
              <FaIcon icon="check" class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0 text-[10px]" />
            </a>
          </template>

        </template>
        <NuxtLink v-else-if="calendar.authorized === false" to="/admin/calendar" class="text-xs text-white/30 hover:text-white/60 transition-colors">Set up Google Calendar</NuxtLink>
      </div>
    </div>
  </div>
</template>
