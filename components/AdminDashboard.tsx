import React, { useEffect, useState } from 'react';
import { Appointment } from '../types';
import { getAppointments, cancelAppointment, clearAllAppointments } from '../services/storageService';
import { Trash2, BarChart2, RefreshCw, ShieldAlert, Download, Eraser, Smartphone } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [occupancyData, setOccupancyData] = useState<{date: string, count: number, rate: number}[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

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

  // Hardcoded slots for robustness in chart calculation
  const DEFAULT_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00"
  ];

  // --- CORE LOGIC ---

  const processAppointments = (data: Appointment[]) => {
    // 1. Sort Data
    const sortedData = [...data].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });
    
    setAppointments(sortedData);
    
    // 2. Prepare Calculation Map
    const countsByDate: Record<string, number> = {};
    sortedData.forEach(app => {
        countsByDate[app.date] = (countsByDate[app.date] || 0) + 1;
    });

    // 3. Generate Chart Data (Last 30 days + Next 14 days)
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
    setLastUpdated(Date.now());
  };

  const loadData = () => {
    const data = getAppointments();
    processAppointments(data);
  };

  useEffect(() => {
    loadData();
    // Add listener for storage events (in case client adds data in another tab)
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-800">Painel Administrativo</h2>
            <div className="text-xs text-gray-400 flex items-center gap-2">
                Última sincronização: {new Date(lastUpdated).toLocaleTimeString()}
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
                                        height: `${Math.max(stat.rate, 1)}%`, // Always show at least 1% if data exists? No, rate is correct.
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

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 gap-4">
          <div className="flex items-center gap-3">
             <ShieldAlert className="w-5 h-5 text-gray-600" />
             <h2 className="text-lg font-bold text-gray-800">Registros de Clientes</h2>
          </div>
          <button 
                onClick={downloadXLS}
                disabled={appointments.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Baixar CSV
          </button>
        </div>
        
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {appointments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
               <p>Nenhum agendamento realizado ainda.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 shadow-sm bg-white">
                  <tr className="text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b border-gray-100">Data</th>
                    <th className="p-4 font-semibold border-b border-gray-100">Hora</th>
                    <th className="p-4 font-semibold border-b border-gray-100">Cliente</th>
                    <th className="p-4 font-semibold border-b border-gray-100 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-900 font-medium">
                        {apt.date.split('-').reverse().join('/')}
                      </td>
                      <td className="p-4 text-gray-600">{apt.time}</td>
                      <td className="p-4 text-gray-800 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {apt.clientName.charAt(0)}
                        </span>
                        {apt.clientName}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
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