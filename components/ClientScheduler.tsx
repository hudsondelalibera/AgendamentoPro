import React, { useState, useEffect } from 'react';
import { Appointment, TIME_SLOTS, DaySlot } from '../types';
import { checkAvailability, saveAppointment, getAppointments } from '../services/storageService';
import { generateConfirmationMessage } from '../services/geminiService';
import { Calendar, Clock, CheckCircle, Smartphone, User, Loader2, X, ChevronRight, AlertCircle, CloudOff } from 'lucide-react';
import { isFirebaseInitialized } from '../services/firebaseConfig';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State to hold fetched appointments for availability check
  const [fetchedAppointments, setFetchedAppointments] = useState<Appointment[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  const [days, setDays] = useState<DaySlot[]>([]);

  // Load initial calendar days and fetch existing appointments from Cloud
  useEffect(() => {
    const init = async () => {
        // 1. Setup days
        const nextDays: DaySlot[] = [];
        const today = new Date();
        let daysAdded = 0;
        let dayOffset = 0;
        
        while (daysAdded < 6) {
            const date = new Date(today);
            date.setDate(today.getDate() + dayOffset);
            
            if (date.getDay() !== 0) { // Skip Sundays if needed
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

        // 2. Fetch occupied slots from Cloud
        if (isFirebaseInitialized) {
            try {
                const cloudAppointments = await getAppointments();
                setFetchedAppointments(cloudAppointments);
            } catch (e) {
                console.error("Failed to fetch availability", e);
            } finally {
                setIsLoadingAvailability(false);
            }
        } else {
            setIsLoadingAvailability(false);
        }
    };
    init();
  }, []);

  // --- SE O BANCO NÃO ESTIVER CONECTADO, BLOQUEIA A TELA ---
  if (!isFirebaseInitialized) {
      return (
          <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-12 text-center border border-red-100">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CloudOff className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sistema Indisponível</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Não foi possível conectar ao banco de dados de agendamentos. Por favor, entre em contato com o administrador para verificar a configuração.
              </p>
              <div className="inline-block bg-gray-100 px-4 py-2 rounded text-xs text-gray-600 font-mono">
                  Erro: Chaves do Firebase não configuradas (VITE_FIREBASE_API_KEY)
              </div>
          </div>
      );
  }
  
  const handleTimeSelect = (time: string) => {
    // Check locally against fetched data first
    if (selectedDate && isTimeSlotValid(selectedDate, time)) {
      setSelectedTime(time);
      setErrorMsg(null);
    }
  };

  const handleNextStep = () => {
    if (selectedDate && selectedTime) {
      setStep(2);
    }
  };

  const isTimeSlotValid = (dateString: string, timeString: string) => {
    // Local check against loaded data
    const isTaken = fetchedAppointments.some(a => a.date === dateString && a.time === timeString);
    if (isTaken) return false;

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
    setShowSuccessModal(false);
    setErrorMsg(null);
    // Refresh availability
    getAppointments().then(setFetchedAppointments);
  };

  const handleOk = () => {
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !clientName || !clientWhatsapp) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Generate AI confirmation text
      let message = await generateConfirmationMessage(clientName, selectedDate, selectedTime);
      
      // 2. Create Appointment Object
      const newAppointment: Appointment = {
        id: '', // Placeholder
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientWhatsapp,
        confirmationMessage: message,
        createdAt: Date.now()
      };

      // 3. Save to Cloud (Firebase) or Local
      const success = await saveAppointment(newAppointment);

      if (success) {
        setShowSuccessModal(true);
        onBookingComplete();
      } else {
        setErrorMsg("Este horário acabou de ser ocupado. Por favor, escolha outro.");
        // Refresh data to show blocked slot
        const freshData = await getAppointments();
        setFetchedAppointments(freshData);
        setStep(1);
        setSelectedTime(null);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Ocorreu um erro técnico. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logic for Saturdays
  const isSelectedDateSaturday = selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() === 6 : false;

  return (
    <>
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col md:flex-row relative">
        {/* Left Sidebar: Date Selection */}
        <div className="w-full md:w-[35%] bg-gray-50 p-6 md:p-8 border-r border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" /> 
            Escolha o Dia
          </h3>
          <div className="space-y-3">
            {days.map((day) => (
              <button
                key={day.dateString}
                onClick={() => {
                  setSelectedDate(day.dateString);
                  setSelectedTime(null);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group ${
                  selectedDate === day.dateString
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]'
                    : 'bg-white text-gray-700 border-gray-100 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg backdrop-blur-sm transition-colors ${
                        selectedDate === day.dateString ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-indigo-50'
                    }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{day.dayName}</span>
                    <span className="text-xl font-bold leading-none">{day.dayNumber}</span>
                    </div>
                    <span className="font-medium text-sm">
                    {day.date.toLocaleDateString('pt-BR', { month: 'long' })}
                    </span>
                </div>
                {selectedDate === day.dateString && <ChevronRight className="w-4 h-4 text-white/80" />}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content: Time & Form */}
        <div className="w-full md:w-[65%] p-6 md:p-10 flex flex-col">
          {errorMsg && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
              </div>
          )}
          
          {isLoadingAvailability ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                  <p>Verificando disponibilidade...</p>
              </div>
          ) : (
            <>
            {step === 1 && (
                <div className="animate-fade-in flex-1 flex flex-col">
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Horários Disponíveis</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}
                    {isSelectedDateSaturday && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium ml-2">Sábado (até 18h)</span>}
                    </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
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
                            py-3 px-2 rounded-lg text-sm font-semibold transition-all border relative overflow-hidden
                            ${!isAvailable 
                            ? 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed opacity-60 decoration-slate-300' 
                            : selectedTime === time
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm'
                            }
                        `}
                        >
                        {time}
                        {!isAvailable && <span className="absolute inset-0 flex items-center justify-center bg-gray-50/50"></span>}
                        </button>
                    );
                    })}
                </div>
                
                <div className="mt-auto pt-6 border-t border-gray-100 flex justify-end">
                    <button
                    disabled={!selectedTime}
                    onClick={handleNextStep}
                    className={`
                        px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg
                        ${selectedTime
                        ? 'bg-gray-900 text-white hover:bg-black transform hover:-translate-y-1'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }
                    `}
                    >
                    Continuar
                    <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in flex-1">
                <button 
                    onClick={() => setStep(1)}
                    className="text-sm text-gray-500 hover:text-indigo-600 mb-8 flex items-center gap-1 transition-colors group"
                >
                    <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    Alterar horário
                </button>

                <h3 className="text-2xl font-bold text-gray-900 mb-8">Confirmar Agendamento</h3>
                
                <div className="bg-indigo-50/50 p-6 rounded-2xl mb-8 border border-indigo-100 flex gap-6 items-center">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <div className="text-sm text-indigo-900/60 font-medium uppercase tracking-wide">Data Selecionada</div>
                        <div className="text-lg font-bold text-indigo-900">
                            {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            <span className="mx-2 text-indigo-300">|</span>
                            {selectedTime}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
                        <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            id="name"
                            required
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none"
                            placeholder="Digite seu nome"
                        />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp</label>
                        <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Smartphone className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
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
                            className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none"
                            placeholder="(11) 99999-9999"
                        />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !clientName || !clientWhatsapp}
                        className={`
                        w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all mt-8
                        flex items-center justify-center gap-3 text-lg
                        ${isSubmitting 
                            ? 'bg-indigo-400 cursor-wait' 
                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1'
                        }
                        `}
                    >
                        {isSubmitting ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Confirmando...
                        </>
                        ) : (
                        'Finalizar Agendamento'
                        )}
                    </button>
                </form>
                </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative transform transition-all scale-100 border border-gray-100">
            
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">Tudo Certo!</h2>
            
            <p className="text-gray-500 leading-relaxed mb-8">
              Seu horário foi reservado com sucesso.
              <br/>
              <span className="text-sm font-medium text-indigo-600 mt-2 block">Te esperamos lá!</span>
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleOk}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-95"
              >
                Concluir
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};