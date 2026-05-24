<script setup lang="ts">
type BackgroundConfig = {
  provider?: string
  color?: string
  unsplashApiKey?: string
  pexelsApiKey?: string
  pixabayApiKey?: string
  query?: string
  url?: string
  position?: string
  overlay?: number
  blur?: string
  fadeSpeed?: string
}

const emit = defineEmits<{ saved: [] }>()

const { data: current, refresh: refreshCurrent } = await useFetch<BackgroundConfig>('/api/admin/background')

const form = ref<Required<BackgroundConfig>>({
  provider: 'none',
  color: '#0f1117',
  unsplashApiKey: '',
  pexelsApiKey: '',
  pixabayApiKey: '',
  query: '',
  url: '',
  position: 'center',
  overlay: 40,
  blur: 'none',
  fadeSpeed: 'normal',
})

watch(current, (val) => {
  if (!val) return
  form.value = {
    provider: val.provider ?? 'none',
    color: val.color ?? '#0f1117',
    unsplashApiKey: val.unsplashApiKey ?? '',
    pexelsApiKey: val.pexelsApiKey ?? '',
    pixabayApiKey: val.pixabayApiKey ?? '',
    query: val.query ?? '',
    url: val.url ?? '',
    position: val.position ?? 'center',
    overlay: typeof val.overlay === 'number' ? val.overlay : 40,
    blur: val.blur ?? 'none',
    fadeSpeed: val.fadeSpeed ?? 'normal',
  }
}, { immediate: true })

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/admin/background', { method: 'POST', body: form.value })
    await refreshCurrent()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
    emit('saved')
  } catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
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
    form.value.provider = 'upload'
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

const POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top',    label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left',   label: 'Left' },
  { value: 'right',  label: 'Right' },
]

const BLURS = [
  { value: 'none', label: 'None' },
  { value: 'sm',   label: 'Light' },
  { value: 'md',   label: 'Medium' },
  { value: 'lg',   label: 'Heavy' },
]

const SPEEDS = [
  { value: 'none',   label: 'None' },
  { value: 'fast',   label: 'Fast' },
  { value: 'normal', label: 'Normal' },
  { value: 'slow',   label: 'Slow' },
]

const needsQuery = computed(() => ['unsplash', 'pexels', 'pixabay'].includes(form.value.provider))
</script>

<template>
  <div class="flex gap-6 items-start">

    <!-- Left panel: Provider -->
    <div class="flex-1 min-w-0 rounded-xl border border-border bg-surface p-6 space-y-6">
      <p class="text-xs text-muted uppercase tracking-widest">Provider</p>

      <div class="flex gap-2 flex-wrap">
        <button
          v-for="p in PROVIDERS"
          :key="p.value"
          class="px-4 py-2 rounded-lg text-sm border transition-colors cursor-pointer"
          :class="form.provider === p.value
            ? 'bg-accent/15 border-accent/40 text-accent'
            : 'bg-transparent border-border text-muted hover:text-primary'"
          @click="form.provider = p.value"
        >{{ p.label }}</button>
      </div>

      <!-- None: color picker -->
      <section v-if="form.provider === 'none'">
        <label class="text-xs text-muted block mb-2">Background color</label>
        <div class="flex items-center gap-3">
          <input
            v-model="form.color"
            type="color"
            class="w-10 h-8 rounded cursor-pointer border border-border bg-transparent"
          />
          <span class="text-sm text-primary font-mono">{{ form.color }}</span>
        </div>
      </section>

      <!-- Picsum -->
      <section v-else-if="form.provider === 'picsum'">
        <p class="text-xs text-muted">No configuration needed. A random landscape photo is served daily via <a href="https://picsum.photos" target="_blank" rel="noopener" class="text-primary hover:underline">picsum.photos</a>.</p>
      </section>

      <!-- Unsplash -->
      <section v-else-if="form.provider === 'unsplash'" class="space-y-3">
        <div>
          <label class="text-xs text-muted block mb-1">API Key</label>
          <input v-model="form.unsplashApiKey" type="password" placeholder="Unsplash Client ID" class="modal-input" autocomplete="off" />
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
      <section v-else-if="form.provider === 'pexels'" class="space-y-3">
        <div>
          <label class="text-xs text-muted block mb-1">API Key</label>
          <input v-model="form.pexelsApiKey" type="password" placeholder="Pexels API Key" class="modal-input" autocomplete="off" />
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
      <section v-else-if="form.provider === 'pixabay'" class="space-y-3">
        <div>
          <label class="text-xs text-muted block mb-1">API Key</label>
          <input v-model="form.pixabayApiKey" type="password" placeholder="Pixabay API Key" class="modal-input" autocomplete="off" />
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
      <section v-else-if="form.provider === 'url'">
        <label class="text-xs text-muted block mb-1">Image URL</label>
        <input v-model="form.url" type="url" placeholder="https://..." class="modal-input" />
      </section>

      <!-- Upload -->
      <section v-else-if="form.provider === 'upload'" class="space-y-3">
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
        <div v-if="uploadedKey > 0 || current?.provider === 'upload'" class="rounded-lg overflow-hidden border border-border" style="max-height: 140px">
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
        <input v-model="form.query" type="text" placeholder="nature landscape" class="modal-input" />
        <p class="text-[11px] text-muted mt-1">A new photo from this query is loaded daily.</p>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-3 pt-2">
        <button
          class="cursor-pointer px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >{{ saving ? 'Saving...' : 'Save' }}</button>
        <p v-if="saveSuccess" class="text-xs text-success">Saved</p>
        <p v-if="saveError" class="text-xs text-danger">{{ saveError }}</p>
      </div>
    </div>

    <!-- Right panel: Appearance -->
    <div class="w-72 shrink-0 rounded-xl border border-border bg-surface p-6 space-y-5">
      <p class="text-xs text-muted uppercase tracking-widest">Appearance</p>

      <div>
        <label class="text-xs text-muted block mb-2">Position</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="p in POSITIONS"
            :key="p.value"
            class="px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer"
            :class="form.position === p.value
              ? 'bg-accent/15 border-accent/40 text-accent'
              : 'bg-transparent border-border text-muted hover:text-primary'"
            @click="form.position = p.value"
          >{{ p.label }}</button>
        </div>
      </div>

      <div>
        <label class="text-xs text-muted block mb-2">Overlay opacity: {{ form.overlay }}%</label>
        <input v-model.number="form.overlay" type="range" min="0" max="80" step="5" class="w-full accent-accent cursor-pointer" />
        <div class="flex justify-between text-[10px] text-muted/50 mt-1">
          <span>Transparent</span>
          <span>Dark</span>
        </div>
      </div>

      <div>
        <label class="text-xs text-muted block mb-2">Blur</label>
        <div class="flex gap-2">
          <button
            v-for="b in BLURS"
            :key="b.value"
            class="px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer"
            :class="form.blur === b.value
              ? 'bg-accent/15 border-accent/40 text-accent'
              : 'bg-transparent border-border text-muted hover:text-primary'"
            @click="form.blur = b.value"
          >{{ b.label }}</button>
        </div>
      </div>

      <div>
        <label class="text-xs text-muted block mb-2">Fade-in speed</label>
        <div class="flex gap-2">
          <button
            v-for="s in SPEEDS"
            :key="s.value"
            class="px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer"
            :class="form.fadeSpeed === s.value
              ? 'bg-accent/15 border-accent/40 text-accent'
              : 'bg-transparent border-border text-muted hover:text-primary'"
            @click="form.fadeSpeed = s.value"
          >{{ s.label }}</button>
        </div>
      </div>
    </div>

  </div>
</template>
