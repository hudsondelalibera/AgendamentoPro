import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do diretório atual
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Define process.env.API_KEY para uso no serviço do Gemini (que espera process.env)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      
      // NOTA: Não definimos manualmente 'import.meta.env.VITE_*' aqui.
      // O Vite injeta automaticamente qualquer variável do .env que comece com VITE_
      // Definir manualmente pode causar conflitos e erros de "undefined".
    }
  };
});