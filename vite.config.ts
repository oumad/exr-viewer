import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { createReadStream, existsSync, statSync } from 'fs';

/** Serve EXR clips from the parent Project_page/clips/ directory */
function serveClips(): Plugin {
  const clipsRoot = resolve(__dirname, '../clips');
  return {
    name: 'serve-clips',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/clips/')) return next();
        const filePath = resolve(clipsRoot, decodeURIComponent(req.url.slice('/clips/'.length)));
        // Prevent path traversal
        if (!filePath.startsWith(clipsRoot)) return next();
        if (!existsSync(filePath) || !statSync(filePath).isFile()) return next();
        const stat = statSync(filePath);
        const mime = filePath.endsWith('.png') ? 'image/png'
                   : filePath.endsWith('.jpg') ? 'image/jpeg'
                   : 'application/octet-stream';
        res.writeHead(200, {
          'Content-Length': stat.size,
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=3600',
        });
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

/** Redirect WASM fetch to the copy in public/ so prebundled imports resolve */
function wasmRedirect(): Plugin {
  return {
    name: 'wasm-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('exrs_raw_wasm_bindgen_bg.wasm')) {
          req.url = '/exrs_raw_wasm_bindgen_bg.wasm';
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  // Relative base so the built bundle works anywhere it's hosted —
  // gh-pages (`/exr-viewer/`), ComfyUI iframe (`/extensions/ComfyUI_Gear/vendor/`),
  // local file:// testing, etc.
  base: command === 'build' ? './' : '/',
  plugins: [wasmRedirect(), serveClips()],
  server: {
    // Allow tunnel domains (Cloudflare quick-tunnel, ngrok, etc.)
    allowedHosts: ['.trycloudflare.com', '.ngrok.io', '.ngrok-free.app', '.loca.lt'],
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
}));
