<script setup lang="ts">
defineProps<{ server: string; container: string }>()
const emit = defineEmits<{ 'update:server': [v: string]; 'update:container': [v: string] }>()
</script>

<template>
  <Field label="Docker">
    <div class="flex gap-2">
      <div class="flex-1">
        <label class="text-[10px] text-muted mb-1 block">Server</label>
        <input
          :value="server"
          type="text"
          class="modal-input font-mono text-xs"
          placeholder="nas"
          autocomplete="off"
          @input="emit('update:server', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="flex-1">
        <label class="text-[10px] text-muted mb-1 block">Container</label>
        <input
          :value="container"
          type="text"
          class="modal-input font-mono text-xs"
          placeholder="auto"
          autocomplete="off"
          @input="emit('update:container', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </Field>
</template>
