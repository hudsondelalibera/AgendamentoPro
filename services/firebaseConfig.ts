import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Função segura para acessar variáveis de ambiente
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env[key];
  } catch (e) {
    return '';
  }
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

let db: any = null;

try {
    // Só tenta inicializar se tiver pelo menos a API Key
    if (firebaseConfig.apiKey) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase conectado com sucesso.");
    } else {
        console.warn("Firebase não configurado (Faltam chaves no .env). Entrando em modo Offline/Local.");
    }
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    console.warn("Entrando em modo Offline/Local.");
}

export { db };