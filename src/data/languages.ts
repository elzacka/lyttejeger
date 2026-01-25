// Available language filters for the UI
export const allLanguages = ['Norsk', 'Engelsk', 'Svensk', 'Dansk'];

// Mapping from English language names (from API) to Norwegian
const languageToNorwegian: Record<string, string> = {
  // English names
  'English': 'Engelsk',
  'Norwegian': 'Norsk',
  'Swedish': 'Svensk',
  'Danish': 'Dansk',
  'German': 'Tysk',
  'French': 'Fransk',
  'Spanish': 'Spansk',
  'Italian': 'Italiensk',
  'Portuguese': 'Portugisisk',
  'Dutch': 'Nederlandsk',
  'Polish': 'Polsk',
  'Russian': 'Russisk',
  'Japanese': 'Japansk',
  'Chinese': 'Kinesisk',
  'Korean': 'Koreansk',
  'Arabic': 'Arabisk',
  'Hindi': 'Hindi',
  'Finnish': 'Finsk',
  'Icelandic': 'Islandsk',

  // ISO 639-1 two-letter codes
  'en': 'Engelsk',
  'no': 'Norsk',
  'nb': 'Norsk',
  'nn': 'Norsk',
  'sv': 'Svensk',
  'da': 'Dansk',
  'de': 'Tysk',
  'fr': 'Fransk',
  'es': 'Spansk',
  'it': 'Italiensk',
  'pt': 'Portugisisk',
  'nl': 'Nederlandsk',
  'pl': 'Polsk',
  'ru': 'Russisk',
  'ja': 'Japansk',
  'zh': 'Kinesisk',
  'ko': 'Koreansk',
  'ar': 'Arabisk',
  'hi': 'Hindi',
  'fi': 'Finsk',
  'is': 'Islandsk',
};

/**
 * Convert language name or code to Norwegian
 * @param language - Language name (e.g., "English") or code (e.g., "en")
 * @returns Norwegian language name, or original if no mapping exists
 */
export function toNorwegianLanguage(language: string | undefined): string {
  if (!language) return '';

  // Try direct lookup (case-insensitive)
  const normalized = language.toLowerCase();
  const exactMatch = Object.entries(languageToNorwegian).find(
    ([key]) => key.toLowerCase() === normalized
  );

  if (exactMatch) return exactMatch[1];

  // If already in Norwegian, return as-is
  if (allLanguages.includes(language)) return language;

  // Return original if no mapping found
  return language;
}
