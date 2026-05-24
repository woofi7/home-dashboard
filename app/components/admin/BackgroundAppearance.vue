<script setup lang="ts">
export type AppearanceForm = {
  position: string
  overlay: number
  blur: string
  fadeSpeed: string
  sectionStyle: string
  cardStyle: string
}

const props = defineProps<{ modelValue: AppearanceForm }>()
const emit = defineEmits<{ 'update:modelValue': [v: AppearanceForm] }>()

function set(patch: Partial<AppearanceForm>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top',    label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left',   label: 'Left' },
  { value: 'right',  label: 'Right' },
]

const BLURS = [
  { value: 'none', label: 'None' },
  { value: 'sm',   label: 'Light' },
  { value: 'md',   label: 'Medium' },
  { value: 'lg',   label: 'Heavy' },
]

const SPEEDS = [
  { value: 'none',   label: 'None' },
  { value: 'fast',   label: 'Fast' },
  { value: 'normal', label: 'Normal' },
  { value: 'slow',   label: 'Slow' },
]

const SECTION_STYLES = [
  { value: 'glass',   label: 'Glass' },
  { value: 'dark',    label: 'Dark' },
  { value: 'darker',  label: 'Darker' },
  { value: 'none',    label: 'None' },
]

const CARD_STYLES = [
  { value: 'glass',   label: 'Glass' },
  { value: 'dark',    label: 'Dark' },
  { value: 'darker',  label: 'Darker' },
  { value: 'none',    label: 'None' },
]
</script>

<template>
  <div class="space-y-5">

    <div>
      <label class="text-xs text-muted block mb-2">Position</label>
      <OptionPicker
        :model-value="modelValue.position"
        :options="POSITIONS"
        size="sm"
        @update:model-value="set({ position: $event })"
      />
    </div>

    <div>
      <label class="text-xs text-muted block mb-2">Overlay opacity: {{ modelValue.overlay }}%</label>
      <input
        :value="modelValue.overlay"
        type="range"
        min="0"
        max="80"
        step="5"
        class="w-full accent-accent cursor-pointer"
        @input="set({ overlay: Number(($event.target as HTMLInputElement).value) })"
      />
      <div class="flex justify-between text-[10px] text-muted/50 mt-1">
        <span>Transparent</span>
        <span>Dark</span>
      </div>
    </div>

    <div>
      <label class="text-xs text-muted block mb-2">Blur</label>
      <OptionPicker
        :model-value="modelValue.blur"
        :options="BLURS"
        size="sm"
        @update:model-value="set({ blur: $event })"
      />
    </div>

    <div>
      <label class="text-xs text-muted block mb-2">Fade-in speed</label>
      <OptionPicker
        :model-value="modelValue.fadeSpeed"
        :options="SPEEDS"
        size="sm"
        @update:model-value="set({ fadeSpeed: $event })"
      />
    </div>

    <div class="border-t border-border pt-5">
      <p class="text-xs text-muted uppercase tracking-widest mb-4">UI elements</p>

      <div class="space-y-4">
        <div>
          <label class="text-xs text-muted block mb-2">Sections background</label>
          <OptionPicker
            :model-value="modelValue.sectionStyle"
            :options="SECTION_STYLES"
            size="sm"
            @update:model-value="set({ sectionStyle: $event })"
          />
        </div>

        <div>
          <label class="text-xs text-muted block mb-2">Cards background</label>
          <OptionPicker
            :model-value="modelValue.cardStyle"
            :options="CARD_STYLES"
            size="sm"
            @update:model-value="set({ cardStyle: $event })"
          />
        </div>
      </div>
    </div>
  </div>
</template>
