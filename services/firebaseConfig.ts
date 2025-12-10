import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Função auxiliar para acessar variáveis de ambiente de forma segura
const getEnvVar = (key: string) => {
  // Cast para any para evitar erros de tipagem se a definição do vite/client estiver faltando
  const meta = import.meta as any;
  
  // Verifica se import.meta.env existe antes de tentar acessar a chave
  if (meta.env && meta.env[key]) {
    return meta.env[key];
  }
  return '';
};

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
};

// Inicializa o Firebase apenas se as chaves existirem
let db: any;

try {
    if (firebaseConfig.apiKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase conectado com sucesso.");
    } else {
        console.warn("Chaves do Firebase não encontradas. Verifique suas variáveis de ambiente (VITE_FIREBASE_...) no Vercel ou .env.");
    }
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
}

export { db };