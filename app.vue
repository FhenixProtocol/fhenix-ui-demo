<template>
  <v-app class="main">
    <v-main>
      <NuxtPage />
    </v-main>
    
  </v-app>
</template>

<style>
  body {
    background-color: #222222;
  }
</style>
<style scoped>
  .main {
    display: flex; 
    flex-direction: column; 
    align-items: center;
    padding: 10px;
    gap: 10px;
    background: url('~/assets/bg.png') no-repeat center bottom;
    background-size: contain;
  }
</style>