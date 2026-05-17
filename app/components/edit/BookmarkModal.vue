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
  if (showIconPicker.value)
    return
  if (e.key === 'Escape')
    emit('close')
  if (e.key === 'Enter')
    submit()
})

function submit() {
  errors.name = form.name ? '' : 'Name is required'
  errors.url = form.url ? '' : 'URL is required'
  if (errors.name || errors.url)
    return
  emit('save', { ...form })
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" >
      <div class="bg-surface border border-border rounded-2xl w-full max-w-sm mx-4">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 class="font-semibold text-primary">{{ bookmark ? 'Edit bookmark' : 'Add bookmark' }}</h2>
          <button class="text-muted hover:text-primary" @click="$emit('close')"><FaIcon icon="xmark" /></button>
        </div>
        <div class="px-6 py-4 space-y-4">
          <Field label="Name" required>
            <input v-model="form.name" type="text" class="modal-input" :class="errors.name ? 'border-danger' : ''" placeholder="GitHub" @input="errors.name = ''" />
            <p v-if="errors.name" class="text-xs text-danger mt-1">{{ errors.name }}</p>
          </Field>
          <Field label="URL" required>
            <input v-model="form.url" type="text" class="modal-input" :class="errors.url ? 'border-danger' : ''" placeholder="https://github.com" @input="errors.url = ''" />
            <p v-if="errors.url" class="text-xs text-danger mt-1">{{ errors.url }}</p>
          </Field>
          <Field label="Icon">
            <div class="flex gap-2 items-center">
              <div class="w-9 h-9 rounded-lg bg-elevated border border-border flex items-center justify-center overflow-hidden shrink-0">
                <img
                  v-if="form.icon"
                  :src="form.icon"
                  alt=""
                  class="w-7 h-7 object-contain"
                  @error="($event.target as HTMLImageElement).style.opacity = '0'"
                />
              </div>
              <input v-model="form.icon" type="text" class="modal-input" placeholder="Search or paste URL..." />
              <button
                class="shrink-0 px-3 py-2 rounded-lg bg-elevated border border-border text-xs text-secondary hover:border-accent hover:text-accent-hover transition-colors whitespace-nowrap"
                @click="showIconPicker = true"
              >Browse</button>
            </div>
          </Field>
        </div>
        <div class="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button class="px-4 py-2 rounded-lg text-sm text-secondary hover:text-primary transition-colors" @click="$emit('close')">Cancel</button>
          <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover" @click="submit">Save</button>
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
