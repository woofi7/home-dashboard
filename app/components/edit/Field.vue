<script setup lang="ts">
defineProps<{ label: string; required?: boolean }>()
</script>

<template>
  <div>
    <label class="block text-xs text-muted mb-1 font-medium">
      {{ label }}<span v-if="required" class="text-danger ml-0.5">*</span>
    </label>
    <slot />
  </div>
</template>
