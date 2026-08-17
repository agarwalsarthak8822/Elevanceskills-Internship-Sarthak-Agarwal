const LINGVA_URL = process.env.LINGVA_URL || "https://lingva.ml";
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

const buildLibreHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (process.env.LIBRETRANSLATE_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.LIBRETRANSLATE_API_KEY}`;
  }
  return headers;
};

const translateWithLingva = async (text, targetLanguage) => {
  const encoded = encodeURIComponent(text);
  const response = await fetch(
    `${LINGVA_URL}/api/v1/auto/${targetLanguage}/${encoded}`
  );

  if (!response.ok) {
    throw new Error(`Lingva translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data?.translation) {
    throw new Error("Lingva returned an empty translation");
  }

  return data.translation;
};

const translateWithMyMemory = async (text, targetLanguage) => {
  const params = new URLSearchParams({
    q: text,
    langpair: `auto|${targetLanguage}`,
  });

  const response = await fetch(`${MYMEMORY_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`MyMemory translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  const translatedText = data?.responseData?.translatedText;

  if (!translatedText) {
    throw new Error("MyMemory returned an empty translation");
  }

  return translatedText;
};

const translateWithLibreTranslate = async (
  text,
  targetLanguage,
  sourceLanguage = "auto"
) => {
  const libreUrl = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";

  const response = await fetch(`${libreUrl}/translate`, {
    method: "POST",
    headers: buildLibreHeaders(),
    body: JSON.stringify({
      q: text,
      source: sourceLanguage,
      target: targetLanguage,
      format: "text",
    }),
  });

  if (!response.ok) {
    throw new Error(`LibreTranslate failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data?.translatedText) {
    throw new Error("LibreTranslate returned an empty translation");
  }

  return data.translatedText;
};

export const detectLanguage = async () => "auto";

export const translateText = async (text, targetLanguage) => {
  const providers = [
    () => translateWithLingva(text, targetLanguage),
    () => translateWithMyMemory(text, targetLanguage),
  ];

  if (process.env.LIBRETRANSLATE_API_KEY) {
    providers.unshift(() =>
      translateWithLibreTranslate(text, targetLanguage, "auto")
    );
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      lastError = error;
      console.warn("Translation provider failed:", error.message);
    }
  }

  throw lastError || new Error("All translation providers failed");
};
