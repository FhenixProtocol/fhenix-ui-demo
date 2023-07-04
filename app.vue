<template>
  <v-app class="main">
    <video id="background-video" ref="background-video" :class="bgClass" autoplay loop muted>
      <source src="~/assets/video/bg.mp4" type="video/mp4">
    </video>
    <v-main>
      <NuxtPage />
    </v-main>
    
  </v-app>
</template>

<style>

@font-face {
  font-family: 'Roboto';
  font-weight: normal;
  font-style: normal;
  src: local('Roboto'), url('~/assets/fonts/Roboto-Regular.ttf') format('truetype');
  font-display: auto;
}

@font-face {
  font-family: 'MazzardH-ExtraLight';
  font-weight: normal;
  font-style: normal;
  src: local('MazzardH-ExtraLight'), url('~/assets/fonts/MazzardH-ExtraLight.otf');
  font-display: auto;
}

html {
  background-color: #222222;    
}

body {
    /* background-color: #222222; */
    overflow: hidden; 
    /* font-family: Sans-Serif; */
    /* font-family: 'Roboto', sans-serif;     */
    font-family: 'MazzardH-ExtraLight';
    
  }


</style>
<style scoped>
  .main {
    display: flex; 
    flex-direction: column; 
    align-items: center;
    gap: 10px;
    background: none;
    /* background: url('~/assets/bg.png') no-repeat center bottom;
    background-size: contain; */
  }

  #background-video {

  width: 100vw;
  height: 100vh;
  object-fit: cover;
  position: fixed;
  opacity: 0.2;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: -1;
}

.enc-bg {
  -webkit-filter: hue-rotate(180deg);
}

</style>

<script setup lang="ts">
import 'vue3-lottie/dist/style.css'
// const { $globalMixin } = useNuxtApp()


</script>


<script lang="ts">
import globalMixin from './mixins/globalMixin';

export default {
  mixins: [globalMixin],
  created() {
    console.log(`Created App!`);
  },
  mounted() {
          console.log("$$$$")
      console.log(this.$globalMixin);
      console.log("$$$$")

  },
  computed: {
    bgClass() {
      return this.$global.bgEncrypted ? "enc-bg" : "";
    }
  }
}
</script>