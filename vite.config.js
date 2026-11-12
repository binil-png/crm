import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { attachPushApi } from './server/onesignalPush.js';

const onesignalPushPlugin = (env) => ({
  name: 'onesignal-push-api',
  configureServer(server) {
    attachPushApi(server.middlewares, env);
  },
  configurePreviewServer(server) {
    attachPushApi(server.middlewares, env);
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), onesignalPushPlugin(env)],
  };
});
