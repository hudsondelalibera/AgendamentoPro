import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateConfirmationMessage = async (
  clientName: string,
  date: string,
  time: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Crie uma mensagem curta, profissional e amigável de confirmação de agendamento para WhatsApp.
      Cliente: ${clientName}
      Data: ${date}
      Horário: ${time}
      
      A mensagem deve ser em português, confirmar que o horário está reservado e pedir para chegar com 5 minutos de antecedência. Não use hashtags. Use emojis moderadamente.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || `Olá ${clientName}, seu agendamento para o dia ${date} às ${time} está confirmado!`;
  } catch (error) {
    console.error("Error generating message:", error);
    // Fallback message
    return `Olá ${clientName}, confirmamos seu agendamento para ${date} às ${time}.`;
  }
};