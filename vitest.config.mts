import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Un solo worker: los tests de integración comparten la DB de desarrollo
    // (los índices globales no tienen namespace por corrida; en paralelo se
    // contaminan entre archivos — lección Fase 5, 2026-09-26).
    maxWorkers: 1,
  },
});
