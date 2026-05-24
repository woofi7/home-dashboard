<script setup lang="ts">
defineProps<{
  isDirty: boolean
  saving: boolean
  saveError?: string
  saveSuccess?: boolean
}>()
defineEmits<{ save: []; cancel: [] }>()
</script>

<template>
  <Teleport to="#admin-header-actions">
    <div class="flex items-center gap-3">
      <p v-if="saveError" class="text-xs text-danger">{{ saveError }}</p>
      <p v-else-if="saveSuccess" class="text-xs text-success">Saved</p>
      <p v-else-if="isDirty" class="text-xs text-warning">Unsaved changes</p>
      <button
        class="cursor-pointer px-3 py-1.5 rounded-lg text-sm border border-border text-muted hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="saving || !isDirty"
        @click="$emit('cancel')"
      >Cancel</button>
      <button
        class="cursor-pointer px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="saving || !isDirty"
        @click="$emit('save')"
      >{{ saving ? 'Saving...' : 'Save' }}</button>
    </div>
  </Teleport>
</template>
