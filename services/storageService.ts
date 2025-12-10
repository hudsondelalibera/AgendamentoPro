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

// --- MÉTODOS ASSÍNCRONOS (FIREBASE) ---

/**
 * Busca todos os agendamentos do banco de dados na nuvem.
 */
export const getAppointments = async (): Promise<Appointment[]> => {
  if (!db) return []; // Fallback se não tiver config
  
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const appointments: Appointment[] = [];
    querySnapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() } as Appointment);
    });
    return appointments;
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return [];
  }
};

/**
 * Inscreve-se para atualizações em tempo real (para o Painel Admin).
 */
export const subscribeToAppointments = (callback: (data: Appointment[]) => void) => {
  if (!db) return () => {};

  const q = query(collection(db, COLLECTION_NAME));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const appointments: Appointment[] = [];
    querySnapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() } as Appointment);
    });
    callback(appointments);
  });
  
  return unsubscribe;
};

/**
 * Salva um novo agendamento no banco de dados.
 * Retorna true se sucesso, false se falha (ou horário ocupado).
 */
export const saveAppointment = async (appointment: Appointment): Promise<boolean> => {
  if (!db) {
    alert("Erro de configuração: Banco de dados não conectado.");
    return false;
  }

  try {
    // Verificar conflito de horário no servidor antes de salvar
    const q = query(
      collection(db, COLLECTION_NAME), 
      where("date", "==", appointment.date),
      where("time", "==", appointment.time)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return false; // Horário já ocupado
    }

    // Salvar
    // Removemos o ID gerado manualmente pois o Firebase gera um ID único
    const { id, ...dataToSave } = appointment; 
    await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    return true;

  } catch (error) {
    console.error("Erro ao salvar agendamento:", error);
    return false;
  }
};

/**
 * Cancela (deleta) um agendamento do banco de dados.
 */
export const cancelAppointment = async (id: string): Promise<void> => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
  }
};

/**
 * Limpa toda a base de dados (Cuidado!)
 */
export const clearAllAppointments = async (): Promise<void> => {
  if (!db) return;
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  querySnapshot.forEach(async (docData) => {
    await deleteDoc(doc(db, COLLECTION_NAME, docData.id));
  });
};

/**
 * Verifica disponibilidade buscando no banco.
 * Nota: É melhor buscar todos os dados de uma vez na UI para performance, 
 * mas mantemos essa função utilitária assíncrona.
 */
export const checkAvailability = async (date: string, time: string): Promise<boolean> => {
  if (!db) return true;
  
  const q = query(
      collection(db, COLLECTION_NAME), 
      where("date", "==", date),
      where("time", "==", time)
    );
    
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};