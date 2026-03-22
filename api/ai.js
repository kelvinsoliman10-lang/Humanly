
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, text } = req.body;
  const ACCOUNT_ID = process.env.VITE_CLOUDFLARE_ACCOUNT_ID;
  const API_TOKEN = process.env.VITE_CLOUDFLARE_API_TOKEN;

  if (!ACCOUNT_ID || !API_TOKEN) {
    return res.status(500).json({ error: 'Cloudflare credentials not configured' });
  }

  try {
    let systemPrompt = "";
    let userPrompt = text;

    if (action === 'detect') {
      systemPrompt = "Analyze the text and determine the probability (0-100%) that it was AI-generated. Return ONLY a JSON object: {\"score\": number, \"analysis\": \"string\", \"suspiciousPhrases\": [\"string\"]}";
    } else if (action === 'humanize') {
      systemPrompt = `Eres un experto corrector de estilo y humanizador de textos. 
      Tu objetivo es REESCRIBIR el texto para que pase como 100% humano, cumpliendo estas reglas estrictas:
      1. COHERENCIA DE TONO: Si el texto original es formal o académico, la versión humanizada DEBE ser formal y profesional. No uses muletillas casuales como "En fin" o "Yo diría que" si no encajan con el contexto.
      2. PRESERVACIÓN DEL FORMATO: Mantén cada salto de línea, espacio y signo de puntuación estructural exactamente como en el original.
      3. FLUIDEZ NATURAL: Varía la estructura de las oraciones para evitar la monotonía robótica, pero mantén el significado exacto.
      4. SIN RELLENO: No añadidas frases introductorias ni conclusiones que no estuvieran en el original.
      
      Devuelve ÚNICAMENTE el texto procesado.`;
    }

    const model = "@cf/meta/llama-3-8b-instruct";
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${model}`;

    const cfResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!cfResponse.ok) {
      const errorText = await cfResponse.text();
      return res.status(cfResponse.status).json({ error: 'Cloudflare error', details: errorText });
    }

    const result = await cfResponse.json();
    return res.status(200).json({ response: result.result.response });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
