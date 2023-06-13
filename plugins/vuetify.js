// plugins/vuetify.js
import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { fa } from 'vuetify/iconsets/fa'


export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: { dark: true },
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        fa,
        mdi,
      },
    }
  })

  nuxtApp.vueApp.use(vuetify)
})
