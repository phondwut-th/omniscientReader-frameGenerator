import { createApp } from 'vue'
import App from './App.vue'

// ✅ Import Toastification
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// ✅ Optional: Toast options (you can customize)
const toastOptions = {
  // You can customize these:
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  icon: true,
}

// ✅ Create app instance
const app = createApp(App)

// ✅ Use toast plugin
app.use(Toast, toastOptions)

// ✅ Mount the app
app.mount('#app')
