<script setup lang="ts">
import { COLOR_PALETTES, applyPalette, getPaletteById } from '~/utils/colorPalettes'

type PanelState = { isDirty: boolean; saving: boolean; saveError: string; saveSuccess: boolean }
const emit = defineEmits<{ state: [PanelState] }>()

const { data: settings, refresh } = useFetch<Record<string, unknown>>('/api/admin/settings')

const active = ref<string>('indigo')
const saved = ref<string>('indigo')

// Initialize once the fetch resolves; using watch avoids async setup so template refs
// on this component work correctly when it is rendered inside another component's slot.
watch(settings, (val) => {
  const palette = (val?.colorPalette as string) ?? 'indigo'
  active.value = palette
  saved.value = palette
  applyPalette(getPaletteById(palette))
}, { immediate: true })
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

const isDirty = computed(() => active.value !== saved.value)

function select(id: string) {
  active.value = id
  applyPalette(getPaletteById(id))
}

function cancel() {
  active.value = saved.value
  applyPalette(getPaletteById(saved.value))
}

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/edit/settings', {
      method: 'POST',
      body: { colorPalette: active.value },
    })
    saved.value = active.value
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
    <div class="p-6">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          v-for="palette in COLOR_PALETTES"
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

    </div>
  </div>
</template>
