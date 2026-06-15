<script setup lang="ts">
type PassEntry = { name: string; count: number }
type PublicTransitData = { passes: PassEntry[]; url: string }

defineProps<{ data: PublicTransitData | null }>()

const { sectionStyle } = useAppearanceSettings()

function countColor(count: number) {
  if (count === 0)
    return 'text-danger'
  if (count <= 2)
    return 'text-warning'
  return 'text-primary'
}
</script>

<template>
  <div v-if="data" class="rounded-xl border border-border overflow-hidden" :style="sectionStyle">
    <a
      :href="data.url"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-2 px-4 py-2 border-b border-border/60 hover:bg-elevated/40 transition-colors no-underline group"
    >
      <FaIcon icon="bus" class="text-muted text-sm shrink-0" />
      <span class="text-[10px] text-muted uppercase tracking-widest flex-1">Public transit passes</span>
      <svg class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
    <div class="px-4 py-2 space-y-1.5">
      <div
        v-for="pass in data.passes"
        :key="pass.name"
        class="flex items-baseline justify-between gap-3"
      >
        <span class="text-[11px] text-secondary truncate">{{ pass.name }}</span>
        <span class="text-sm font-semibold shrink-0" :class="countColor(pass.count)">{{ pass.count }}</span>
      </div>
      <p v-if="!data.passes.length" class="text-xs text-muted italic">No passes found</p>
    </div>
  </div>
</template>
