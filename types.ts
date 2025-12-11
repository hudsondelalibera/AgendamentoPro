
export interface Appointment {
  id: string;
  date: string; // Format: YYYY-MM-DD
  time: string; // Format: HH:mm
  clientName: string;
  clientWhatsapp: string;
  confirmationMessage?: string;
  createdAt: number;
}

export interface DaySlot {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayName: string;
  dayNumber: number;
}

// Lista expandida com intervalos de 30 minutos
export const TIME_SLOTS = [
  "07:00", "07:30",
  "08:00", "08:30",
  "09:00", "09:30",
  "10:00", "10:30",
  "11:00", "11:30",
  "12:00", "12:30", 
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30", 
  "18:00", "18:30",
  "19:00", "19:30",
  "20:00"
];
