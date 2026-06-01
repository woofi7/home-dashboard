<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

watch([() => useAuth().editEnabled.value, () => useAuth().needsLogin.value], ([enabled, locked]) => {
  if (!enabled || locked)
    navigateTo('/')
})

type DockerServerConfig = { host?: string; port?: number; socket?: string }
type DockerServerEntry = { name: string } & DockerServerConfig

const { data: current, refresh } = await useFetch<Record<string, DockerServerConfig>>('/api/admin/docker')
const { data: pingStatus, refresh: refreshPing, pending: pinging } = useFetch<Record<string, boolean>>('/api/admin/docker-ping')

const servers = ref<DockerServerEntry[]>([])

watch(current, (v) => {
  if (v)
    servers.value = Object.entries(v).map(([name, cfg]) => ({ name, ...cfg }))
}, { immediate: true })

const isDirty = computed(() => {
  const curr = current.value ?? {}
  if (servers.value.length !== Object.keys(curr).length)
    return true
  return servers.value.some((s) => {
    const c = curr[s.name]
    if (!c)
      return true
    return s.host !== c.host || s.port !== c.port || s.socket !== c.socket
  })
})

function removeServer(name: string) {
  if (editingName.value === name)
    closeEdit()
  servers.value = servers.value.filter(s => s.name !== name)
}

// Edit form (one at a time)
const editingName = ref<string | null>(null)
const editConnType = ref<'http' | 'socket'>('http')
const editHost = ref('')
const editPort = ref('')
const editSocket = ref('')
const editError = ref('')

function openEdit(s: DockerServerEntry) {
  showAdd.value = false
  editingName.value = s.name
  editConnType.value = s.host ? 'http' : 'socket'
  editHost.value = s.host ?? ''
  editPort.value = s.port ? String(s.port) : ''
  editSocket.value = s.socket ?? ''
  editError.value = ''
}

function closeEdit() {
  editingName.value = null
}

function submitEdit() {
  editError.value = ''
  const name = editingName.value!
  if (editConnType.value === 'http' && !editHost.value.trim()) {
    editError.value = 'Host is required'
    return
  }
  servers.value = servers.value.map((s) => {
    if (s.name !== name)
      return s
    const updated: DockerServerEntry = { name }
    if (editConnType.value === 'http') {
      updated.host = editHost.value.trim()
      const portStr = String(editPort.value).trim()
      if (portStr)
        updated.port = Number(portStr)
    }
    else {
      updated.socket = editSocket.value.trim() || '/var/run/docker.sock'
    }
    return updated
  })
  editingName.value = null
}

// Add form
const showAdd = ref(false)
const addName = ref('')
const addConnType = ref<'http' | 'socket'>('http')
const addHost = ref('')
const addPort = ref('')
const addSocket = ref('')
const addError = ref('')

function openAdd() {
  closeEdit()
  addName.value = ''
  addConnType.value = 'http'
  addHost.value = ''
  addPort.value = ''
  addSocket.value = ''
  addError.value = ''
  showAdd.value = true
}

function submitAdd() {
  addError.value = ''
  const name = addName.value.trim()
  if (!name) {
    addError.value = 'Name is required'
    return
  }
  if (servers.value.some(s => s.name === name)) {
    addError.value = 'A server with this name already exists'
    return
  }
  if (addConnType.value === 'http' && !addHost.value.trim()) {
    addError.value = 'Host is required'
    return
  }
  const entry: DockerServerEntry = { name }
  if (addConnType.value === 'http') {
    entry.host = addHost.value.trim()
    const portStr = String(addPort.value).trim()
    if (portStr)
      entry.port = Number(portStr)
  }
  else {
    entry.socket = addSocket.value.trim() || '/var/run/docker.sock'
  }
  servers.value.push(entry)
  showAdd.value = false
}

function cancelAdd() {
  showAdd.value = false
}

function cancel() {
  const v = current.value ?? {}
  servers.value = Object.entries(v).map(([name, cfg]) => ({ name, ...cfg }))
  showAdd.value = false
  editingName.value = null
}

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    const body: Record<string, DockerServerConfig> = {}
    for (const s of servers.value) {
      const cfg: DockerServerConfig = {}
      if (s.host)
        cfg.host = s.host
      if (s.port)
        cfg.port = s.port
      if (s.socket)
        cfg.socket = s.socket
      body[s.name] = cfg
    }
    await $fetch('/api/admin/docker', { method: 'POST', body })
    await refresh()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  }
  catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminSaveBar
    :is-dirty="isDirty"
    :saving="saving"
    :save-error="saveError"
    :save-success="saveSuccess"
    @save="save"
    @cancel="cancel"
  />
  <div class="px-6 py-8 max-w-xl space-y-6">

    <!-- Servers list -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border flex items-center justify-between">
        <p class="text-xs text-muted uppercase tracking-widest">Docker servers</p>
        <div class="flex items-center gap-3">
          <button
            class="text-xs text-muted hover:text-primary transition-colors disabled:opacity-40"
            :disabled="pinging"
            title="Refresh status"
            @click="refreshPing()"
          >
            <FaIcon icon="rotate-right" :class="pinging ? 'animate-spin' : ''" />
          </button>
          <button
            class="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
            @click="openAdd"
          >
            <FaIcon icon="plus" class="text-[10px]" />
            Add server
          </button>
        </div>
      </div>

      <!-- Built-in localhost note -->
      <div class="px-4 py-3 border-b border-border bg-elevated/50 flex items-center gap-3">
        <div
          class="w-2 h-2 rounded-full shrink-0 transition-colors"
          :class="pinging ? 'bg-muted animate-pulse' : pingStatus?.local ? 'bg-success' : 'bg-danger'"
        />
        <div class="min-w-0">
          <p class="text-xs font-mono text-primary">local</p>
          <p class="text-[10px] text-muted mt-0.5">localhost - built-in (socket or DOCKER_HOST env)</p>
        </div>
        <span class="ml-auto text-[10px] text-muted shrink-0">always available</span>
      </div>

      <!-- Configured servers -->
      <div v-if="servers.length === 0 && !showAdd" class="px-4 py-6 text-center text-xs text-muted">
        No remote servers configured. Add one above.
      </div>
      <template v-for="s in servers" :key="s.name">
        <!-- Server row -->
        <div class="px-4 py-3 border-b border-border flex items-center gap-3">
          <div
            class="w-2 h-2 rounded-full shrink-0 transition-colors"
            :class="pinging ? 'bg-muted animate-pulse' : pingStatus?.[s.name] ? 'bg-success' : 'bg-danger'"
          />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-mono text-primary">{{ s.name }}</p>
            <p class="text-[10px] text-muted mt-0.5 font-mono truncate">
              <span v-if="s.host">{{ s.host }}:{{ s.port ?? 2375 }}</span>
              <span v-else>{{ s.socket || '/var/run/docker.sock' }}</span>
            </p>
          </div>
          <button
            class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            :class="editingName === s.name ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent hover:bg-accent/10'"
            title="Edit server"
            @click="editingName === s.name ? closeEdit() : openEdit(s)"
          >
            <FaIcon icon="pencil" class="text-xs" />
          </button>
          <button
            class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title="Remove server"
            @click="removeServer(s.name)"
          >
            <FaIcon icon="trash" class="text-xs" />
          </button>
        </div>

        <!-- Inline edit form -->
        <div v-if="editingName === s.name" class="px-4 py-4 border-b border-border bg-elevated/30 space-y-3">
          <p class="text-xs font-medium text-primary">Edit <span class="font-mono">{{ s.name }}</span></p>

          <div class="flex gap-2">
            <button
              class="flex-1 px-3 py-2 rounded-lg text-xs border transition-colors"
              :class="editConnType === 'http' ? 'bg-accent text-white border-accent' : 'bg-elevated border-border text-muted hover:border-accent'"
              @click="editConnType = 'http'"
            >HTTP</button>
            <button
              class="flex-1 px-3 py-2 rounded-lg text-xs border transition-colors"
              :class="editConnType === 'socket' ? 'bg-accent text-white border-accent' : 'bg-elevated border-border text-muted hover:border-accent'"
              @click="editConnType = 'socket'"
            >Socket</button>
          </div>

          <template v-if="editConnType === 'http'">
            <div>
              <label class="text-[10px] text-muted block mb-1">Host URL</label>
              <input
                v-model="editHost"
                type="text"
                class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-xs font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                placeholder="http://10.0.1.2"
                autocomplete="off"
                @keydown.enter.prevent="submitEdit"
              />
            </div>
            <div>
              <label class="text-[10px] text-muted block mb-1">Port (optional if included in host)</label>
              <input
                v-model="editPort"
                type="number"
                class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-xs font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                placeholder="2375"
                autocomplete="off"
                @keydown.enter.prevent="submitEdit"
              />
            </div>
          </template>
          <template v-else>
            <div>
              <label class="text-[10px] text-muted block mb-1">Socket path</label>
              <input
                v-model="editSocket"
                type="text"
                class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-xs font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                placeholder="/var/run/docker.sock"
                autocomplete="off"
                @keydown.enter.prevent="submitEdit"
              />
            </div>
          </template>

          <p v-if="editError" class="text-xs text-danger">{{ editError }}</p>

          <div class="flex gap-2 justify-end pt-1">
            <button class="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition-colors" @click="closeEdit">Cancel</button>
            <button class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors" @click="submitEdit">Save changes</button>
          </div>
        </div>
      </template>

      <!-- Add form -->
      <div v-if="showAdd" class="px-4 py-4 border-t border-border bg-elevated/30 space-y-3">
        <p class="text-xs font-medium text-primary">New server</p>

        <div>
          <label class="text-[10px] text-muted block mb-1">Name</label>
          <input
            v-model="addName"
            type="text"
            class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-xs font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="nas"
            autocomplete="off"
          />
        </div>

        <div class="flex gap-2">
          <button
            class="flex-1 px-3 py-2 rounded-lg text-xs border transition-colors"
            :class="addConnType === 'http' ? 'bg-accent text-white border-accent' : 'bg-elevated border-border text-muted hover:border-accent'"
            @click="addConnType = 'http'"
          >HTTP</button>
          <button
            class="flex-1 px-3 py-2 rounded-lg text-xs border transition-colors"
            :class="addConnType === 'socket' ? 'bg-accent text-white border-accent' : 'bg-elevated border-border text-muted hover:border-accent'"
            @click="addConnType = 'socket'"
          >Socket</button>
        </div>

        <template v-if="addConnType === 'http'">
          <div>
            <label class="text-[10px] text-muted block mb-1">Host URL</label>
            <input
              v-model="addHost"
              type="text"
              class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-xs font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="http://10.0.1.2"
              autocomplete="off"
            />
          </div>
          <div>
            <label class="text-[10px] text-muted block mb-1">Port (optional if included in host)</label>
            <input
              v-model="addPort"
              type="number"
              class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-xs font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="2375"
              autocomplete="off"
            />
          </div>
        </template>
        <template v-else>
          <div>
            <label class="text-[10px] text-muted block mb-1">Socket path</label>
            <input
              v-model="addSocket"
              type="text"
              class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-xs font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="/var/run/docker.sock"
              autocomplete="off"
            />
          </div>
        </template>

        <p v-if="addError" class="text-xs text-danger">{{ addError }}</p>

        <div class="flex gap-2 justify-end pt-1">
          <button class="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary transition-colors" @click="cancelAdd">Cancel</button>
          <button class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors" @click="submitAdd">Add</button>
        </div>
      </div>
    </div>

    <!-- Info note -->
    <p class="text-xs text-muted/70">
      The built-in <span class="font-mono">local</span> server always monitors the host via its Docker socket (or the <span class="font-mono">DOCKER_HOST</span> env), even alongside remote servers. Add a <span class="font-mono">local</span> entry only to override its connection (e.g. a custom socket path).
    </p>

  </div>
</template>
