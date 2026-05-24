<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'

const props = defineProps<{
  type: string
  entry: { name: string; authType: string; fields: { label: string; desc?: string }[] }
  activeLabels: string[]
  isDirty: boolean
  saving: boolean
  authColors: Record<string, string>
}>()

const emit = defineEmits<{ updateFields: [labels: string[]]; save: []; cancel: [] }>()

const dragList = ref<string[]>([...props.activeLabels])

watch(() => props.activeLabels, (v) => {
  if (JSON.stringify(v) !== JSON.stringify(dragList.value))
    dragList.value = [...v]
}, { deep: true })

const inactiveFields = computed(() =>
  props.entry.fields.filter(f => !dragList.value.includes(f.label))
)

function onDragEnd() {
  emit('updateFields', [...dragList.value])
}

function deactivate(label: string) {
  dragList.value = dragList.value.filter(l => l !== label)
  emit('updateFields', [...dragList.value])
}

function activate(f: { label: string }) {
  dragList.value = [...dragList.value, f.label]
  emit('updateFields', [...dragList.value])
}

function cancel() {
  emit('cancel')
}
</script>

<template>
  <div class="rounded-xl border border-border bg-surface flex flex-col">

    <!-- Header -->
    <div class="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
      <span class="font-semibold text-primary flex-1">{{ entry.name }}</span>
      <span
        class="px-2 py-0.5 rounded-md text-xs font-medium border"
        :style="{
          color: authColors[entry.authType] ?? authColors.none,
          borderColor: (authColors[entry.authType] ?? authColors.none) + '40',
          background: (authColors[entry.authType] ?? authColors.none) + '15',
        }"
      >{{ entry.authType }}</span>
    </div>

    <!-- Active fields (draggable) -->
    <div class="px-4 pt-3 pb-2 flex-1">
      <p class="text-xs text-muted mb-2 font-medium uppercase tracking-wide">Active fields</p>
      <VueDraggable
        v-model="dragList"
        handle=".field-handle"
        :animation="200"
        ghost-class="opacity-40"
        @end="onDragEnd"
      >
        <div
          v-for="label in dragList"
          :key="label"
          class="flex items-center gap-2 py-1 group/field"
        >
          <span class="field-handle cursor-grab text-muted/50 hover:text-muted transition-colors select-none shrink-0">
            <FaIcon icon="grip-vertical" class="text-xs" />
          </span>
          <span class="text-sm text-primary flex-1 truncate">{{ label }}</span>
          <button
            class="cursor-pointer opacity-0 group-hover/field:opacity-100 text-muted hover:text-danger transition-all text-xs shrink-0"
            :title="`Remove ${label}`"
            @click="deactivate(label)"
          >
            <FaIcon icon="xmark" />
          </button>
        </div>
      </VueDraggable>
      <p v-if="dragList.length === 0" class="text-xs text-muted italic">No active fields</p>
    </div>

    <!-- Available fields (inactive) -->
    <div v-if="inactiveFields.length" class="px-4 pb-3 border-t border-border pt-3">
      <p class="text-xs text-muted mb-2 font-medium uppercase tracking-wide">Available</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="f in inactiveFields"
          :key="f.label"
          :title="f.desc"
          class="cursor-pointer px-2 py-0.5 rounded-md text-xs border border-dashed border-border text-muted hover:border-accent hover:text-accent transition-colors"
          @click="activate(f)"
        >+ {{ f.label }}</button>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-4 pb-4 pt-2 gap-2 border-t border-border">
      <p class="text-xs text-muted">{{ dragList.filter(l => entry.fields.some(f => f.label === l)).length }} / {{ entry.fields.length }} fields shown</p>
      <div v-if="isDirty" class="flex items-center gap-2">
        <button
          class="cursor-pointer px-3 py-1.5 rounded-lg text-xs border border-border text-muted hover:text-primary transition-colors disabled:opacity-40"
          :disabled="saving"
          @click="cancel"
        >Cancel</button>
        <button
          class="cursor-pointer px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="saving"
          @click="emit('save')"
        >{{ saving ? 'Saving...' : 'Save' }}</button>
      </div>
    </div>

  </div>
</template>
