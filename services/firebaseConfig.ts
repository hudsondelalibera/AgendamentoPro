import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// A leitura agora é feita via process.env, que é injetado pelo vite.config.ts
// Isso é mais robusto que import.meta.env para este setup específico.

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let db: Firestore | null = null;
let isFirebaseInitialized = false;

// Verificação robusta antes de inicializar
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== "undefined") {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("🔥 Firebase inicializado com sucesso.");
    } catch (error) {
        console.error("Erro fatal ao inicializar Firebase:", error);
    }
} else {
    console.warn("⚠️ Firebase não configurado. O aplicativo funcionará apenas em modo de visualização (sem salvar dados).");
    console.log("Configuração atual:", firebaseConfig);
}

export { db, isFirebaseInitialized };