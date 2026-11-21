import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// host: true exposes the dev server on your local Wi-Fi so phones/tablets can open it.
export default defineConfig({
  // Relative paths so the build works at any address (GitHub Pages serves it under /kitchenmacro/)
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
