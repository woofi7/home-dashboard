<script setup lang="ts">
const route = useRoute()

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Admin',
  '/admin/settings': 'General',
  '/admin/appearance': 'Appearance',
  '/admin/service-fields': 'Service Fields',
  '/admin/widgets': 'Widgets',
  '/admin/widgets/calendar': 'Google Calendar',
  '/admin/widgets/weather': 'Weather',
  '/admin/widgets/publictransit': 'Public Transit',
  '/admin/backup': 'Backup & Restore',
  '/admin/docker': 'Docker',
}

const PARENT_ROUTES: Record<string, string> = {
  '/admin/widgets/calendar': '/admin/widgets',
  '/admin/widgets/weather': '/admin/widgets',
  '/admin/widgets/publictransit': '/admin/widgets',
}

const headerRef = ref<HTMLElement>()

onMounted(() => {
  if (!headerRef.value) return
  const ro = new ResizeObserver(([entry]) => {
    const h = entry.borderBoxSize?.[0]?.blockSize ?? (headerRef.value?.getBoundingClientRect().height ?? 0)
    document.documentElement.style.setProperty('--admin-header-h', `${Math.ceil(h)}px`)
  })
  ro.observe(headerRef.value)
  onUnmounted(() => ro.disconnect())
})

const isRoot = computed(() => route.path === '/admin')
const parentRoute = computed(() => PARENT_ROUTES[route.path] ?? null)
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
    <div ref="headerRef" class="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-border bg-surface">
      <div class="flex items-center gap-2 min-w-0">
        <NuxtLink
          to="/"
          class="text-muted hover:text-primary transition-colors text-sm shrink-0"
        >Dashboard</NuxtLink>
        <span class="text-border shrink-0">/</span>
        <template v-if="isRoot">
          <span class="font-semibold text-primary truncate">Admin</span>
        </template>
        <template v-else>
          <NuxtLink
            to="/admin"
            class="text-muted hover:text-primary transition-colors text-sm shrink-0"
          >Admin</NuxtLink>
          <template v-if="parentRoute">
            <span class="text-border shrink-0">/</span>
            <NuxtLink
              :to="parentRoute"
              class="text-muted hover:text-primary transition-colors text-sm shrink-0"
            >{{ PAGE_TITLES[parentRoute] }}</NuxtLink>
          </template>
          <span class="text-border shrink-0">/</span>
          <span class="font-semibold text-primary truncate">{{ pageTitle }}</span>
        </template>
      </div>
      <div id="admin-header-actions" class="flex items-center gap-2 shrink-0" />
    </div>
    <slot />
  </div>
</template>
