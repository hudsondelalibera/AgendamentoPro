import React, { useEffect, useState } from 'react';
import { Appointment } from '../types';
import { subscribeToAppointments, cancelAppointment, clearAllAppointments } from '../services/storageService';
import { Trash2, BarChart2, Download, Eraser, Smartphone, Share2, Copy, Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, CloudOff, Filter, X } from 'lucide-react';
import { isFirebaseInitialized } from '../services/firebaseConfig';

export const AdminDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [occupancyData, setOccupancyData] = useState<{date: string, count: number, rate: number}[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getNoonDate = (date: Date = new Date()) => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openWhatsapp = (message: string, number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    if (!cleanNumber) return;
    const encodedMessage = encodeURIComponent(message || `Olá, confirmamos seu agendamento.`);
    const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = async (text: string, type: 'link' | 'invite') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShareLink = () => {
    const url = window.location.href; 
    copyToClipboard(url, 'link');
  };

  const handleShareInvite = () => {
    const url = window.location.href;
    const message = `Olá! 👋\n\nAgende seu horário conosco de forma prática e rápida pelo nosso App:\n${url}\n\nEscolha o melhor horário para você. Esperamos sua visita!`;
    copyToClipboard(message, 'invite');
  };

  const processOccupancy = (data: Appointment[]) => {
    const countsByDate: Record<string, number> = {};
    data.forEach(app => {
        countsByDate[app.date] = (countsByDate[app.date] || 0) + 1;
    });

    const rangeStats: {date: string, count: number, rate: number}[] = [];
    const today = getNoonDate();
    
    for(let i = -15; i <= 15; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateKey = formatDateKey(d);
        const dayOfWeek = d.getDay(); 

        if (dayOfWeek === 0) continue; 

        const count = countsByDate[dateKey] || 0;
        const rate = Math.round((count / 13) * 100); // Assuming ~13 slots/day
        rangeStats.push({ date: dateKey, count, rate });
    }
    setOccupancyData(rangeStats);
  };

  useEffect(() => {
    const unsubscribe = subscribeToAppointments((data) => {
      const sortedData = [...data].sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
      });
      setAppointments(sortedData);
      processOccupancy(sortedData);
    });

    return () => unsubscribe();
  }, []);

  const handleCancel = async (apt: Appointment) => {
    const dateFormatted = apt.date.split('-').reverse().join('/');
    const confirmMessage = `CONFIRMAÇÃO DE CANCELAMENTO:\n\nCliente: ${apt.clientName}\nData: ${dateFormatted}\nHorário: ${apt.time}\n\nAo confirmar, este horário ficará livre imediatamente para novos agendamentos.`;
    
    if (window.confirm(confirmMessage)) {
      await cancelAppointment(apt.id);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("PERIGO: Isso apagará TODOS os agendamentos do banco de dados na nuvem. Deseja continuar?")) {
      await clearAllAppointments();
    }
  };

  const downloadXLS = () => {
    const headers = ['ID', 'Data', 'Hora', 'Cliente', 'WhatsApp'];
    const csvRows = [headers.join(',')];

    appointments.forEach(apt => {
        const row = [
            apt.id,
            apt.date,
            apt.time,
            `"${apt.clientName}"`,
            `"${apt.clientWhatsapp}"`
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agendamentos_pro_${formatDateKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };
  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
  };
  const getAppointmentsForDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${month}-${dayStr}`;
    return appointments.filter(a => a.date === dateKey);
  };

  const renderCalendarGrid = () => {
    const totalDays = getDaysInMonth(currentMonth);
    const startDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="bg-gray-50/50 min-h-[100px] border-r border-b border-gray-100"></div>);

    for (let day = 1; day <= totalDays; day++) {
      const dayAppointments = getAppointmentsForDay(day);
      const isCurrentDay = isToday(day);
      
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayStr}`;
      
      const isSelected = selectedDateFilter === dateKey;

      days.push(
        <div 
            key={day} 
            onClick={() => setSelectedDateFilter(isSelected ? null : dateKey)}
            className={`min-h-[100px] p-2 border-r border-b border-gray-100 transition-colors cursor-pointer hover:bg-indigo-50/60 ${isCurrentDay ? 'bg-indigo-50/40' : 'bg-white'} ${isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50' : ''}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isCurrentDay ? 'bg-indigo-600 text-white' : isSelected ? 'bg-indigo-500 text-white' : 'text-gray-400'}`}>{day}</span>
            {dayAppointments.length > 0 && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 rounded-md">{dayAppointments.length}</span>}
          </div>
          <div className="flex flex-col gap-1 overflow-hidden">
            {dayAppointments.slice(0, 3).map(apt => (
              <div key={apt.id} className="text-[9px] bg-indigo-50 text-indigo-900 border border-indigo-100 rounded px-1 py-0.5 truncate">
                {apt.time} • {apt.clientName.split(' ')[0]}
              </div>
            ))}
            {dayAppointments.length > 3 && <div className="text-[9px] text-gray-400 pl-1">+{dayAppointments.length - 3} mais</div>}
          </div>
        </div>
      );
    }
    return days;
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Filter list logic
  const filteredAppointments = selectedDateFilter 
    ? appointments.filter(a => a.date === selectedDateFilter)
    : appointments;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {!isFirebaseInitialized && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
              <CloudOff className="w-6 h-6 text-red-600" />
              <div><p className="font-bold text-sm">Offline</p></div>
          </div>
      )}

      {/* Share Section */}
      <div className="bg-gradient-to-r from-gray-900 to-indigo-900 rounded-xl shadow-lg p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Share2 className="w-8 h-8 text-indigo-200" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Divulgue sua Agenda</h2>
            <p className="text-indigo-200 text-sm mt-1 max-w-md">Envie o link do seu aplicativo profissional para os clientes escolherem os horários.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button onClick={handleShareLink} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-3 rounded-lg font-semibold transition-all">
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Link
          </button>
          <button onClick={handleShareInvite} className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-green-500/20">
            {copiedInvite ? <Check className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />} Copiar Convite WhatsApp
          </button>
        </div>
      </div>

      {/* Stats & Controls */}
      <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-600"/> Visão Geral (30 dias)</h3>
             </div>
             <div className="h-32 flex items-end justify-between gap-1 px-2 border-b border-gray-100 pb-2">
                 {occupancyData.map((d, i) => (
                     <div key={i} className="flex-1 bg-indigo-100 hover:bg-indigo-500 transition-colors rounded-t-sm relative group" style={{height: `${Math.max(d.rate, 5)}%`}}>
                         <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-xs p-1 rounded whitespace-nowrap z-10">{d.count} agend.</div>
                     </div>
                 ))}
             </div>
          </div>
          <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center gap-3">
             <button onClick={handleClearAll} className="w-full text-xs text-red-600 bg-red-50 hover:bg-red-100 p-3 rounded-lg border border-red-100 transition-colors font-medium flex items-center justify-center gap-2">
                <Eraser className="w-4 h-4" /> Resetar Banco de Dados
             </button>
             <button onClick={downloadXLS} className="w-full text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border border-gray-200 transition-colors font-medium flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Baixar Relatório Completo
             </button>
          </div>
      </div>

      {/* Calendar & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-indigo-600"/> Calendário</h3>
                 <div className="flex gap-1">
                     <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
                     <span className="text-sm font-medium px-2 py-1">{currentMonth.toLocaleDateString('pt-BR', {month: 'long'})}</span>
                     <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-200 rounded"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
                 </div>
             </div>
             <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                {weekDays.map(d => <div key={d} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>)}
             </div>
             <div className="grid grid-cols-7">
                {renderCalendarGrid()}
             </div>
             <div className="p-2 text-xs text-gray-400 text-center bg-gray-50 border-t border-gray-100">
                Clique em um dia para filtrar a lista de agendamentos
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
             <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    Agendamentos
                    {selectedDateFilter && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{selectedDateFilter.split('-').reverse().slice(0,2).join('/')}</span>}
                 </h3>
                 {selectedDateFilter && (
                    <button onClick={() => setSelectedDateFilter(null)} className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-900">
                        <X className="w-3 h-3" /> Limpar
                    </button>
                 )}
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                 {filteredAppointments.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <Filter className="w-10 h-10 text-gray-300 mb-2" />
                        <p className="text-gray-400 text-sm">Nenhum agendamento encontrado {selectedDateFilter ? 'nesta data' : ''}.</p>
                    </div>
                 )}
                 {filteredAppointments.map(apt => (
                     <div key={apt.id} className="p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all bg-white group flex flex-col gap-2">
                         <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{apt.time}</span>
                                <span className="text-xs font-medium text-indigo-600">{apt.date.split('-').reverse().slice(0,2).join('/')}</span>
                             </div>
                         </div>
                         <h4 className="font-bold text-gray-800 text-sm">{apt.clientName}</h4>
                         
                         <div className="flex gap-2 mt-1">
                            <button onClick={() => openWhatsapp(apt.confirmationMessage || '', apt.clientWhatsapp)} className="flex-1 text-xs flex items-center justify-center gap-1 text-green-700 bg-green-50 py-1.5 rounded hover:bg-green-100 transition-colors border border-green-100">
                                <Smartphone className="w-3 h-3" /> WhatsApp
                            </button>
                            <button 
                                onClick={() => handleCancel(apt)} 
                                className="flex-1 text-xs flex items-center justify-center gap-1 text-red-600 bg-red-50 py-1.5 rounded hover:bg-red-600 hover:text-white transition-all border border-red-100 font-medium"
                                title="Liberar horário e remover do banco de dados"
                            >
                                <Trash2 className="w-3 h-3" /> Cancelar
                            </button>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      </div>
    </div>
  );
};