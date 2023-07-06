<script lang="ts">
import Desktop from '@/components/Desktop';
import Mobile from '@/components/Mobile';
import globalMixin from '../mixins/globalMixin';


export default {
  components: { Desktop, Mobile },
  mixins: [globalMixin],

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
    isMobile() {
      return this.$global.isMobile();
    },    
  },
  methods: {
  }
}
</script>

<template>
  <mobile v-if="isMobile"></mobile>
  <desktop v-else></desktop>

</template>