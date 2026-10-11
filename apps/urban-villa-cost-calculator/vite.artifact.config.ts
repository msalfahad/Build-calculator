// Build for publishing as a claude.ai Artifact: one self-contained page (JS + CSS inlined by
// scripts/build-artifact.mjs), fonts from Google Fonts, in-memory navigation, platform capabilities.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'import.meta.env.VITE_ARTIFACT': JSON.stringify('true') },
  resolve: {
    alias: [{ find: /^\.\/fonts$/, replacement: path.resolve(__dirname, 'src/fonts.artifact.ts') }],
  },
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
