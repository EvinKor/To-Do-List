/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_USER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
