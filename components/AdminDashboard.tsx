import React, { useEffect, useState } from 'react';
import { Appointment } from '../types';
import { getAppointments, cancelAppointment, clearAllAppointments } from '../services/storageService';
import { Trash2, BarChart2, RefreshCw, ShieldAlert, Download, Eraser, Smartphone, Share2, Copy, Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [occupancyData, setOccupancyData] = useState<{date: string, count: number, rate: number}[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  
  // State for Calendar View
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- UTILS ---
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
    const url = 'https://agendamento-pro-tau.vercel.app/';
    copyToClipboard(url, 'link');
  };

  const handleShareInvite = () => {
    const url = 'https://agendamento-pro-tau.vercel.app/';
    const message = `Olá! 👋\n\nAgende seu horário conosco de forma prática e rápida através do nosso link:\n${url}\n\nEsperamos por você!`;
    copyToClipboard(message, 'invite');
  };

  // Hardcoded slots for robustness in chart calculation
  const DEFAULT_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00"
  ];

  // --- CORE LOGIC ---

  const processOccupancy = (data: Appointment[]) => {
    // 1. Prepare Calculation Map
    const countsByDate: Record<string, number> = {};
    data.forEach(app => {
        countsByDate[app.date] = (countsByDate[app.date] || 0) + 1;
    });

    // 2. Generate Chart Data (Last 30 days + Next 14 days)
    const rangeStats: {date: string, count: number, rate: number}[] = [];
    const today = getNoonDate();
    
    for(let i = -30; i <= 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateKey = formatDateKey(d);
        const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat

        // Rule: Skip Sundays in Chart
        if (dayOfWeek === 0) continue; 

        const count = countsByDate[dateKey] || 0;
        
        // Rule: Saturday Capacity (08:00 - 18:00 = 11 slots)
        let dailyCapacity = DEFAULT_SLOTS.length;
        if (dayOfWeek === 6) { 
             dailyCapacity = DEFAULT_SLOTS.filter(t => parseInt(t.split(':')[0], 10) <= 18).length;
        }

        // Avoid division by zero
        dailyCapacity = dailyCapacity || 1;

        const rate = Math.round((count / dailyCapacity) * 100);

        rangeStats.push({
            date: dateKey,
            count,
            rate
        });
    }

    setOccupancyData(rangeStats);
  };

  const loadData = () => {
    const data = getAppointments();
    // Sort logic
    const sortedData = [...data].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });
    setAppointments(sortedData);
    processOccupancy(sortedData);
    setLastUpdated(Date.now());
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleCancel = (id: string) => {
    if (window.confirm("Tem certeza que deseja cancelar este agendamento?")) {
      cancelAppointment(id);
      loadData();
    }
  };

  const handleClearAll = () => {
    if (window.confirm("PERIGO: Isso apagará TODOS os agendamentos da base de dados. Deseja continuar?")) {
      clearAllAppointments();
      loadData();
    }
  };

  const downloadXLS = () => {
    const headers = ['ID', 'Data', 'Hora', 'Nome do Cliente', 'WhatsApp', 'Data Criacao'];
    const csvRows = [headers.join(',')];

    appointments.forEach(apt => {
        const row = [
            apt.id,
            apt.date,
            apt.time,
            `"${apt.clientName}"`,
            `"${apt.clientWhatsapp}"`,
            new Date(apt.createdAt).toLocaleDateString('pt-BR')
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `base_agendamentos_producao_${formatDateKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
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

    // Empty cells for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50/50 min-h-[120px] border-r border-b border-gray-100"></div>);
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const dayAppointments = getAppointmentsForDay(day);
      const isCurrentDay = isToday(day);
      const hasAppointments = dayAppointments.length > 0;

      days.push(
        <div 
          key={day} 
          className={`
            min-h-[120px] p-2 border-r border-b border-gray-100 relative group transition-colors
            ${isCurrentDay ? 'bg-indigo-50/30' : 'bg-white hover:bg-gray-50'}
          `}
        >
          {/* Day Number Header */}
          <div className="flex justify-between items-start mb-2">
            <span className={`
              text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
              ${isCurrentDay ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500'}
            `}>
              {day}
            </span>
            {hasAppointments && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-md">
                {dayAppointments.length}
              </span>
            )}
          </div>

          {/* Appointments List */}
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayAppointments.map(apt => (
              <div 
                key={apt.id} 
                className="text-[10px] bg-indigo-50 text-indigo-900 border border-indigo-100 rounded px-1.5 py-1 flex items-center justify-between gap-1 group/item cursor-default hover:bg-indigo-100 hover:border-indigo-200 transition-colors"
                title={`${apt.time} - ${apt.clientName}`}
              >
                <div className="flex items-center gap-1 overflow-hidden">
                    <span className="font-bold whitespace-nowrap">{apt.time}</span>
                    <span className="truncate">{apt.clientName}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCancel(apt.id); }}
                  className="hidden group-hover/item:block text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Share Section */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-xl shadow-lg p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Share2 className="w-8 h-8 text-indigo-100" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Enviar Agenda para Clientes</h2>
            <p className="text-indigo-200 text-sm mt-1 max-w-md">
              Copie o link direto ou uma mensagem de convite pronta para enviar no WhatsApp dos seus clientes.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button 
            onClick={handleShareLink}
            className="flex items-center justify-center gap-2 bg-white text-indigo-900 px-4 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-sm min-w-[140px]"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedLink ? 'Copiado!' : 'Copiar Link'}
          </button>
          
          <button 
            onClick={handleShareInvite}
            className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-sm min-w-[160px]"
          >
            {copiedInvite ? <Check className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            {copiedInvite ? 'Copiado!' : 'Copiar Convite'}
          </button>
        </div>
      </div>

      {/* Admin Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                Painel Administrativo
            </h2>
            <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3" />
                Atualizado: {new Date(lastUpdated).toLocaleTimeString()}
                <button onClick={loadData} className="text-indigo-600 hover:text-indigo-800" title="Atualizar">
                    <RefreshCw className="w-3 h-3" />
                </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
                onClick={handleClearAll}
                className="text-xs text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 transition-colors font-medium"
            >
                <Eraser className="w-4 h-4" />
                Limpar Base
            </button>
          </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <BarChart2 className="w-6 h-6 text-indigo-600" />
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Ocupação Diária</h2>
                    <p className="text-xs text-gray-500">Visualização de Segunda a Sábado</p>
                </div>
            </div>
            <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                Total Agendamentos: {appointments.length}
            </div>
        </div>
        
        {occupancyData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">Sistema pronto para receber dados reais.</p>
                <p className="text-sm text-gray-400 mt-1">Os agendamentos feitos pelos clientes aparecerão aqui.</p>
            </div>
        ) : (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
                {/* Chart Container */}
                <div className="flex items-end gap-1 min-w-[800px] h-64 border-b border-gray-200 px-2 pt-8 relative">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-[10px] text-gray-300 pl-1 pb-6">
                        <span className="border-b border-dashed border-gray-100 w-full">100%</span>
                        <span className="border-b border-dashed border-gray-100 w-full">50%</span>
                        <span className="border-b border-gray-100 w-full">0%</span>
                    </div>

                    {occupancyData.map((stat) => {
                         const isToday = stat.date === formatDateKey(new Date());
                         
                         return (
                            <div key={stat.date} className="flex flex-col items-center flex-1 group relative min-w-[20px] h-full justify-end z-10">
                                
                                {/* Hover Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-2 px-3 transition-opacity duration-200 whitespace-nowrap shadow-xl pointer-events-none z-20">
                                    <div className="font-bold border-b border-gray-700 pb-1 mb-1 text-center text-indigo-200">
                                        {stat.date.split('-').reverse().join('/')}
                                    </div>
                                    <div className="text-center">{stat.count} agendamentos</div>
                                    <div className="text-center font-bold text-indigo-300">{stat.rate}% ocupado</div>
                                </div>
                                
                                {/* Bar */}
                                <div 
                                    className={`w-full mx-0.5 rounded-t-sm transition-all relative ${
                                        isToday ? 'bg-indigo-600' : 'bg-indigo-400 hover:bg-indigo-500'
                                    }`}
                                    style={{ 
                                        height: `${Math.max(stat.rate, 1)}%`, 
                                        minHeight: stat.count > 0 ? '4px' : '0',
                                        opacity: 0.9
                                    }} 
                                />
                                
                                {/* X-Axis Labels (Every 5 days) */}
                                <div className="absolute top-full mt-2 w-full flex justify-center">
                                   {(parseInt(stat.date.split('-')[2]) % 5 === 0 || isToday) && (
                                       <span className={`text-[10px] whitespace-nowrap ${isToday ? 'font-bold text-indigo-700' : 'text-gray-400'}`}>
                                            {stat.date.split('-')[2]}/{stat.date.split('-')[1]}
                                       </span>
                                   )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>

      {/* Calendar View (Gestão à Vista) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2 rounded-lg">
                    <CalendarIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                        {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-xs text-gray-500">Gestão visual de agendamentos</p>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
                <button 
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition-all"
                >
                    Hoje
                </button>
                <button 
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {weekDays.map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {day}
                </div>
            ))}
        </div>
        <div className="grid grid-cols-7">
            {renderCalendarGrid()}
        </div>
      </div>

      {/* List View (Secondary) */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <div className="flex items-center gap-3">
             <h3 className="text-md font-bold text-gray-700">Todos os Registros</h3>
          </div>
          <button 
                onClick={downloadXLS}
                disabled={appointments.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Baixar Relatório CSV
          </button>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
               <p>Nenhum agendamento realizado ainda.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 shadow-sm bg-white">
                  <tr className="text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-3 font-semibold border-b border-gray-100 pl-6">Data</th>
                    <th className="p-3 font-semibold border-b border-gray-100">Hora</th>
                    <th className="p-3 font-semibold border-b border-gray-100">Cliente</th>
                    <th className="p-3 font-semibold border-b border-gray-100 text-right pr-6">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 pl-6 text-gray-900 font-medium">
                        {apt.date.split('-').reverse().join('/')}
                      </td>
                      <td className="p-3 text-gray-600">{apt.time}</td>
                      <td className="p-3 text-gray-800 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {apt.clientName.charAt(0)}
                        </span>
                        {apt.clientName}
                      </td>
                      <td className="p-3 pr-6 text-right flex items-center justify-end gap-2">
                        <button 
                            onClick={() => openWhatsapp(apt.confirmationMessage || '', apt.clientWhatsapp)}
                            className="text-green-500 hover:bg-green-50 p-2 rounded transition-all"
                            title="Enviar Confirmação WhatsApp"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleCancel(apt.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-all" title="Cancelar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          )}
        </div>
      </div>
    </div>
  );
};