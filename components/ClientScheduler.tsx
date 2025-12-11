import React, { useState, useEffect, useRef } from 'react';
import { Appointment, TIME_SLOTS, DaySlot } from '../types';
import { saveAppointment, getAppointments } from '../services/storageService';
import { sendAutomaticConfirmation } from '../services/whatsappService';
import { Calendar, Clock, CheckCircle, Smartphone, User, Loader2, ChevronRight, AlertCircle, CloudOff, ArrowLeft } from 'lucide-react';
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
  const [step, setStep] = useState<0 | 1>(0); // 0: Date/Time, 1: Info Form
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [fetchedAppointments, setFetchedAppointments] = useState<Appointment[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [days, setDays] = useState<DaySlot[]>([]);

  // Ref para rolagem automática no mobile
  const timeSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
        const nextDays: DaySlot[] = [];
        const today = new Date();
        let daysAdded = 0;
        let dayOffset = 0;
        
        while (daysAdded < 7) { 
            const date = new Date(today);
            date.setDate(today.getDate() + dayOffset);
            
            if (date.getDay() !== 0) { // Skip Sundays
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

  if (!isFirebaseInitialized) {
      return (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-12 text-center border border-red-100 mt-8">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CloudOff className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sistema Indisponível</h3>
              <p className="text-gray-500">Contate o estabelecimento para agendar.</p>
          </div>
      );
  }

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedTime(null);
    
    if (window.innerWidth < 768 && timeSectionRef.current) {
        setTimeout(() => {
            timeSectionRef.current?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }
  };

  const handleTimeSelect = (time: string) => {
    if (selectedDate && isTimeSlotValid(selectedDate, time)) {
      setSelectedTime(time);
      setErrorMsg(null);
    }
  };

  const handleNextStep = () => {
    if (selectedDate && selectedTime) {
      setStep(1);
    }
  };

  // Converte horário "HH:MM" para minutos absolutos (ex: "01:00" -> 60)
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isTimeSlotValid = (dateString: string, candidateTime: string) => {
    // 1. Verificar se é passado
    const today = new Date();
    const selectedDateObj = new Date(dateString + 'T00:00:00');
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());

    if (selectedDateOnly.getTime() === todayDateOnly.getTime()) {
      const currentMinutes = today.getHours() * 60 + today.getMinutes();
      const candidateMinutes = timeToMinutes(candidateTime);
      if (candidateMinutes <= currentMinutes) return false;
    }

    // 2. Verificar colisão de horários (DURAÇÃO DE 60 MINUTOS)
    // Se eu agendar às 08:30, eu ocupo 08:30 até 09:30.
    // Isso conflita com alguém que agendou às 08:00 (vai até 09:00).
    // Isso conflita com alguém que agendou às 09:00 (começa às 09:00).
    
    const candidateStart = timeToMinutes(candidateTime);
    const candidateEnd = candidateStart + 60; // Duração fixa de 60 min

    const appointmentsOnDay = fetchedAppointments.filter(a => a.date === dateString);

    const hasConflict = appointmentsOnDay.some(existingAppt => {
        const existingStart = timeToMinutes(existingAppt.time);
        const existingEnd = existingStart + 60; // Duração fixa de 60 min

        // Lógica de intersecção de intervalos:
        // (StartA < EndB) e (EndA > StartB)
        return candidateStart < existingEnd && candidateEnd > existingStart;
    });

    return !hasConflict;
  };

  const resetForm = () => {
    setStep(0);
    setClientName('');
    setClientWhatsapp('');
    setSelectedTime(null);
    setShowSuccessModal(false);
    setErrorMsg(null);
    getAppointments().then(setFetchedAppointments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !clientName || !clientWhatsapp) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    // Verificação dupla de segurança antes de enviar
    if (!isTimeSlotValid(selectedDate, selectedTime)) {
        setErrorMsg("Este horário acabou de ser ocupado ou conflita com outro agendamento.");
        const freshData = await getAppointments();
        setFetchedAppointments(freshData);
        setSelectedTime(null);
        setStep(0);
        setIsSubmitting(false);
        return;
    }

    try {
      const newAppointment: Appointment = {
        id: '', 
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientWhatsapp,
        confirmationMessage: '', 
        createdAt: Date.now()
      };

      const success = await saveAppointment(newAppointment);

      if (success) {
        await sendAutomaticConfirmation(clientWhatsapp, clientName, selectedDate, selectedTime);
        setShowSuccessModal(true);
        onBookingComplete();
      } else {
        setErrorMsg("Erro ao salvar. Tente novamente.");
        const freshData = await getAppointments();
        setFetchedAppointments(freshData);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Ocorreu um erro técnico. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelectedDateSaturday = selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() === 6 : false;

  return (
    <div className="max-w-4xl mx-auto">
        {/* Progress Bar with Labels */}
        <div className="max-w-md mx-auto mb-10 px-8">
            <div className="relative flex justify-between items-center">
                 {/* Background Line */}
                <div className="absolute left-0 top-4 w-full h-1 bg-gray-200 rounded-full -z-10"></div>
                {/* Active Line */}
                <div 
                    className={`absolute left-0 top-4 h-1 bg-indigo-600 rounded-full -z-10 transition-all duration-500 ease-out`}
                    style={{ width: step >= 1 ? '100%' : '0%' }}
                ></div>

                {/* Step 1 */}
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-gray-100 ${
                        step >= 0 ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-gray-300 text-gray-500'
                    }`}>
                        1
                    </div>
                    <span className={`text-xs font-bold mt-2 ${step >= 0 ? 'text-indigo-600' : 'text-gray-400'}`}>Data e Horário</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-gray-100 ${
                        step >= 1 ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'bg-gray-300 text-gray-500'
                    }`}>
                        2
                    </div>
                    <span className={`text-xs font-bold mt-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>Confirmação</span>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[500px] border border-gray-100 flex flex-col relative">
            
            {/* Step 0: Date & Time */}
            {step === 0 && (
                <div className="flex flex-col md:flex-row h-full animate-fade-in flex-1">
                    {/* Left: Date */}
                    <div className="w-full md:w-[35%] bg-gray-50 p-6 border-r border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-600" /> 
                            Escolha o Dia
                        </h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {days.map((day) => (
                            <button
                                key={day.dateString}
                                onClick={() => handleDateSelect(day.dateString)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                                selectedDate === day.dateString
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]'
                                    : 'bg-white text-gray-700 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/30'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{day.dayName}</span>
                                        <span className="text-xl font-bold leading-none">{day.dayNumber}</span>
                                    </div>
                                    <div className="h-8 w-[1px] bg-current opacity-20 mx-1"></div>
                                    <span className="font-medium text-sm capitalize">
                                        {day.date.toLocaleDateString('pt-BR', { month: 'long' })}
                                    </span>
                                </div>
                            </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Time */}
                    <div ref={timeSectionRef} className="w-full md:w-[65%] p-6 md:p-8 flex flex-col">
                        {isLoadingAvailability ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                                <p>Verificando agenda...</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Horários</h3>
                                    <p className="text-gray-500 text-sm flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}
                                    </p>
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 gap-2 mb-8 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
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
                                                py-2 px-1 rounded-lg text-sm font-semibold transition-all border relative overflow-hidden
                                                ${!isAvailable 
                                                ? 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed decoration-slate-300' 
                                                : selectedTime === time
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 ring-offset-1'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-500 hover:text-indigo-600'
                                                }
                                            `}
                                            >
                                            {time}
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
                                        ? 'bg-gray-900 text-white hover:bg-black hover:-translate-y-1'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }
                                    `}
                                    >
                                    Continuar
                                    <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Step 1: Confirmation Form */}
            {step === 1 && (
                <div className="p-8 md:p-12 animate-fade-in flex-1 max-w-2xl mx-auto w-full">
                    <button onClick={() => setStep(0)} className="flex items-center text-gray-500 hover:text-indigo-600 mb-8 text-sm font-medium transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Alterar Horário
                    </button>

                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Seus Dados</h3>
                    
                    <div className="bg-indigo-50 rounded-2xl p-6 mb-8 border border-indigo-100 flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-wide mb-1">Agendando Para</p>
                        <p className="text-indigo-900 font-bold text-2xl">
                            {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                            <span className="mx-2 text-indigo-300">•</span>
                            {selectedTime}
                        </p>
                         <p className="text-xs text-gray-400 mt-2">(Duração: 1 Hora)</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {errorMsg && (
                             <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {errorMsg}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label>
                            <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium"
                                placeholder="Digite seu nome"
                            />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Celular para Contato</label>
                            <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Smartphone className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                value={clientWhatsapp}
                                onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setClientWhatsapp(val);
                                }}
                                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none font-medium"
                                placeholder="(DDD) 99999-9999"
                            />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !clientName || !clientWhatsapp}
                            className={`
                            w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all mt-6
                            flex items-center justify-center gap-3 text-lg
                            ${isSubmitting 
                                ? 'bg-indigo-400 cursor-wait' 
                                : 'bg-gray-900 hover:bg-black hover:shadow-2xl hover:-translate-y-1'
                            }
                            `}
                        >
                            {isSubmitting 
                             ? <Loader2 className="w-6 h-6 animate-spin" /> 
                             : <CheckCircle className="w-6 h-6" />
                            }
                            {isSubmitting 
                             ? 'Confirmando...' 
                             : 'Confirmar Agendamento'
                            }
                        </button>
                    </form>
                </div>
            )}
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative animate-bounce-slow border-t-4 border-green-500">
            
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative bg-green-50">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendado com Sucesso!</h2>
            
            <p className="text-gray-500 mb-6 text-sm">
                Seu horário está reservado.<br/>
                Entraremos em contato caso necessário.
            </p>
            
            <button
                onClick={resetForm}
                className="w-full bg-gray-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-black transition-all text-sm shadow-lg"
            >
                Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};