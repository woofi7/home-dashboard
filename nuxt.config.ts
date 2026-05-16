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

  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // frame-ancestors 'none' supersedes X-Frame-Options in modern browsers
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http: blob:; connect-src 'self' https: http:; font-src 'self' data:; frame-ancestors 'none';",
      },
    },
  },
})
