import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  // @ts-ignore
  if (import.meta.env.VITE_GEMINI_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  return "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function analyzeFeedback(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this citizen feedback and return ONLY a valid JSON object with no extra text: 
    Feedback: '${text}' 
    Return format: { 
      "sentiment_label": "Positive|Neutral|Negative", 
      "sentiment_score": float -1 to 1, 
      "priority_score": float 0 to 10, 
      "is_urgent": boolean, 
      "category": "Water|Roads|Garbage|Electricity|Other",
      "cluster_suggestion": "one word topic" 
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment_label: { type: Type.STRING },
          sentiment_score: { type: Type.NUMBER },
          priority_score: { type: Type.NUMBER },
          is_urgent: { type: Type.BOOLEAN },
          category: { type: Type.STRING },
          cluster_suggestion: { type: Type.STRING }
        },
        required: ["sentiment_label", "sentiment_score", "priority_score", "is_urgent", "category", "cluster_suggestion"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateClusterSummary(topic: string, feedbacks: string[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a civic analyst. Given these citizen feedbacks about ${topic}: 
    ${feedbacks.join('\n')}
    Provide: 
    1) A 2-sentence summary of the core issue. 
    2) Top 3 actionable recommendations for city officials. 
    3) Urgency level: Low/Medium/High/Critical. 
    Return as plain readable text.`,
  });

  return response.text;
}
