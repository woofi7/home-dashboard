<script setup lang="ts">
defineProps<{ message: string }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('cancel')">
      <div class="bg-surface border border-border rounded-2xl p-6 w-80 shadow-2xl">
        <p class="text-sm text-primary mb-5">{{ message }}</p>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 rounded-lg text-sm text-muted hover:text-primary transition-colors cursor-pointer"
            @click="$emit('cancel')"
          >Stay</button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:opacity-90 transition-opacity cursor-pointer"
            @click="$emit('confirm')"
          >Discard & leave</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
