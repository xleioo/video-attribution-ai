import { GoogleGenAI } from "@google/genai";
import { TagCategory, VideoAnalysisResult } from "../types";

export const analyzeVideoWithGemini = async (
  apiKey: string,
  base64Video: string,
  mimeType: string,
  taxonomy: TagCategory[]
): Promise<VideoAnalysisResult[]> => {
  const ai = new GoogleGenAI({ apiKey });

  // 1. Construct a structured description of the taxonomy for the model
  let taxonomyContext = "You must analyze the video against the following Content Tag Taxonomy (内容标签体系). This is a strict classification task.\n\n";
  const allTags: string[] = [];

  taxonomy.forEach((cat, index) => {
    taxonomyContext += `${index + 1}. Dimension: ${cat.name}\n`;
    taxonomyContext += `   Tags: [${cat.tags.join(', ')}]\n`;
    allTags.push(...cat.tags);
  });

  const prompt = `
    Role: You are a senior video content analyst for the beauty brand "Elixir" (怡丽丝尔).
    Task: Strictly analyze the visual and audio content of the uploaded short video and determine which tags from the provided taxonomy are present.

    ${taxonomyContext}

    Instructions:
    1. Review the video content frame by frame and listen to the audio.
    2. For EACH Dimension listed above, check if any of its specific Tags apply to this video.
    3. A tag should be marked as "detected" ONLY if there is clear visual or audio evidence.
    4. Be strict. Do not invent tags. Only use tags listed in the taxonomy.
    
    Output Format:
    Return a JSON object with a single property "detected_tags". This property must be an array of strings containing EXACTLY the tag names that were found in the video.
    
    Example Output:
    {
      "detected_tags": ["素人体验故事", "淡纹抚皱", "面部特写/按摩演示", "亲子家庭"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Efficient and capable for video understanding
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Video,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, // Low temperature for deterministic classification
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    console.log("Gemini Analysis Response:", text);

    let detectedTags: string[] = [];
    try {
        const json = JSON.parse(text);
        if (Array.isArray(json.detected_tags)) {
            detectedTags = json.detected_tags;
        } else if (Array.isArray(json)) {
            // Handle edge case where model might return just the array
            detectedTags = json;
        }
    } catch (e) {
        console.error("JSON Parse Error", e);
        // Fallback: try to find strings in quotes if JSON parse fails strictly
        const matches = text.match(/"([^"]+)"/g);
        if (matches) {
            detectedTags = matches.map(s => s.replace(/"/g, ''));
        }
    }
    
    // 2. Map the detected tags back to the full taxonomy list 
    // This ensures we have a result for EVERY tag in the system (True/False)
    const results: VideoAnalysisResult[] = allTags.map(tag => ({
      tag,
      detected: detectedTags.includes(tag),
    }));

    return results;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};