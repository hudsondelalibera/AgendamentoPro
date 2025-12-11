
// --- CONFIGURAÇÃO Z-API ---
const INSTANCE_ID = '3EB8778A29E0C1A13168B28DC313D01F';
const INSTANCE_TOKEN = '90BD29C5A89B6FB43D089B93';
const CLIENT_TOKEN = 'F7bfaa180e6a1458098903a4e609ba4d4S';

// URL Base com Token na rota
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}`;

// Função auxiliar para requisições Z-API
const zApiFetch = async (endpoint: string, body: any) => {
  try {
    const url = `${BASE_URL}/${endpoint}`;
    
    console.log(`[Z-API] Disparando requisição: ${endpoint}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // CLIENT TOKEN CONFIGURADO:
        // Necessário pois a opção "Client Token" está ativada no painel da Z-API.
        'Client-Token': CLIENT_TOKEN
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Z-API] Falha (${response.status}):`, errText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[Z-API] Erro de conexão:", error);
    return false;
  }
};

export const sendAutomaticConfirmation = async (
  clientPhone: string,
  clientName: string, 
  date: string,       
  time: string        
): Promise<void> => {
  
  let phone = clientPhone.replace(/\D/g, '');
  
  // Garante DDI 55 se o número tiver tamanho de celular BR sem DDI
  if (phone.length >= 10 && phone.length <= 11) {
      phone = `55${phone}`;
  }

  const dateFormatted = date.split('-').reverse().join('/');

  const message = `Oi *${clientName}*! Tudo bem? 💖

Passando para confirmar seu horário na *KM Estética*! ✨

🗓 Data: *${dateFormatted}*
⏰ Horário: *${time}*

Está tudo preparado para te receber.
Pedimos gentilmente que chegue com 5 minutinhos de antecedência.

Até logo! 😍🌸`;

  console.log(`[Z-API] Enviando confirmação para ${phone}...`);
  const success = await zApiFetch('send-text', { phone, message });
  
  if (success) console.log("[Z-API] ✅ Mensagem enviada com sucesso!");
  else console.log("[Z-API] ❌ Erro ao enviar mensagem.");
};

export const sendAppointmentLink = async (
  clientPhone: string, 
  clientName: string
): Promise<boolean> => {
  
  let phone = clientPhone.replace(/\D/g, '');
  
  if (phone.length >= 10 && phone.length <= 11) {
      phone = `55${phone}`;
  }

  const appUrl = window.location.origin;

  const message = `Olá, *${clientName}*! 🌷
Aqui é da *KM Estética*.

Para facilitar seu dia a dia, agora você pode escolher seu horário no nosso calendário digital:

👇 *Toque abaixo para ver os horários disponíveis:*
${appUrl}

É só escolher o dia e a hora que preferir.
Qualquer dúvida, estou por aqui! 😘`;

  console.log(`[Z-API] Enviando convite para ${phone}...`);
  return await zApiFetch('send-text', { phone, message });
};
