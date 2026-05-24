<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

watch([() => useAuth().editEnabled.value, () => useAuth().needsLogin.value], ([enabled, locked]) => {
  if (!enabled || locked) navigateTo('/')
})
</script>

<template>
  <div class="px-4 md:px-6 py-6">
    <BackgroundPanel />
  </div>
</template>
