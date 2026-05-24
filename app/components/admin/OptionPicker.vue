<script setup lang="ts">
defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  size?: 'sm' | 'md'
}>()

defineEmits<{ 'update:modelValue': [v: string] }>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="opt in options"
      :key="opt.value"
      :class="[
        'rounded-lg border transition-colors cursor-pointer',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        modelValue === opt.value
          ? 'bg-accent/15 border-accent/40 text-accent'
          : 'bg-transparent border-border text-muted hover:text-primary',
      ]"
      @click="$emit('update:modelValue', opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>
