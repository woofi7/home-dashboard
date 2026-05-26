<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string]; browse: [] }>()
</script>

<template>
  <Field label="Icon">
    <div class="flex gap-2 items-center">
      <div class="w-9 h-9 rounded-lg bg-elevated border border-border flex items-center justify-center overflow-hidden shrink-0">
        <img
          v-if="modelValue"
          :src="modelValue"
          alt=""
          class="w-7 h-7 object-contain"
          @error="($event.target as HTMLImageElement).style.opacity = '0'"
        />
      </div>
      <input
        :value="modelValue"
        type="text"
        class="modal-input"
        placeholder="Search or paste URL..."
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        class="shrink-0 w-9 h-9 rounded-lg bg-elevated border border-border flex items-center justify-center text-secondary hover:border-accent hover:text-accent-hover transition-colors"
        title="Search icons"
        @click="emit('browse')"
      ><FaIcon icon="magnifying-glass" /></button>
    </div>
  </Field>
</template>
