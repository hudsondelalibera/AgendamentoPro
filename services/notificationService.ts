// Este serviço gera os links para a API universal do WhatsApp (Click-to-Chat)
// Isso permite que o cliente envie a mensagem sem necessidade de servidores complexos.

// Seu número de WhatsApp Business
const CLINIC_WHATSAPP = '5544991685916';

export const getClinicWhatsappUrl = (clientName: string, date: string, time: string) => {
  // Converte data YYYY-MM-DD para DD/MM/YYYY
  const dateFormatted = date.split('-').reverse().join('/');
  
  const text = `Olá! Sou *${clientName}*.\nAcabei de realizar um agendamento pelo App.\n\n📅 Data: *${dateFormatted}*\n⏰ Horário: *${time}*\n\nAguardo a confirmação. Obrigado!`;
  
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(text)}`;
};