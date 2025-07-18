import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  external: ['react'],
  splitting: false,
  sourcemap: true,
  clean: true,
})
