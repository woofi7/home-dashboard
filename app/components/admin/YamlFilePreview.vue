<script setup lang="ts">
defineProps<{
  filename: string
  content?: string
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{ load: [] }>()

const open = ref(false)

function toggle() {
  open.value = !open.value
  if (open.value)
    emit('load')
}
</script>

<template>
  <div class="rounded-lg border border-border bg-elevated overflow-hidden">
    <div class="flex items-center gap-3 px-3 py-2">
      <FaIcon icon="file" class="text-muted text-xs shrink-0" />
      <span class="text-sm text-secondary flex-1 truncate">{{ filename }}</span>
      <slot />
      <button
        class="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors shrink-0"
        :class="open ? 'text-accent' : 'text-muted hover:text-accent'"
        @click="toggle"
      >
        <FaIcon :icon="open ? 'eye-slash' : 'eye'" />
        {{ open ? 'Hide' : 'Preview' }}
      </button>
      <slot name="actions" />
    </div>
    <div v-if="open" class="border-t border-border">
      <div v-if="loading" class="px-3 py-3 text-xs text-muted">Loading...</div>
      <div v-else-if="error" class="px-3 py-3 text-xs text-danger">{{ error }}</div>
      <pre v-else class="px-3 py-3 text-xs text-secondary font-mono overflow-x-auto max-h-64 whitespace-pre-wrap break-words">{{ content }}</pre>
    </div>
  </div>
</template>
