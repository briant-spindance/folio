import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.match(/\/react\//)) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            if (id.includes('@tiptap/') || id.includes('tiptap-markdown')) {
              return 'vendor-tiptap'
            }
            if (id.includes('@codemirror/') || id.includes('@uiw/react-codemirror')) {
              return 'vendor-codemirror'
            }
            if (id.includes('@dnd-kit/')) {
              return 'vendor-dnd'
            }
            if (id.includes('@ai-sdk/') || id.match(/\/ai\//)) {
              return 'vendor-ai'
            }
            if (id.includes('react-markdown') || id.includes('remark-gfm')) {
              return 'vendor-markdown'
            }
          }
        },
      },
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:2600',
        changeOrigin: true,
      },
    },
  },
})
