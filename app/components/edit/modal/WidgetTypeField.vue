<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const widgetEntries = Object.entries(widgetDefinitions).map(([type, def]) => ({ type, ...def }))
const widgetSearch = ref(props.modelValue ?? '')
const showDropdown = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

const dropdownStyle = ref<Record<string, string>>({})

function updateDropdownPosition() {
  const rect = inputRef.value?.getBoundingClientRect()
  if (!rect)
    return
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: '9999',
  }
}

const filteredWidgets = computed(() => {
  const q = widgetSearch.value.trim().toLowerCase()
  if (!q)
    return widgetEntries
  return widgetEntries.filter(w => w.type.includes(q) || w.name.toLowerCase().includes(q))
})

const selectedWidget = computed(() => widgetEntries.find(w => w.type === props.modelValue) ?? null)

const AUTH_COLORS: Record<string, string> = {
  header: 'var(--color-accent)',
  bearer: 'var(--color-success)',
  basic: 'var(--color-warning)',
  query: '#a78bfa',
  none: 'var(--color-muted)',
}

onClickOutside(wrapperRef, () => { showDropdown.value = false })

function selectWidget(w: typeof widgetEntries[number]) {
  emit('update:modelValue', w.type)
  widgetSearch.value = w.type
  showDropdown.value = false
}

function onInput() {
  emit('update:modelValue', widgetSearch.value.trim().toLowerCase())
  showDropdown.value = true
}

function openDropdown() {
  updateDropdownPosition()
  showDropdown.value = true
}
</script>

<template>
  <Field label="Widget type">
    <div ref="wrapperRef" class="relative">
      <input
        ref="inputRef"
        v-model="widgetSearch"
        type="text"
        class="modal-input font-mono pr-8"
        placeholder="-"
        autocomplete="off"
        @input="onInput"
        @focus="openDropdown"
        @keydown.esc.stop="showDropdown = false"
        @keydown.enter.prevent
      />
      <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">
        <FaIcon :icon="showDropdown ? 'chevron-up' : 'chevron-down'" />
      </span>
      <Teleport to="body">
        <div
          v-if="showDropdown && filteredWidgets.length"
          :style="dropdownStyle"
          class="rounded-lg border border-border bg-elevated shadow-lg overflow-hidden max-h-48 overflow-y-auto overscroll-contain"
        >
          <button
            v-for="w in filteredWidgets"
            :key="w.type"
            class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-surface transition-colors text-left"
            :class="modelValue === w.type ? 'bg-accent/10' : ''"
            @mousedown.prevent="selectWidget(w)"
          >
            <span class="font-mono text-primary">{{ w.type }}</span>
            <span class="text-xs text-muted">{{ w.authType }}</span>
          </button>
        </div>
        <div
          v-else-if="showDropdown && widgetSearch && !filteredWidgets.length"
          :style="dropdownStyle"
          class="rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-muted"
        >No matching widget — go to Admin to fetch it</div>
      </Teleport>
    </div>
    <div
      v-if="selectedWidget && !showDropdown"
      class="mt-2 px-3 py-2 rounded-lg bg-elevated border border-border flex items-center gap-3 text-xs text-secondary"
    >
      <span
        class="px-1.5 py-0.5 rounded border font-medium"
        :style="{
          color: AUTH_COLORS[selectedWidget.authType] ?? AUTH_COLORS.none,
          borderColor: (AUTH_COLORS[selectedWidget.authType] ?? AUTH_COLORS.none) + '40',
          background: (AUTH_COLORS[selectedWidget.authType] ?? AUTH_COLORS.none) + '15',
        }"
      >{{ selectedWidget.authType }}</span>
      <span>{{ selectedWidget.fields.length }} field{{ selectedWidget.fields.length !== 1 ? 's' : '' }}</span>
    </div>
    <p v-else-if="modelValue && !selectedWidget && !showDropdown" class="mt-1.5 text-xs text-warning">Not in registry — fetch it from Admin to enable widget data</p>
  </Field>
</template>
