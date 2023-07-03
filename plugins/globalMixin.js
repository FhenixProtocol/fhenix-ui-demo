import globalMixin from '../mixins/globalMixin';
export default defineNuxtPlugin((nuxtApp) => {
return {
    provide: {
      global: globalMixin,
    },
  };
});
