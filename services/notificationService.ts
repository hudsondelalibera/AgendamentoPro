import { Appointment } from '../types';

const CLINIC_WHATSAPP = '5544991685916';

interface NotificationParams {
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  message: string;
}

export const sendConfirmationToClient = async (params: NotificationParams): Promise<boolean> => {
  console.log("Iniciando processo de envio automatizado...", params);

  // SIMULAÇÃO DE ENVIO PARA API (BACKEND)
  // Como este é um app frontend, não podemos enviar diretamente pelo WhatsApp do dono sem um servidor intermediário.
  // PARA FUNCIONAR REALMENTE: Você precisaria configurar um Webhook (ex: Make.com, Zapier, Twilio)
  // e descomentar o código abaixo:
  
  /*
  try {
    const webhookUrl = "SUA_URL_DO_WEBHOOK_AQUI"; // Ex: https://hook.us1.make.com/xyz...
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: CLINIC_WHATSAPP,
        target: params.clientPhone,
        message: params.message
      })
    });
    return true;
  } catch (error) {
    console.error("Erro ao conectar com API de envio", error);
    return false;
  }
  */

  // Simula um delay de rede para parecer real ao usuário
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Retorna sucesso simulado
  return true;
};

export const getClinicWhatsappUrl = (clientName: string, date: string, time: string) => {
  const text = `Olá, acabei de agendar para o dia ${date} às ${time}. Gostaria de tirar uma dúvida.`;
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(text)}`;
};