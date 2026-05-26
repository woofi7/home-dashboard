<script setup lang="ts">
defineProps<{
  server: string
  container: string
  serverError?: string
  containerError?: string
}>()
const emit = defineEmits<{
  'update:server': [v: string]
  'update:container': [v: string]
}>()

type DockerServerConfig = { host?: string; port?: number; socket?: string }

const { data: configuredServers } = useFetch<Record<string, DockerServerConfig>>('/api/admin/docker', {
  key: 'docker-servers',
})

const serverOptions = computed(() => {
  const servers = configuredServers.value ?? {}
  const names = Object.keys(servers).filter(n => n !== 'local')
  return [
    { value: '', label: 'None' },
    { value: 'local', label: 'localhost' },
    ...names.map(name => ({ value: name, label: name })),
  ]
})
</script>

<template>
  <Field label="Docker">
    <div class="space-y-2">
      <div>
        <label class="text-[10px] text-muted mb-1 block">Server</label>
        <select
          :value="server"
          class="modal-input font-mono text-xs"
          :class="serverError ? 'border-danger' : ''"
          @change="emit('update:server', ($event.target as HTMLSelectElement).value); emit('update:container', '')"
        >
          <option v-for="opt in serverOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <p v-if="serverError" class="text-xs text-danger mt-1">{{ serverError }}</p>
      </div>
      <div v-if="server">
        <label class="text-[10px] text-muted mb-1 block">Container</label>
        <input
          :value="container"
          type="text"
          class="modal-input font-mono text-xs"
          :class="containerError ? 'border-danger' : ''"
          placeholder=""
          autocomplete="off"
          @input="emit('update:container', ($event.target as HTMLInputElement).value)"
        />
        <p v-if="containerError" class="text-xs text-danger mt-1">{{ containerError }}</p>
      </div>
    </div>
  </Field>
</template>
