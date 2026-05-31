<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useConnectivityStore } from '~/stores/connectivity'

const store = useConnectivityStore()
const { online } = storeToRefs(store)

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 30000)
})
onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

const snapshotLabel = computed(() => {
  const ts = store.lastSnapshotAt
  if (!ts)
    return 'no cached data'
  const min = Math.floor(Math.max(0, now.value - ts) / 60000)
  if (min < 1)
    return 'just now'
  if (min < 60)
    return `${min} min ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24)
    return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
})

const snapshotTime = computed(() => {
  const ts = store.lastSnapshotAt
  if (!ts)
    return ''
  return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="!online"
      class="fixed top-0 inset-x-0 z-60 flex items-center justify-center gap-2 px-4 py-1.5 bg-danger/90 text-white text-xs backdrop-blur-sm"
    >
      <FaIcon icon="circle-exclamation" />
      <span>Offline - showing last snapshot from {{ snapshotLabel }}<template v-if="snapshotTime"> ({{ snapshotTime }})</template></span>
    </div>
  </Transition>
</template>
