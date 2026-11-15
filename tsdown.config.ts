import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'iife'],
  globalName: 'PlainSlides',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  dts: true,
})
