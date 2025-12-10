import React, { useState, useEffect } from 'react';
import { Appointment, TIME_SLOTS, DaySlot } from '../types';
import { checkAvailability, saveAppointment } from '../services/storageService';
import { generateConfirmationMessage } from '../services/geminiService';
// sendConfirmationToClient removido pois a automação foi desligada
import { Calendar, Clock, CheckCircle, Smartphone, User, Loader2, X } from 'lucide-react';

interface ClientSchedulerProps {
  onBookingComplete: () => void;
}

export const ClientScheduler: React.FC<ClientSchedulerProps> = ({ onBookingComplete }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: Date/Time, 2: Info
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  
  // Helper for safe ID generation
  const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // Generate next days
  const [days, setDays] = useState<DaySlot[]>([]);

  useEffect(() => {
    const nextDays: DaySlot[] = [];
    const today = new Date();
    let daysAdded = 0;
    let dayOffset = 0;
    
    while (daysAdded < 6) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      
      if (date.getDay() !== 0) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        nextDays.push({
          date,
          dateString,
          dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase(),
          dayNumber: date.getDate()
        });
        daysAdded++;
      }
      dayOffset++;
    }
    setDays(nextDays);
    if (nextDays.length > 0) {
        setSelectedDate(nextDays[0].dateString);
    }
  }, []);
  
  const handleTimeSelect = (time: string) => {
    if (selectedDate && checkAvailability(selectedDate, time)) {
      setSelectedTime(time);
    }
  };

  const handleNextStep = () => {
    if (selectedDate && selectedTime) {
      setStep(2);
    }
  };

  const isTimeSlotValid = (dateString: string, timeString: string) => {
    if (!checkAvailability(dateString, timeString)) return false;

    const today = new Date();
    const selectedDateObj = new Date(dateString + 'T00:00:00');
    
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());

    if (selectedDateOnly.getTime() === todayDateOnly.getTime()) {
      const currentHour = today.getHours();
      const slotHour = parseInt(timeString.split(':')[0], 10);
      return slotHour > currentHour;
    }

    return true;
  };

  const resetForm = () => {
    setStep(1);
    setClientName('');
    setClientWhatsapp('');
    setSelectedTime(null);
    setGeneratedMessage('');
    setShowSuccessModal(false);
  };

  const handleOk = () => {
    // Ao invés de recarregar a página (que causa erro no preview), apenas resetamos o formulário
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !clientName || !clientWhatsapp) return;

    setIsSubmitting(true);

    try {
      // 1. Generate AI confirmation text
      let message = await generateConfirmationMessage(clientName, selectedDate, selectedTime);
      if (!message) {
        message = `Olá ${clientName}, confirmamos seu agendamento para ${selectedDate} às ${selectedTime}.`;
      }
      setGeneratedMessage(message);

      // 2. Create Appointment Object
      const newAppointment: Appointment = {
        id: generateId(),
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientWhatsapp,
        confirmationMessage: message,
        createdAt: Date.now()
      };

      // 3. Save to Local Storage
      const success = saveAppointment(newAppointment);

      if (success) {
        // 4. AUTOMATION REMOVED
        // O código de envio para o Zapier foi removido conforme solicitado.
        // O agendamento fica salvo apenas no banco de dados local (AdminDashboard).
        
        // 5. Show Success Modal
        setShowSuccessModal(true);
        onBookingComplete();
      } else {
        alert("Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.");
        setStep(1);
        setSelectedTime(null);
      }
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao agendar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logic for Saturdays
  const isSelectedDateSaturday = selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() === 6 : false;

  return (
    <>
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden min-h-[500px] flex flex-col md:flex-row relative">
        {/* Left Sidebar: Date Selection */}
        <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" /> Escolha a Data
          </h3>
          <p className="text-xs text-gray-500 mb-4">Mostrando disponibilidade para os próximos dias (exceto domingos).</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {days.map((day) => (
              <button
                key={day.dateString}
                onClick={() => {
                  setSelectedDate(day.dateString);
                  setSelectedTime(null);
                }}
                className={`w-full flex items-center p-3 rounded-lg border transition-all ${
                  selectedDate === day.dateString
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex flex-col items-center justify-center w-10 h-10 bg-white/20 rounded mr-3 backdrop-blur-sm">
                  <span className="text-xs font-bold">{day.dayName}</span>
                  <span className="text-lg font-bold">{day.dayNumber}</span>
                </div>
                <span className="font-medium text-sm">
                  {day.date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content: Time & Form */}
        <div className="w-full md:w-2/3 p-6 md:p-8">
          {step === 1 && (
            <div className="animate-fade-in">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Horários Disponíveis</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Para o dia {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                {isSelectedDateSaturday && <span className="text-amber-600 font-medium ml-2">(Horário de Sábado: 08:00 - 18:00)</span>}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
                {TIME_SLOTS.map((time) => {
                  if (isSelectedDateSaturday) {
                      const hour = parseInt(time.split(':')[0], 10);
                      if (hour > 18) return null;
                  }

                  const isAvailable = selectedDate ? isTimeSlotValid(selectedDate, time) : false;
                  
                  return (
                    <button
                      key={time}
                      disabled={!isAvailable}
                      onClick={() => handleTimeSelect(time)}
                      className={`
                        py-3 px-2 rounded-lg text-sm font-semibold transition-all border
                        ${!isAvailable 
                          ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' 
                          : selectedTime === time
                            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-500 hover:text-indigo-600'
                        }
                      `}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              
              {selectedDate && (
                <div className="text-xs text-gray-400 mb-4 text-center">
                    * Horários passados são removidos automaticamente.
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  disabled={!selectedTime}
                  onClick={handleNextStep}
                  className={`
                    px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2
                    ${selectedTime
                      ? 'bg-gray-900 text-white hover:bg-black shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <button 
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1"
              >
                ← Voltar para horários
              </button>

              <h3 className="text-xl font-bold text-gray-900 mb-6">Finalizar Agendamento</h3>
              
              <div className="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
                <div className="flex items-center gap-4 text-sm text-indigo-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-semibold">
                        {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">{selectedTime}</span>
                    </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="name"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Smartphone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="whatsapp"
                        required
                        value={clientWhatsapp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setClientWhatsapp(val);
                        }}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="11999999999"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Seu número será usado apenas para o registro.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !clientName || !clientWhatsapp}
                    className={`
                      w-full py-3 rounded-lg font-bold text-white shadow-md transition-all mt-6
                      flex items-center justify-center gap-2
                      ${isSubmitting 
                        ? 'bg-indigo-400 cursor-wait' 
                        : 'bg-indigo-600 hover:bg-indigo-700'
                      }
                    `}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      'Confirmar Agendamento'
                    )}
                  </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative transform transition-all scale-100">
            
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agendamento Realizado!</h2>
            
            <p className="text-gray-600 leading-relaxed mb-8">
              Obrigada por realizar o seu agendamento conosco, será um prazer atende-lo(a) em nossa clínica.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleOk}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                OK
              </button>
              <button
                onClick={resetForm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors"
              >
                Novo Agendamento
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};