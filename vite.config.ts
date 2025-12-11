import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente locais (.env)
  // O terceiro argumento '' permite carregar todas as env vars, não apenas VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Prioridade: 
      // 1. process.env (Vercel System Env)
      // 2. env (Arquivo .env carregado pelo Vite)
      // 3. '' (Fallback vazio)
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ''),
      
      // Firebase Configs
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || ''),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || ''),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID || ''),
    }
  };
});