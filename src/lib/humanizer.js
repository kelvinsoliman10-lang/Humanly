/**
 * Minimal Local Humanizer (Fallback only)
 * This is only used if the main AI API fails.
 * It performs basic synonym swapping without injecting conversational noise.
 */

export const humanize = (text) => {
  if (!text) return "";
  
  let result = text.trim();
  
  // Basic synonym swaps to add variety without breaking grammar
  const pairs = [
    ["importante", "crucial"],
    ["fundamental", "esencial"],
    ["problema", "inconveniente"],
    ["desarrollar", "generar"],
    ["utilizar", "emplear"],
    ["ayudar", "colaborar"],
    ["objetivo", "propósito"],
    ["proporciona", "aporta"]
  ];

  pairs.forEach(([oldWord, newWord]) => {
    const regex = new RegExp(`\\b${oldWord}\\b`, 'gi');
    result = result.replace(regex, newWord);
  });

  return result;
};
