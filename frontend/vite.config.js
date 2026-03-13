import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    coverage: {
      provider: 'v8',
      // The reporter 'text' shows the table, 'html' lets you see exactly which lines are red in a browser
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/test/**',
        'src/main.jsx',          // Entry point (no logic)
        'src/assets/**',         // Static assets
        '**/*.d.ts',             // Type definitions
        'src/utils/constants.js' // Static strings
      ],
      // Once you are ready to enforce perfection, set these to 100
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 65,
        statements: 65
      }
    },
  },
})