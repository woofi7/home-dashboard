<script setup lang="ts">
const route = useRoute()

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Admin',
  '/admin/settings': 'General',
  '/admin/appearance': 'Appearance',
  '/admin/weather': 'Weather',
  '/admin/widgets': 'Widget Fields',
  '/admin/calendar': 'Google Calendar',
  '/admin/backup': 'Backup & Restore',
  '/admin/docker': 'Docker',
}

const isRoot = computed(() => route.path === '/admin')
const pageTitle = computed(() => {
  if (PAGE_TITLES[route.path])
    return PAGE_TITLES[route.path]
  const seg = route.path.split('/').filter(Boolean)
  const last = seg[seg.length - 1] ?? ''
  return last.charAt(0).toUpperCase() + last.slice(1)
})
</script>

<template>
  <div class="min-h-screen bg-base text-primary">
    <div class="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-border bg-surface">
      <div class="flex items-center gap-3 min-w-0">
        <NuxtLink
          v-if="!isRoot"
          to="/admin"
          class="text-muted hover:text-primary transition-colors text-sm shrink-0 flex items-center gap-1.5"
        >
          <FaIcon icon="chevron-left" class="text-xs" />
          Admin
        </NuxtLink>
        <NuxtLink
          v-else
          to="/"
          class="text-muted hover:text-primary transition-colors text-sm shrink-0"
        >Dashboard</NuxtLink>
        <span v-if="!isRoot" class="text-border shrink-0">/</span>
        <span class="font-semibold text-primary truncate">{{ pageTitle }}</span>
      </div>
      <div id="admin-header-actions" class="flex items-center gap-2 shrink-0" />
    </div>
    <slot />
  </div>
</template>
