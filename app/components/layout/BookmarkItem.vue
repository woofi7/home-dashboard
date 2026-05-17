<script setup lang="ts">
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

function faviconUrl(url: string) {
  try {
    const { hostname } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
  } catch {
    return null
  }
}
</script>

<template>
  <component
    :is="edit ? 'div' : 'a'"
    v-bind="edit ? {} : { href: bookmark.url, target: '_blank', rel: 'noopener' }"
    class="group/bm relative flex flex-col items-center gap-1.5 transition-opacity"
    :class="[edit ? 'cursor-default' : 'cursor-pointer', pendingDelete ? 'opacity-40' : '']"
    @click="!edit && emit('click')"
  >
    <div
      class="aspect-square w-full rounded-xl bg-black/60 border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors overflow-hidden relative"
      :class="pendingDelete ? 'border-danger/70' : pending ? 'border-warning/60' : 'border-border'"
    >
      <img
        :src="bookmark.icon || faviconUrl(bookmark.url) || ''"
        :alt="bookmark.name"
        class="w-3/5 h-3/5 object-contain"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span v-if="clickCount" class="absolute top-1 right-1.5 text-[9px] text-white/40 tabular-nums leading-none">{{ clickCount }}</span>
    </div>
    <span class="text-[11px] text-white/70 text-center leading-tight line-clamp-2 w-full px-0.5">{{ bookmark.name }}</span>

    <span
      v-if="edit && !pendingDelete"
      class="bookmark-handle absolute top-1 left-1 cursor-grab text-muted select-none text-sm z-20 transition-opacity"
      :class="dragging ? 'opacity-0' : 'opacity-0 group-hover/bm:opacity-100'"
    ><FaIcon icon="grip-vertical" /></span>

    <div
      v-if="edit"
      class="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-opacity z-10 bg-black/40"
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
