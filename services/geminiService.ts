import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: API Key must be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMonsterLore = async (monsterName: string, location: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a single, short, intense sentence describing a hostile ${monsterName} appearing in the ${location}. Do not use quotes.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return `A wild ${monsterName} appears!`;
  }
};

export const generateCastleTaunt = async (ownerName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, arrogant taunt from a castle lord named ${ownerName} to a challenger. Max 20 words.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I am the lord of this castle! Begone!";
  }
};
