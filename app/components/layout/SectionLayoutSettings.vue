<script setup lang="ts">
export type LayoutSettings = {
  columns?: number
  gap?: 'tight' | 'normal' | 'loose'
  justify?: 'start' | 'center' | 'end' | 'between'
  mobile?: {
    columns?: number
    gap?: 'tight' | 'normal' | 'loose'
    justify?: 'start' | 'center' | 'end' | 'between'
  }
}

const props = defineProps<{ modelValue: LayoutSettings }>()
const emit = defineEmits<{ 'update:modelValue': [v: LayoutSettings] }>()

const open = ref(false)
const view = ref<'desktop' | 'mobile'>('desktop')

const active = computed(() =>
  view.value === 'mobile' ? (props.modelValue.mobile ?? {}) : props.modelValue
)

function set<K extends 'columns' | 'gap' | 'justify'>(key: K, val: LayoutSettings[K]) {
  if (view.value === 'desktop') {
    emit('update:modelValue', { ...props.modelValue, [key]: val })
  } else {
    emit('update:modelValue', {
      ...props.modelValue,
      mobile: { ...(props.modelValue.mobile ?? {}), [key]: val },
    })
  }
}

const GAPS = [
  { label: 'Tight', value: 'tight' },
  { label: 'Normal', value: 'normal' },
  { label: 'Loose', value: 'loose' },
] as const

const JUSTIFY = [
  { label: 'Start', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'end' },
  { label: 'Between', value: 'between' },
] as const
</script>

<template>
  <div class="relative">
    <button
      class="text-xs px-1 transition-colors"
      :class="open ? 'text-[var(--color-accent-hover)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'"
      title="Layout settings"
      @click="open = !open"
    >⊞</button>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-1 z-40 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-3 w-56 shadow-xl shadow-black/40"
    >
      <!-- Desktop / Mobile toggle -->
      <div class="flex gap-1 mb-3 p-0.5 bg-[var(--color-bg-surface)] rounded-lg">
        <button
          class="flex-1 py-1 rounded-md text-xs font-medium transition-colors"
          :class="view === 'desktop' ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'"
          @click="view = 'desktop'"
        >Desktop</button>
        <button
          class="flex-1 py-1 rounded-md text-xs font-medium transition-colors"
          :class="view === 'mobile' ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'"
          @click="view = 'mobile'"
        >Mobile</button>
      </div>

      <!-- Columns -->
      <div class="mb-3">
        <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Items per row</div>
        <div class="flex gap-1 flex-wrap">
          <button
            class="px-2 py-0.5 rounded text-xs transition-colors"
            :class="!active.columns ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'"
            @click="set('columns', undefined)"
          >Auto</button>
          <button
            v-for="n in [1, 2, 3, 4, 5, 6, 8]"
            :key="n"
            class="px-2 py-0.5 rounded text-xs transition-colors"
            :class="active.columns === n ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'"
            @click="set('columns', n)"
          >{{ n }}</button>
        </div>
      </div>

      <!-- Gap -->
      <div class="mb-3">
        <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Gap</div>
        <div class="flex gap-1">
          <button
            v-for="g in GAPS"
            :key="g.value"
            class="flex-1 py-0.5 rounded text-xs transition-colors"
            :class="(active.gap ?? 'normal') === g.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'"
            @click="set('gap', g.value)"
          >{{ g.label }}</button>
        </div>
      </div>

      <!-- Justify -->
      <div>
        <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Justify</div>
        <div class="flex gap-1">
          <button
            v-for="j in JUSTIFY"
            :key="j.value"
            class="flex-1 py-0.5 rounded text-xs transition-colors"
            :class="(active.justify ?? 'start') === j.value ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'"
            @click="set('justify', j.value)"
          >{{ j.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
