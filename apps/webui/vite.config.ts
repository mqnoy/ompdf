import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const serverOnlyDeps = [
  'ompdf',
  '@jspawn/ghostscript-wasm',
  'mupdf',
  'pdf-lib',
  'pyodide',
  'sharp'
];

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    external: serverOnlyDeps
  },
  optimizeDeps: {
    exclude: serverOnlyDeps
  }
});
