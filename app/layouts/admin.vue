<script setup lang="ts">
const route = useRoute()

const crumb = computed(() => {
  const seg = route.path.split('/').filter(Boolean)
  if (seg.length < 2) return null
  const name = seg[seg.length - 1]
  return name.charAt(0).toUpperCase() + name.slice(1)
})
</script>

<template>
  <div class="min-h-screen bg-base text-primary">
    <div class="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-border bg-surface flex-wrap">
      <div class="flex items-center gap-2">
        <NuxtLink to="/" class="text-muted hover:text-primary transition-colors text-sm cursor-pointer">Dashboard</NuxtLink>
        <span class="text-border">/</span>
        <NuxtLink to="/admin" class="text-muted hover:text-primary transition-colors text-sm cursor-pointer">Admin</NuxtLink>
        <template v-if="crumb">
          <span class="text-border">/</span>
          <span class="text-sm text-primary">{{ crumb }}</span>
        </template>
      </div>
      <div id="admin-header-actions" />
    </div>
    <slot />
  </div>
</template>
