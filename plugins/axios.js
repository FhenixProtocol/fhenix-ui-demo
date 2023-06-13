import axios from "axios";
export default defineNuxtPlugin((nuxtApp) => {
  const defaultUrl = "/";

  let api = axios.create({
    baseUrl: defaultUrl,
    headers: {
      common: {},
    },
  });
return {
    provide: {
      axios: api,
    },
  };
});
