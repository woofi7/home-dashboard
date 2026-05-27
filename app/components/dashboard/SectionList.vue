<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'

type Service = { name: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[] }
type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[] }
type Config = { services: ServiceGroup[]; bookmarks: BookmarkGroup[]; widgets: Record<string, unknown>[]; settings: Record<string, unknown> }
type SectionEntry = { type: 'service' | 'bookmark'; name: string }

const props = defineProps<{
  sectionOrder: SectionEntry[]
  localConfig: Config
  editActive: boolean
  configLoaded: boolean
}>()

const emit = defineEmits<{
  'update:sectionOrder': [order: SectionEntry[]]
  'update-service-group': [name: string, group: ServiceGroup]
  'update-bookmark-group': [name: string, group: BookmarkGroup]
  'delete-service-group': [name: string]
  'delete-bookmark-group': [name: string]
  'add-service-group': [name: string]
  'add-bookmark-group': [name: string]
  'request-edit': []
  dirty: []
}>()

const localOrder = computed({
  get: () => props.sectionOrder,
  set: (v) => emit('update:sectionOrder', v),
})

function getServiceGroup(name: string) {
  return props.localConfig.services.find(g => g.name === name)
}
function getBookmarkGroup(name: string) {
  return props.localConfig.bookmarks.find(g => g.name === name)
}

// Inline add-group state
type AddMode = 'service' | 'bookmark' | null
const addMode = ref<AddMode>(null)
const addName = ref('')
const addError = ref('')

function startAdd(mode: 'service' | 'bookmark') {
  addMode.value = mode
  addName.value = ''
  addError.value = ''
  nextTick(() => {
    const el = document.getElementById('add-section-input')
    el?.focus()
  })
}

function confirmAdd() {
  const name = addName.value.trim()
  if (!name)
    return
  const existing = addMode.value === 'service'
    ? props.localConfig.services.map(g => g.name)
    : props.localConfig.bookmarks.map(g => g.name)
  if (existing.includes(name)) {
    addError.value = 'Name already used'
    return
  }
  if (addMode.value === 'service')
    emit('add-service-group', name)
  else if (addMode.value === 'bookmark')
    emit('add-bookmark-group', name)
  addMode.value = null
  addName.value = ''
  addError.value = ''
}

function cancelAdd() {
  addMode.value = null
  addName.value = ''
  addError.value = ''
}

function onAddKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter')
    confirmAdd()
  else if (e.key === 'Escape')
    cancelAdd()
  else
    addError.value = ''
}
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="!configLoaded" class="px-4 md:px-6 pt-6 pb-28 space-y-6">
    <div v-for="i in 3" :key="i" class="rounded-xl border border-border bg-surface animate-pulse">
      <div class="h-10 border-b border-border px-4 flex items-center gap-2">
        <div class="h-3 w-24 rounded bg-elevated" />
      </div>
      <div class="p-3 flex flex-wrap gap-2">
        <div v-for="j in 6" :key="j" class="h-16 rounded-lg bg-elevated flex-1 min-w-[120px]" />
      </div>
    </div>
  </div>

  <!-- Loaded: empty state -->
  <div v-else-if="!sectionOrder.length" class="px-4 md:px-6 pt-6 pb-28">
    <div class="rounded-xl border border-dashed border-border p-12 flex flex-col items-center gap-4 text-center">
      <p class="text-muted text-sm">No sections yet</p>
      <div v-if="!editActive" class="flex flex-col items-center gap-3 mt-2">
        <p class="text-muted text-xs">Click Edit to add your first service section or bookmark group.</p>
        <button
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          @click="$emit('request-edit')"
        >Edit</button>
      </div>
      <div v-else class="flex flex-col sm:flex-row gap-2 mt-2">
        <button
          class="px-4 py-2 rounded-lg border border-border bg-elevated text-sm text-muted hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('service')"
        >+ Service section</button>
        <button
          class="px-4 py-2 rounded-lg border border-border bg-elevated text-sm text-muted hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('bookmark')"
        >+ Bookmark group</button>
      </div>
      <!-- Inline name input -->
      <div v-if="addMode" class="flex flex-col items-center gap-1 mt-1">
        <div class="flex items-center gap-2">
          <input
            id="add-section-input"
            v-model="addName"
            :placeholder="addMode === 'service' ? 'Section name' : 'Group name'"
            class="px-3 py-1.5 rounded-lg bg-elevated border text-sm text-primary outline-none w-48"
            :class="addError ? 'border-danger' : 'border-border focus:border-accent'"
            @keydown="onAddKeydown"
          />
          <button class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors" @click="confirmAdd">Add</button>
          <button class="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-primary transition-colors" @click="cancelAdd">Cancel</button>
        </div>
        <span v-if="addError" class="text-[10px] text-danger">{{ addError }}</span>
      </div>
    </div>
  </div>

  <!-- Loaded: sections -->
  <div v-else>
    <VueDraggable
      v-model="localOrder"
      :disabled="!editActive"
      handle=".section-handle"
      :animation="300"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      item-key="name"
      class="px-4 md:px-6 pt-6 space-y-6"
      @end="$emit('dirty')"
    >
      <template v-for="item in sectionOrder" :key="item.type + ':' + item.name">
        <ServiceGroupSection
          v-if="item.type === 'service' && getServiceGroup(item.name)"
          :group="getServiceGroup(item.name)!"
          :edit="editActive"
          :existing-names="localConfig.services.map(g => g.name)"
          @update="$emit('update-service-group', item.name, $event)"
          @dirty="$emit('dirty')"
          @delete="$emit('delete-service-group', item.name)"
        />
        <BookmarkGroupSection
          v-else-if="item.type === 'bookmark' && getBookmarkGroup(item.name)"
          :group="getBookmarkGroup(item.name)!"
          :edit="editActive"
          :existing-names="localConfig.bookmarks.map(g => g.name)"
          @update="$emit('update-bookmark-group', item.name, $event)"
          @dirty="$emit('dirty')"
          @delete="$emit('delete-bookmark-group', item.name)"
        />
      </template>
    </VueDraggable>

    <!-- Add section buttons (bottom of list, edit mode only) -->
    <div v-if="editActive" class="px-4 md:px-6 pt-4 pb-28">
      <div v-if="!addMode" class="flex gap-2">
        <button
          class="px-3 py-1.5 rounded-lg border border-dashed border-border bg-elevated text-xs text-muted hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('service')"
        >+ Service section</button>
        <button
          class="px-3 py-1.5 rounded-lg border border-dashed border-border bg-elevated text-xs text-muted hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('bookmark')"
        >+ Bookmark group</button>
      </div>
      <div v-else class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <input
            id="add-section-input"
            v-model="addName"
            :placeholder="addMode === 'service' ? 'Section name' : 'Group name'"
            class="px-3 py-1.5 rounded-lg bg-elevated border text-sm text-primary outline-none w-48"
            :class="addError ? 'border-danger' : 'border-border focus:border-accent'"
            @keydown="onAddKeydown"
          />
          <button class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors" @click="confirmAdd">Add</button>
          <button class="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-primary transition-colors" @click="cancelAdd">Cancel</button>
        </div>
        <span v-if="addError" class="text-[10px] text-danger">{{ addError }}</span>
      </div>
    </div>
    <div v-else class="pb-28" />
  </div>
</template>
