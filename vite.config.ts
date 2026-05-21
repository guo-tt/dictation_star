import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Polling needed for file-watching inside Docker volume mounts on macOS/Windows
      usePolling: true,
      interval: 300,
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
  },
})
