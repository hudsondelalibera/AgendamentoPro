
// --- CONFIGURAÇÃO Z-API (AUTOMÁTICA) ---
const INSTANCE_ID = '3EB8778A29E0C1A13168B28DC313D01F';
const INSTANCE_TOKEN = '90BD29C5A89B6FB43D089B93';
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}`;

export const sendAutomaticConfirmation = async (
  clientPhone: string,
  clientName: string, 
  date: string,       
  time: string        
): Promise<void> => {
  
  // 1. Limpeza rigorosa do telefone
  let phone = clientPhone.replace(/\D/g, '');
  
  // Garante o DDI 55 (Brasil) se não estiver presente
  if (!phone.startsWith('55')) {
      phone = `55${phone}`;
  }

  // Formata data de YYYY-MM-DD para DD/MM/YYYY
  const dateFormatted = date.split('-').reverse().join('/');

  // 2. Mensagem atualizada conforme solicitação
  const message = `Oi, *${clientName}* Tudo bem? 💕
Sua agenda na KM Estética está confirmadíssima para *${dateFormatted}* às *${time}*✨
Estamos muito felizes em te receber para cuidar de você com todo carinho que merece.
Se precisar ajustar alguma informação, é só mandar uma mensagem aqui. 💬

Até lá! 😍🌸`;

  try {
    console.log(`[Z-API] Disparando mensagem para ${phone}...`);
    
    // Fire-and-forget: Tentamos enviar, mas não travamos o app se falhar
    // O await aqui é apenas para garantir que a requisição saia antes de fechar componentes
    await fetch(`${BASE_URL}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });
    
    console.log("[Z-API] Requisição enviada.");

  } catch (error) {
    // Log apenas para o desenvolvedor, não afeta o fluxo do usuário
    console.error("[Z-API] Erro silencioso no envio:", error);
  }
};
