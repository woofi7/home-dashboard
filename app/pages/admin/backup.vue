<script setup lang="ts">
import { unzipSync, strFromU8 } from 'fflate'

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

// ── Restore from zip ─────────────────────────────────────────────────────────
const ALLOWED_RESTORE_EXTS = new Set(['.yaml', '.yml', '.json', '.env'])

type ZipFile = { name: string; content: string }

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const zipFiles = ref<ZipFile[]>([])
const zipSelection = ref<Set<string>>(new Set())
const zipParseError = ref('')
const restoring = ref(false)
const restoreError = ref('')
const restoredFiles = ref<string[]>([])

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  zipFiles.value = []
  zipParseError.value = ''
  restoreError.value = ''
  restoredFiles.value = []

  if (!selectedFile.value)
    return

  try {
    const buffer = await selectedFile.value.arrayBuffer()
    const entries = unzipSync(new Uint8Array(buffer))
    const files: ZipFile[] = []
    for (const [name, data] of Object.entries(entries)) {
      const safe = name.split('/').pop() ?? name
      if (!safe)
        continue
      const dot = safe.lastIndexOf('.')
      const ext = dot === -1 ? '' : safe.slice(dot)
      if (!ALLOWED_RESTORE_EXTS.has(ext) && safe !== '.env')
        continue
      if (safe.endsWith('.bak'))
        continue
      files.push({ name: safe, content: strFromU8(data) })
    }
    files.sort((a, b) => a.name.localeCompare(b.name))
    if (!files.length) {
      zipParseError.value = 'No valid config files found in zip'
      return
    }
    zipFiles.value = files
    zipSelection.value = new Set(files.map(f => f.name))
  }
  catch {
    zipParseError.value = 'Invalid or corrupt zip file'
  }
}

function clearFile() {
  selectedFile.value = null
  zipFiles.value = []
  zipSelection.value = new Set()
  zipParseError.value = ''
  restoreError.value = ''
  restoredFiles.value = []
  if (fileInput.value)
    fileInput.value.value = ''
}

function toggleZipFile(name: string) {
  const next = new Set(zipSelection.value)
  if (next.has(name))
    next.delete(name)
  else
    next.add(name)
  zipSelection.value = next
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
    form.append('files', [...zipSelection.value].join(','))
    const result = await $fetch<{ ok: boolean; restored: string[] }>('/api/admin/restore', {
      method: 'POST',
      body: form,
    })
    restoredFiles.value = result.restored
    selectedFile.value = null
    zipFiles.value = []
    zipSelection.value = new Set()
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

// ── Auto-backup restore ───────────────────────────────────────────────────────
type AutoBackupFile = { name: string; modified: string; size: number }

const { data: autoBackupsData } = useFetch<{ files: AutoBackupFile[] }>('/api/admin/auto-backups')
const autoBackups = computed(() => autoBackupsData.value?.files ?? [])

const restoringAuto = ref<string | null>(null)
const autoRestoreErrors = ref<Record<string, string>>({})
const autoRestoredFiles = ref<Set<string>>(new Set())

const previewContent = ref<Record<string, string>>({})
const previewLoading = ref<string | null>(null)
const previewErrors = ref<Record<string, string>>({})

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

async function loadPreview(name: string) {
  if (previewContent.value[name] !== undefined)
    return
  previewLoading.value = name
  delete previewErrors.value[name]
  try {
    const res = await $fetch<{ content: string }>(`/api/admin/auto-backup-preview?filename=${encodeURIComponent(name)}`)
    previewContent.value = { ...previewContent.value, [name]: res.content }
  }
  catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    previewErrors.value = { ...previewErrors.value, [name]: msg ?? 'Failed to load preview' }
  }
  finally {
    previewLoading.value = null
  }
}

async function restoreAuto(name: string) {
  if (restoringAuto.value)
    return
  restoringAuto.value = name
  delete autoRestoreErrors.value[name]
  try {
    await $fetch('/api/admin/auto-backup-restore', { method: 'POST', body: { filename: name } })
    autoRestoredFiles.value = new Set([...autoRestoredFiles.value, name])
  }
  catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    autoRestoreErrors.value = { ...autoRestoreErrors.value, [name]: msg ?? 'Restore failed' }
  }
  finally {
    restoringAuto.value = null
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

    <!-- Restore from zip -->
    <section class="rounded-xl border border-border bg-surface p-6">
      <div class="flex items-center gap-3 mb-1">
        <FaIcon icon="upload" class="text-xl text-muted" />
        <h2 class="font-semibold text-primary">Restore</h2>
      </div>
      <p class="text-xs text-muted mb-5">Upload a previously downloaded backup zip. Preview the contents before importing.</p>

      <div v-if="!restoredFiles.length" class="space-y-4">
        <!-- File picker -->
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-elevated text-sm text-primary hover:border-accent transition-colors cursor-pointer">
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
          <span v-if="selectedFile && !zipFiles.length && !zipParseError" class="text-sm text-secondary truncate max-w-xs">{{ selectedFile.name }}</span>
        </div>

        <p v-if="zipParseError" class="text-sm text-danger flex items-center gap-2">
          <FaIcon icon="circle-exclamation" />
          {{ zipParseError }}
        </p>

        <!-- File previews -->
        <template v-if="zipFiles.length">
          <p class="text-xs text-muted">{{ zipFiles.length }} file{{ zipFiles.length !== 1 ? 's' : '' }} found - select which to import:</p>
          <ul class="space-y-2">
            <li v-for="f in zipFiles" :key="f.name">
              <YamlFilePreview :filename="f.name" :content="f.content">
                <label class="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    class="sr-only peer"
                    :checked="zipSelection.has(f.name)"
                    @change="toggleZipFile(f.name)"
                  />
                  <span class="w-4 h-4 rounded border border-border flex items-center justify-center peer-checked:bg-accent peer-checked:border-accent transition-colors">
                    <FaIcon v-if="zipSelection.has(f.name)" icon="check" class="text-white text-[10px]" />
                  </span>
                </label>
              </YamlFilePreview>
            </li>
          </ul>

          <div class="flex items-center gap-3 pt-1">
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="restoring || zipSelection.size === 0"
              @click="restore"
            >
              <FaIcon :icon="restoring ? 'spinner' : 'rotate-left'" :spin="restoring" />
              {{ restoring ? 'Restoring...' : `Restore ${zipSelection.size} file${zipSelection.size !== 1 ? 's' : ''}` }}
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
        </template>
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

    <!-- Auto-backup restore -->
    <section class="rounded-xl border border-border bg-surface p-6">
      <div class="flex items-center gap-3 mb-1">
        <FaIcon icon="clock-rotate-left" class="text-xl text-muted" />
        <h2 class="font-semibold text-primary">Auto-backups</h2>
      </div>
      <p class="text-xs text-muted mb-5">These files are created automatically each time a config file is saved. Restore any file to its previous state.</p>

      <div v-if="!autoBackups.length" class="text-sm text-muted italic">
        No auto-backups found.
      </div>

      <ul v-else class="space-y-2">
        <li v-for="file in autoBackups" :key="file.name">
          <YamlFilePreview
            :filename="file.name"
            :content="previewContent[file.name]"
            :loading="previewLoading === file.name"
            :error="previewErrors[file.name]"
            @load="loadPreview(file.name)"
          >
            <span class="text-xs text-muted shrink-0">{{ formatDate(file.modified) }}</span>
            <template #actions>
              <span v-if="autoRestoredFiles.has(file.name)" class="flex items-center gap-1 text-xs text-green-400 shrink-0">
                <FaIcon icon="check" />
                Restored
              </span>
              <span v-else-if="autoRestoreErrors[file.name]" class="text-xs text-danger shrink-0">
                {{ autoRestoreErrors[file.name] }}
              </span>
              <button
                v-else
                class="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border text-xs text-muted hover:text-danger hover:border-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                :disabled="restoringAuto !== null"
                @click="restoreAuto(file.name)"
              >
                <FaIcon :icon="restoringAuto === file.name ? 'spinner' : 'rotate-left'" :spin="restoringAuto === file.name" />
                {{ restoringAuto === file.name ? 'Restoring...' : 'Restore' }}
              </button>
            </template>
          </YamlFilePreview>
        </li>
      </ul>

      <p v-if="autoRestoredFiles.size" class="text-xs text-muted/60 mt-4">A page reload is required for changes to take effect.</p>
    </section>

  </div>
</template>
