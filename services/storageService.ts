import { Appointment } from '../types';
import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

const COLLECTION_NAME = 'appointments';
const LOCAL_STORAGE_KEY = 'agendamento_pro_local_db';

// --- HELPERS PARA MODO OFFLINE (LOCAL STORAGE) ---
const getLocalData = (): Appointment[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

const saveLocalData = (data: Appointment[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

// --- MÉTODOS HÍBRIDOS (FIREBASE + LOCAL STORAGE) ---

export const getAppointments = async (): Promise<Appointment[]> => {
  // Modo Firebase
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const appointments: Appointment[] = [];
      querySnapshot.forEach((doc) => {
        appointments.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      return appointments;
    } catch (error) {
      console.error("Erro no Firebase, tentando local:", error);
    }
  }

  // Modo Local (Fallback)
  return getLocalData();
};

export const subscribeToAppointments = (callback: (data: Appointment[]) => void) => {
  // Modo Firebase
  if (db) {
    try {
        const q = query(collection(db, COLLECTION_NAME));
        return onSnapshot(q, (querySnapshot) => {
            const appointments: Appointment[] = [];
            querySnapshot.forEach((doc) => {
            appointments.push({ id: doc.id, ...doc.data() } as Appointment);
            });
            callback(appointments);
        });
    } catch (e) {
        console.error("Erro ao assinar Firebase", e);
    }
  }

  // Modo Local (Simula realtime chamando uma vez)
  const data = getLocalData();
  callback(data);
  return () => {};
};

export const saveAppointment = async (appointment: Appointment): Promise<boolean> => {
  // Verificação de conflito de horário (Local e Remoto)
  const currentApps = await getAppointments();
  const isTaken = currentApps.some(a => a.date === appointment.date && a.time === appointment.time);
  
  if (isTaken) return false;

  // Modo Firebase
  if (db) {
    try {
      const { id, ...dataToSave } = appointment; 
      await addDoc(collection(db, COLLECTION_NAME), dataToSave);
      return true;
    } catch (error) {
      console.error("Erro ao salvar no Firebase:", error);
      // Se falhar no Firebase, salva localmente como backup? 
      // Por enquanto, vamos assumir que se tem DB, deve salvar no DB.
      // Mas para garantir a experiência do usuário se o DB cair:
    }
  }

  // Modo Local (Fallback ou se não tiver DB)
  const localApps = getLocalData();
  // Gera um ID falso
  const newApp = { ...appointment, id: `local_${Date.now()}` };
  localApps.push(newApp);
  saveLocalData(localApps);
  return true;
};

export const cancelAppointment = async (id: string): Promise<void> => {
  // Modo Firebase
  if (db && !id.startsWith('local_')) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      return;
    } catch (error) {
      console.error("Erro ao deletar no Firebase:", error);
    }
  }

  // Modo Local
  const localApps = getLocalData();
  const filtered = localApps.filter(a => a.id !== id);
  saveLocalData(filtered);
  
  // Se for híbrido, pode ser necessário forçar uma atualização da UI
  // Mas o subscribe ou o refresh da página cuidam disso
};

export const clearAllAppointments = async (): Promise<void> => {
  if (db) {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    querySnapshot.forEach(async (docData) => {
      await deleteDoc(doc(db, COLLECTION_NAME, docData.id));
    });
  }
  
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export const checkAvailability = async (date: string, time: string): Promise<boolean> => {
   const apps = await getAppointments();
   return !apps.some(a => a.date === date && a.time === time);
};