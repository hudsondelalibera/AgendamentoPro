import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Define 'process.env' como um objeto vazio para evitar que bibliotecas que usam 'process' quebrem o app
    'process.env': {},
    // Injeta especificamente a API Key das variáveis de ambiente do Vercel
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});