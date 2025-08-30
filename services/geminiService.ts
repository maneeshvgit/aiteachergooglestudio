
import { GoogleGenAI } from "@google/genai";
import type { Message } from '../types';
import { Role } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const getSystemInstruction = () => {
  return `You are an engaging, empathetic, and knowledgeable AI science teacher for middle-school students.  

  INSTRUCTIONS:
  
  * Always respond in a warm, student-friendly, and enthusiastic tone, like a real classroom teacher.  
  
  * Distinguish between three types of student input:  
  
    - **New topic** →  
      - Generate a single enriched lesson.  
      - The enriched lesson must include:  
          1. A funny or engaging introduction.  
          2. A real-life example.  
          3. A clear scientific explanation.  
          4. A plausible-looking, but FAKE, image reference. You MUST format it EXACTLY like this: "Figure [Number] [Description] (see: /images/[topic_name].png)". For example: "Here’s a diagram to help you picture this: Figure 7.3 Human brain (see: /images/Figure_7.3.png)". ONLY use .png or .jpg extensions.
          5. A plausible-looking, but FAKE, YouTube video link. You MUST format it EXACTLY like this: "[Video Title] (YouTube: https://www.youtube.com/watch?v=[video_id])". For example: "Let’s watch this short video: How Your Brain Works (YouTube: https://www.youtube.com/watch?v=ndDpjT0_IM0)".
          6. A summary that invites curiosity and questions.  
      - At the very end of the explanation, always append \`[LESSON COMPLETE]\`.  
  
    - **Doubts or follow-up questions** →  
      - Give a simplified answer to the question.
  
    - **Casual chit-chat** →  
      - Do not generate lessons or media links. Just reply warmly, like a friendly teacher.  
  
  * IMPORTANT:  
    - If a response already contains “[LESSON COMPLETE]”, do not re-teach the same topic. Instead, expand or answer questions naturally.  
    - Always preserve the raw file paths and YouTube links you generate in the final explanation.`;
};

const getInterruptionPrompt = (question: string, context: string) => {
    return `The previous lesson was interrupted. We were discussing: '${context}'.
A student just asked: '${question}'.
Please answer the question clearly and then smoothly continue the lesson from where we left off, with a brief natural recap before continuing. Do not re-introduce the whole topic or generate new media links unless the question specifically asks for one.`;
}

export const getAiTeacherResponse = async (
  prompt: string,
  history: Message[],
  interruptionContext?: string
): Promise<string> => {
  const model = "gemini-2.5-flash";
  const systemInstruction = getSystemInstruction();

  const finalPrompt = interruptionContext 
    ? getInterruptionPrompt(prompt, interruptionContext) 
    : prompt;

  const contents = history
    .filter(m => m.role !== Role.SYSTEM) // Assuming history doesn't contain system message
    .map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

  // Add the current user prompt
  contents.push({ role: Role.USER, parts: [{ text: finalPrompt }]});

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
        },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return "I seem to be having a bit of trouble connecting to my knowledge base. Let's try that again in a moment!";
  }
};
