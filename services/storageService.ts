import { Appointment } from '../types';

// Alterado para uma nova chave para garantir que a base comece vazia (Produção)
const STORAGE_KEY = 'agendamentopro_production_db_v1';

export const getAppointments = (): Appointment[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load appointments", error);
    return [];
  }
};

export const saveAppointment = (appointment: Appointment): boolean => {
  const appointments = getAppointments();
  
  // Prevent exact duplicates
  const exists = appointments.find(
    a => a.date === appointment.date && a.time === appointment.time
  );

  if (exists) {
    return false;
  }

  appointments.push(appointment);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  return true;
};

// Mantido caso precise importar dados reais via JSON no futuro
export const addAppointmentsBatch = (newAppointments: Appointment[]): void => {
  const current = getAppointments();
  const uniqueNew = newAppointments.filter(newItem => 
    !current.some(existing => existing.date === newItem.date && existing.time === newItem.time)
  );
  
  const updated = [...current, ...uniqueNew];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const cancelAppointment = (id: string): void => {
  const appointments = getAppointments();
  const filtered = appointments.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const clearAllAppointments = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const checkAvailability = (date: string, time: string): boolean => {
  const appointments = getAppointments();
  return !appointments.some(a => a.date === date && a.time === time);
};