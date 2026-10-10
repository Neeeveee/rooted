import { defineConfig, loadEnv } from 'vite';
import { createRecognitionMiddleware } from './server/recognition.mjs';
export default defineConfig(({ mode }) => {
  // Never use VITE_ prefix, define(), or client imports for this secret.
  const key = process.env.GEMINI_API_KEY || loadEnv(mode, process.cwd(), 'GEMINI_').GEMINI_API_KEY;
  return { server: { host: '127.0.0.1', fs: { deny: ['.env', '.env.*', '**/.git/**'] } }, preview: { host: '127.0.0.1' }, plugins: [{
    name: 'rooted-server-recognition',
    configureServer(server) { server.middlewares.use(createRecognitionMiddleware({ apiKey: key })); },
    configurePreviewServer(server) { server.middlewares.use(createRecognitionMiddleware({ apiKey: key })); }
  }] };
});
