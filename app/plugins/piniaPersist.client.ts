import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  (nuxtApp.$pinia as import('pinia').Pinia).use(piniaPluginPersistedstate)
})
