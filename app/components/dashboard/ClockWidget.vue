<script setup lang="ts">
const now = ref<Date | null>(null)
onMounted(() => {
  now.value = new Date()
  setInterval(() => { now.value = new Date() }, 1000)
})
const timeStr = computed(() => now.value?.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) ?? '')
const dateStr = computed(() => now.value?.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) ?? '')
</script>

<template>
  <div class="flex flex-col items-center select-none text-center order-1 md:order-2 md:min-w-[280px]">
    <div class="text-[clamp(2.5rem,6vw,5rem)] font-light tracking-widest tabular-nums text-white [text-shadow:0_2px_24px_rgba(0,0,0,1),0_0_60px_rgba(0,0,0,0.8)]">{{ timeStr }}</div>
    <div class="text-sm text-white/80 mt-1 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">{{ dateStr }}</div>
  </div>
</template>
