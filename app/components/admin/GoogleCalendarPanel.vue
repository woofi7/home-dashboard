<script setup lang="ts">
type CalendarConfig = { clientId: string; clientSecret: string; hasRefreshToken: boolean }

const route = useRoute()

const { data: current, refresh: refreshCurrent } = await useFetch<CalendarConfig>('/api/admin/calendar')

const form = ref({ clientId: '', clientSecret: '' })

watch(current, (val) => {
  form.value = {
    clientId:     val?.clientId     ?? '',
    clientSecret: val?.clientSecret ?? '',
  }
}, { immediate: true })

const isDirty = computed(() =>
  form.value.clientId !== (current.value?.clientId ?? '') ||
  form.value.clientSecret !== (current.value?.clientSecret ?? '')
)

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

const { data: calendarData } = useFetch('/api/calendar')
</script>

<template>
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
      <div class="w-full xl:flex-1 xl:min-w-0 rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">

        <!-- Step 1: Create project -->
        <div class="flex gap-4 p-5">
          <span class="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] flex items-center justify-center font-bold">1</span>
          <div class="space-y-2 min-w-0">
            <p class="text-sm font-medium text-primary">Create a Google Cloud project</p>
            <p class="text-xs text-muted">Open the Google Cloud Console and create a new project (or select an existing one). Then enable the <strong class="text-primary">Google Calendar API</strong> for it.</p>
            <div class="flex flex-wrap gap-2 pt-1">
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 transition-colors">
                <FaIcon icon="arrow-up-right-from-square" class="text-[10px]" />
                Google Cloud Console
              </a>
              <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-primary hover:border-primary/40 transition-colors">
                <FaIcon icon="arrow-up-right-from-square" class="text-[10px]" />
                Enable Calendar API
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

  </div>
</template>
