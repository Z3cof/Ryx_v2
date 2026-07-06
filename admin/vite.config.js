import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy désactivé : parce que le back-end est hebergé sur render (voir le fichier .env)
    // Pour le dev local avec un backend local :
    // proxy: {
    //   '/api': { target: 'http://localhost:3000', changeOrigin: true },
    // },
  },
})
