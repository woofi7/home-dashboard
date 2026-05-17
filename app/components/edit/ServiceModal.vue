<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

type Service = { name: string; url?: string; icon?: string; description?: string; type?: string; apiKey?: string; username?: string; password?: string; container?: string; server?: string; [key: string]: unknown }
type TestResult = { ok: boolean; status?: number; message?: string; fields?: { label: string; value: unknown }[] }

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
  container: props.service?.container ?? '',
  server: props.service?.server ?? '',
})

const credsLoading = ref(false)
const credsError = ref('')
if (props.service?.name) {
  credsLoading.value = true
  $fetch<Record<string, string>>('/api/edit/service-creds', {
    method: 'POST',
    body: { name: props.service.name, group: props.group },
  }).then(creds => {
    if (creds.apiKey !== undefined)
      form.apiKey = creds.apiKey
    if (creds.username !== undefined)
      form.username = creds.username
    if (creds.password !== undefined)
      form.password = creds.password
  }).catch((e) => {
    credsError.value = `Could not load credentials: ${e?.data?.message ?? e?.message ?? 'unknown error'}`
  }).finally(() => { credsLoading.value = false })
}

useScrollLock()
const showIconPicker = ref(false)

const widgetEntries = Object.entries(widgetDefinitions).map(([type, def]) => ({ type, ...def }))
const authType = computed(() => {
  const def = widgetEntries.find(w => w.type === form.type)
  return def?.authType ?? (form.type ? 'header' : '')
})

useEventListener('keydown', (e: KeyboardEvent) => {
  if (showIconPicker.value)
    return
  if (e.key === 'Escape')
    emit('close')
  if (e.key === 'Enter')
    submit()
})

const testResult = ref<TestResult | null>(null)
const testing = ref(false)
const errors = reactive<Record<string, string>>({})

async function test() {
  if (!form.type || !form.url)
    return
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await $fetch<TestResult>('/api/edit/widget-test', {
      method: 'POST',
      body: { type: form.type, url: form.url, apiKey: form.apiKey, username: form.username, password: form.password },
    })
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
      <div class="bg-surface border border-border rounded-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 class="font-semibold text-primary">{{ service ? 'Edit service' : 'Add service' }}</h2>
          <button class="text-muted hover:text-primary" @click="$emit('close')"><FaIcon icon="xmark" /></button>
        </div>

        <div class="px-6 py-4 space-y-4 overflow-y-auto">
          <Field label="Name" required>
            <input v-model="form.name" type="text" class="modal-input" :class="errors.name ? 'border-danger' : ''" placeholder="Sonarr" @input="errors.name = ''" />
            <p v-if="errors.name" class="text-xs text-danger mt-1">{{ errors.name }}</p>
          </Field>
          <Field label="URL">
            <input v-model="form.url" type="text" class="modal-input" placeholder="http://192.168.1.10:8989" />
          </Field>
          <Field label="Description">
            <input v-model="form.description" type="text" class="modal-input" />
          </Field>
          <IconField v-model="form.icon as string" @browse="showIconPicker = true" />
          <DockerField v-model:server="form.server as string" v-model:container="form.container as string" />
          <WidgetTypeField v-model="form.type as string" />
          <p v-if="credsError" class="text-xs text-danger">{{ credsError }}</p>
          <CredentialFields
            :auth-type="authType"
            :creds-loading="credsLoading"
            :api-key="form.apiKey as string"
            :username="form.username as string"
            :password="form.password as string"
            :widget-type="form.type as string"
            @update:api-key="form.apiKey = $event"
            @update:username="form.username = $event"
            @update:password="form.password = $event"
          />
        </div>

        <WidgetTestResult :result="testResult" />

        <div class="px-6 py-4 border-t border-border flex justify-between gap-2 shrink-0">
          <button
            v-if="form.type && form.url"
            class="cursor-pointer px-3 py-2 rounded-lg bg-elevated border border-border text-xs text-secondary hover:border-accent disabled:opacity-50"
            :disabled="testing"
            @click="test"
          >{{ testing ? 'Testing...' : 'Test widget' }}</button>
          <div class="flex gap-2 ml-auto">
            <button class="cursor-pointer px-4 py-2 rounded-lg text-sm text-secondary hover:text-primary" @click="$emit('close')">Cancel</button>
            <button class="cursor-pointer px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed" :disabled="credsLoading" @click="submit">Save</button>
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
