<script setup lang="ts">
defineProps<{ active: boolean; dirty: boolean; pendingCount: number; countdown: number; locked?: boolean; offline?: boolean; authenticated?: boolean }>()
defineEmits<{ edit: []; save: []; rollback: []; refresh: []; logout: [] }>()
</script>

<template>
  <div class="fixed bottom-4 md:bottom-6 right-4 md:right-6 flex gap-1.5 md:gap-2 z-50">
    <button
      v-if="!active"
      class="fixed bottom-4 md:bottom-6 left-4 md:left-6 cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-muted text-xs md:text-sm hover:border-accent hover:text-accent transition-colors select-none"
      @click="$emit('refresh')"
    ><FaIcon icon="rotate-right" /> {{ countdown }}s</button>
    <template v-if="active">
      <NuxtLink
        v-if="!offline"
        to="/admin"
        class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-secondary text-xs md:text-sm hover:border-accent hover:text-accent-hover transition-colors"
      >Admin</NuxtLink>
      <span
        v-else
        class="px-3 md:px-4 py-2 rounded-xl bg-elevated border border-border text-muted text-xs md:text-sm cursor-not-allowed select-none"
        title="Unavailable while offline"
      >Admin</span>
      <button
        class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-surface border border-border text-muted text-xs md:text-sm hover:border-danger hover:text-danger transition-colors"
        title="Logout"
        @click="$emit('logout')"
      ><FaIcon icon="right-from-bracket" /></button>
      <button
        class="cursor-pointer px-3 md:px-4 py-2 rounded-xl bg-elevated border border-border text-secondary text-xs md:text-sm hover:border-danger hover:text-danger transition-colors"
        @click="$emit('rollback')"
      >Cancel</button>
      <button
        :disabled="!dirty || offline"
        class="px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors"
        :class="(dirty && !offline)
          ? 'cursor-pointer bg-accent text-white hover:bg-accent-hover'
          : 'bg-elevated text-muted border border-border cursor-not-allowed'"
        :title="offline ? 'Cannot save while offline' : undefined"
        @click="$emit('save')"
      >
        Save
        <span v-if="pendingCount > 0" class="ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-bold bg-warning text-base">{{ pendingCount }}</span>
      </button>
    </template>
    <template v-else>
      <button
        :disabled="offline"
        class="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm transition-colors"
        :class="offline
          ? 'bg-elevated border border-border text-muted cursor-not-allowed select-none'
          : 'cursor-pointer bg-surface border border-border text-muted hover:border-accent hover:text-accent-hover'"
        :title="offline ? 'Editing unavailable while offline' : undefined"
        @click="$emit('edit')"
      >
        <span v-if="authenticated" class="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        Edit
      </button>
    </template>
  </div>
</template>
