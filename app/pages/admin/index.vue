<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

watch([() => useAuth().editEnabled.value, () => useAuth().needsLogin.value], ([enabled, locked]) => {
  if (!enabled || locked) navigateTo('/')
})
</script>

<template>
  <div class="px-6 py-8">
    <h1 class="text-lg font-semibold mb-6">Settings</h1>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">

      <NuxtLink
        to="/admin/settings"
        class="group rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <FaIcon icon="gear" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">General</p>
        <p class="text-xs text-muted mt-1">Dashboard title and general configuration</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/appearance"
        class="group rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <FaIcon icon="image" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Appearance</p>
        <p class="text-xs text-muted mt-1">Background, sections and cards appearance</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/weather"
        class="group rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <FaIcon icon="cloud-sun-rain" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Weather</p>
        <p class="text-xs text-muted mt-1">Location source, units and widget display options</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/widgets"
        class="group rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <FaIcon icon="table-cells" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Widget Fields</p>
        <p class="text-xs text-muted mt-1">Configure visible fields for each widget type</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/calendar"
        class="group rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <FaIcon icon="calendar-days" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Google Calendar</p>
        <p class="text-xs text-muted mt-1">Connect your Google account to show today's events</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/backup"
        class="group rounded-xl border border-border bg-surface p-6 hover:border-accent/50 hover:bg-elevated transition-colors cursor-pointer"
      >
        <FaIcon icon="file-zipper" class="text-2xl text-muted group-hover:text-accent transition-colors mb-3" />
        <p class="font-medium text-primary group-hover:text-accent transition-colors">Backup & Restore</p>
        <p class="text-xs text-muted mt-1">Download or restore config files as a zip archive</p>
      </NuxtLink>

    </div>
  </div>
</template>
