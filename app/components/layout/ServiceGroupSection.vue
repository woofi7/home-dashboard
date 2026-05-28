<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { LayoutSettings } from './SectionLayoutSettings.vue'

type Service = { name: string; url?: string; icon?: string; type?: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[]; layout?: LayoutSettings }

const props = defineProps<{
  group: ServiceGroup
  edit: boolean
  existingNames?: string[]
}>()

const visible = ref(false)
const collapsed = ref(false)
onMounted(() => nextTick(() => { visible.value = true }))

const { sectionStyle } = useAppearanceSettings()

const emit = defineEmits<{
  update: [group: ServiceGroup]
  dirty: []
  delete: []
}>()

const localGroup = ref<ServiceGroup>(JSON.parse(JSON.stringify(props.group)))

watch(() => props.group, (v) => {
  if (!props.edit)
    localGroup.value = JSON.parse(JSON.stringify(v))
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
  if (!props.edit || !editSnapshot.value)
    return new Set<string>()
  const original = new Map(editSnapshot.value.services.map(s => [s.name, JSON.stringify(s)]))
  return new Set(
    localGroup.value.services
      .filter(s => !pendingDeleteNames.value.has(s.name))
      .filter(s => !original.has(s.name) || original.get(s.name) !== JSON.stringify(s))
      .map(s => s.name)
  )
})

const editingName = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const draftName = ref('')
const nameError = ref('')

function startRename() {
  draftName.value = localGroup.value.name
  nameError.value = ''
  editingName.value = true
  nextTick(() => nameInput.value?.select())
}

function confirmRename() {
  const trimmed = draftName.value.trim()
  if (!trimmed)
    return
  const others = (props.existingNames ?? []).filter(n => n !== localGroup.value.name)
  if (others.includes(trimmed)) {
    nameError.value = 'Name already used'
    return
  }
  if (trimmed !== localGroup.value.name) {
    localGroup.value.name = trimmed
    onServicesUpdate()
  }
  editingName.value = false
  nameError.value = ''
}

function cancelRename() {
  editingName.value = false
  nameError.value = ''
}

const editingService = ref<Service | null>(null)
const showModal = ref(false)

function revertService(name: string) {
  if (pendingDeleteNames.value.has(name)) {
    pendingDeleteNames.value = new Set([...pendingDeleteNames.value].filter(n => n !== name))
    onServicesUpdate()
    return
  }
  if (!editSnapshot.value)
    return
  const idx = localGroup.value.services.findIndex(s => s.name === name)
  if (idx === -1)
    return
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
    if (idx !== -1)
      localGroup.value.services[idx] = updated
  } else {
    localGroup.value.services.push(updated)
  }
  onServicesUpdate()
  showModal.value = false
}
</script>

<template>
  <div
    class="rounded-xl border border-border transition-[opacity,transform] duration-400 ease-out"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'"
    :style="sectionStyle"
  >
    <div class="flex items-center gap-2 px-4 py-2 border-b border-border">
      <span v-if="edit" class="section-handle cursor-grab text-muted select-none rounded p-1 -m-1 hover:bg-elevated hover:text-primary transition-colors"><FaIcon icon="grip-vertical" /></span>
      <template v-if="edit && editingName">
        <input
          ref="nameInput"
          v-model="draftName"
          class="bg-transparent border-b text-sm font-semibold text-secondary outline-none"
          :class="nameError ? 'border-danger' : 'border-accent'"
          @blur="confirmRename"
          @keydown.enter.prevent="confirmRename"
          @keydown.escape.prevent="cancelRename"
        />
        <span v-if="nameError" class="text-[10px] text-danger ml-1">{{ nameError }}</span>
        <span class="flex-1" />
      </template>
      <template v-else>
        <span class="font-semibold text-sm text-secondary">{{ group.name }}</span>
        <button v-if="edit" class="text-muted hover:text-primary ml-1" @click="startRename"><FaIcon icon="pencil" class="text-xs" /></button>
        <span class="flex-1" />
      </template>
      <template v-if="edit">
        <SectionLayoutSettings v-model="layout" />
        <button class="text-xs text-danger hover:text-red-400" @click="$emit('delete')">Remove</button>
      </template>
      <button class="text-muted hover:text-secondary ml-1" @click="collapsed = !collapsed">
        <FaIcon icon="chevron-down" class="text-xs transition-transform" :class="collapsed ? '-rotate-90' : ''" />
      </button>
    </div>

    <VueDraggable
      v-show="!collapsed"
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
      @add="onServicesUpdate"
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

    <div v-if="edit" v-show="!collapsed" class="px-3 pb-3">
      <button
        class="w-full rounded-lg border border-dashed border-border hover:border-accent text-muted hover:text-accent-hover text-sm py-2 transition-colors"
        @click="openAdd"
      >+ Add</button>
    </div>
  </div>

  <ServiceModal v-if="showModal" :service="editingService" :group="localGroup.name" @save="saveService" @close="showModal = false" />
</template>
