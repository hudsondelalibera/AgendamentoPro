import { Appointment } from '../types';

const CLINIC_WHATSAPP = '5544991685916';
const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/24244740/ufsfi01/';

interface NotificationParams {
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  message: string;
}

export const sendConfirmationToClient = async (params: NotificationParams): Promise<boolean> => {
  console.log("Enviando dados para o Zapier...", params);

  try {
    // 1. Formatar o telefone para garantir o DDI 55 (Brasil)
    let formattedPhone = params.clientPhone.replace(/\D/g, '');
    
    // Se tiver entre 10 e 11 dígitos (DDD + Numero), adiciona 55. 
    if (formattedPhone.length >= 10 && formattedPhone.length <= 11) {
      formattedPhone = `55${formattedPhone}`;
    }

    // 2. Preparar o pacote de dados (Payload)
    const payload = {
      event_type: "new_appointment",
      client_name: params.clientName,
      whatsapp_number: formattedPhone, 
      appointment_date: params.date,
      appointment_time: params.time,
      generated_message: params.message,
      created_at: new Date().toISOString()
    };

    // 3. Enviar para o Zapier
    // IMPORTANTE: 'mode: no-cors' é essencial para enviar dados do navegador direto para o Zapier
    // sem que o navegador bloqueie a requisição.
    // O Content-Type deve ser text/plain (ou omitido) para evitar "Preflight OPTIONS request".
    // O Zapier consegue ler o JSON dentro do corpo mesmo assim.
    await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain' 
      },
      body: JSON.stringify(payload)
    });

    console.log("Dados enviados para o Zapier (background) com sucesso!");
    return true;

  } catch (error) {
    console.error("Erro ao enviar webhook para Zapier:", error);
    // Retornamos true para não travar a experiência do usuário
    return true;
  }
};

export const getClinicWhatsappUrl = (clientName: string, date: string, time: string) => {
  const text = `Olá, acabei de agendar para o dia ${date} às ${time}. Gostaria de tirar uma dúvida.`;
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(text)}`;
};