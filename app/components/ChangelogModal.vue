<script setup lang="ts">
import type { ChangelogEntry } from '#shared/changelog'

defineProps<{ entry: ChangelogEntry }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-surface border border-border rounded-2xl p-6 w-88 shadow-2xl">
        <div class="flex items-center gap-2 mb-1">
          <FaIcon icon="gift" class="text-accent text-sm" />
          <h2 class="text-base font-semibold text-primary">What's new in {{ entry.version }}</h2>
        </div>
        <ul class="mt-3 mb-5 space-y-2">
          <li
            v-for="note in entry.notes"
            :key="note"
            class="flex items-start gap-2 text-sm text-primary"
          >
            <FaIcon icon="check" class="text-accent mt-0.5 shrink-0 text-xs" />
            <span>{{ note }}</span>
          </li>
        </ul>
        <div class="flex justify-end">
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
            @click="$emit('close')"
          >Got it</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
