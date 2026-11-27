import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/motion')) {
            return 'vendor-motion'
          }
          if (id.includes('node_modules/@dnd-kit')) {
            return 'vendor-dnd'
          }
          if (id.includes('node_modules/culori') || id.includes('node_modules/zod') || id.includes('node_modules/zustand')) {
            return 'vendor-engine'
          }
          if (id.includes('node_modules/three')) {
            return 'vendor-three'
          }
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qr'
          }
        },
      },
    },
  },
})
