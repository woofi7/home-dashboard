<script setup lang="ts">
type CalendarConfig = {
  clientId: string
  clientSecret: string
  hasRefreshToken: boolean
  showEvents: boolean
  showTasks: boolean
  daysAhead: number
  taskMode: string
}

const DAYS_OPTIONS = [1, 2, 3, 5, 7, 14, 30]

const route = useRoute()

const { data: current, refresh: refreshCurrent } = await useFetch<CalendarConfig>('/api/admin/calendar')

const form = ref({ clientId: '', clientSecret: '' })
const display = ref({ showEvents: true, showTasks: false, daysAhead: 2, taskMode: 'all' })

watch(current, (val) => {
  form.value = {
    clientId:     val?.clientId     ?? '',
    clientSecret: val?.clientSecret ?? '',
  }
  display.value = {
    showEvents: val?.showEvents ?? true,
    showTasks:  val?.showTasks  ?? false,
    daysAhead:  val?.daysAhead  ?? 2,
    taskMode:   val?.taskMode   ?? 'all',
  }
}, { immediate: true })

const isDirty = computed(() =>
  form.value.clientId !== (current.value?.clientId ?? '') ||
  form.value.clientSecret !== (current.value?.clientSecret ?? '')
)

const isDisplayDirty = computed(() =>
  display.value.showEvents !== (current.value?.showEvents ?? true) ||
  display.value.showTasks  !== (current.value?.showTasks  ?? false) ||
  display.value.daysAhead  !== (current.value?.daysAhead  ?? 2) ||
  display.value.taskMode   !== (current.value?.taskMode   ?? 'all')
)

function cancelDisplay() {
  display.value = {
    showEvents: current.value?.showEvents ?? true,
    showTasks:  current.value?.showTasks  ?? false,
    daysAhead:  current.value?.daysAhead  ?? 2,
    taskMode:   current.value?.taskMode   ?? 'all',
  }
}

const savingDisplay = ref(false)
const saveDisplayError = ref('')
const saveDisplaySuccess = ref(false)

async function saveDisplay() {
  savingDisplay.value = true
  saveDisplayError.value = ''
  saveDisplaySuccess.value = false
  try {
    await $fetch('/api/admin/calendar', { method: 'POST', body: { showEvents: display.value.showEvents, showTasks: display.value.showTasks, daysAhead: display.value.daysAhead, taskMode: display.value.taskMode } })
    await refreshCurrent()
    await refreshCalendar()
    saveDisplaySuccess.value = true
    setTimeout(() => { saveDisplaySuccess.value = false }, 2000)
  } catch (err: unknown) {
    saveDisplayError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  } finally {
    savingDisplay.value = false
  }
}

function cancel() {
  form.value = {
    clientId:     current.value?.clientId     ?? '',
    clientSecret: current.value?.clientSecret ?? '',
  }
}

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/admin/calendar', { method: 'POST', body: form.value })
    await refreshCurrent()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

const disconnecting = ref(false)
const disconnectError = ref('')

async function disconnect() {
  disconnecting.value = true
  disconnectError.value = ''
  try {
    await $fetch('/api/admin/calendar/disconnect', { method: 'POST' })
    await refreshCurrent()
  } catch (err: unknown) {
    disconnectError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Disconnect failed'
  } finally {
    disconnecting.value = false
  }
}

const redirectUri = computed(() => import.meta.client ? `${window.location.origin}/api/auth/google/callback` : '')

const hasCredentials = computed(() => !!(current.value?.clientId && current.value?.clientSecret))
const isConnected = computed(() => !!current.value?.hasRefreshToken)

const justConnected = computed(() => route.query.connected === '1')

onMounted(() => {
  if (justConnected.value) refreshCurrent()
})

const { data: calendarData, refresh: refreshCalendar } = useFetch('/api/calendar')

const tasksError = computed(() => (calendarData.value as { tasksError?: string | null } | null)?.tasksError ?? null)

const stepsExpanded = ref(!isConnected.value)
watch(isConnected, (v) => { if (v) stepsExpanded.value = false })
</script>

<template>
  <AdminSaveBar
    :is-dirty="isDisplayDirty"
    :saving="savingDisplay"
    :save-error="saveDisplayError"
    :save-success="saveDisplaySuccess"
    @save="saveDisplay"
    @cancel="cancelDisplay"
  />
  <div class="space-y-6">

    <!-- Success banner after OAuth redirect -->
    <div
      v-if="justConnected && isConnected"
      class="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm"
    >
      <FaIcon icon="check" class="text-xs shrink-0" />
      Google account connected successfully. Your calendar events will now appear on the dashboard.
    </div>

    <div class="flex flex-col xl:flex-row gap-6 items-start">

      <!-- Steps panel -->
      <div class="w-full xl:flex-1 xl:min-w-0 rounded-xl border border-border bg-surface overflow-hidden">

        <!-- Collapsible header -->
        <button
          class="cursor-pointer w-full flex items-center justify-between px-4 py-3 text-left hover:bg-elevated/50 transition-colors"
          :class="stepsExpanded ? 'border-b border-border' : ''"
          @click="stepsExpanded = !stepsExpanded"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0"
              :class="isConnected ? 'bg-success/15 border border-success/40 text-success' : 'bg-accent/15 border border-accent/30 text-accent'"
            >
              <FaIcon v-if="isConnected" icon="check" />
              <FaIcon v-else icon="key" />
            </span>
            <p class="text-xs font-medium" :class="isConnected ? 'text-success' : 'text-primary'">
              {{ isConnected ? 'Connected to Google' : 'Google account setup' }}
            </p>
          </div>
          <FaIcon
            icon="chevron-down"
            class="text-muted text-xs transition-transform"
            :class="stepsExpanded ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="stepsExpanded" class="divide-y divide-border">

        <!-- Step 1: Create project -->
        <div class="flex gap-4 p-5">
          <span class="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] flex items-center justify-center font-bold">1</span>
          <div class="space-y-2 min-w-0">
            <p class="text-sm font-medium text-primary">Create a Google Cloud project</p>
            <p class="text-xs text-muted">Open the Google Cloud Console and create a new project (or select an existing one). Then enable the <strong class="text-primary">Google Calendar API</strong> for it. To show tasks, also enable the <strong class="text-primary">Google Tasks API</strong>.</p>
            <div class="flex flex-wrap gap-2 pt-1">
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 transition-colors">
                <FaIcon icon="arrow-up-right-from-square" class="text-[10px]" />
                Google Cloud Console
              </a>
              <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 transition-colors">
                <FaIcon icon="arrow-up-right-from-square" class="text-[10px]" />
                Enable Calendar API
              </a>
              <a href="https://console.cloud.google.com/apis/library/tasks.googleapis.com" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 transition-colors">
                <FaIcon icon="arrow-up-right-from-square" class="text-[10px]" />
                Enable Tasks API
              </a>
            </div>
          </div>
        </div>

        <!-- Step 2: Create OAuth credentials -->
        <div class="flex gap-4 p-5">
          <span class="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] flex items-center justify-center font-bold">2</span>
          <div class="space-y-2 min-w-0 flex-1">
            <p class="text-sm font-medium text-primary">Create OAuth 2.0 credentials</p>
            <p class="text-xs text-muted">
              In <strong class="text-primary">APIs &amp; Services &rarr; Credentials</strong>, click
              <strong class="text-primary">Create Credentials &rarr; OAuth client ID</strong>
              and choose <strong class="text-primary">Web application</strong>.
            </p>
            <p class="text-xs text-muted">Under <strong class="text-primary">Authorized redirect URIs</strong>, add this URL exactly:</p>
            <div v-if="redirectUri" class="flex items-center gap-2">
              <code class="text-[11px] font-mono bg-elevated border border-border rounded-lg px-3 py-2 text-primary break-all flex-1">{{ redirectUri }}</code>
            </div>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 transition-colors">
              <FaIcon icon="arrow-up-right-from-square" class="text-[10px]" />
              Open Credentials
            </a>
          </div>
        </div>

        <!-- Step 3: Enter credentials -->
        <div class="flex gap-4 p-5" :class="isConnected ? 'opacity-60' : ''">
          <span
            class="shrink-0 mt-0.5 w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-bold"
            :class="hasCredentials
              ? 'bg-success/15 border border-success/40 text-success'
              : 'bg-accent/15 border border-accent/30 text-accent'"
          >
            <FaIcon v-if="hasCredentials" icon="check" class="text-[10px]" />
            <span v-else>3</span>
          </span>
          <div class="space-y-3 min-w-0 flex-1">
            <p class="text-sm font-medium text-primary">Enter your credentials</p>
            <p class="text-xs text-muted">Copy the <strong class="text-primary">Client ID</strong> and <strong class="text-primary">Client Secret</strong> from the OAuth client detail screen.</p>

            <div>
              <label class="text-xs text-muted block mb-1">Client ID</label>
              <SecretInput v-model="form.clientId" placeholder="Client ID" suggested-var="GOOGLE_CLIENT_ID" />
            </div>

            <div>
              <label class="text-xs text-muted block mb-1">Client Secret</label>
              <SecretInput v-model="form.clientSecret" placeholder="Client Secret" suggested-var="GOOGLE_CLIENT_SECRET" />
            </div>

            <div v-if="isDirty" class="flex items-center gap-2 pt-1">
              <button
                class="cursor-pointer px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                :disabled="saving"
                @click="save"
              >{{ saving ? 'Saving...' : 'Save' }}</button>
              <button
                class="cursor-pointer px-3 py-1.5 rounded-lg text-sm border border-border text-muted hover:text-primary transition-colors"
                :disabled="saving"
                @click="cancel"
              >Cancel</button>
              <p v-if="saveError" class="text-xs text-danger">{{ saveError }}</p>
            </div>
            <p v-else-if="saveSuccess" class="text-xs text-success pt-1">Saved</p>
          </div>
        </div>

        <!-- Step 4: Connect -->
        <div class="flex gap-4 p-5">
          <span
            class="shrink-0 mt-0.5 w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-bold"
            :class="isConnected
              ? 'bg-success/15 border border-success/40 text-success'
              : hasCredentials
                ? 'bg-accent/15 border border-accent/30 text-accent'
                : 'bg-surface border border-border text-muted'"
          >
            <FaIcon v-if="isConnected" icon="check" class="text-[10px]" />
            <span v-else>4</span>
          </span>
          <div class="space-y-3 min-w-0 flex-1">
            <p class="text-sm font-medium" :class="hasCredentials ? 'text-primary' : 'text-muted'">Connect your Google account</p>

            <template v-if="isConnected">
              <p class="text-xs text-muted">Your Google account is authorized. Events from your primary calendar appear on the dashboard.</p>
              <p v-if="disconnectError" class="text-xs text-danger">{{ disconnectError }}</p>
              <button
                class="cursor-pointer px-4 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-50"
                :disabled="disconnecting"
                @click="disconnect"
              >{{ disconnecting ? 'Disconnecting...' : 'Disconnect account' }}</button>
            </template>

            <template v-else-if="hasCredentials">
              <p class="text-xs text-muted">Click below to open Google's authorization page and grant read access to your calendar.</p>
              <a
                href="/api/auth/google"
                class="inline-flex cursor-pointer px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
              >Connect Google Account</a>
            </template>

            <template v-else>
              <p class="text-xs text-muted">Save your credentials in step 3 to unlock this step.</p>
            </template>
          </div>
        </div>

        </div><!-- end stepsExpanded -->
      </div>

      <!-- Preview panel -->
      <div class="w-full xl:w-64 xl:shrink-0 rounded-xl border border-border bg-surface overflow-hidden">
        <div class="px-4 py-3 border-b border-border">
          <p class="text-xs text-muted uppercase tracking-widest">Preview</p>
        </div>
        <div class="bg-black/80 p-4 min-h-32">
          <CalendarPanel :calendar="calendarData as any" />
        </div>
      </div>

    </div>

    <!-- Display settings -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">Display</p>
      </div>
      <div class="p-6 space-y-5">

        <!-- Show events toggle -->
        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p class="text-sm text-primary">Show events</p>
            <p class="text-xs text-muted mt-0.5">Display calendar events on the dashboard.</p>
          </div>
          <button
            role="switch"
            :aria-checked="display.showEvents"
            class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none"
            :class="display.showEvents ? 'bg-accent' : 'bg-border'"
            @click="display.showEvents = !display.showEvents"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform"
              :class="display.showEvents ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </label>

        <!-- Show tasks toggle -->
        <div class="space-y-2">
        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p class="text-sm text-primary">Show tasks</p>
            <p class="text-xs text-muted mt-0.5">
              Display Google Tasks due in the selected window.
              <span v-if="!current?.hasRefreshToken" class="text-warning"> Requires connecting your account.</span>
              <span v-else-if="!display.showTasks" class="text-muted/60"> Requires reconnecting to grant Tasks permission.</span>
            </p>
          </div>
          <button
            role="switch"
            :aria-checked="display.showTasks"
            class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none"
            :class="display.showTasks ? 'bg-accent' : 'bg-border'"
            @click="display.showTasks = !display.showTasks"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform"
              :class="display.showTasks ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </label>

        <!-- Live tasks failure warning -->
        <div
          v-if="display.showTasks && tasksError"
          class="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30"
        >
          <FaIcon icon="circle-exclamation" class="text-warning text-xs mt-0.5 shrink-0" />
          <p class="text-xs text-warning leading-snug">{{ tasksError }}</p>
        </div>

        <!-- Task window mode -->
        <div v-if="display.showTasks" class="flex items-center justify-between gap-4 pt-1">
          <div class="min-w-0">
            <p class="text-sm text-primary">Tasks to show</p>
            <p class="text-xs text-muted mt-0.5">
              {{ display.taskMode === 'overdue'
                ? 'Every overdue task plus today.'
                : 'Every overdue task plus today and upcoming tasks within the days-ahead window.' }}
            </p>
          </div>
          <div class="flex gap-1 shrink-0">
            <button
              class="cursor-pointer px-2.5 py-1 rounded-lg text-xs border transition-colors"
              :class="display.taskMode === 'all'
                ? 'bg-accent text-white border-accent'
                : 'border-border text-muted hover:text-primary hover:border-primary/40'"
              @click="display.taskMode = 'all'"
            >Everything</button>
            <button
              class="cursor-pointer px-2.5 py-1 rounded-lg text-xs border transition-colors"
              :class="display.taskMode === 'overdue'
                ? 'bg-accent text-white border-accent'
                : 'border-border text-muted hover:text-primary hover:border-primary/40'"
              @click="display.taskMode = 'overdue'"
            >Overdue</button>
          </div>
        </div>
        </div>

        <!-- Days ahead -->
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm text-primary">Days ahead</p>
            <p class="text-xs text-muted mt-0.5">How many days of events and tasks to fetch.</p>
          </div>
          <div class="flex gap-1 flex-wrap justify-end">
            <button
              v-for="n in DAYS_OPTIONS"
              :key="n"
              class="cursor-pointer px-2.5 py-1 rounded-lg text-xs border transition-colors"
              :class="display.daysAhead === n
                ? 'bg-accent text-white border-accent'
                : 'border-border text-muted hover:text-primary hover:border-primary/40'"
              @click="display.daysAhead = n"
            >{{ n }}</button>
          </div>
        </div>


      </div>
    </div>

  </div>
</template>
