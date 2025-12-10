import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que o process.env não quebre o app no navegador
    'process.env': {},
    // Injeta a API Key especificamente. 
    // Nota: O Vercel disponibiliza variáveis de ambiente no processo de build.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});