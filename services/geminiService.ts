/**
 * Checks if the Gemini API key is provided in the environment variables.
 */
export function isApiKeyConfigured(): boolean {
  const apiKey = process.env.API_KEY;
  return !!apiKey && apiKey.length > 0;
}

// The proxy endpoint for the Gemini API
const API_URL = '/api-proxy/v1beta/models/gemini-2.5-flash:generateContent';


/**
 * A helper function to call the Gemini API via the backend proxy.
 * @param prompt The text prompt to send to the model.
 * @returns The text response from the model.
 */
async function generateGeminiContent(prompt: string): Promise<string> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ "text": prompt }]
        }]
      }),
    });

    if (!response.ok) {
        // Try to get more detailed error from the response body
        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error("API request failed:", response.status, response.statusText, errorBody);
        const details = (errorBody.error && errorBody.error.message) || errorBody.details || JSON.stringify(errorBody);
        throw new Error(`${details}`);
    }

    const data = await response.json();
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || text.trim().length === 0) {
      console.error("Invalid or empty response from API:", data);
      throw new Error("API가 비어있거나 유효하지 않은 응답을 반환했습니다.");
    }
    return text.trim();
  } catch (error) {
    console.error("Error calling Gemini API via proxy:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini API와의 통신에 실패했습니다. (오류: ${errorMessage})`);
  }
}


/**
 * Fetches a random Korean noun from the Gemini API to start the game.
 */
export async function getRandomKoreanWord(): Promise<string> {
  try {
    // A more creative prompt to generate diverse and interesting starting words.
    const prompt = "다음 카테고리 중 하나에서 흥미로운 한국어 명사 단어 하나만 무작위로 알려줘: [우주, 바다, 신화, 과학, 예술, 역사, 음식, 기술]. 설명이나 다른 텍스트 없이 오직 단어만 응답해야 해.";
    const word = await generateGeminiContent(prompt);
    
    // The API might sometimes add quotes or other characters, so we clean the response.
    return word.replace(/["'.]/g, '').trim();
  } catch (error) {
    console.error("API로부터 시작 단어를 가져오는 데 실패했습니다:", error);
    // Re-throw all errors to be displayed on the UI. The game cannot start without the API.
    throw error;
  }
}

/**
 * Calculates the cosine similarity between two words using the Gemini API.
 * @param word1 The first word.
 * @param word2 The second word.
 * @returns A similarity score between -1 and 1.
 */
export async function calculateSimilarity(word1: string, word2: string): Promise<number> {
  try {
    const prompt = `두 단어 "${word1}"와(과) "${word2}" 사이의 코사인 유사도 점수를 계산해줘. 응답은 오직 부동 소수점 숫자(예: 0.7543)만 포함해야 해. 다른 텍스트나 설명은 붙이지 마.`;
    const text = await generateGeminiContent(prompt);

    // Extract the first floating-point number from the API's response.
    const numberMatch = text.match(/-?(\d+(\.\d+)?)/);
    
    if (numberMatch && numberMatch[0]) {
      const similarity = parseFloat(numberMatch[0]);
      if (!isNaN(similarity) && isFinite(similarity)) {
        // Clamp the value between -1 and 1.
        return Math.max(-1, Math.min(1, similarity));
      }
    }
    
    console.error(`Failed to parse similarity score from response: "${text}"`);
    throw new Error("모델로부터 유효한 유사도 점수를 파싱할 수 없습니다.");

  } catch (error) {
    console.error(`Error calculating similarity between ${word1} and ${word2}:`, error);
    // Re-throw the error so it can be displayed in the game UI.
    if (error instanceof Error) {
        throw error;
    }
    // Fallback for unknown error types.
    throw new Error("유사도 계산 중 알 수 없는 오류가 발생했습니다.");
  }
}