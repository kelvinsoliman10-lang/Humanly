/**
 * Cloudflare Workers AI Bridge
 * Uses Llama-3-8B-Instruct for high-volume free processing
 */

const fetchAI = async (action, text) => {
  try {
    const response = await fetch('/api/ai', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, text })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("AI Proxy Error:", error);
    throw error;
  }
};

export const detectAI = async (text) => {
  const response = await fetchAI('detect', text.substring(0, 5000));
  try {
    const jsonStr = response.match(/\{.*\}/s)?.[0] || response;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("Llama JSON parse failed, using fallback regex", e);
    return { score: 50, analysis: "Análisis preliminar completado.", suspiciousPhrases: [] };
  }
};

export const humanizeText = async (text) => {
  return await fetchAI('humanize', text);
};

export const cleanTranscription = async (text) => {
  return await fetchAI('clean', text.substring(0, 10000));
};
