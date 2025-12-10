import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Isso permite que o código use process.env.API_KEY mesmo no navegador,
    // pegando o valor das Variáveis de Ambiente do Vercel no momento do build.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});