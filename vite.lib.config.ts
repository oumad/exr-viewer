// Library build: emits a standalone ESM bundle of the renderer + EXR decoder
// for embedding in other apps (e.g. ComfyUI_Gear). Separate from the SPA build
// so the two can be rebuilt independently.
//
//   npm run build       -> SPA    (dist/)
//   npm run build:lib   -> Library (dist-lib/)
//
// The library bundle inlines the `exrs` JS glue but leaves the WASM as an
// external asset — consumers must serve `exrs_raw_wasm_bindgen_bg.wasm`
// alongside the JS or configure exrs to fetch it from a known URL.

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-lib',
    target: 'es2020',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/lib.ts'),
      formats: ['es'],
      fileName: () => 'exr-viewer-lib.js',
    },
    rollupOptions: {
      // Keep output self-contained: inline exrs JS glue into the bundle.
      // WASM stays external (see comment above).
      output: {
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
  },
});
