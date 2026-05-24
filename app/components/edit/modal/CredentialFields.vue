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
</script>

<template>
  <template v-if="authType && authType !== 'none'">
    <template v-if="authType === 'password'">
      <Field label="Password">
        <SecretInput
          :model-value="password"
          :suggested-var="suggestedPasswordVar"
          :disabled="credsLoading"
          :placeholder="credsLoading ? 'Loading...' : ''"
          @update:model-value="emit('update:password', $event)"
        />
      </Field>
    </template>
    <template v-else-if="authType === 'basic'">
      <Field label="Username">
        <SecretInput
          :model-value="username"
          :masked="false"
          :suggested-var="suggestedUsernameVar"
          :disabled="credsLoading"
          :placeholder="credsLoading ? 'Loading...' : ''"
          @update:model-value="emit('update:username', $event)"
        />
      </Field>
      <Field label="Password">
        <SecretInput
          :model-value="password"
          :suggested-var="suggestedPasswordVar"
          :disabled="credsLoading"
          :placeholder="credsLoading ? 'Loading...' : ''"
          @update:model-value="emit('update:password', $event)"
        />
      </Field>
    </template>
    <Field v-else label="API key">
      <SecretInput
        :model-value="apiKey"
        :suggested-var="suggestedApiKeyVar"
        :disabled="credsLoading"
        :placeholder="credsLoading ? 'Loading...' : ''"
        @update:model-value="emit('update:apiKey', $event)"
      />
    </Field>
  </template>
</template>
