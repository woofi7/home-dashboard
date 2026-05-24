<script setup lang="ts">
export type ProviderForm = {
  provider: string
  color: string
  unsplashApiKey: string
  pexelsApiKey: string
  pixabayApiKey: string
  query: string
  url: string
}

const props = defineProps<{
  modelValue: ProviderForm
  savedProvider?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [v: ProviderForm] }>()

function set(patch: Partial<ProviderForm>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const uploadInput = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadError = ref('')
const uploadedKey = ref(0)

async function handleUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch('/api/admin/background-upload', { method: 'POST', body: fd })
    set({ provider: 'upload' })
    uploadedKey.value++
  } catch (err: unknown) {
    uploadError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Upload failed'
  } finally {
    uploading.value = false
    if (uploadInput.value) uploadInput.value.value = ''
  }
}

const PROVIDERS = [
  { value: 'none',     label: 'Basic color' },
  { value: 'picsum',   label: 'Picsum' },
  { value: 'unsplash', label: 'Unsplash' },
  { value: 'pexels',   label: 'Pexels' },
  { value: 'pixabay',  label: 'Pixabay' },
  { value: 'url',      label: 'Custom URL' },
  { value: 'upload',   label: 'Upload' },
]

const needsQuery = computed(() => ['unsplash', 'pexels', 'pixabay'].includes(props.modelValue.provider))
</script>

<template>
  <div class="space-y-6">
    <p class="text-xs text-muted uppercase tracking-widest">Provider</p>

    <OptionPicker
      :model-value="modelValue.provider"
      :options="PROVIDERS"
      @update:model-value="set({ provider: $event })"
    />

    <!-- None: color picker -->
    <section v-if="modelValue.provider === 'none'">
      <label class="text-xs text-muted block mb-2">Background color</label>
      <div class="flex items-center gap-3">
        <input
          :value="modelValue.color"
          type="color"
          class="w-10 h-8 rounded cursor-pointer border border-border bg-transparent"
          @input="set({ color: ($event.target as HTMLInputElement).value })"
        />
        <span class="text-sm text-primary font-mono">{{ modelValue.color }}</span>
      </div>
    </section>

    <!-- Picsum -->
    <section v-else-if="modelValue.provider === 'picsum'">
      <p class="text-xs text-muted">No configuration needed. A random landscape photo is served daily via <a href="https://picsum.photos" target="_blank" rel="noopener" class="text-primary hover:underline">picsum.photos</a>.</p>
    </section>

    <!-- Unsplash -->
    <section v-else-if="modelValue.provider === 'unsplash'" class="space-y-3">
      <div>
        <label class="text-xs text-muted block mb-1">API Key</label>
        <SecretInput
          :model-value="modelValue.unsplashApiKey"
          placeholder="Unsplash Client ID"
          suggested-var="UNSPLASH_API_KEY"
          @update:model-value="set({ unsplashApiKey: $event })"
        />
        <div class="text-[11px] text-muted mt-2 space-y-1">
          <p>To get a free API key from <a href="https://unsplash.com/developers" target="_blank" rel="noopener" class="text-primary hover:underline">unsplash.com/developers</a>:</p>
          <ol class="list-decimal list-inside space-y-0.5 pl-1">
            <li>Create or log in to your Unsplash account</li>
            <li>Click "New Application"</li>
            <li>Accept the API guidelines</li>
            <li>Fill in the app name and description</li>
            <li>Copy the <span class="text-primary">Access Key</span> (Client ID)</li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Pexels -->
    <section v-else-if="modelValue.provider === 'pexels'" class="space-y-3">
      <div>
        <label class="text-xs text-muted block mb-1">API Key</label>
        <SecretInput
          :model-value="modelValue.pexelsApiKey"
          placeholder="Pexels API Key"
          suggested-var="PEXELS_API_KEY"
          @update:model-value="set({ pexelsApiKey: $event })"
        />
        <div class="text-[11px] text-muted mt-2 space-y-1">
          <p>To get a free API key from <a href="https://www.pexels.com/api" target="_blank" rel="noopener" class="text-primary hover:underline">pexels.com/api</a>:</p>
          <ol class="list-decimal list-inside space-y-0.5 pl-1">
            <li>Create or log in to your Pexels account</li>
            <li>Go to the API section and click "Your API Key"</li>
            <li>Fill in the application details</li>
            <li>Copy your API key</li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Pixabay -->
    <section v-else-if="modelValue.provider === 'pixabay'" class="space-y-3">
      <div>
        <label class="text-xs text-muted block mb-1">API Key</label>
        <SecretInput
          :model-value="modelValue.pixabayApiKey"
          placeholder="Pixabay API Key"
          suggested-var="PIXABAY_API_KEY"
          @update:model-value="set({ pixabayApiKey: $event })"
        />
        <div class="text-[11px] text-muted mt-2 space-y-1">
          <p>To get a free API key from <a href="https://pixabay.com/api/docs" target="_blank" rel="noopener" class="text-primary hover:underline">pixabay.com/api/docs</a>:</p>
          <ol class="list-decimal list-inside space-y-0.5 pl-1">
            <li>Create or log in to your Pixabay account</li>
            <li>Visit the API documentation page</li>
            <li>Your API key is shown at the top once logged in</li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Custom URL -->
    <section v-else-if="modelValue.provider === 'url'">
      <label class="text-xs text-muted block mb-1">Image URL</label>
      <input
        :value="modelValue.url"
        type="url"
        placeholder="https://..."
        class="modal-input"
        @input="set({ url: ($event.target as HTMLInputElement).value })"
      />
    </section>

    <!-- Upload -->
    <section v-else-if="modelValue.provider === 'upload'" class="space-y-3">
      <div>
        <label class="text-xs text-muted block mb-2">Image file</label>
        <div
          class="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
          @click="uploadInput?.click()"
        >
          <p class="text-sm text-muted">Click to select an image</p>
          <p class="text-[11px] text-muted/60 mt-1">JPG, PNG, WebP, GIF - max 20 MB</p>
          <p v-if="uploading" class="text-xs text-accent mt-2">Uploading...</p>
          <p v-if="uploadError" class="text-xs text-danger mt-2">{{ uploadError }}</p>
        </div>
        <input ref="uploadInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleUpload" />
      </div>
      <div v-if="uploadedKey > 0 || savedProvider === 'upload'" class="rounded-lg overflow-hidden border border-border" style="max-height: 140px">
        <img
          :key="uploadedKey"
          :src="`/api/background-file?t=${uploadedKey}`"
          alt="Current background"
          class="w-full object-cover"
          style="max-height: 140px"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
      </div>
    </section>

    <!-- Shared query for API providers -->
    <div v-if="needsQuery">
      <label class="text-xs text-muted block mb-1">Search query</label>
      <input
        :value="modelValue.query"
        type="text"
        placeholder="nature landscape"
        class="modal-input"
        @input="set({ query: ($event.target as HTMLInputElement).value })"
      />
      <p class="text-[11px] text-muted mt-1">A new photo from this query is loaded daily.</p>
    </div>
  </div>
</template>
