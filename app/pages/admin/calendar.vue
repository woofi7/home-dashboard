<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })
</script>

<template>
  <div class="px-4 md:px-6 py-6">
    <GoogleCalendarPanel />
  </div>
</template>
