import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getHealthAnalysis(packsData: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    return "API Key do Gemini não configurada.";
  }

  const prompt = `
    Analise o seguinte histórico de consumo de cigarros de um usuário e forneça uma análise de impacto à saúde em tempo real.
    Seja direto, empático, mas firme sobre os riscos. 
    Dados: ${JSON.stringify(packsData)}
    
    O usuário quer saber:
    1. O impacto atual baseado na frequência.
    2. Benefícios imediatos se ele parar agora.
    3. Uma estimativa de quanto tempo de vida pode estar sendo impactado (estimativa geral).
    
    Responda em Português do Brasil, formatado em Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro na análise IA:", error);
    return "Não foi possível gerar a análise no momento.";
  }
}

export async function getChatResponse(message: string, history: any[]) {
  if (!process.env.GEMINI_API_KEY) return "API Key não configurada.";

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "Você é um Coach especializado em cessação do tabagismo. Seu objetivo é ajudar o usuário a parar de fumar. Seja empático, use técnicas de Terapia Cognitivo-Comportamental (TCC), forneça dicas práticas para lidar com a fissura e mantenha o usuário motivado. Se o usuário estiver em crise (fissura forte), dê exercícios de respiração ou distração imediatos.",
      },
    });

    // We could pass history here if needed, but for simplicity we'll just send the message
    // In a real app, we'd map history to the format expected by sendMessage
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Erro no chat IA:", error);
    return "Desculpe, tive um problema ao processar sua mensagem.";
  }
}

export async function getTriggerAnalysis(unitsData: any[]) {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `
    Analise os motivos de consumo de cigarros abaixo e identifique padrões e gatilhos emocionais ou situacionais.
    Dados: ${JSON.stringify(unitsData)}
    
    Forneça:
    1. Os 3 principais gatilhos identificados.
    2. Uma sugestão de comportamento alternativo para cada gatilho.
    3. Uma frase de encorajamento baseada no padrão.
    
    Responda em Português do Brasil, formatado em JSON com os campos:
    {
      "triggers": [{"name": "string", "reason": "string", "suggestion": "string"}],
      "encouragement": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro na análise de gatilhos:", error);
    return null;
  }
}
