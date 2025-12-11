import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuração direta fornecida pelo usuário para garantir conexão imediata
const firebaseConfig = {
  apiKey: "AIzaSyDL7tD_CuF1n_jHoQ3ZKBXwAR4qshFe-GA",
  authDomain: "firestore-database-b6b52.firebaseapp.com",
  projectId: "firestore-database-b6b52",
  storageBucket: "firestore-database-b6b52.firebasestorage.app",
  messagingSenderId: "690656142474",
  appId: "1:690656142474:web:c7e973454658278c4bf973",
  measurementId: "G-0MK2ZLN0V8"
};

let db: Firestore | null = null;
let isFirebaseInitialized = false;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseInitialized = true;
    console.log("🔥 Firebase inicializado com sucesso (Configuração Direta).");
} catch (error) {
    console.error("Erro fatal ao inicializar Firebase:", error);
}

export { db, isFirebaseInitialized };