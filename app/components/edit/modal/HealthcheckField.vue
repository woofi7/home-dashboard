<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

type HcType = 'auto' | 'none' | 'docker' | 'http'

const type = computed<HcType>(() => {
  const v = props.modelValue
  if (!v || v === 'auto') return 'auto'
  if (v === 'none') return 'none'
  if (v === 'docker') return 'docker'
  return 'http'
})

function initialUrl(v: string): string {
  return (v && v !== 'none' && v !== 'docker' && v !== 'http') ? v : ''
}

const localUrl = ref(initialUrl(props.modelValue))

function onTypeChange(t: HcType) {
  if (t === 'auto') emit('update:modelValue', '')
  else if (t === 'none') emit('update:modelValue', 'none')
  else if (t === 'docker') emit('update:modelValue', 'docker')
  else emit('update:modelValue', localUrl.value || 'http')
}

function onUrlInput(url: string) {
  localUrl.value = url
  emit('update:modelValue', url.trim() || 'http')
}

const TYPE_OPTIONS: { value: HcType; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Docker container if configured, otherwise ping service URL' },
  { value: 'none', label: 'None', description: 'Disable the status dot for this service' },
  { value: 'docker', label: 'Docker', description: 'Show Docker container state only' },
  { value: 'http', label: 'HTTP', description: 'Ping via HTTP (service URL, or specify a custom URL below)' },
]
</script>

<template>
  <Field label="Healthcheck">
    <div class="flex gap-1.5 flex-wrap">
      <button
        v-for="opt in TYPE_OPTIONS"
        :key="opt.value"
        type="button"
        :title="opt.description"
        class="px-3 py-1.5 rounded-lg text-xs border transition-colors"
        :class="type === opt.value ? 'bg-accent text-white border-accent' : 'bg-elevated border-border text-muted hover:border-accent'"
        @click="onTypeChange(opt.value)"
      >{{ opt.label }}</button>
    </div>
    <div v-if="type === 'http'" class="mt-2">
      <input
        type="url"
        class="modal-input"
        placeholder="Leave empty to use service URL"
        :value="localUrl"
        autocomplete="off"
        @input="onUrlInput(($event.target as HTMLInputElement).value)"
      />
      <p class="text-[10px] text-muted mt-1">Optional: ping a different URL (e.g. <span class="font-mono">http://host/health</span>)</p>
    </div>
  </Field>
</template>
