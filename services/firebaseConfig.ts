import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Acessamos via process.env. O Vite substituirá essas chaves pelos valores reais durante o build (graças ao 'define' no vite.config.ts).
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

// Função auxiliar para verificar se a string é válida
const isValid = (val: string | undefined) => val && val !== "" && val !== "undefined" && val !== "null";

if (isValid(firebaseConfig.apiKey) && isValid(firebaseConfig.projectId)) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isFirebaseInitialized = true;
        console.log("🔥 Firebase inicializado com sucesso.");
    } catch (error) {
        console.error("Erro fatal ao inicializar Firebase:", error);
    }
} else {
    console.warn("⚠️ Firebase não conectado. Modo de visualização offline.");
    
    // Log seguro para debug (apenas em ambiente de navegador para não quebrar SSR se houver)
    if (typeof window !== 'undefined') {
        console.group("Diagnóstico de Configuração Firebase");
        console.log("API Key Status:", firebaseConfig.apiKey ? "Presente" : "Ausente");
        console.log("Project ID Status:", firebaseConfig.projectId ? "Presente" : "Ausente");
        console.groupEnd();
    }
}

export { db, isFirebaseInitialized };