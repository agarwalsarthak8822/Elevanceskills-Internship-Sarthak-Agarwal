const LINGVA_URL = process.env.LINGVA_URL || "https://lingva.ml";
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

const buildLibreHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (process.env.LIBRETRANSLATE_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.LIBRETRANSLATE_API_KEY}`;
  }
  return headers;
};

// Lightweight, dependency-free language detection based on the Unicode script
// of the text. Good enough to give MyMemory a concrete source language and to
// surface a meaningful "detected language" to the user. Falls back to English.
export const detectLanguage = (text = "") => {
  if (/[ऀ-ॿ]/.test(text)) return "hi"; // Devanagari (Hindi/Marathi)
  if (/[஀-௿]/.test(text)) return "ta"; // Tamil
  if (/[ఀ-౿]/.test(text)) return "te"; // Telugu
  if (/[ಀ-೿]/.test(text)) return "kn"; // Kannada
  if (/[ഀ-ൿ]/.test(text)) return "ml"; // Malayalam
  if (/[ঀ-৿]/.test(text)) return "bn"; // Bengali
  if (/[਀-੿]/.test(text)) return "pa"; // Gurmukhi (Punjabi)
  if (/[؀-ۿ]/.test(text)) return "ar"; // Arabic
  if (/[Ѐ-ӿ]/.test(text)) return "ru"; // Cyrillic (Russian)
  if (/[぀-ヿ]/.test(text)) return "ja"; // Hiragana/Katakana (Japanese)
  if (/[가-힯]/.test(text)) return "ko"; // Hangul (Korean)
  if (/[一-鿿]/.test(text)) return "zh"; // CJK Han (Chinese)
  return "en";
};

const translateWithLingva = async (text, targetLanguage, sourceLanguage) => {
  const source = sourceLanguage || "auto";
  const encoded = encodeURIComponent(text);
  const response = await fetch(
    `${LINGVA_URL}/api/v1/${source}/${targetLanguage}/${encoded}`
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

const translateWithMyMemory = async (
  text,
  targetLanguage,
  sourceLanguage = "en"
) => {
  // MyMemory requires a concrete source language — "auto" is rejected.
  const params = new URLSearchParams({
    q: text,
    langpair: `${sourceLanguage}|${targetLanguage}`,
  });

  const response = await fetch(`${MYMEMORY_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`MyMemory translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  const translatedText = data?.responseData?.translatedText;

  if (!translatedText || data?.responseStatus >= 400) {
    throw new Error("MyMemory returned an empty translation");
  }

  return translatedText;
};

const translateWithLibreTranslate = async (
  text,
  targetLanguage,
  sourceLanguage = "auto"
) => {
  const libreUrl =
    process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";

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

export const translateText = async (text, targetLanguage, sourceLanguage) => {
  const source = sourceLanguage || detectLanguage(text);

  // Nothing to translate if the text is already in the target language.
  if (source && source === targetLanguage) {
    return text;
  }

  const providers = [];

  // Prefer LibreTranslate when it is configured (self-host or an API key).
  if (process.env.LIBRETRANSLATE_URL || process.env.LIBRETRANSLATE_API_KEY) {
    providers.push(() =>
      translateWithLibreTranslate(text, targetLanguage, "auto")
    );
  }

  // Lingva (public Google Translate front-end) supports auto source.
  providers.push(() => translateWithLingva(text, targetLanguage, source));

  // MyMemory works with no key but needs a concrete source language.
  providers.push(() => translateWithMyMemory(text, targetLanguage, source));

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
