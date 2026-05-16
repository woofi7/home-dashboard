<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

type Bookmark = { name: string; url: string; icon?: string }

const props = defineProps<{ bookmark: Bookmark | null }>()
const emit = defineEmits<{ save: [b: Bookmark]; close: [] }>()

const form = reactive<Bookmark>({
  name: props.bookmark?.name ?? '',
  url: props.bookmark?.url ?? '',
  icon: props.bookmark?.icon ?? '',
})

useScrollLock()
const showIconPicker = ref(false)
const errors = reactive<Record<string, string>>({})

useEventListener('keydown', (e: KeyboardEvent) => {
  if (showIconPicker.value) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter') submit()
})

function submit() {
  errors.name = form.name ? '' : 'Name is required'
  errors.url = form.url ? '' : 'URL is required'
  if (errors.name || errors.url) return
  emit('save', { ...form })
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" >
      <div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm mx-4">
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 class="font-semibold text-[var(--color-text-primary)]">{{ bookmark ? 'Edit bookmark' : 'Add bookmark' }}</h2>
          <button class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" @click="$emit('close')">✕</button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <Field label="Name" required>
            <input v-model="form.name" type="text" class="modal-input" :class="errors.name ? 'border-[var(--color-danger)]' : ''" placeholder="GitHub" @input="errors.name = ''" />
            <p v-if="errors.name" class="text-xs text-[var(--color-danger)] mt-1">{{ errors.name }}</p>
          </Field>
          <Field label="URL" required>
            <input v-model="form.url" type="text" class="modal-input" :class="errors.url ? 'border-[var(--color-danger)]' : ''" placeholder="https://github.com" @input="errors.url = ''" />
            <p v-if="errors.url" class="text-xs text-[var(--color-danger)] mt-1">{{ errors.url }}</p>
          </Field>
          <Field label="Icon">
            <div class="flex gap-2 items-center">
              <div class="w-9 h-9 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  v-if="form.icon"
                  :src="form.icon"
                  class="w-7 h-7 object-contain"
                  @error="($event.target as HTMLImageElement).style.opacity = '0'"
                />
              </div>
              <input v-model="form.icon" type="text" class="modal-input" placeholder="Search or paste URL…" />
              <button
                class="flex-shrink-0 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors whitespace-nowrap"
                @click="showIconPicker = true"
              >Browse</button>
            </div>
          </Field>
        </div>
        <div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
          <button class="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors" @click="$emit('close')">Cancel</button>
          <button class="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)]" @click="submit">Save</button>
        </div>
      </div>
    </div>
  </Teleport>

  <IconPicker
    v-if="showIconPicker"
    @select="(url) => { form.icon = url; showIconPicker = false }"
    @close="showIconPicker = false"
  />
</template>

<style scoped>
@reference "tailwindcss";

.modal-input {
  @apply w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors;
}
</style>
