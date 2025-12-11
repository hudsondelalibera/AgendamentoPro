
// --- CONFIGURAÇÃO Z-API (ARQUIVADO/FUTURO USO) ---
const INSTANCE_ID = '3EB8778A29E0C1A13168B28DC313D01F';
const INSTANCE_TOKEN = '90BD29C5A89B6FB43D089B93';
const CLIENT_TOKEN = 'F7bfaa180e6a1458098903a4e609ba4d4S';

// URL Base com Token na rota
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${INSTANCE_TOKEN}`;

// Função auxiliar para requisições Z-API (MANTIDA PARA USO FUTURO)
const zApiFetch = async (endpoint: string, body: any) => {
  try {
    const url = `${BASE_URL}/${endpoint}`;
    console.log(`[Z-API] Disparando requisição: ${endpoint}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

// --- FUNÇÕES ARQUIVADAS (Z-API) ---

export const sendZApiConfirmation_Archived = async (
  clientPhone: string,
  clientName: string, 
  date: string,       
  time: string        
): Promise<void> => {
  let phone = clientPhone.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;
  const dateFormatted = date.split('-').reverse().join('/');

  const message = `Oi *${clientName}*! Tudo bem? 💖

Passando para confirmar seu horário na *KM Estética*! ✨

🗓 Data: *${dateFormatted}*
⏰ Horário: *${time}*

Está tudo preparado para te receber.
Pedimos gentilmente que chegue com 5 minutinhos de antecedência.

Até logo! 😍🌸`;

  await zApiFetch('send-text', { phone, message });
};

export const sendZApiInvite_Archived = async (
  clientPhone: string, 
  clientName: string
): Promise<boolean> => {
  let phone = clientPhone.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;
  const appUrl = window.location.origin;
  const message = `Olá, *${clientName}*! 🌷\nAqui é da *KM Estética*.\n\nPara facilitar seu dia a dia, agora você pode escolher seu horário no nosso calendário digital:\n\n👇 *Toque abaixo para ver os horários disponíveis:*\n${appUrl}\n\nÉ só escolher o dia e a hora que preferir.\nQualquer dúvida, estou por aqui! 😘`;
  return await zApiFetch('send-text', { phone, message });
};

// --- NOVAS FUNÇÕES MANUAIS (LINKS WHATSAPP) ---

export const getConfirmationLink = (
  clientPhone: string,
  clientName: string,
  date: string,
  time: string
): string => {
  let phone = clientPhone.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;

  const dateFormatted = date.split('-').reverse().join('/');

  // Usando escape unicode para garantir que os emojis não quebrem
  // \u{1F495} = 💕
  // \u{2728} = ✨
  // \u{1F5D3} = 🗓
  // \u{1F4AC} = 💬
  // \u{1F60D} = 😍
  // \u{1F338} = 🌸

  const message = `Oi *${clientName}*, Tudo bem? \u{1F495}
Sua agenda na KM Estética está confirmadíssima! \u{2728}

\u{1F5D3} *${dateFormatted}* às *${time}*

Estamos muito felizes em te receber para cuidar de você com todo carinho que merece.
Se precisar ajustar alguma informação, é só mandar uma mensagem aqui. \u{1F4AC}

Até lá! \u{1F60D}\u{1F338}`;

  // Utilizando api.whatsapp.com para maior compatibilidade com emojis na URL
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};

export const getInviteLink = (
  clientPhone: string, 
  clientName: string
): string => {
  let phone = clientPhone.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 11) phone = `55${phone}`;

  const appUrl = window.location.origin;

  // \u{1F337} = 🌷
  // \u{1F447} = 👇
  // \u{1F618} = 😘

  const message = `Olá, *${clientName}*! \u{1F337}
Aqui é da *KM Estética*.

Para facilitar seu dia a dia, agora você pode escolher seu horário no nosso calendário digital:

\u{1F447} *Toque abaixo para ver os horários disponíveis:*
${appUrl}

É só escolher o dia e a hora que preferir.
Qualquer dúvida, estou por aqui! \u{1F618}`;

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};
