
import React, { useEffect, useState } from 'react';
import { Appointment } from '../types';
import { subscribeToAppointments, cancelAppointment, clearAllAppointments } from '../services/storageService';
import { sendAppointmentLink } from '../services/whatsappService';
import { Trash2, BarChart2, Download, Eraser, Share2, Copy, Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, CloudOff, Filter, X, Smartphone, Send, ExternalLink } from 'lucide-react';
import { isFirebaseInitialized } from '../services/firebaseConfig';

export const AdminDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [occupancyData, setOccupancyData] = useState<{date: string, displayDate: string, count: number, rate: number, isToday: boolean}[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Estados para o envio de convite
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShareLink = () => {
    const url = window.location.href; 
    copyToClipboard(url);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !invitePhone) return;

    setIsSendingInvite(true);
    setInviteStatus('idle');

    try {
      const success = await sendAppointmentLink(invitePhone, inviteName);
      if (success) {
        setInviteStatus('success');
        setInviteName('');
        setInvitePhone('');
        setTimeout(() => setInviteStatus('idle'), 3000);
      } else {
        setInviteStatus('error');
      }
    } catch (error) {
      setInviteStatus('error');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const openWhatsapp = (phone: string) => {
      const cleanNumber = phone.replace(/\D/g, '');
      if (!cleanNumber) return;
      const url = `https://wa.me/55${cleanNumber}`;
      window.open(url, '_blank');
  };

  const processOccupancy = (data: Appointment[]) => {
    const countsByDate: Record<string, number> = {};
    data.forEach(app => {
        countsByDate[app.date] = (countsByDate[app.date] || 0) + 1;
    });

    const rangeStats: {date: string, displayDate: string, count: number, rate: number, isToday: boolean}[] = [];
    const today = getNoonDate();
    const todayKey = formatDateKey(today);
    
    const MAX_DAILY_CAPACITY = 14; 

    for(let i = -15; i <= 15; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateKey = formatDateKey(d);
        const dayOfWeek = d.getDay(); 

        if (dayOfWeek === 0) continue; 

        const count = countsByDate[dateKey] || 0;
        const rate = Math.min(Math.round((count / MAX_DAILY_CAPACITY) * 100), 100); 
        
        rangeStats.push({ 
            date: dateKey, 
            displayDate: d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
            count, 
            rate,
            isToday: dateKey === todayKey
        });
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

  const handleCancel = async (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    e.preventDefault();

    if (isDeleting === apt.id) return;

    const dateFormatted = apt.date.split('-').reverse().join('/');
    const confirmMessage = `Tem certeza que deseja apagar este agendamento?\n\nCliente: ${apt.clientName}\nDia: ${dateFormatted} às ${apt.time}`;
    
    if (window.confirm(confirmMessage)) {
      setIsDeleting(apt.id);
      try {
        const success = await cancelAppointment(apt.id);
        if (success) {
            console.log("Agendamento excluído com sucesso.");
        } else {
            alert("Não foi possível excluir. Verifique sua conexão ou se o item já foi removido.");
        }
      } catch (error) {
        console.error("Erro no handleCancel:", error);
        alert("Erro técnico ao tentar cancelar.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("PERIGO: Isso apagará TODOS os agendamentos do banco de dados na nuvem. Deseja continuar?")) {
      await clearAllAppointments();
    }
  };

  const downloadXLS = () => {
    const headers = ['ID', 'Data', 'Hora', 'Cliente', 'Celular'];
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

      {/* Hero Section: Enviar Calendário */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl shadow-xl text-white overflow-hidden p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
         
         <div className="flex-1 space-y-4">
             <div className="inline-flex items-center gap-2 bg-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-200 uppercase tracking-wide border border-indigo-400/30">
                 <Smartphone className="w-3 h-3" /> Z-API Conectada
             </div>
             <h2 className="text-3xl font-bold leading-tight">Envie o Calendário para seus Clientes</h2>
             <p className="text-indigo-100 text-sm md:text-base max-w-lg">
                 Envie o link de agendamento diretamente para o WhatsApp do seu cliente. Ele receberá uma mensagem profissional e poderá escolher o horário ideal.
             </p>
             <button onClick={handleShareLink} className="flex items-center gap-2 text-xs font-bold text-indigo-300 hover:text-white transition-colors">
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? "Link copiado!" : "Copiar link manualmente"}
             </button>
         </div>

         <div className="w-full md:w-[400px] bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-2xl">
             <form onSubmit={handleSendInvite} className="space-y-4">
                 <div>
                     <label className="block text-xs font-bold text-indigo-200 uppercase mb-1">Nome do Cliente</label>
                     <input 
                        type="text" 
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:bg-black/40 focus:border-indigo-400 transition-colors text-sm"
                     />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-indigo-200 uppercase mb-1">WhatsApp</label>
                     <input 
                        type="text" 
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:bg-black/40 focus:border-indigo-400 transition-colors text-sm"
                     />
                 </div>
                 
                 <button 
                    type="submit" 
                    disabled={isSendingInvite || !inviteName || !invitePhone}
                    className={`
                        w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg
                        ${inviteStatus === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' : 
                          inviteStatus === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' :
                          'bg-white text-indigo-900 hover:bg-indigo-50'}
                        disabled:opacity-70 disabled:cursor-not-allowed
                    `}
                 >
                    {isSendingInvite ? (
                        <div className="w-5 h-5 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin"></div>
                    ) : inviteStatus === 'success' ? (
                        <>Enviado com Sucesso <Check className="w-4 h-4" /></>
                    ) : inviteStatus === 'error' ? (
                        'Erro ao Enviar'
                    ) : (
                        <>Enviar Calendário <Send className="w-4 h-4" /></>
                    )}
                 </button>
             </form>
         </div>

      </div>

      {/* Stats & Controls */}
      <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-600"/> Ocupação (30 dias)</h3>
             </div>
             <div className="h-32 flex items-end justify-between gap-1 px-2 border-b border-gray-100 pb-2 relative">
                 <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-gray-200 -z-10"></div>
                 
                 {occupancyData.map((d, i) => (
                     <div 
                        key={i} 
                        className={`flex-1 transition-all rounded-t-sm relative group cursor-pointer ${d.isToday ? 'bg-indigo-600' : 'bg-indigo-200 hover:bg-indigo-400'}`} 
                        style={{height: `${Math.max(d.rate, 8)}%`}}
                        title={`${d.displayDate}: ${d.count} agendamentos`}
                     >
                     </div>
                 ))}
             </div>
          </div>
          <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center gap-3">
             <h3 className="font-bold text-gray-700 text-sm mb-1">Ações Administrativas</h3>
             <button onClick={downloadXLS} className="w-full text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border border-gray-200 transition-colors font-medium flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Baixar Relatório (CSV)
             </button>
             <button onClick={handleClearAll} className="w-full text-xs text-red-600 bg-red-50 hover:bg-red-100 p-3 rounded-lg border border-red-100 transition-colors font-medium flex items-center justify-center gap-2">
                <Eraser className="w-4 h-4" /> Resetar Banco de Dados
             </button>
          </div>
      </div>

      {/* Calendar & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-indigo-600"/> Agenda Mensal</h3>
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
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
             <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    {selectedDateFilter ? `Agendamentos (${selectedDateFilter.split('-').reverse().slice(0,2).join('/')})` : 'Próximos Agendamentos'}
                 </h3>
                 {selectedDateFilter && (
                    <button onClick={() => setSelectedDateFilter(null)} className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-900">
                        <X className="w-3 h-3" /> Limpar Filtro
                    </button>
                 )}
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                 {filteredAppointments.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <Filter className="w-10 h-10 text-gray-300 mb-2" />
                        <p className="text-gray-400 text-sm">Nenhum horário marcado.</p>
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
                         <p className="text-xs text-gray-400 mb-1">{apt.clientWhatsapp}</p>
                         
                         <div className="mt-1 flex gap-2">
                            <button 
                                onClick={() => openWhatsapp(apt.clientWhatsapp)}
                                className="flex-1 text-xs flex items-center justify-center gap-1 text-green-700 bg-green-50 py-2.5 rounded-lg hover:bg-green-100 border border-green-100 font-bold transition-all"
                            >
                                <Smartphone className="w-3 h-3" /> WhatsApp
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => handleCancel(e, apt)} 
                                disabled={isDeleting === apt.id}
                                className={`flex-1 text-xs flex items-center justify-center gap-1 text-red-600 bg-red-50 py-2.5 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-100 font-bold ${isDeleting === apt.id ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                <Trash2 className="w-3 h-3" /> {isDeleting === apt.id ? '...' : 'Cancelar'}
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
