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

export const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", 
  "18:00", "19:00", "20:00"
];