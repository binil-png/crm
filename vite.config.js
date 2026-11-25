
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { attachPushApi } from './server/onesignalPush.js';
import { attachSheetsApi } from './server/googleSheetsProxy.js';
import { attachConfigSheetApi } from './server/configSheetPublic.js';

const applyServerEnv = (env) => {
  Object.entries(env || {}).forEach(([key, value]) => {
    if (value) process.env[key] = value;
  });
};

const localApisPlugin = (env) => ({
  name: 'crm-local-apis',

  configureServer(server) {
    applyServerEnv(env);
    attachPushApi(server.middlewares, env);
    attachSheetsApi(server.middlewares, env);
    attachConfigSheetApi(server.middlewares, env);
  },

  configurePreviewServer(server) {
    applyServerEnv(env);
    attachPushApi(server.middlewares, env);
    attachSheetsApi(server.middlewares, env);
    attachConfigSheetApi(server.middlewares, env);
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',

    plugins: [
      react(),
      tailwindcss(),
      localApisPlugin(env),
    ],

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});
