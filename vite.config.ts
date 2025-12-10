import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que a chave seja uma string segura
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    // Evita crash por falta de process.env em libs legadas
    'process.env': {} 
  }
});