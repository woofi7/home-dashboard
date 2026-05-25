<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

// ── Backup ─────────────────────────────────────────────────────────────────
const backing = ref(false)

async function downloadBackup() {
  if (backing.value)
    return
  backing.value = true
  try {
    const blob = await $fetch<Blob>('/api/admin/backup', { responseType: 'blob' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `homepage-backup-${timestamp}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }
  finally {
    backing.value = false
  }
}

// ── Restore ─────────────────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const restoring = ref(false)
const restoreError = ref('')
const restoredFiles = ref<string[]>([])

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  restoreError.value = ''
  restoredFiles.value = []
}

function clearFile() {
  selectedFile.value = null
  restoreError.value = ''
  restoredFiles.value = []
  if (fileInput.value)
    fileInput.value.value = ''
}

async function restore() {
  if (!selectedFile.value || restoring.value)
    return
  restoring.value = true
  restoreError.value = ''
  restoredFiles.value = []
  try {
    const form = new FormData()
    form.append('file', selectedFile.value)
    const result = await $fetch<{ ok: boolean; restored: string[] }>('/api/admin/restore', {
      method: 'POST',
      body: form,
    })
    restoredFiles.value = result.restored
    selectedFile.value = null
    if (fileInput.value)
      fileInput.value.value = ''
  }
  catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    restoreError.value = msg ?? 'Restore failed'
  }
  finally {
    restoring.value = false
  }
}
</script>

<template>
  <div class="px-6 py-8 max-w-2xl space-y-8">

    <!-- Backup -->
    <section class="rounded-xl border border-border bg-surface p-6">
      <div class="flex items-center gap-3 mb-1">
        <FaIcon icon="file-zipper" class="text-xl text-muted" />
        <h2 class="font-semibold text-primary">Backup</h2>
      </div>
      <p class="text-xs text-muted mb-5">Download all config files as a zip archive with a timestamp. Excludes internal backup files.</p>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="backing"
        @click="downloadBackup"
      >
        <FaIcon :icon="backing ? 'spinner' : 'download'" :spin="backing" />
        {{ backing ? 'Preparing...' : 'Download backup' }}
      </button>
    </section>

    <!-- Restore -->
    <section class="rounded-xl border border-border bg-surface p-6">
      <div class="flex items-center gap-3 mb-1">
        <FaIcon icon="upload" class="text-xl text-muted" />
        <h2 class="font-semibold text-primary">Restore</h2>
      </div>
      <p class="text-xs text-muted mb-5">Upload a previously downloaded backup zip. Existing config files will be backed up before being replaced.</p>

      <!-- File picker -->
      <div v-if="!restoredFiles.length" class="space-y-4">
        <div class="flex items-center gap-3">
          <label
            class="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-elevated text-sm text-primary hover:border-accent transition-colors cursor-pointer"
          >
            <FaIcon icon="folder-open" class="text-muted" />
            Choose zip file
            <input
              ref="fileInput"
              type="file"
              accept=".zip"
              class="hidden"
              @change="onFileChange"
            />
          </label>
          <span v-if="selectedFile" class="text-sm text-secondary truncate max-w-xs">{{ selectedFile.name }}</span>
        </div>

        <div v-if="selectedFile" class="flex items-center gap-3">
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="restoring"
            @click="restore"
          >
            <FaIcon :icon="restoring ? 'spinner' : 'rotate-left'" :spin="restoring" />
            {{ restoring ? 'Restoring...' : 'Restore now' }}
          </button>
          <button
            class="text-sm text-muted hover:text-primary transition-colors"
            :disabled="restoring"
            @click="clearFile"
          >Cancel</button>
        </div>

        <p v-if="restoreError" class="text-sm text-danger flex items-center gap-2">
          <FaIcon icon="circle-exclamation" />
          {{ restoreError }}
        </p>
      </div>

      <!-- Success state -->
      <div v-else class="space-y-3">
        <div class="flex items-center gap-2 text-sm text-green-400">
          <FaIcon icon="check" />
          Restore complete. The following files were updated:
        </div>
        <ul class="text-xs text-muted space-y-1 pl-1">
          <li v-for="f in restoredFiles" :key="f" class="flex items-center gap-2">
            <FaIcon icon="file" class="text-[10px]" />
            {{ f }}
          </li>
        </ul>
        <p class="text-xs text-muted/60 pt-1">A page reload is required for changes to take effect.</p>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-elevated border border-border text-sm text-primary hover:border-accent transition-colors"
          @click="$router.go(0)"
        >
          <FaIcon icon="rotate-right" />
          Reload page
        </button>
      </div>
    </section>

  </div>
</template>
