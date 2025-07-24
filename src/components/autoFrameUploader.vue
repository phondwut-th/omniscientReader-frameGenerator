<template>
  <div class="app-wrapper">
    <div class="overlay"></div>
    <div class="app-content">
      <h2>📸 อัปโหลดภาพอวตาร เพื่อเลือกกลุ่มดาวผู้สนับสนุน!</h2>

      <!-- 🗂 File Input -->
      <input type="file" @change="onUpload" accept="image/*" />
      <select v-model="selectedRatio" @change="updateCanvasSize">
        <option disabled value="">ขนาดภาพ</option>
        <option value="1:1">1:1</option>
        <option value="4:5">4:5</option>
      </select>
      <!-- 🎛 Frame Dropdown (after image upload) -->
      <select v-if="userImg" v-model="selectedFrame" @change="onFrameChange">
        <option disabled value="">เลือกกรอบ</option>
        <option v-for="i in 6" :key="i" :value="`frame${i}.png`">กรอบที่ {{ i }}</option>
      </select>

      <!-- 🖼 Canvas -->
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @wheel.prevent="onWheel"
      ></canvas>

      <!-- 🎮 Action Buttons -->
      <div class="actions">
        <button @click="rotate">หมุน</button>
        <button @click="downloadImage">ดาวน์โหลดภาพ</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'

import { useToast } from 'vue-toastification'

const toast = useToast()

toast.success('ดาวน์โหลดภาพสำเร็จ! 🎉')
toast.error('เกิดข้อผิดพลาดในการอัปโหลด')
const canvasWidth = 1080
const canvasHeight = 1350
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const selectedRatio = ref<'1:1' | '4:5'>('1:1')
const selectedFrame = ref('frame1.png')

// Canvas Size
const canvasSize = reactive({ width: 1080, height: 1080 })

const transform = reactive({
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
})

const state = reactive({
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
})

const userImg = ref<HTMLImageElement | null>(null)
let frameImg = new Image()

function updateCanvasSize() {
  if (selectedRatio.value === '1:1') {
    canvasSize.width = 1080
    canvasSize.height = 1080
  } else {
    canvasSize.width = 1080
    canvasSize.height = 1350
  }
  resizeCanvas()
  drawCanvas()
}

function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    userImg.value = new Image()
    userImg.value.onload = () => {
      transform.offsetX = 0
      transform.offsetY = 0
      transform.scale = 1
      transform.rotation = 0

      frameImg = new Image()
      frameImg.src = selectedFrame.value
      frameImg.onload = () => {
        drawCanvas()
      }
    }
    userImg.value.src = event.target?.result as string
  }
  reader.readAsDataURL(file)
}

function onFrameChange() {
  frameImg = new Image()
  frameImg.src = selectedFrame.value
  frameImg.onload = () => {
    drawCanvas()
  }
}

function drawCanvas() {
  if (!canvasRef.value || !userImg.value) return
  const ctx = canvasRef.value.getContext('2d')!
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

  ctx.save()
  ctx.translate(canvasSize.width / 2 + transform.offsetX, canvasSize.height / 2 + transform.offsetY)
  ctx.rotate((transform.rotation * Math.PI) / 180)
  ctx.scale(transform.scale, transform.scale)
  ctx.drawImage(userImg.value, -userImg.value.width / 2, -userImg.value.height / 2)
  ctx.restore()

  ctx.drawImage(frameImg, 0, 0, canvasSize.width, canvasSize.height)
}

function startDrag(e: MouseEvent) {
  state.dragging = true
  state.dragStartX = e.clientX
  state.dragStartY = e.clientY
}

function startTouch(e: TouchEvent) {
  state.dragging = true
  state.dragStartX = e.touches[0].clientX
  state.dragStartY = e.touches[0].clientY
}

function onDrag(e: MouseEvent) {
  if (!state.dragging || !userImg.value) return
  handleMove(e.clientX, e.clientY)
}

function onTouch(e: TouchEvent) {
  if (!state.dragging || !userImg.value) return
  handleMove(e.touches[0].clientX, e.touches[0].clientY)
}

function handleMove(clientX: number, clientY: number) {
  const dx = clientX - state.dragStartX
  const dy = clientY - state.dragStartY

  const bounds = getImageBounds()
  const maxOffsetX = (bounds.width - canvasSize.width) / 2
  const maxOffsetY = (bounds.height - canvasSize.height) / 2

  transform.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, transform.offsetX + dx))
  transform.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, transform.offsetY + dy))

  state.dragStartX = clientX
  state.dragStartY = clientY

  drawCanvas()
}

function endDrag() {
  state.dragging = false
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  transform.scale = Math.max(0.1, transform.scale + delta)
  drawCanvas()
}

function rotate() {
  transform.rotation = (transform.rotation + 15) % 360
  drawCanvas()
}

function getImageBounds(): { width: number; height: number } {
  if (!userImg.value) return { width: 0, height: 0 }
  const w = userImg.value.width * transform.scale
  const h = userImg.value.height * transform.scale
  const rad = (transform.rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  return {
    width: w * cos + h * sin,
    height: w * sin + h * cos,
  }
}

function downloadImage() {
  if (!canvasRef.value) {
    toast.error('ไม่สามารถดาวน์โหลดภาพได้ 😢')
    return
  }

  if (!userImg.value) {
    toast.warning('กรุณาอัปโหลดภาพก่อนดาวน์โหลด 🙏')
    return
  }

  const link = document.createElement('a')
  link.download = 'framed-image.png'
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()

  toast.success('ดาวน์โหลดภาพสำเร็จแล้ว! 🎉')
}

function resizeCanvas() {
  if (!containerRef.value || !canvasRef.value) return
  const maxDisplayWidth = containerRef.value.clientWidth
  const ratio = canvasSize.height / canvasSize.width
  canvasRef.value.style.width = maxDisplayWidth + 'px'
  canvasRef.value.style.height = maxDisplayWidth * ratio + 'px'
}

onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
})
</script>
background-image:
url('https://media.discordapp.net/attachments/660882640240508948/1397947682995175607/63bd0c70-4834-4061-840d-8e77fbfd4cb0.png?ex=688393bc&is=6882423c&hm=c29b814cfa984b558d41934a69743fed9b37398fd068003f4da0979955c35e69&=&format=webp&quality=lossless');

<style scoped>
/* 🌄 Background wrapper */
.app-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('https://images.plex.tv/photo?size=large-1920&scale=1&url=https%3A%2F%2Fmetadata-static.plex.tv%2F0%2Fgracenote%2F009912a27e274d69a0683dbb1040b932.jpg');
  background-size: cover;
  background-position: center;
  filter: blur(1.5px); /* 🎯 Blur effect */
  transform: scale(1.05); /* Prevent edges from showing */
  z-index: 0;
}
.app-wrapper {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}
/* 🟤 Overlay to soften image */
.overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4); /* semi-transparent dark overlay */
  z-index: 0;
}

/* 📱 App content styling */
.app-content {
  position: relative;
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(5px); /* optional frosted effect */
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

@media (max-width: 600px) {
  .app-content {
    background-color: rgba(255, 255, 255, 0); /* fully transparent */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0);
    color: white;
    padding: 1rem;
  }
}
/* 📦 Canvas responsive size */
canvas {
  width: 100%;
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}

/* 🎯 Action buttons */
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
/* 🖼 Unified style for file input, select dropdown, and buttons */
input[type='file'],
select,
button {
  width: 100%;
  padding: 0.6rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 0.5rem;
  border: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  appearance: none;
}

/* 🟦 Button-specific style */
button {
  background-color: #007aff;
  color: #fff;
}
button:hover {
  background-color: #005ecc;
}

/* 📄 File input override for better UX */
input[type='file'] {
  background-color: #f5f5f5;
  color: #444;
}

/* 🔽 Dropdown (select) style */
select {
  background-color: #f5f5f5;
  color: #333;
  width: 100%;
  padding: 0.6rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 0.5rem;
  border: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  appearance: none;

  /* Custom dropdown arrow */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg width='14' height='10' viewBox='0 0 14 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L7 9L13 1' stroke='%23333' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1rem;
}

/* 🎞️ Fade animation */
@keyframes fadeInBg {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
