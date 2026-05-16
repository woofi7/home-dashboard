import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },

  runtimeConfig: {
    configDir: process.env.CONFIG_DIR || './config',
    allowedHosts: process.env.ALLOWED_HOSTS || '*',
  },
})
