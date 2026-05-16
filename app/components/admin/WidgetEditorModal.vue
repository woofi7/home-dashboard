<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

const props = defineProps<{
  type?: string
  initialYaml?: string
  isNew?: boolean
}>()

const emit = defineEmits<{ save: [type: string, yaml: string]; close: [] }>()

useScrollLock()

const widgetType = ref(props.type ?? '')
const yaml = ref(props.initialYaml ?? '')
const saveLoading = ref(false)
const saveError = ref('')
const typeError = ref('')
const yamlError = ref('')

useEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
})

async function save() {
  typeError.value = widgetType.value.trim() ? '' : 'Widget type is required'
  yamlError.value = yaml.value.trim() ? '' : 'YAML cannot be empty'
  if (typeError.value || yamlError.value) return

  saveLoading.value = true
  saveError.value = ''
  try {
    await $fetch('/api/admin/widgets', {
      method: 'POST',
      body: { type: widgetType.value.trim().toLowerCase(), yaml: yaml.value },
    })
    emit('save', widgetType.value.trim().toLowerCase(), yaml.value)
  } catch (e: unknown) {
    saveError.value = (e as { data?: { message?: string } }).data?.message ?? 'Save failed'
  } finally {
    saveLoading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
          <h2 class="font-semibold text-[var(--color-text-primary)]">{{ isNew ? 'Add Widget' : `Edit — ${type}` }}</h2>
          <button class="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" @click="$emit('close')">✕</button>
        </div>

        <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <!-- Widget type -->
          <div>
            <label class="block text-xs text-[var(--color-text-secondary)] mb-1">Widget type</label>
            <input
              v-model="widgetType"
              :disabled="!isNew"
              type="text"
              class="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50 font-mono"
              :class="typeError ? 'border-[var(--color-danger)]' : ''"
              placeholder="e.g. sonarr"
              @input="typeError = ''"
            />
            <p v-if="typeError" class="text-xs text-[var(--color-danger)] mt-1">{{ typeError }}</p>
          </div>

          <!-- YAML editor -->
          <div>
            <label class="block text-xs text-[var(--color-text-secondary)] mb-1">YAML definition</label>
            <textarea
              v-model="yaml"
              class="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors font-mono resize-none"
              :class="yamlError ? 'border-[var(--color-danger)]' : ''"
              rows="18"
              placeholder="name: MyWidget&#10;auth:&#10;  type: header&#10;  header: X-Api-Key&#10;  field: apiKey&#10;endpoints:&#10;  stats:&#10;    path: /api/stats&#10;    method: GET&#10;display:&#10;  - label: Count&#10;    value: '$.stats.count'"
              spellcheck="false"
              @input="yamlError = ''"
            />
            <p v-if="yamlError" class="text-xs text-[var(--color-danger)] mt-1">{{ yamlError }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center flex-shrink-0">
          <p v-if="saveError" class="text-xs text-[var(--color-danger)]">{{ saveError }}</p>
          <div v-else class="text-xs text-[var(--color-text-muted)]">Saved widgets go to config/custom-widgets/</div>
          <div class="flex gap-2">
            <button class="cursor-pointer px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" @click="$emit('close')">Cancel</button>
            <button
              class="cursor-pointer px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              :disabled="saveLoading"
              @click="save"
            >{{ saveLoading ? 'Saving…' : 'Save' }}</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
