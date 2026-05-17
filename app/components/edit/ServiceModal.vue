<script setup lang="ts">
import { useEventListener, onClickOutside } from '@vueuse/core'
import type { WidgetEntry } from '~/server/api/admin/widgets.get'

type Service = { name: string; url?: string; icon?: string; description?: string; type?: string; apiKey?: string; username?: string; password?: string; [key: string]: unknown }

const props = defineProps<{ service: Service | null; group?: string }>()
const emit = defineEmits<{ save: [service: Service]; close: [] }>()

const form = reactive<Service>({
  name: props.service?.name ?? '',
  url: props.service?.url ?? '',
  icon: props.service?.icon ?? '',
  description: props.service?.description ?? '',
  type: props.service?.type ?? '',
  apiKey: props.service?.apiKey ?? '',
  username: props.service?.username ?? '',
  password: props.service?.password ?? '',
})

const credsLoading = ref(false)

// For existing services, fetch raw credentials (may contain ${VAR} references)
const credsError = ref('')
if (props.service?.name) {
  credsLoading.value = true
  $fetch<Record<string, string>>('/api/edit/service-creds', {
    method: 'POST',
    body: { name: props.service.name, group: props.group },
  }).then(creds => {
    if (creds.apiKey !== undefined) form.apiKey = creds.apiKey
    if (creds.username !== undefined) form.username = creds.username
    if (creds.password !== undefined) form.password = creds.password
  }).catch((e) => {
    credsError.value = `Could not load credentials: ${e?.data?.message ?? e?.message ?? 'unknown error'}`
  }).finally(() => { credsLoading.value = false })
}

useScrollLock()
const showIconPicker = ref(false)

// Widget autocomplete
const { data: widgetList } = await useFetch<WidgetEntry[]>('/api/admin/widgets')
const widgetSearch = ref(form.type ?? '')
const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const filteredWidgets = computed(() => {
  const q = widgetSearch.value.trim().toLowerCase()
  if (!q)
    return widgetList.value ?? []
  return (widgetList.value ?? []).filter((w) => w.type.includes(q) || w.name.toLowerCase().includes(q))
})

const selectedWidget = computed(() => (widgetList.value ?? []).find((w) => w.type === form.type) ?? null)

onClickOutside(dropdownRef, () => { showDropdown.value = false })

function selectWidget(w: WidgetEntry) {
  form.type = w.type
  widgetSearch.value = w.type
  showDropdown.value = false
}

function onWidgetInput() {
  form.type = widgetSearch.value.trim().toLowerCase()
  showDropdown.value = true
}

const AUTH_COLORS: Record<string, string> = {
  header: 'var(--color-accent)',
  bearer: 'var(--color-success)',
  basic: 'var(--color-warning)',
  query: '#a78bfa',
  none: 'var(--color-text-muted)',
}

// Credential fields based on widget auth type
const KNOWN_AUTH: Record<string, string> = {
  qbittorrent: 'basic', duplicati: 'password', pihole: 'password',
  portainer: 'bearer', homeassistant: 'bearer', audiobookshelf: 'bearer',
  unraid: 'header',
}
const authType = computed(() => selectedWidget.value?.authType ?? KNOWN_AUTH[form.type ?? ''] ?? (form.type ? 'header' : ''))
const isBasicAuth = computed(() => authType.value === 'basic')
const isPasswordOnly = computed(() => authType.value === 'password')


const suggestedApiKeyVar = computed(() => form.type ? envVarName(form.type, 'apiKey') : '')
const suggestedUsernameVar = computed(() => form.type ? envVarName(form.type, 'username') : '')
const suggestedPasswordVar = computed(() => form.type ? envVarName(form.type, 'password') : '')

const apiKeyEnvRef = computed(() => parseEnvRef(form.apiKey))
const usernameEnvRef = computed(() => parseEnvRef(form.username))
const passwordEnvRef = computed(() => parseEnvRef(form.password))

useEventListener('keydown', (e: KeyboardEvent) => {
  if (showIconPicker.value || showDropdown.value)
    return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter') submit()
})

type TestResult = { ok: boolean; status?: number; message?: string; fields?: { label: string; value: unknown }[] }
const testResult = ref<TestResult | null>(null)
const testing = ref(false)
const errors = reactive<Record<string, string>>({})

async function test() {
  if (!form.type || !form.url)
    return
  testing.value = true
  testResult.value = null
  try {
    const res = await $fetch<TestResult>('/api/edit/widget-test', {
      method: 'POST',
      body: { type: form.type, url: form.url, apiKey: form.apiKey, username: form.username, password: form.password },
    })
    testResult.value = res
  } catch {
    testResult.value = { ok: false, message: 'Request failed' }
  } finally {
    testing.value = false
  }
}

function submit() {
  errors.name = form.name ? '' : 'Name is required'
  if (errors.name)
    return
  emit('save', { ...form })
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
          <h2 class="font-semibold text-[var(--color-text-primary)]">{{ service ? 'Edit service' : 'Add service' }}</h2>
          <button class="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" @click="$emit('close')">✕</button>
        </div>

        <div class="px-6 py-4 space-y-4 overflow-y-auto">
          <Field label="Name" required>
            <input v-model="form.name" type="text" class="modal-input" :class="errors.name ? 'border-[var(--color-danger)]' : ''" placeholder="Sonarr" @input="errors.name = ''" />
            <p v-if="errors.name" class="text-xs text-[var(--color-danger)] mt-1">{{ errors.name }}</p>
          </Field>
          <Field label="URL">
            <input v-model="form.url" type="text" class="modal-input" placeholder="http://192.168.1.10:8989" />
          </Field>
          <Field label="Description">
            <input v-model="form.description" type="text" class="modal-input" />
          </Field>

          <!-- Icon field with picker -->
          <Field label="Icon">
            <div class="flex gap-2 items-center">
              <div class="w-9 h-9 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  v-if="form.icon"
                  :src="form.icon as string"
                  class="w-7 h-7 object-contain"
                  @error="($event.target as HTMLImageElement).style.opacity = '0'"
                />
              </div>
              <input v-model="form.icon" type="text" class="modal-input" placeholder="Search or paste URL…" />
              <button
                class="flex-shrink-0 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors whitespace-nowrap"
                @click="showIconPicker = true"
              >Browse</button>
            </div>
          </Field>

          <!-- Widget type with autocomplete -->
          <Field label="Widget type">
            <div ref="dropdownRef" class="relative">
              <input
                v-model="widgetSearch"
                type="text"
                class="modal-input font-mono"
                placeholder="-"
                autocomplete="off"
                @input="onWidgetInput"
                @focus="showDropdown = true"
                @keydown.escape.stop="showDropdown = false"
                @keydown.enter.prevent
              />
              <!-- Dropdown -->
              <div
                v-if="showDropdown && filteredWidgets.length"
                class="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-lg overflow-hidden max-h-48 overflow-y-auto"
              >
                <button
                  v-for="w in filteredWidgets"
                  :key="w.type"
                  class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--color-bg-surface)] transition-colors text-left"
                  :class="form.type === w.type ? 'bg-[var(--color-accent)]/10' : ''"
                  @mousedown.prevent="selectWidget(w)"
                >
                  <span class="font-mono text-[var(--color-text-primary)]">{{ w.type }}</span>
                  <span class="text-xs text-[var(--color-text-muted)]">{{ w.authType }}</span>
                </button>
              </div>
              <div
                v-else-if="showDropdown && widgetSearch && !filteredWidgets.length"
                class="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs text-[var(--color-text-muted)]"
              >
                No matching widget — go to Admin to fetch it
              </div>
            </div>
            <!-- Widget info card -->
            <div
              v-if="selectedWidget && !showDropdown"
              class="mt-2 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center gap-3 text-xs text-[var(--color-text-secondary)]"
            >
              <span class="px-1.5 py-0.5 rounded border font-medium"
                :style="{
                  color: AUTH_COLORS[selectedWidget.authType] ?? AUTH_COLORS.none,
                  borderColor: (AUTH_COLORS[selectedWidget.authType] ?? AUTH_COLORS.none) + '40',
                  background: (AUTH_COLORS[selectedWidget.authType] ?? AUTH_COLORS.none) + '15',
                }">{{ selectedWidget.authType }}</span>
              <span>{{ selectedWidget.displayLabels.length }} field{{ selectedWidget.displayLabels.length !== 1 ? 's' : '' }}</span>
            </div>
            <p
              v-else-if="form.type && !selectedWidget && !showDropdown"
              class="mt-1.5 text-xs text-[var(--color-warning)]"
            >Not in registry — fetch it from Admin to enable widget data</p>
          </Field>

          <p v-if="credsError" class="text-xs text-[var(--color-danger)]">{{ credsError }}</p>

          <!-- Credentials based on auth type -->
          <template v-if="form.type && authType !== 'none'">
            <template v-if="isPasswordOnly">
              <Field label="Password">
                <input v-model="form.password" :type="passwordEnvRef ? 'text' : 'password'" class="modal-input" autocomplete="new-password" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading…' : ''" />
                <div class="mt-1 flex items-center gap-2">
                  <span v-if="passwordEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]">from env: {{ passwordEnvRef }}</span>
                  <button v-else type="button" class="text-[10px] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors" @click="form.password = '${' + suggestedPasswordVar + '}'">use $&#123;{{ suggestedPasswordVar }}&#125;</button>
                </div>
              </Field>
            </template>
            <template v-else-if="isBasicAuth">
              <Field label="Username">
                <input v-model="form.username" type="text" class="modal-input" autocomplete="off" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading…' : ''" />
                <div class="mt-1 flex items-center gap-2">
                  <span v-if="usernameEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]">from env: {{ usernameEnvRef }}</span>
                  <button v-else type="button" class="text-[10px] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors" @click="form.username = '${' + suggestedUsernameVar + '}'">use $&#123;{{ suggestedUsernameVar }}&#125;</button>
                </div>
              </Field>
              <Field label="Password">
                <input v-model="form.password" :type="passwordEnvRef ? 'text' : 'password'" class="modal-input" autocomplete="new-password" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading…' : ''" />
                <div class="mt-1 flex items-center gap-2">
                  <span v-if="passwordEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]">from env: {{ passwordEnvRef }}</span>
                  <button v-else type="button" class="text-[10px] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors" @click="form.password = '${' + suggestedPasswordVar + '}'">use $&#123;{{ suggestedPasswordVar }}&#125;</button>
                </div>
              </Field>
            </template>
            <Field v-else label="API key">
              <input v-model="form.apiKey" type="text" class="modal-input font-mono text-xs" autocomplete="off" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading…' : ''" />
              <div class="mt-1 flex items-center gap-2">
                <span v-if="apiKeyEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]">from env: {{ apiKeyEnvRef }}</span>
                <button v-else type="button" class="text-[10px] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors" @click="form.apiKey = '${' + suggestedApiKeyVar + '}'">use $&#123;{{ suggestedApiKeyVar }}&#125;</button>
              </div>
            </Field>
          </template>
        </div>

        <div v-if="testResult" class="px-6 pb-3 space-y-1.5">
          <p class="text-xs font-medium" :class="testResult.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'">
            {{ testResult.ok ? '✓ Connected' : `✗ Failed${testResult.status ? ` (${testResult.status})` : ''}${testResult.message ? ` — ${testResult.message}` : ''}` }}
          </p>
          <div v-if="testResult.ok && testResult.fields?.length" class="rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
            <span v-for="f in testResult.fields" :key="f.label" class="text-xs">
              <span class="text-[var(--color-text-muted)]">{{ f.label }}:</span>
              <span class="ml-1 text-[var(--color-text-primary)] font-mono">{{ f.value ?? '—' }}</span>
            </span>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between gap-2 flex-shrink-0">
          <button
            v-if="form.type && form.url"
            class="cursor-pointer px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] disabled:opacity-50"
            :disabled="testing"
            @click="test"
          >{{ testing ? 'Testing…' : 'Test widget' }}</button>
          <div class="flex gap-2 ml-auto">
            <button class="cursor-pointer px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" @click="$emit('close')">Cancel</button>
            <button class="cursor-pointer px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed" :disabled="credsLoading" @click="submit">Save</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <IconPicker
    v-if="showIconPicker"
    @select="(url) => { form.icon = url; showIconPicker = false }"
    @close="showIconPicker = false"
  />
</template>

<style scoped>
@reference "tailwindcss";

.modal-input {
  @apply w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors;
}
</style>
