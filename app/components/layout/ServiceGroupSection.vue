<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { LayoutSettings } from './SectionLayoutSettings.vue'

type Service = { name: string; url?: string; icon?: string; type?: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[]; layout?: LayoutSettings }

const props = defineProps<{
  group: ServiceGroup
  edit: boolean
}>()

const visible = ref(false)
onMounted(() => nextTick(() => { visible.value = true }))

const emit = defineEmits<{
  update: [group: ServiceGroup]
  dirty: []
  delete: []
}>()

const localGroup = ref<ServiceGroup>(JSON.parse(JSON.stringify(props.group)))

watch(() => props.group, (v) => {
  if (!props.edit) localGroup.value = JSON.parse(JSON.stringify(v))
}, { deep: true })

const layout = computed({
  get: () => localGroup.value.layout ?? {},
  set: (v: LayoutSettings) => {
    localGroup.value.layout = v
    onServicesUpdate()
  },
})

const { containerStyle, itemStyle } = useLayoutSettings(layout)

const editSnapshot = ref<ServiceGroup | null>(null)
const pendingDeleteNames = ref<Set<string>>(new Set())

watch(() => props.edit, (editing) => {
  if (editing) {
    editSnapshot.value = JSON.parse(JSON.stringify(props.group))
    pendingDeleteNames.value = new Set()
  } else {
    editSnapshot.value = null
    pendingDeleteNames.value = new Set()
  }
}, { immediate: true })

function onServicesUpdate() {
  emit('update', {
    ...localGroup.value,
    services: localGroup.value.services.filter(s => !pendingDeleteNames.value.has(s.name)),
  })
  emit('dirty')
}

const pendingItems = computed(() => {
  if (!props.edit || !editSnapshot.value) return new Set<string>()
  const original = new Map(editSnapshot.value.services.map(s => [s.name, JSON.stringify(s)]))
  return new Set(
    localGroup.value.services
      .filter(s => !pendingDeleteNames.value.has(s.name))
      .filter(s => !original.has(s.name) || original.get(s.name) !== JSON.stringify(s))
      .map(s => s.name)
  )
})

const editingService = ref<Service | null>(null)
const showModal = ref(false)

function revertService(name: string) {
  if (pendingDeleteNames.value.has(name)) {
    pendingDeleteNames.value = new Set([...pendingDeleteNames.value].filter(n => n !== name))
    onServicesUpdate()
    return
  }
  if (!editSnapshot.value) return
  const idx = localGroup.value.services.findIndex(s => s.name === name)
  if (idx === -1) return
  const original = editSnapshot.value.services.find(s => s.name === name)
    ?? editSnapshot.value.services[idx]
  if (original) {
    localGroup.value.services[idx] = JSON.parse(JSON.stringify(original))
  } else {
    localGroup.value.services.splice(idx, 1)
  }
  onServicesUpdate()
}

function openAdd() { editingService.value = null; showModal.value = true }
function openEdit(s: Service) { editingService.value = s; showModal.value = true }
function deleteService(s: Service) {
  pendingDeleteNames.value = new Set([...pendingDeleteNames.value, s.name])
  onServicesUpdate()
}
function saveService(updated: Service) {
  if (editingService.value) {
    const idx = localGroup.value.services.findIndex((s) => s.name === editingService.value!.name)
    if (idx !== -1) localGroup.value.services[idx] = updated
  } else {
    localGroup.value.services.push(updated)
  }
  onServicesUpdate()
  showModal.value = false
}
</script>

<template>
  <div
    class="rounded-xl border border-white/10 bg-black/30 backdrop-blur-md transition-[opacity,transform] duration-[400ms] ease-out"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-white/10">
      <span v-if="edit" class="section-handle cursor-grab text-[var(--color-text-muted)] select-none">⠿</span>
      <span class="font-semibold text-sm text-[var(--color-text-secondary)] flex-1">{{ group.name }}</span>
      <template v-if="edit">
        <SectionLayoutSettings v-model="layout" />
        <button class="text-xs text-[var(--color-danger)] hover:text-red-400" @click="$emit('delete')">Remove</button>
      </template>
    </div>

    <!-- Services -->
    <VueDraggable
      v-model="localGroup.services"
      :disabled="!edit"
      :group="{ name: 'services', pull: true, put: true }"
      handle=".service-handle"
      :animation="300"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      item-key="name"
      :style="{ ...containerStyle, padding: '0.75rem', minHeight: '80px' }"
      @end="onServicesUpdate"
    >
      <ServiceCard
        v-for="service in localGroup.services"
        :key="service.name"
        :style="itemStyle"
        :service="service"
        :edit="edit"
        :pending="pendingItems.has(service.name)"
        :pending-delete="pendingDeleteNames.has(service.name)"
        @edit="openEdit(service)"
        @delete="deleteService(service)"
        @revert="revertService(service.name)"
      />
    </VueDraggable>

    <!-- Add item -->
    <div v-if="edit" class="px-3 pb-3">
      <button
        class="w-full rounded-lg border border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-hover)] text-sm py-2 transition-colors"
        @click="openAdd"
      >+ Add</button>
    </div>
  </div>

  <ServiceModal v-if="showModal" :service="editingService" :group="localGroup.name" @save="saveService" @close="showModal = false" />
</template>
