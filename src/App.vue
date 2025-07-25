<script setup lang="ts">
import autoFrameUploader from './components/autoFrameUploader.vue'
document.addEventListener('gesturestart', (e) => {
  e.preventDefault()
})
</script>

<template>
  <autoFrameUploader />
</template>
