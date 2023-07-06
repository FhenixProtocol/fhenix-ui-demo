import swipeModal from '@takuma-ru/vue-swipe-modal'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('swipe-modal', swipeModal)
})
