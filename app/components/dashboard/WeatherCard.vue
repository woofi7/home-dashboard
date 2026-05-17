<script setup lang="ts">
type HourForecast = { time: string; icon: string; temp: number; precip: number }
type DayForecast = { icon: string; description: string; tempMax: number; tempMin: number; precip: number }
type WeatherData = {
  url: string; icon: string; temp: number; description: string
  city: string; feels: number; humidity: number; wind: number
  laterToday: HourForecast[]
  tomorrow: DayForecast | null
}

defineProps<{ weather?: WeatherData | null }>()
</script>

<template>
  <div class="order-3">
    <Transition name="fade" mode="out-in">
      <div v-if="!weather" key="wx-ghost" class="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 animate-pulse space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-white/10 shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-6 w-20 rounded-lg bg-white/10" />
            <div class="h-3 w-40 rounded bg-white/10" />
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <div v-for="i in 4" :key="i" class="flex-1 h-16 rounded-lg bg-white/10" />
        </div>
      </div>
      <div v-else key="wx-real" class="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <a :href="weather.url" target="_blank" rel="noopener" class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors no-underline group">
          <span class="text-3xl leading-none">{{ weather.icon }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-semibold text-white">{{ weather.temp }}°C</span>
              <span class="text-sm text-white/70">{{ weather.description }}</span>
            </div>
            <div class="text-[11px] text-white/55 mt-0.5">
              {{ weather.city }} · Feels {{ weather.feels }}° · 💧{{ weather.humidity }}% · 💨 {{ weather.wind }} km/h
            </div>
          </div>
          <svg class="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
        <div v-if="weather.laterToday?.length" class="border-t border-white/8 px-4 py-2">
          <p class="text-[9px] text-white/45 uppercase tracking-widest mb-2">Later today</p>
          <div class="flex gap-3 justify-between">
            <div v-for="h in weather.laterToday" :key="h.time" class="flex flex-col items-center gap-0.5 text-center flex-1">
              <span class="text-[10px] text-white/55">{{ h.time }}</span>
              <span class="text-base leading-none">{{ h.icon }}</span>
              <span class="text-xs font-medium text-white/80">{{ h.temp }}°</span>
              <span v-if="h.precip > 0" class="text-[9px] text-blue-300/60">{{ h.precip }}%</span>
            </div>
          </div>
        </div>
        <div v-if="weather.tomorrow" class="border-t border-white/8 px-4 py-2.5 flex items-center gap-3">
          <p class="text-[9px] text-white/45 uppercase tracking-widest w-14 shrink-0">Tomorrow</p>
          <span class="text-xl leading-none">{{ weather.tomorrow.icon }}</span>
          <span class="text-sm text-white/70">{{ weather.tomorrow.description }}</span>
          <div class="ml-auto flex items-baseline gap-1.5 text-xs shrink-0">
            <span class="text-white/80 font-medium">{{ weather.tomorrow.tempMax }}°</span>
            <span class="text-white/50">/ {{ weather.tomorrow.tempMin }}°</span>
          </div>
          <div v-if="weather.tomorrow.precip > 0" class="text-[10px] text-blue-300/60 shrink-0">{{ weather.tomorrow.precip }}%</div>
        </div>
      </div>
    </Transition>
  </div>
</template>
