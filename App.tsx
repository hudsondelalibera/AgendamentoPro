import React, { useState } from 'react';
import { ClientScheduler } from './components/ClientScheduler';
import { AdminDashboard } from './components/AdminDashboard';
import { Calendar, Lock, LogOut } from 'lucide-react';

function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  // Simple password protection simulation for demo
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded password for demo purposes
    if (passwordInput === 'admin123') {
      setIsAdminAuthenticated(true);
      setPasswordInput('');
    } else {
      alert('Senha incorreta (Dica: admin123)');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={() => setView('client')} role="button">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">AgendamentoPro</h1>
              <p className="text-xs text-gray-500">Sistema de Gestão Profissional</p>
            </div>
          </div>

          <nav>
            {view === 'client' ? (
              <button
                onClick={() => setView('admin')}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1.5 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
              >
                <Lock className="w-4 h-4" />
                Acesso Admin
              </button>
            ) : (
              <button
                onClick={() => setView('client')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 py-2 px-3 rounded-md hover:bg-indigo-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Voltar para Agendamento
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {view === 'client' ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Agende seu horário</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Selecione um dia e horário disponível no calendário abaixo. Enviaremos uma confirmação automática para o seu WhatsApp.
              </p>
            </div>
            <ClientScheduler onBookingComplete={() => {}} />
          </div>
        ) : (
          <div className="animate-fade-in">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg mt-12">
                <div className="text-center mb-6">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-gray-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Acesso Restrito</h2>
                  <p className="text-sm text-gray-500">Apenas para administradores</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-black transition-colors font-medium"
                  >
                    Entrar
                  </button>
                </form>
              </div>
            ) : (
              <AdminDashboard />
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} AgendamentoPro. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

export default App;