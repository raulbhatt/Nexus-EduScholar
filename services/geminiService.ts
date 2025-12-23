
import { GoogleGenAI, Type, Content } from "@google/genai";
import { Topic, Level, LearningContent, ConceptDetail } from "../types";

const isQuotaError = (error: any) => {
  const msg = error?.message?.toLowerCase() || "";
  return msg.includes("quota") || msg.includes("429") || msg.includes("resource_exhausted");
};

const handleGeminiError = (error: any, fallbackTitle: string) => {
  console.error(`Gemini API Error (${fallbackTitle}):`, error);
  
  if (isQuotaError(error)) {
    return {
      isError: true,
      type: 'QUOTA_EXCEEDED',
      message: "The Nexus Core is currently at peak capacity (API Quota Exceeded). Please wait a moment before requesting more data."
    };
  }
  
  return {
    isError: true,
    type: 'GENERAL_ERROR',
    message: "An unexpected anomaly occurred in the data stream. Please check your connection."
  };
};

const contentSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    introduction: { type: Type.STRING },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    deepDive: { 
      type: Type.STRING, 
      description: "A comprehensive, multi-paragraph scholarly essay. Focus on high-density theoretical information." 
    },
    curatedSubTopics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["title", "description"]
      },
      description: "Specialized research directions for high-level academic study."
    },
    industryUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          summary: { type: Type.STRING },
          date: { type: Type.STRING },
          imageKeyword: { type: Type.STRING }
        },
        required: ["headline", "summary", "date", "imageKeyword"]
      }
    },
    vizPrompt: { type: Type.STRING }
  },
  required: ["title", "introduction", "keyPoints", "deepDive", "curatedSubTopics", "industryUpdates", "vizPrompt"]
};

const conceptDetailSchema = {
  type: Type.OBJECT,
  properties: {
    explanation: { type: Type.STRING },
    suggestedPath: {
      type: Type.OBJECT,
      properties: {
        nextConcept: { type: Type.STRING },
        rationale: { type: Type.STRING },
        connectionType: { type: Type.STRING, enum: ['Prerequisite', 'Deep Dive', 'Evolution', 'Application'] }
      },
      required: ["nextConcept", "rationale", "connectionType"]
    },
    relatedConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    practicalApplication: { type: Type.STRING },
    historicalContext: { type: Type.STRING },
    imageKeyword: { type: Type.STRING }
  },
  required: ["explanation", "suggestedPath", "relatedConcepts", "practicalApplication", "historicalContext", "imageKeyword"]
};

export const fetchLearningContent = async (topic: Topic, level: Level): Promise<LearningContent | { isError: boolean, message: string }> => {
  if (!process.env.API_KEY) {
    return {
      title: "API Key Missing",
      introduction: "Please configure your API key to generate real-time content.",
      keyPoints: ["Check process.env.API_KEY", "Restart application"],
      deepDive: "Without an API key, we cannot fetch the latest scholarly articles from the Neural Core.",
      curatedSubTopics: [],
      industryUpdates: [],
      vizPrompt: "Explore the simulation freely."
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Optimized prompt for speed: removed massive word count requirements to lower latency
    const prompt = `Act as a Senior Research Fellow. Generate a high-fidelity study module for "${topic}" at the "${level}" academic level. 
    1. The 'introduction' should be a dense, informative scholarly opening (approx 150-200 words).
    2. The 'deepDive' section should be a concise but deep scholarly essay (approx 400-500 words). Focus on first principles and mathematical underpinnings. 
    3. Provide 4-5 'curatedSubTopics' for advanced specialization. 
    4. Ensure the tone is strictly academic and precise.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: contentSchema,
        systemInstruction: "You are the Nexus Neural Core. Deliver high-density scientific data quickly. Prioritize factual accuracy and academic tone."
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as LearningContent;
    }
    throw new Error("Empty response");
  } catch (error) {
    return handleGeminiError(error, "Learning Content") as any;
  }
};

export const fetchConceptExplanation = async (topic: Topic, level: Level, concept: string): Promise<ConceptDetail | { isError: boolean, message: string }> => {
  if (!process.env.API_KEY) {
    return { isError: true, message: "API Key required" } as any;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `Provide concise yet in-depth academic notes for the concept: "${concept}" within "${topic}" at a "${level}" level. 
    Detail its derivation, role in current paradigms, and a suggested Building block 'suggestedPath'.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: conceptDetailSchema,
        systemInstruction: "You are an advanced academic tutor. Deliver concise, high-impact technical explanations."
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ConceptDetail;
    }
    throw new Error("No text response");
  } catch (error) {
    return handleGeminiError(error, "Concept Explanation") as any;
  }
};

export interface ChatResponse {
  text: string;
  sources: { title: string; url: string }[];
  isError?: boolean;
}

export const chatWithTutor = async (
  history: Content[],
  message: string,
  isThinkingMode: boolean,
  topic: Topic,
  level: Level
): Promise<ChatResponse> => {
  if (!process.env.API_KEY) return { text: "I cannot reply without an API key.", sources: [], isError: true };

  const model = isThinkingMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: `You are an AI Tutor for ${topic} (${level}). Use search for live updates.`,
        tools: isThinkingMode ? [] : [{ googleSearch: {} }],
        thinkingConfig: isThinkingMode ? { thinkingBudget: 32768 } : undefined
      },
      history
    });

    const result = await chat.sendMessage({ message: message });
    const sources: { title: string; url: string }[] = [];
    
    if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      result.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, url: chunk.web.uri });
        }
      });
    }

    return { text: result.text || "", sources };
  } catch (error) {
    const err = handleGeminiError(error, "Chat");
    return { text: err.message, sources: [], isError: true };
  }
};
