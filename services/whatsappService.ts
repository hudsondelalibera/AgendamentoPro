// --- CONFIGURAÇÃO DE ENVIO AUTOMÁTICO (GATEWAY) ---
// Configuração para envio via Z-API

// Credenciais Fornecidas
const INSTANCE_ID = '3EB8778A29E0C1A13168B28DC313D01F';
const TOKEN = '90BD29C5A89B6FB43D089B93';

export const sendAutomaticConfirmation = async (
  clientPhone: string, 
  clientName: string, 
  date: string, 
  time: string
): Promise<boolean> => {
  
  if (!INSTANCE_ID || !TOKEN) {
    console.warn("⚠️ Gateway de WhatsApp não configurado.");
    return false;
  }

  try {
    // 1. Limpeza rigorosa do telefone
    // Remove tudo que não for dígito
    let phone = clientPhone.replace(/\D/g, '');
    
    // Lógica para garantir formato internacional: 55 + DDD + Numero
    // Se tiver 10 ou 11 dígitos (Ex: 44999999999 ou 4499999999), assume que é BR e adiciona 55
    if (phone.length >= 10 && phone.length <= 11) {
        phone = '55' + phone;
    }
    
    // LOG PARA DEBUG (Aperte F12 para ver no Console)
    console.log(`🚀 Tentando enviar WhatsApp para: ${phone}`);

    // 2. Formatar Data
    const dateFormatted = date.split('-').reverse().join('/');

    // 3. Montar Mensagem
    const message = `Olá *${clientName}*! 👋\n\nSeu agendamento foi confirmado com sucesso!\n\n🗓️ *Data:* ${dateFormatted}\n⏰ *Horário:* ${time}\n\nSe precisar reagendar, entre em contato.`;

    // 4. URL Exata fornecida
    const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

    console.log("🔗 URL API:", url);

    // REMOVIDO 'Client-Token' do header para evitar conflito de chaves incorretas.
    // Usamos apenas a autenticação via URL (Token da Instância).
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

    const responseData = await response.json(); // Tenta ler a resposta da Z-API

    if (!response.ok) {
        console.error('❌ Erro Z-API:', responseData);
        alert('Erro técnico ao enviar WhatsApp. Verifique o Console (F12).');
        return false;
    }

    console.log('✅ Sucesso Z-API:', responseData);
    return true;

  } catch (error) {
    console.error("❌ Erro fatal na conexão com WhatsApp:", error);
    return false;
  }
};