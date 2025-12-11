import { GoogleGenAI } from "@google/genai";

// Guidelines: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// We assume it is pre-configured and valid.
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateConfirmationMessage = async (
  clientName: string,
  date: string,
  time: string
): Promise<string> => {
  const fallbackMessage = `Olá ${clientName}, confirmamos seu agendamento para ${date} às ${time}. Por favor, chegue com 5 minutos de antecedência.`;

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Crie uma mensagem curta, profissional e amigável de confirmação de agendamento para WhatsApp.
      Cliente: ${clientName}
      Data: ${date}
      Horário: ${time}
      
      A mensagem deve ser em português, confirmar que o horário está reservado e pedir para chegar com 5 minutos de antecedência. Não use hashtags. Use emojis moderadamente.
    `;

    const response = await aiClient.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || fallbackMessage;
  } catch (error) {
    console.error("Erro na geração de texto (usando fallback):", error);
    return fallbackMessage;
  }
};