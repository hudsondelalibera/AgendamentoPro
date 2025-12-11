// --- CONFIGURAÇÃO DE ENVIO AUTOMÁTICO (GATEWAY) ---
// Configuração para envio via Z-API

const INSTANCE_ID = '3EB8778A29E0C1A13168B28DC313D01F';
const TOKEN = '90BD29C5A89B6FB43D089B93';

export const sendAutomaticConfirmation = async (
  clientPhone: string, 
  clientName: string, 
  date: string, 
  time: string
): Promise<boolean> => {
  
  if (!INSTANCE_ID || !TOKEN) return false;

  try {
    // 1. Limpeza do telefone (apenas números)
    let phone = clientPhone.replace(/\D/g, '');
    
    // Adiciona 55 se parecer um número BR sem DDI
    if (phone.length >= 10 && phone.length <= 11) {
        phone = '55' + phone;
    }
    
    // 2. Formatar Data
    const dateFormatted = date.split('-').reverse().join('/');

    // 3. Montar Mensagem
    const message = `Olá *${clientName}*! 👋\n\nSeu agendamento foi confirmado com sucesso!\n\n🗓️ *Data:* ${dateFormatted}\n⏰ *Horário:* ${time}\n\nO horário está reservado para você. Caso precise remarcar, por favor nos avise.\n\nAtenciosamente,\n*Sua Clínica*`;

    // 4. Envio via API
    const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    if (!response.ok) {
        // Log silencioso no console para debug, sem travar o app
        console.warn('Falha no envio automático (API):', response.status);
        return false;
    }

    return true;

  } catch (error) {
    // Log silencioso (provavelmente bloqueio de CORS do navegador ou erro de rede)
    console.warn("Falha no envio automático (Rede/CORS):", error);
    return false;
  }
};

// Função auxiliar para gerar link manual caso o automático falhe
export const getManualWhatsappLink = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};