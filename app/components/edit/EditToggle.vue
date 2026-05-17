<script setup lang="ts">
defineProps<{ active: boolean; dirty: boolean; pendingCount: number; countdown: number; editEnabled?: boolean; locked?: boolean }>()
defineEmits<{ edit: []; save: []; rollback: []; refresh: []; logout: [] }>()
</script>

<template>
  <div class="fixed bottom-4 md:bottom-6 right-4 md:right-6 flex gap-1.5 md:gap-2 z-50">
    <button
      v-if="!active"
      class="fixed bottom-4 md:bottom-6 left-4 md:left-6 cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-muted text-xs md:text-sm hover:border-accent hover:text-accent transition-colors select-none"
      @click="$emit('refresh')"
    >↻ {{ countdown }}s</button>
    <template v-if="active">
      <NuxtLink
        to="/admin"
        class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-secondary text-xs md:text-sm hover:border-accent hover:text-accent-hover transition-colors"
      >Admin</NuxtLink>
      <button
        class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-muted text-xs md:text-sm hover:border-danger hover:text-danger transition-colors"
        title="Logout"
        @click="$emit('logout')"
      >⎋</button>
      <button
        class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-elevated border border-border text-secondary text-xs md:text-sm hover:border-danger hover:text-danger transition-colors"
        @click="$emit('rollback')"
      >Cancel</button>
      <button
        :disabled="!dirty"
        class="px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors"
        :class="dirty
          ? 'cursor-pointer bg-accent text-white hover:bg-accent-hover'
          : 'bg-elevated text-muted border border-border cursor-not-allowed'"
        @click="$emit('save')"
      >
        Save
        <span v-if="pendingCount > 0" class="ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-bold bg-warning text-bg-base">{{ pendingCount }}</span>
      </button>
    </template>
    <template v-else-if="editEnabled">
      <button
        v-if="locked"
        class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-muted text-xs md:text-sm hover:border-accent hover:text-accent-hover transition-colors"
        @click="$emit('edit')"
      >Edit</button>
      <template v-else>
        <button
          class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-secondary text-xs md:text-sm hover:border-accent hover:text-accent-hover transition-colors"
          @click="$emit('edit')"
        >Edit</button>
      </template>
    </template>
  </div>
</template>
