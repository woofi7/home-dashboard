<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  suggestedVar?: string
  disabled?: boolean
  masked?: boolean
}>(), { masked: true })

const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const visible = ref(false)
const envRef = computed(() => parseEnvRef(props.modelValue))
const isMasked = computed(() => props.masked)
const inputType = computed(() => (!isMasked.value || visible.value || envRef.value) ? 'text' : 'password')
</script>

<template>
  <div>
    <div class="relative">
      <input
        :value="modelValue"
        :type="inputType"
        :placeholder="placeholder"
        :disabled="disabled"
        class="modal-input pr-9"
        autocomplete="off"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="isMasked && !envRef"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors cursor-pointer"
        tabindex="-1"
        @click="visible = !visible"
      >
        <FaIcon :icon="visible ? 'eye-slash' : 'eye'" class="text-xs" />
      </button>
    </div>
    <div v-if="suggestedVar" class="mt-1 flex items-center gap-2">
      <template v-if="envRef">
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-success/10 border border-success/30 text-success">from env: {{ envRef }}</span>
        <button
          type="button"
          tabindex="-1"
          class="text-[10px] text-muted hover:text-primary transition-colors cursor-pointer"
          @click="emit('update:modelValue', '')"
        >use inline</button>
      </template>
      <button
        v-else
        type="button"
        tabindex="-1"
        class="text-[10px] font-mono text-muted hover:text-accent transition-colors cursor-pointer"
        @click="emit('update:modelValue', '${' + suggestedVar + '}')"
      >use $&#123;{{ suggestedVar }}&#125;</button>
    </div>
  </div>
</template>
