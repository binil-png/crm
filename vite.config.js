import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { attachPushApi } from './server/onesignalPush.js';
import { attachSheetsApi } from './server/googleSheetsProxy.js';

const localApisPlugin = (env) => ({
  name: 'crm-local-apis',
  configureServer(server) {
    attachPushApi(server.middlewares, env);
    attachSheetsApi(server.middlewares, env);
  },
  configurePreviewServer(server) {
    attachPushApi(server.middlewares, env);
    attachSheetsApi(server.middlewares, env);
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), localApisPlugin(env)],
  };
});
