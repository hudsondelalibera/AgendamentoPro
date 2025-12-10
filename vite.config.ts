import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Substitui a string 'process.env.API_KEY' pelo valor da variável de ambiente durante o build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Define um fallback seguro para process.env para evitar crash em bibliotecas legadas
    'process.env': {} 
  }
});