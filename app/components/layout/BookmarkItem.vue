<script setup lang="ts">
import { externalUrl } from '#shared/externalUrl'

type Bookmark = { name: string; url: string; icon?: string }

const props = defineProps<{
  bookmark: Bookmark
  edit: boolean
  pending: boolean
  pendingDelete: boolean
  dragging: boolean
  clickCount?: number
}>()

const emit = defineEmits<{
  click: []
  edit: []
  delete: []
  restore: []
}>()

const { settings } = useGlobalSettings()
const linkTarget = computed(() => settings.value?.linkTarget === 'same-tab' ? '_self' : '_blank')
const href = computed(() => externalUrl(props.bookmark.url))

function faviconUrl(url: string) {
  try {
    const { hostname } = new URL(externalUrl(url))
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
  } catch {
    return null
  }
}
</script>

<template>
  <component
    :is="edit ? 'div' : 'a'"
    v-bind="edit ? {} : { href, target: linkTarget, rel: 'noopener' }"
    class="group/bm relative flex flex-col items-center gap-1.5 transition-opacity"
    :class="[edit ? 'cursor-default' : 'cursor-pointer', pendingDelete ? 'opacity-40' : '']"
    @click="!edit && emit('click')"
  >
    <div
      class="aspect-square w-full rounded-xl bg-elevated border flex items-center justify-center transition-colors overflow-hidden relative"
      :class="pendingDelete ? 'border-danger/70' : pending ? 'border-warning/60' : 'border-border hover:border-accent/40'"
    >
      <img
        :src="bookmark.icon || faviconUrl(bookmark.url) || ''"
        :alt="bookmark.name"
        class="w-3/5 h-3/5 object-contain"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span v-if="clickCount" class="absolute top-1 right-1.5 text-[9px] text-muted tabular-nums leading-none">{{ clickCount }}</span>
    </div>
    <span class="text-[11px] text-secondary text-center leading-tight line-clamp-2 w-full px-0.5 transition-colors group-hover/bm:text-accent">{{ bookmark.name }}</span>

    <span
      v-if="edit && !pendingDelete"
      class="bookmark-handle absolute top-1 left-1 cursor-grab text-muted select-none text-sm z-20 transition-opacity rounded p-0.5 hover:bg-elevated hover:text-primary"
      :class="dragging ? 'opacity-0' : 'opacity-0 group-hover/bm:opacity-100'"
    ><FaIcon icon="grip-vertical" /></span>

    <div
      v-if="edit"
      class="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-opacity z-10 bg-elevated/80"
      :class="dragging ? 'opacity-0' : 'opacity-0 group-hover/bm:opacity-100'"
    >
      <template v-if="pendingDelete">
        <button
          class="cursor-pointer h-9 px-3 rounded-lg bg-elevated border border-warning/40 flex items-center gap-1.5 text-warning hover:border-warning transition-colors shadow-md shadow-black/30 text-xs font-medium"
          @click="emit('restore')"
        ><FaIcon icon="rotate-left" /> Restore</button>
      </template>
      <template v-else>
        <div class="flex gap-2">
          <button
            class="cursor-pointer w-8 h-8 rounded-lg bg-elevated border border-border flex items-center justify-center text-muted hover:text-accent-hover hover:border-accent transition-colors shadow-md shadow-black/30"
            @click="emit('edit')"
          ><FaIcon icon="pencil" /></button>
          <button
            class="cursor-pointer w-8 h-8 rounded-lg bg-elevated border border-border flex items-center justify-center text-muted hover:text-danger hover:border-danger transition-colors shadow-md shadow-black/30"
            @click="emit('delete')"
          ><FaIcon icon="xmark" /></button>
        </div>
        <button
          v-if="pending"
          class="cursor-pointer h-6 px-2 rounded-md bg-elevated border border-warning/40 flex items-center gap-1 text-warning hover:border-warning transition-colors shadow-md shadow-black/30 text-xs"
          @click="emit('restore')"
        ><FaIcon icon="rotate-left" /> Revert</button>
      </template>
    </div>
  </component>
</template>
