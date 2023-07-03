<script lang="ts">
import Desktop from '@/components/Desktop';
import Mobile from '@/components/Mobile';


export default {
    components: { Desktop },
  created() {
    console.log(`Created!`);
  },
  mounted() {
  },
  data() {
    return {
    }
  }, 
  watch: {
  },
  computed: {
  },
  methods: {
  }
}
</script>

<template>
  <desktop></desktop>
</template>