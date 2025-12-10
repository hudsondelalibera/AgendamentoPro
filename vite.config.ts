import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que a chave seja uma string, mesmo que vazia, para não quebrar o JSON.stringify
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    // Define um fallback seguro para process.env para evitar crash em bibliotecas legadas
    'process.env': {} 
  }
});