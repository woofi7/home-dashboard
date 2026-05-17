<script setup lang="ts">
type TestResult = { ok: boolean; status?: number; message?: string; fields?: { label: string; value: unknown }[] }
defineProps<{ result: TestResult | null }>()
</script>

<template>
  <div v-if="result" class="px-6 pb-3 space-y-1.5">
    <p class="text-xs font-medium flex items-center gap-1.5" :class="result.ok ? 'text-success' : 'text-danger'">
      <FaIcon :icon="result.ok ? 'check' : 'xmark'" />
      <span v-if="result.ok">Connected</span>
      <span v-else>Failed{{ result.status ? ` (${result.status})` : '' }}{{ result.message ? ` - ${result.message}` : '' }}</span>
    </p>
    <div v-if="result.ok && result.fields?.length" class="rounded-lg bg-elevated border border-border px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
      <span v-for="f in result.fields" :key="f.label" class="text-xs">
        <span class="text-muted">{{ f.label }}:</span>
        <span class="ml-1 text-primary font-mono">{{ f.value ?? '—' }}</span>
      </span>
    </div>
  </div>
</template>
