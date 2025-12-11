import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Função segura para acessar variáveis de ambiente sem quebrar o build
const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    return import.meta.env[key] || '';
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

let db: Firestore | null = null;
let isFirebaseInitialized = false;

try {
    // Validação mínima para tentar conectar: precisa de API Key e Project ID
    if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey.length > 5) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("Sistema conectado à nuvem.");
    } else {
        // Silencioso em produção para não assustar o usuário
        console.warn("Modo Offline ativado: Chaves do Firebase não detectadas.");
    }
} catch (error) {
    console.error("Falha silenciosa na conexão com DB:", error);
    db = null;
}

export { db, isFirebaseInitialized };