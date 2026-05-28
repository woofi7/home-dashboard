<script setup lang="ts">
import { COLOR_PALETTES, applyPalette, getPaletteById, CUSTOM_PALETTE_DEFAULTS } from '~/utils/colorPalettes'
import type { CustomPaletteColors } from '~/utils/colorPalettes'

type PanelState = { isDirty: boolean; saving: boolean; saveError: string; saveSuccess: boolean }
const emit = defineEmits<{ state: [PanelState] }>()

const { data: settings, refresh } = useFetch<Record<string, unknown>>('/api/admin/settings')

const active = ref<string>('indigo')
const saved = ref<string>('indigo')

const customColors = ref<CustomPaletteColors>({ ...CUSTOM_PALETTE_DEFAULTS })
const savedCustomColors = ref<CustomPaletteColors>({ ...CUSTOM_PALETTE_DEFAULTS })

watch(settings, (val) => {
  const palette = (val?.colorPalette as string) ?? 'indigo'
  active.value = palette
  saved.value = palette
  if (val?.customPalette) {
    const c = { ...CUSTOM_PALETTE_DEFAULTS, ...(val.customPalette as Partial<CustomPaletteColors>) }
    customColors.value = c
    savedCustomColors.value = { ...c }
  }
  applyPalette(getPaletteById(palette, customColors.value))
}, { immediate: true })

const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

const isDirty = computed(() => {
  if (active.value !== saved.value)
    return true
  if (active.value === 'custom') {
    const keys = Object.keys(CUSTOM_PALETTE_DEFAULTS) as (keyof CustomPaletteColors)[]
    return keys.some(k => customColors.value[k] !== savedCustomColors.value[k])
  }
  return false
})

const allPalettes = computed(() =>
  COLOR_PALETTES.map(p => p.id === 'custom' ? { ...p, ...customColors.value } : p),
)

const COLOR_FIELDS: { key: keyof CustomPaletteColors; label: string }[][] = [
  [
    { key: 'base', label: 'Base' },
    { key: 'surface', label: 'Surface' },
    { key: 'elevated', label: 'Elevated' },
    { key: 'border', label: 'Border' },
  ],
  [
    { key: 'primary', label: 'Primary text' },
    { key: 'secondary', label: 'Secondary text' },
    { key: 'muted', label: 'Muted text' },
  ],
  [
    { key: 'accent', label: 'Accent' },
    { key: 'accentHover', label: 'Accent hover' },
  ],
]

function select(id: string) {
  active.value = id
  applyPalette(getPaletteById(id, customColors.value))
}

function updateCustomColor(key: keyof CustomPaletteColors, value: string) {
  customColors.value = { ...customColors.value, [key]: value }
  if (active.value === 'custom')
    applyPalette(getPaletteById('custom', customColors.value))
}

function cancel() {
  active.value = saved.value
  customColors.value = { ...savedCustomColors.value }
  applyPalette(getPaletteById(saved.value, savedCustomColors.value))
}

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/edit/settings', {
      method: 'POST',
      body: { colorPalette: active.value, customPalette: { ...customColors.value } },
    })
    saved.value = active.value
    savedCustomColors.value = { ...customColors.value }
    saveSuccess.value = true
    await refresh()
  }
  catch (e: unknown) {
    saveError.value = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to save'
  }
  finally {
    saving.value = false
  }
}

watch(
  () => ({ isDirty: isDirty.value, saving: saving.value, saveError: saveError.value, saveSuccess: saveSuccess.value }),
  (val) => emit('state', val),
  { deep: true, immediate: true },
)

defineExpose({ save, cancel })
</script>

<template>
  <div class="rounded-xl border border-border bg-surface overflow-hidden">
    <div class="px-4 py-3 border-b border-border">
      <p class="text-xs text-muted uppercase tracking-widest">Color Palette</p>
    </div>
    <div class="p-6 space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          v-for="palette in allPalettes"
          :key="palette.id"
          class="relative rounded-xl border-2 p-3 flex flex-col gap-2 transition-all cursor-pointer"
          :class="active === palette.id ? 'border-accent' : 'border-border hover:border-accent/40'"
          @click="select(palette.id)"
        >
          <div class="flex gap-1.5 items-center">
            <div class="w-8 h-8 rounded-lg flex-shrink-0" :style="{ backgroundColor: palette.base, border: `1px solid ${palette.border}` }">
              <div class="w-full h-full rounded-lg flex items-end justify-end p-1">
                <div class="w-3 h-3 rounded-sm" :style="{ backgroundColor: palette.accent }" />
              </div>
            </div>
            <div class="flex flex-col gap-0.5">
              <div class="flex gap-1">
                <div class="w-3 h-3 rounded-sm" :style="{ backgroundColor: palette.surface }" />
                <div class="w-3 h-3 rounded-sm" :style="{ backgroundColor: palette.elevated }" />
                <div class="w-3 h-3 rounded-sm" :style="{ backgroundColor: palette.accent }" />
                <div class="w-3 h-3 rounded-sm" :style="{ backgroundColor: palette.accentHover }" />
              </div>
              <div class="flex gap-1 items-baseline">
                <span class="text-[8px] font-bold leading-none" :style="{ color: palette.primary }">Aa</span>
                <span class="text-[8px] leading-none" :style="{ color: palette.secondary }">Aa</span>
                <span class="text-[8px] leading-none" :style="{ color: palette.muted }">Aa</span>
              </div>
            </div>
          </div>
          <span class="text-xs text-left font-medium" :class="active === palette.id ? 'text-accent' : 'text-secondary'">{{ palette.name }}</span>
          <div v-if="active === palette.id" class="absolute top-2 right-2 text-accent text-xs">
            <FaIcon icon="check" />
          </div>
        </button>
      </div>

      <!-- Custom color editor -->
      <div v-if="active === 'custom'" class="space-y-4">
        <p class="text-xs text-muted uppercase tracking-widest">Custom Colors</p>
        <div v-for="(group, gi) in COLOR_FIELDS" :key="gi" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label
            v-for="field in group"
            :key="field.key"
            class="flex flex-col gap-1.5 cursor-pointer"
          >
            <span class="text-xs text-muted">{{ field.label }}</span>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-elevated hover:border-accent/40 transition-colors">
              <input
                type="color"
                :value="customColors[field.key]"
                class="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                @input="updateCustomColor(field.key, ($event.target as HTMLInputElement).value)"
              />
              <span class="text-xs text-secondary font-mono">{{ customColors[field.key] }}</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
