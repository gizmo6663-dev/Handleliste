import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Basestien kan overstyres slik at appen kan hostes under en undermappe,
// f.eks. GitHub Pages: BASE_PATH=/Handleliste/ npm run build
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
