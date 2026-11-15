import type { SizeLimitConfig } from 'size-limit'

export default [
  {
    name: 'IIFE (includes injected CSS)',
    path: 'dist/index.iife.js',
    limit: '12 kB',
  },
] satisfies SizeLimitConfig
