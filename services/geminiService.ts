import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not defined");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeAudio = async (
  audioBlob: Blob,
  prompt: string = "Please provide a detailed summary of the audio content, identifying speakers if possible and the general mood."
): Promise<string> => {
  try {
    const client = getGeminiClient();
    
    // Convert Blob to Base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
    });
    
    reader.readAsDataURL(audioBlob);
    const base64Data = await base64Promise;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/wav',
              data: base64Data,
            },
          },
        ],
      },
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze audio. Please check your API key and connection.");
  }
};
