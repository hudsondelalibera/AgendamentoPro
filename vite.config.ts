import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cast process to any to avoid TS error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Injeta apenas a chave da API do Gemini. 
      // As chaves do Firebase agora estão hardcoded no arquivo de serviço para garantir funcionamento.
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ''),
    }
  };
});