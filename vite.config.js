import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE || '/erd/'

export default defineConfig({
  base,
  plugins: [react()],
})
