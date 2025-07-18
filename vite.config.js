import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: {
    port: 5174, // 異なるポートを使用してHiroSuwaアプリと競合を避ける
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    outDir: 'dist'
  }
})