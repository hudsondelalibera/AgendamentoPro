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
      Crie uma mensagem curta, elegante e profissional de confirmação de agendamento para WhatsApp.
      
      Dados do Agendamento:
      - Cliente: ${clientName}
      - Data: ${date}
      - Horário: ${time}
      
      Instruções:
      1. Use um tom acolhedor, mas profissional.
      2. Peça gentilmente para chegar com 5 minutos de antecedência.
      3. Se for Sexta ou Sábado, deseje um bom fim de semana no final.
      4. Use no máximo 2 emojis.
      5. Texto em Português do Brasil.
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