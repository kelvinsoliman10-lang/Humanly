
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, text } = req.body;
  const CLOUD_ACCOUNT_ID = process.env.VITE_CLOUDFLARE_ACCOUNT_ID;
  const CLOUD_API_TOKEN = process.env.VITE_CLOUDFLARE_API_TOKEN;
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

  try {
    let systemPrompt = "";
    if (action === 'detect') {
      systemPrompt = "Analyze the text and determine the probability (0-100%) that it was AI-generated. Return ONLY a JSON object: {\"score\": number, \"analysis\": \"string\", \"suspiciousPhrases\": [\"string\"]}";
    } else if (action === 'humanize') {
      systemPrompt = `Eres un Humanizador de Textos de Grado Profesional. 
      Tu misión es reescribir el texto para que parezca 100% humano, eliminando cualquier rastro de IA pero manteniendo la esencia, el formato y el tono original.
      REGLAS DE ORO:
      1. GRAMÁTICA PERFECTA: No inventes palabras ni rompas la estructura gramatical.
      2. CERO MULETILLAS: Prohibido usar "En fin", "La verdad es que", "Yo diría", etc.
      3. SERIEDAD: Si el texto es formal, la respuesta DEBE ser formal.
      4. FIDELIDAD: No añadas ni quites información. Solo cambia el estilo.
      Devuelve ÚNICAMENTE el texto humanizado.`;
    }

    // --- PRIORIDAD 1: GEMINI 1.5 FLASH (SI HAY API KEY) ---
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'TU_API_KEY_AQUI' && GEMINI_API_KEY.startsWith('AIza')) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nTEXTO A PROCESAR:\n${text}` }]
          }]
        })
      });

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        if (data.candidates && data.candidates[0].content) {
          const responseText = data.candidates[0].content.parts[0].text.trim();
          res.setHeader('X-AI-Engine', 'Gemini-1.5-Flash');
          return res.status(200).json({ response: responseText, engine: 'gemini' });
        }
      }
      console.warn("Gemini failing or empty response, falling back...");
    }

    // --- PRIORIDAD 2: CLOUDFLARE LLAMA 3.1 (FALLBACK) ---
    if (!CLOUD_ACCOUNT_ID || !CLOUD_API_TOKEN) {
      return res.status(500).json({ error: 'Missing AI credentials' });
    }

    const model = "@cf/meta/llama-3.1-8b-instruct";
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUD_ACCOUNT_ID}/ai/run/${model}`;

    const cfResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUD_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      })
    });

    if (!cfResponse.ok) {
      const errorText = await cfResponse.text();
      return res.status(cfResponse.status).json({ error: 'AI Error', details: errorText });
    }

    const result = await cfResponse.json();
    res.setHeader('X-AI-Engine', 'Cloudflare-Llama-3.1');
    return res.status(200).json({ response: result.result.response, engine: 'cloudflare' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
