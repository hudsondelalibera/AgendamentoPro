// --- CONFIGURAÇÃO DE ENVIO AUTOMÁTICO (GATEWAY) ---
// Configuração para envio via Z-API usando o número da clínica.

// Credenciais da Instância (Conectada ao WhatsApp +55 44 9168-5916)
const INSTANCE_ID = '3EB8778A29E0C1A13168B28DC313D01F';
const TOKEN = '90BD29C5A89B6FB43D089B93';
const CLIENT_TOKEN = 'F45d8f9219e24483785461c31405e6080S'; // Token de segurança padrão da Z-API

export const sendAutomaticConfirmation = async (
  clientPhone: string, 
  clientName: string, 
  date: string, 
  time: string
): Promise<boolean> => {
  
  // Verificação de segurança básica
  if (!INSTANCE_ID || !TOKEN) {
    console.warn("⚠️ Gateway de WhatsApp não configurado.");
    return false;
  }

  try {
    // 1. Formatar telefone do cliente para padrão internacional (55 + DDD + Numero)
    let phone = clientPhone.replace(/\D/g, '');
    
    // Se o usuário digitou apenas DDD+Número (10 ou 11 dígitos), adicionamos o código do Brasil (55)
    if (phone.length >= 10 && phone.length <= 11) {
        phone = '55' + phone;
    }

    // 2. Formatar Data para o padrão brasileiro (DD/MM/AAAA)
    const dateFormatted = date.split('-').reverse().join('/');

    // 3. Montar Mensagem Profissional
    const message = `Olá *${clientName}*! 👋\n\nSeu agendamento foi confirmado com sucesso!\n\n🗓️ *Data:* ${dateFormatted}\n⏰ *Horário:* ${time}\n\nO horário está reservado para você. Caso precise remarcar, por favor nos avise.\n\nAtenciosamente,\n*Sua Clínica*`;

    // 4. Enviar via API (Endpoint da Z-API)
    const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': CLIENT_TOKEN 
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    if (!response.ok) {
        console.error('Erro no envio automático (Z-API):', await response.text());
        return false;
    }

    console.log('Mensagem automática enviada com sucesso via Z-API!');
    return true;

  } catch (error) {
    console.error("Erro de conexão com Gateway WhatsApp:", error);
    return false;
  }
};