/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIP_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
