// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  devServer: {
    port: 2222,
  },
  css: ['vuetify/lib/styles/main.sass', 'material-design-icons-iconfont/dist/material-design-icons.css'],
  build: {
    transpile: ['vuetify'],
  },
  modules: [
    '@nuxt/ui',
  ]
})
