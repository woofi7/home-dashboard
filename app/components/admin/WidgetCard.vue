<script setup lang="ts">
defineProps<{
  type: string
  entry: { name: string; authType: string; fields: { label: string; desc?: string }[] }
  activeLabels: string[]
  isDirty: boolean
  saving: boolean
  authColors: Record<string, string>
}>()

const emit = defineEmits<{ toggleField: [label: string]; save: [] }>()
</script>

<template>
  <div class="rounded-xl border border-border bg-surface flex flex-col">
    <div class="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
      <span class="font-semibold text-primary flex-1">{{ entry.name }}</span>
      <span
        class="px-2 py-0.5 rounded-md text-xs font-medium border"
        :style="{
          color: authColors[entry.authType] ?? authColors.none,
          borderColor: (authColors[entry.authType] ?? authColors.none) + '40',
          background: (authColors[entry.authType] ?? authColors.none) + '15',
        }"
      >{{ entry.authType }}</span>
    </div>
    <div class="px-4 py-3 flex-1">
      <p class="text-xs text-muted mb-2 font-medium uppercase tracking-wide">Fields</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="field in entry.fields"
          :key="field.label"
          :title="field.desc"
          class="cursor-pointer px-2 py-0.5 rounded-md text-xs border transition-colors"
          :class="activeLabels.includes(field.label) ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-transparent border-border text-muted'"
          @click="emit('toggleField', field.label)"
        >{{ field.label }}</button>
      </div>
    </div>
    <div class="flex items-center justify-between px-4 pb-4 pt-2 gap-2">
      <p class="text-xs text-muted">{{ activeLabels.filter(l => entry.fields.some(f => f.label === l)).length }} / {{ entry.fields.length }} fields shown</p>
      <button
        v-if="isDirty"
        class="cursor-pointer px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
        :disabled="saving"
        @click="emit('save')"
      >{{ saving ? 'Saving...' : 'Save' }}</button>
    </div>
  </div>
</template>
