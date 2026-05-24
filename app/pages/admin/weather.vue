<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

type WeatherConfig = {
  locationMode: 'ip' | 'custom'
  location: { name?: string; lat?: number; lon?: number; admin1?: string; countryCode?: string }
  units: 'celsius' | 'fahrenheit'
  display: { feelsLike: boolean; humidity: boolean; wind: boolean; laterToday: boolean; tomorrow: boolean }
}

type GeoResult = { name: string; admin1?: string; country: string; country_code: string; latitude: number; longitude: number }

const { data: current, refresh } = await useFetch<WeatherConfig>('/api/admin/weather')

function defaultForm(): WeatherConfig {
  return {
    locationMode: 'ip',
    location: {},
    units: 'celsius',
    display: { feelsLike: true, humidity: true, wind: true, laterToday: true, tomorrow: true },
  }
}

const form = ref<WeatherConfig>(defaultForm())

watch(current, (v) => {
  if (v)
    form.value = JSON.parse(JSON.stringify(v))
}, { immediate: true })

const isDirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(current.value))

function cancel() {
  if (current.value)
    form.value = JSON.parse(JSON.stringify(current.value))
}

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/admin/weather', { method: 'POST', body: form.value })
    await refresh()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

// Location search
const searchQuery = ref('')
const searchResults = ref<GeoResult[]>([])
const searching = ref(false)

async function searchLocation() {
  if (!searchQuery.value.trim())
    return
  searching.value = true
  searchResults.value = []
  try {
    const res = await $fetch<{ results?: GeoResult[] }>(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.value)}&count=5&language=en&format=json`
    )
    searchResults.value = res.results ?? []
  } finally {
    searching.value = false
  }
}

function selectLocation(r: GeoResult) {
  form.value.location = {
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    admin1: r.admin1,
    countryCode: r.country_code?.toLowerCase(),
  }
  searchQuery.value = ''
  searchResults.value = []
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter')
    searchLocation()
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
    <!-- Location -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">Location</p>
      </div>
      <div class="p-6 space-y-4">
        <div class="flex gap-3">
          <button
            class="flex-1 py-2 rounded-lg border text-sm transition-colors"
            :class="form.locationMode === 'ip'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-muted hover:border-accent hover:text-accent'"
            @click="form.locationMode = 'ip'"
          >IP geolocation</button>
          <button
            class="flex-1 py-2 rounded-lg border text-sm transition-colors"
            :class="form.locationMode === 'custom'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-muted hover:border-accent hover:text-accent'"
            @click="form.locationMode = 'custom'"
          >Custom location</button>
        </div>

        <div v-if="form.locationMode === 'ip'" class="text-xs text-muted">
          Your location is determined automatically from your server's IP address.
        </div>

        <div v-else class="space-y-3">
          <div v-if="form.location.name" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated border border-border">
            <FaIcon icon="cloud-sun" class="text-muted text-sm" />
            <span class="text-sm text-primary flex-1">{{ form.location.name }}</span>
            <button class="text-xs text-muted hover:text-danger transition-colors" @click="form.location = {}">Clear</button>
          </div>
          <div class="flex gap-2">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search city..."
              class="flex-1 px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              @keydown="onSearchKeydown"
            />
            <button
              class="px-3 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              :disabled="searching || !searchQuery.trim()"
              @click="searchLocation"
            >{{ searching ? '...' : 'Search' }}</button>
          </div>
          <div v-if="searchResults.length" class="rounded-lg border border-border overflow-hidden">
            <button
              v-for="r in searchResults"
              :key="`${r.latitude},${r.longitude}`"
              class="w-full text-left px-3 py-2 text-sm hover:bg-elevated transition-colors border-b border-border last:border-0"
              @click="selectLocation(r)"
            >
              <span class="text-primary">{{ r.name }}</span>
              <span v-if="r.admin1" class="text-muted">, {{ r.admin1 }}</span>
              <span class="text-muted">, {{ r.country }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Units -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">Units</p>
      </div>
      <div class="p-6">
        <div class="flex gap-3">
          <button
            class="flex-1 py-2 rounded-lg border text-sm transition-colors"
            :class="form.units === 'celsius'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-muted hover:border-accent hover:text-accent'"
            @click="form.units = 'celsius'"
          >Celsius (°C)</button>
          <button
            class="flex-1 py-2 rounded-lg border text-sm transition-colors"
            :class="form.units === 'fahrenheit'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-muted hover:border-accent hover:text-accent'"
            @click="form.units = 'fahrenheit'"
          >Fahrenheit (°F)</button>
        </div>
      </div>
    </div>

    <!-- Display -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">Display</p>
      </div>
      <div class="p-6 space-y-3">
        <label v-for="(label, key) in { feelsLike: 'Feels like temperature', humidity: 'Humidity', wind: 'Wind speed', laterToday: 'Later today forecast', tomorrow: 'Tomorrow forecast' }" :key="key" class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="form.display[key as keyof typeof form.display]"
            type="checkbox"
            class="rounded accent-accent w-4 h-4 cursor-pointer"
          />
          <span class="text-sm text-primary">{{ label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
