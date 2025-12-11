
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
  
  // Garante o DDI 55 (Brasil)
  if (!phone.startsWith('55')) {
      phone = `55${phone}`;
  }

  // Formata data
  const dateFormatted = date.split('-').reverse().join('/');

  // 2. Mensagem atualizada
  const message = `Oi, *${clientName}* Tudo bem? 💕
Sua agenda na KM Estética está confirmadíssima para *${dateFormatted}* às *${time}*✨
Estamos muito felizes em te receber para cuidar de você com todo carinho que merece.
Se precisar ajustar alguma informação, é só mandar uma mensagem aqui. 💬

Até lá! 😍🌸`;

  try {
    console.log(`[Z-API] Iniciando envio para ${phone}...`);
    
    // Controller para timeout (evita que o app trave se a API cair)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos max

    const response = await fetch(`${BASE_URL}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': INSTANCE_TOKEN // Reforço de segurança para alguns endpoints
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      }),
      // KEEPALIVE: Crucial para que o navegador não cancele a requisição 
      // quando o componente React for desmontado ou mudar de tela.
      keepalive: true, 
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
        console.log("[Z-API] Sucesso! Mensagem entregue ao gateway.");
    } else {
        const errorData = await response.text();
        console.error(`[Z-API] Erro do Servidor: ${response.status}`, errorData);
    }

  } catch (error) {
    console.error("[Z-API] Falha na comunicação. Verifique se a instância está Conectada ou bloqueio CORS.", error);
  }
};
