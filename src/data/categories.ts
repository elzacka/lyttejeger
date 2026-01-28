import type { FilterOption } from '../types/podcast';

// Static categories from Podcast Index API
// Consolidated to remove duplicates - each Norwegian label appears only once
// When multiple English values map to same Norwegian label, we keep the most common one
// Sorted alphabetically by Norwegian label
export const allCategories: FilterOption[] = [
  { value: 'Alternative', label: 'Alternativt' },
  { value: 'Animation', label: 'Animasjon' },
  { value: 'Reviews', label: 'Anmeldelser' },
  { value: 'Astronomy', label: 'Astronomi' },
  { value: 'Kids', label: 'Barn' },
  { value: 'Baseball', label: 'Baseball' },
  { value: 'Basketball', label: 'Basketball' },
  { value: 'Automotive', label: 'Bil og motor' },
  { value: 'Tabletop', label: 'Brettspill' },
  { value: 'Wrestling', label: 'Bryting' },
  { value: 'Buddhism', label: 'Buddhisme' },
  { value: 'Books', label: 'Bøker' },
  { value: 'Cricket', label: 'Cricket' },
  { value: 'Journals', label: 'Dagbøker' },
  { value: 'Daily', label: 'Daglig' },
  { value: 'Design', label: 'Design' },
  { value: 'Documentary', label: 'Dokumentar' },
  { value: 'Drama', label: 'Drama' },
  { value: 'Animals', label: 'Dyr' },
  { value: 'Entrepreneurship', label: 'Entreprenørskap' },
  { value: 'Nutrition', label: 'Ernæring' },
  { value: 'After-Shows', label: 'Etterprat' },
  { value: 'Family', label: 'Familie' },
  { value: 'Fantasy', label: 'Fantasy' },
  { value: 'Fiction', label: 'Fiksjon' },
  { value: 'Film', label: 'Film' },
  { value: 'Philosophy', label: 'Filosofi' },
  { value: 'Relationships', label: 'Forhold' },
  { value: 'Parenting', label: 'Foreldreskap' },
  { value: 'Government', label: 'Forvaltning' },
  { value: 'Football', label: 'Fotball' },
  { value: 'Leisure', label: 'Fritid' },
  { value: 'Physics', label: 'Fysikk' },
  { value: 'Golf', label: 'Golf' },
  { value: 'Garden', label: 'Hage' },
  { value: 'Health', label: 'Helse' },
  { value: 'Health & Fitness', label: 'Helse og trening' },
  { value: 'Hinduism', label: 'Hinduisme' },
  { value: 'History', label: 'Historie' },
  { value: 'Stories', label: 'Historier' },
  { value: 'Home', label: 'Hjem' },
  { value: 'Hobbies', label: 'Hobbyer' },
  { value: 'Hockey', label: 'Hockey' },
  { value: 'Comedy', label: 'Humor' },
  { value: 'Crafts', label: 'Håndverk' },
  { value: 'Non-Profit', label: 'Ideelle org.' },
  { value: 'Improv', label: 'Improvisasjon' },
  { value: 'Interviews', label: 'Intervjuer' },
  { value: 'Investing', label: 'Investering' },
  { value: 'Islam', label: 'Islam' },
  { value: 'Earth', label: 'Jorda' },
  { value: 'Judaism', label: 'Jødedom' },
  { value: 'Careers', label: 'Karriere' },
  { value: 'Chemistry', label: 'Kjemi' },
  { value: 'Pets', label: 'Kjæledyr' },
  { value: 'Climate', label: 'Klima' },
  { value: 'Commentary', label: 'Kommentar' },
  { value: 'True Crime', label: 'Krim' },
  { value: 'Christianity', label: 'Kristendom' },
  { value: 'Cryptocurrency', label: 'Kryptovaluta' },
  { value: 'Culture', label: 'Kultur' },
  { value: 'Arts', label: 'Kunst' },
  { value: 'Courses', label: 'Kurs' },
  { value: 'Management', label: 'Ledelse' },
  { value: 'Life', label: 'Liv' },
  { value: 'Aviation', label: 'Luftfart' },
  { value: 'Running', label: 'Løping' },
  { value: 'Learning', label: 'Læring' },
  { value: 'Manga', label: 'Manga' },
  { value: 'Marketing', label: 'Markedsføring' },
  { value: 'Food', label: 'Mat' },
  { value: 'Mathematics', label: 'Matematikk' },
  { value: 'Medicine', label: 'Medisin' },
  { value: 'Mental', label: 'Mental helse' },
  { value: 'Fashion', label: 'Mote' },
  { value: 'Music', label: 'Musikk' },
  { value: 'Nature', label: 'Natur' },
  { value: 'News', label: 'Nyheter' },
  { value: 'Business', label: 'Næringsliv' },
  { value: 'Personal', label: 'Personlig' },
  { value: 'Politics', label: 'Politikk' },
  { value: 'Travel', label: 'Reise' },
  { value: 'Religion', label: 'Religion' },
  { value: 'Role-Playing', label: 'Rollespill' },
  { value: 'Rugby', label: 'Rugby' },
  { value: 'Society', label: 'Samfunn' },
  { value: 'Society & Culture', label: 'Samfunn og kultur' },
  { value: 'Performing', label: 'Scenekunst' },
  { value: 'Sexuality', label: 'Seksualitet' },
  { value: 'Self-Improvement', label: 'Selvutvikling' },
  { value: 'How-To', label: 'Slik gjør du' },
  { value: 'Beauty', label: 'Skjønnhet' },
  { value: 'Social', label: 'Sosialt' },
  { value: 'Games', label: 'Spill' },
  { value: 'Sports', label: 'Sport' },
  { value: 'Language', label: 'Språk' },
  { value: 'Stand-Up', label: 'Standup' },
  { value: 'Places', label: 'Steder' },
  { value: 'Swimming', label: 'Svømming' },
  { value: 'Technology', label: 'Teknologi' },
  { value: 'Tennis', label: 'Tennis' },
  { value: 'Fitness', label: 'Trening' },
  { value: 'TV', label: 'TV' },
  { value: 'Entertainment', label: 'Underholdning' },
  { value: 'Education', label: 'Utdanning' },
  { value: 'Video-Games', label: 'Videospill' },
  { value: 'Wilderness', label: 'Villmark' },
  { value: 'Visual', label: 'Visuell kunst' },
  { value: 'Science', label: 'Vitenskap' },
  { value: 'Volleyball', label: 'Volleyball' },
  { value: 'Weather', label: 'Vær' },
];

// Build lookup map for O(1) translation (lazily initialized)
let categoryLookup: Map<string, string> | null = null;

function getCategoryLookup(): Map<string, string> {
  if (!categoryLookup) {
    categoryLookup = new Map(allCategories.map((c) => [c.value, c.label]));
    // Add common API variations that map to same Norwegian label
    categoryLookup.set('Natural', 'Natur');
    categoryLookup.set('Soccer', 'Fotball');
  }
  return categoryLookup;
}

/**
 * Translate category name from English (API) to Norwegian
 * Returns the original name if no translation exists
 */
export function translateCategory(name: string): string {
  return getCategoryLookup().get(name) || name;
}
