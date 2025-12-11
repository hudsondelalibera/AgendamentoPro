// --- CONFIGURAÇÃO Z-API (RESTAURADA) ---
const INSTANCE_ID = 'SEU_ID_DA_INSTANCIA'; // Insira seu ID da Z-API aqui
const TOKEN = 'SEU_TOKEN';             // Insira seu Token da Z-API aqui

export const sendAutomaticConfirmation = async (
  clientPhone: string, 
  clientName: string, 
  date: string, 
  time: string
): Promise<boolean> => {
  try {
    if (INSTANCE_ID === 'SEU_ID_DA_INSTANCIA') {
        console.warn("Z-API não configurada. Configure o ID e Token em services/whatsappService.ts");
        return true; 
    }

    const phone = '55' + clientPhone.replace(/\D/g, '');
    const message = `Olá ${clientName}! 👋\n\nSeu agendamento está confirmado!\n🗓 Data: ${date.split('-').reverse().join('/')}\n⏰ Horário: ${time}\n\nPor favor, chegue com 5 minutos de antecedência. Até lá!`;

    const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': 'F4051016629749558373180299696345' // Token de segurança opcional, se houver
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    // Retorna true para não bloquear o fluxo do app mesmo se o envio falhar
    return true;
  }
};

export const getManualWhatsappLink = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
};