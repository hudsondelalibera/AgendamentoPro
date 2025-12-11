import { Appointment } from '../types';
import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot 
} from 'firebase/firestore';

const COLLECTION_NAME = 'appointments';

// --- MÉTODOS EXCLUSIVOS FIREBASE ---

export const getAppointments = async (): Promise<Appointment[]> => {
  if (!db) {
    console.error("Firebase não inicializado. Verifique as chaves de API.");
    return [];
  }

  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const appointments: Appointment[] = [];
    querySnapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() } as Appointment);
    });
    return appointments;
  } catch (error) {
    console.error("Erro ao buscar agendamentos na nuvem:", error);
    throw error;
  }
};

export const subscribeToAppointments = (callback: (data: Appointment[]) => void) => {
  if (!db) {
    console.warn("Tentativa de assinatura sem conexão com banco de dados.");
    return () => {};
  }

  try {
      const q = query(collection(db, COLLECTION_NAME));
      return onSnapshot(q, (querySnapshot) => {
          const appointments: Appointment[] = [];
          querySnapshot.forEach((doc) => {
             appointments.push({ id: doc.id, ...doc.data() } as Appointment);
          });
          callback(appointments);
      }, (error) => {
          console.error("Erro na sincronização em tempo real:", error);
      });
  } catch (e) {
      console.error("Erro fatal ao configurar listener:", e);
      return () => {};
  }
};

export const saveAppointment = async (appointment: Appointment): Promise<boolean> => {
  if (!db) {
    alert("Erro de Conexão: O banco de dados não está configurado. Entre em contato com o administrador.");
    return false;
  }

  try {
    const currentApps = await getAppointments();
    const isTaken = currentApps.some(a => a.date === appointment.date && a.time === appointment.time);
    
    if (isTaken) return false;

    const { id, ...dataToSave } = appointment; 
    await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    return true;
  } catch (error) {
    console.error("Erro ao salvar no Firebase:", error);
    return false;
  }
};

export const cancelAppointment = async (id: string): Promise<boolean> => {
  if (!db) {
      console.error("Erro: Banco de dados desconectado durante tentativa de cancelamento.");
      return false;
  }

  if (!id) {
      console.error("Tentativa de cancelar agendamento sem ID válido.");
      return false;
  }

  console.log(`[Firebase] Excluindo documento ID: ${id}`);

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    console.log(`[Firebase] Documento ${id} excluído com sucesso.`);
    return true;
  } catch (error) {
    console.error(`Erro ao cancelar agendamento ${id} no Firebase:`, error);
    return false;
  }
};

export const clearAllAppointments = async (): Promise<void> => {
  if (!db) return;
  
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const deletePromises = querySnapshot.docs.map(docData => 
        deleteDoc(doc(db, COLLECTION_NAME, docData.id))
    );
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Erro ao limpar banco de dados:", error);
  }
};

export const checkAvailability = async (date: string, time: string): Promise<boolean> => {
   if (!db) return false;
   try {
       const apps = await getAppointments();
       return !apps.some(a => a.date === date && a.time === time);
   } catch (e) {
       return false;
   }
};