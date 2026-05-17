<script setup lang="ts">
const props = defineProps<{
  authType: string
  credsLoading: boolean
  apiKey: string
  username: string
  password: string
  widgetType: string
}>()

const emit = defineEmits<{
  'update:apiKey': [v: string]
  'update:username': [v: string]
  'update:password': [v: string]
}>()

const suggestedApiKeyVar = computed(() => props.widgetType ? envVarName(props.widgetType, 'apiKey') : '')
const suggestedUsernameVar = computed(() => props.widgetType ? envVarName(props.widgetType, 'username') : '')
const suggestedPasswordVar = computed(() => props.widgetType ? envVarName(props.widgetType, 'password') : '')

const apiKeyEnvRef = computed(() => parseEnvRef(props.apiKey))
const usernameEnvRef = computed(() => parseEnvRef(props.username))
const passwordEnvRef = computed(() => parseEnvRef(props.password))
</script>

<template>
  <template v-if="authType && authType !== 'none'">
    <template v-if="authType === 'password'">
      <Field label="Password">
        <input :value="password" :type="passwordEnvRef ? 'text' : 'password'" class="modal-input" autocomplete="new-password" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading...' : ''" @input="emit('update:password', ($event.target as HTMLInputElement).value)" />
        <div class="mt-1 flex items-center gap-2">
          <span v-if="passwordEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-success/10 border border-success/30 text-success">from env: {{ passwordEnvRef }}</span>
          <button v-else type="button" class="text-[10px] font-mono text-muted hover:text-accent transition-colors" @click="emit('update:password', '${' + suggestedPasswordVar + '}')">use $&#123;{{ suggestedPasswordVar }}&#125;</button>
        </div>
      </Field>
    </template>
    <template v-else-if="authType === 'basic'">
      <Field label="Username">
        <input :value="username" type="text" class="modal-input" autocomplete="off" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading...' : ''" @input="emit('update:username', ($event.target as HTMLInputElement).value)" />
        <div class="mt-1 flex items-center gap-2">
          <span v-if="usernameEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-success/10 border border-success/30 text-success">from env: {{ usernameEnvRef }}</span>
          <button v-else type="button" class="text-[10px] font-mono text-muted hover:text-accent transition-colors" @click="emit('update:username', '${' + suggestedUsernameVar + '}')">use $&#123;{{ suggestedUsernameVar }}&#125;</button>
        </div>
      </Field>
      <Field label="Password">
        <input :value="password" :type="passwordEnvRef ? 'text' : 'password'" class="modal-input" autocomplete="new-password" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading...' : ''" @input="emit('update:password', ($event.target as HTMLInputElement).value)" />
        <div class="mt-1 flex items-center gap-2">
          <span v-if="passwordEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-success/10 border border-success/30 text-success">from env: {{ passwordEnvRef }}</span>
          <button v-else type="button" class="text-[10px] font-mono text-muted hover:text-accent transition-colors" @click="emit('update:password', '${' + suggestedPasswordVar + '}')">use $&#123;{{ suggestedPasswordVar }}&#125;</button>
        </div>
      </Field>
    </template>
    <Field v-else label="API key">
      <input :value="apiKey" type="text" class="modal-input font-mono text-xs" autocomplete="off" :disabled="credsLoading" :placeholder="credsLoading ? 'Loading...' : ''" @input="emit('update:apiKey', ($event.target as HTMLInputElement).value)" />
      <div class="mt-1 flex items-center gap-2">
        <span v-if="apiKeyEnvRef" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-success/10 border border-success/30 text-success">from env: {{ apiKeyEnvRef }}</span>
        <button v-else type="button" class="text-[10px] font-mono text-muted hover:text-accent transition-colors" @click="emit('update:apiKey', '${' + suggestedApiKeyVar + '}')">use $&#123;{{ suggestedApiKeyVar }}&#125;</button>
      </div>
    </Field>
  </template>
</template>
