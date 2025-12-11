import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// A leitura é feita via process.env injetado pelo Vite no build time.
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
const isValid = (val: string | undefined) => val && val !== "" && val !== "undefined";

// Verificação
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
    
    // Log de diagnóstico seguro (não mostra a chave inteira, apenas se existe)
    console.group("Diagnóstico de Configuração Firebase");
    console.log("API Key Presente?", isValid(firebaseConfig.apiKey) ? "SIM" : "NÃO");
    console.log("Project ID Presente?", isValid(firebaseConfig.projectId) ? "SIM" : "NÃO");
    console.log("Auth Domain Presente?", isValid(firebaseConfig.authDomain) ? "SIM" : "NÃO");
    console.log("Variáveis brutas:", firebaseConfig); 
    console.groupEnd();
}

export { db, isFirebaseInitialized };