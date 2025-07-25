<template>
  <div class="app-wrapper">
    <div class="overlay"></div>
    <div class="app-content">
      <h2>📸 อัปโหลดภาพอวตาร เพื่อเลือกกลุ่มดาวผู้สนับสนุน!</h2>

      <!-- 🗂 File Input -->
      <input type="file" @change="onUpload" accept="image/*" />

      <!-- 📐 Ratio Selection -->

      <h2 value="4:5">4:5</h2>

      <!-- 🎨 Frame Selector (shows after upload) -->
      <select v-if="imageLoaded" v-model="currentFrame" @change="handleFrameChange">
        <option disabled value="">เลือกกรอบ</option>
        <option v-for="(label, index) in frameLabels" :key="index" :value="`frame${index + 1}.png`">
          {{ label }}
        </option>
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
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
      />

      <!-- 🎮 Action Buttons -->
      <div class="actions">
        <button @click="rotate">หมุน</button>
        <button @click="downloadImage">ดาวน์โหลดภาพ</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useToast } from 'vue-toastification'

const toast = useToast()

// Refs and canvas config
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(1080)
const canvasHeight = ref(1080)
const imageLoaded = ref(false)

const currentFrame = ref('')
const frameLabels = [
  'ผู้พิพากษาเปลวเพลิงดุจปีศาจ',
  'มังกรทมิฬแห่งนรกอเวจี',
  'นักโทษรัดเกล้าทองคำ',
  'จอมวางแผนลับ',
  'ปกภาพยนตร์',
]
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

const framePaths = [
  'frame1.png',
  'frame2.png',
  'frame3.png',
  'frame4.png',
  'frame5.png',
  'frame6.png',
]

let userImg: HTMLImageElement | null = null
let frameImg = new Image()

function getRandomFramePath(): string {
  const index = Math.floor(Math.random() * framePaths.length)
  return framePaths[index]
}
//Touch
let lastTouchDistance = 0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    lastTouchDistance = getTouchDistance(e.touches)
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    const newDistance = getTouchDistance(e.touches)
    const delta = newDistance - lastTouchDistance

    if (Math.abs(delta) > 5) {
      transform.scale = Math.max(0.1, transform.scale + delta * 0.005)
      drawCanvas()
    }

    lastTouchDistance = newDistance
    e.preventDefault() // prevent page scroll
  }
}

function getTouchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// 📤 Upload Image
function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageLoaded.value = false
  const reader = new FileReader()
  reader.onload = (event) => {
    userImg = new Image()
    userImg.onload = () => {
      // Fit image logic...
      const scaleX = canvasWidth.value / userImg!.width
      const scaleY = canvasHeight.value / userImg!.height
      transform.scale = Math.min(scaleX, scaleY)

      transform.offsetX = 0
      transform.offsetY = 0
      transform.rotation = 0

      // Load frame
      frameImg = new Image()
      frameImg.src = currentFrame.value || getRandomFramePath()

      frameImg.onload = () => {
        imageLoaded.value = true // ✅ Mark image + frame ready
        drawCanvas()
      }
    }

    userImg.src = event.target?.result as string
  }
  reader.readAsDataURL(file)
}

function drawCanvas() {
  if (!canvasRef.value || !userImg) return
  const ctx = canvasRef.value.getContext('2d')!
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  ctx.save()
  ctx.translate(
    canvasWidth.value / 2 + transform.offsetX,
    canvasHeight.value / 2 + transform.offsetY,
  )
  ctx.rotate((transform.rotation * Math.PI) / 180)
  ctx.scale(transform.scale, transform.scale)
  ctx.drawImage(userImg, -userImg.width / 2, -userImg.height / 2)
  ctx.restore()

  ctx.drawImage(frameImg, 0, 0, canvasWidth.value, canvasHeight.value)
}

function startDrag(e: MouseEvent) {
  state.dragging = true
  state.dragStartX = e.clientX
  state.dragStartY = e.clientY
}

function onDrag(e: MouseEvent) {
  if (!state.dragging || !userImg) return

  const dx = e.clientX - state.dragStartX
  const dy = e.clientY - state.dragStartY

  const bounds = getImageBounds()

  const maxX = (bounds.width - canvasWidth.value) / 2
  const maxY = (bounds.height - canvasHeight.value) / 2

  transform.offsetX = Math.min(maxX, Math.max(-maxX, transform.offsetX + dx))
  transform.offsetY = Math.min(maxY, Math.max(-maxY, transform.offsetY + dy))

  state.dragStartX = e.clientX
  state.dragStartY = e.clientY

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
function handleFrameChange() {
  frameImg.src = currentFrame.value
  frameImg.onload = drawCanvas
}
function getImageBounds(): { width: number; height: number } {
  if (!userImg) return { width: 0, height: 0 }

  const w = userImg.width * transform.scale
  const h = userImg.height * transform.scale

  const rad = (transform.rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))

  return {
    width: w * cos + h * sin,
    height: w * sin + h * cos,
  }
}

function downloadImage() {
  if (!canvasRef.value) return
  if (!userImg) {
    toast.error('กรุณาอัปโหลดภาพก่อนดาวน์โหลด')
    return
  }

  const link = document.createElement('a')
  link.download = 'framed-image.png'
  link.href = canvasRef.value.toDataURL('image/png')
  link.click()

  toast.success('✅ ดาวน์โหลดภาพเรียบร้อยแล้ว')
}
</script>

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
