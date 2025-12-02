import { GoogleGenAI, Type } from "@google/genai";
import { Language, SubtitleItem } from "../types";

export const generateBilingualSubtitles = async (
  file: File,
  targetLanguage: Language,
  onStatusUpdate?: (status: string) => void
): Promise<SubtitleItem[]> => {
  
  // Initialize client inside the function to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash";

  try {
    // 1. Upload the file using the Files API
    if (onStatusUpdate) onStatusUpdate("Uploading video to Gemini...");
    
    // Ensure we have a valid mimeType. Browsers sometimes return empty string for recognized types.
    const mimeType = file.type || "video/mp4"; 

    const uploadResult = await ai.files.upload({
      file: file,
      config: {
        displayName: file.name,
        mimeType: mimeType,
      },
    });

    // Safely retrieve the file metadata. 
    // The SDK structure can vary; sometimes it's wrapped in { file: ... }, sometimes it's direct.
    // @ts-ignore
    const uploadedFile = uploadResult.file ?? uploadResult;

    if (!uploadedFile || !uploadedFile.uri) {
        console.error("Unexpected upload result:", uploadResult);
        throw new Error("Failed to upload file: URI is missing from response.");
    }

    const fileUri = uploadedFile.uri;
    const fileName = uploadedFile.name; // The resource name (e.g., files/...)

    // 2. Poll for processing state
    if (onStatusUpdate) onStatusUpdate("Processing video...");
    
    let fileState = uploadedFile.state;
    while (fileState === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fileStatus = await ai.files.get({ name: fileName });
      
      // Safely access file status
      // @ts-ignore
      const currentFile = fileStatus.file ?? fileStatus;
      fileState = currentFile.state;
      
      if (fileState === "FAILED") {
        throw new Error("Video processing failed on Gemini servers.");
      }
    }

    // 3. Generate Subtitles
    if (onStatusUpdate) onStatusUpdate("Generating subtitles...");

    const prompt = `
      You are an expert subtitle generator and translator.
      Task:
      1. Analyze the audio in the provided video file.
      2. Transcribe the spoken content accurately.
      3. The user has selected the target language preference: ${targetLanguage}.
      4. STRICTLY output bilingual subtitles (English and Chinese).
         - Determine the language of the audio.
         - 'originalText': The transcription of what was actually said.
         - 'translatedText': The translation into the OTHER language (English <-> Chinese).
         - Example: If audio is English, 'originalText' is English, 'translatedText' is Chinese.
         - Example: If audio is Chinese, 'originalText' is Chinese, 'translatedText' is English.
      5. Generate precise timestamps (HH:MM:SS,mmm).
      
      Output Format:
      Return a valid JSON array of objects.
    `;

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.STRING, description: "Start time in HH:MM:SS,mmm format" },
          endTime: { type: Type.STRING, description: "End time in HH:MM:SS,mmm format" },
          originalText: { type: Type.STRING, description: "The transcribed text from the audio" },
          translatedText: { type: Type.STRING, description: "The translated text" }
        },
        required: ["startTime", "endTime", "originalText", "translatedText"]
      }
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            fileData: {
              mimeType: mimeType,
              fileUri: fileUri
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1
      }
    });

    if (response.text) {
      try {
        const data = JSON.parse(response.text);
        return data as SubtitleItem[];
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.log("Raw Response:", response.text);
        throw new Error("Failed to parse generated subtitles.");
      }
    }
    
    throw new Error("No content generated.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};