import type { Episode } from '../types/podcast'

export const mockEpisodes: Episode[] = [
  // Aftenpodden episodes
  {
    id: 'ep1',
    podcastId: '1',
    title: 'Statsbudsjettet 2025: Vinnere og tapere',
    description: 'Vi analyserer statsbudsjettet og ser på hvem som kommer best ut. Økte skatter, kutt i bistand og mer til forsvar.',
    audioUrl: 'https://example.com/audio1.mp3',
    duration: 2400,
    publishedAt: '2024-12-06',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&h=300&fit=crop'
  },
  {
    id: 'ep2',
    podcastId: '1',
    title: 'Klimatoppmøtet i Dubai: Hva ble egentlig vedtatt?',
    description: 'COP28 er over. Vi oppsummerer de viktigste vedtakene om fossil energi, klimafinansiering og tap og skade.',
    audioUrl: 'https://example.com/audio2.mp3',
    duration: 1800,
    publishedAt: '2024-12-05'
  },
  {
    id: 'ep3',
    podcastId: '1',
    title: 'Kunstig intelligens i norsk arbeidsliv',
    description: 'Hvordan påvirker AI norske arbeidsplasser? Vi snakker med eksperter om automatisering, ChatGPT og fremtidens jobber.',
    audioUrl: 'https://example.com/audio3.mp3',
    duration: 2100,
    publishedAt: '2024-12-04'
  },

  // Teknologirådet episodes
  {
    id: 'ep4',
    podcastId: '2',
    title: 'GPT-5 og fremtiden for språkmodeller',
    description: 'OpenAI jobber med neste generasjon AI. Vi diskuterer hva vi kan forvente og hvilke etiske utfordringer som venter.',
    audioUrl: 'https://example.com/audio4.mp3',
    duration: 3600,
    publishedAt: '2024-12-05'
  },
  {
    id: 'ep5',
    podcastId: '2',
    title: 'Kvantecomputing: Fra teori til praksis',
    description: 'Google og IBM kjemper om kvantedominans. Vi forklarer hvordan kvantecomputere fungerer og hva de kan brukes til.',
    audioUrl: 'https://example.com/audio5.mp3',
    duration: 2700,
    publishedAt: '2024-12-01'
  },
  {
    id: 'ep6',
    podcastId: '2',
    title: 'Elbiler og batterirevolusjonen',
    description: 'Nye batteriteknologier lover lengre rekkevidde og raskere lading. Vi ser på solid-state batterier og natriumbatterier.',
    audioUrl: 'https://example.com/audio6.mp3',
    duration: 2400,
    publishedAt: '2024-11-28'
  },

  // True Crime Norge episodes
  {
    id: 'ep7',
    podcastId: '3',
    title: 'Orderud-saken: 25 år etter',
    description: 'Vi ser tilbake på en av Norges mest omtalte kriminalsaker. Nye teorier og ubesvarte spørsmål.',
    audioUrl: 'https://example.com/audio7.mp3',
    duration: 4200,
    publishedAt: '2024-12-04'
  },
  {
    id: 'ep8',
    podcastId: '3',
    title: 'Mysteriet på Hisøy',
    description: 'En uløst forsvinningssak fra 1990-tallet. Vi snakker med etterforskere og pårørende.',
    audioUrl: 'https://example.com/audio8.mp3',
    duration: 3600,
    publishedAt: '2024-12-01'
  },

  // Heia Fotball episodes
  {
    id: 'ep9',
    podcastId: '6',
    title: 'Premier League: Tittelkampen tilspisser seg',
    description: 'Arsenal, Liverpool og Manchester City kjemper om gullet. Vi analyserer lagenes sjanser og svakheter.',
    audioUrl: 'https://example.com/audio9.mp3',
    duration: 3000,
    publishedAt: '2024-12-06'
  },
  {
    id: 'ep10',
    podcastId: '6',
    title: 'Haaland vs Mbappé: Hvem er best?',
    description: 'To av verdens beste spillere sammenlignes. Statistikk, spillestil og fremtidsutsikter.',
    audioUrl: 'https://example.com/audio10.mp3',
    duration: 2400,
    publishedAt: '2024-12-03'
  },
  {
    id: 'ep11',
    podcastId: '6',
    title: 'Norsk fotball i krise?',
    description: 'Landslaget sliter og klubbene taper i Europa. Hva må til for å snu trenden?',
    audioUrl: 'https://example.com/audio11.mp3',
    duration: 2700,
    publishedAt: '2024-11-30'
  },

  // Psykologlunsj episodes
  {
    id: 'ep12',
    podcastId: '7',
    title: 'Angst i hverdagen: Når bekymring tar overhånd',
    description: 'Vi snakker om generalisert angstlidelse, panikkanfall og hvordan du kan håndtere angsten din.',
    audioUrl: 'https://example.com/audio12.mp3',
    duration: 2100,
    publishedAt: '2024-12-02'
  },
  {
    id: 'ep13',
    podcastId: '7',
    title: 'Parforhold: Kommunikasjon og konflikt',
    description: 'Hvorfor krangler vi med partneren vår? Tips for bedre kommunikasjon og konfliktløsning.',
    audioUrl: 'https://example.com/audio13.mp3',
    duration: 2400,
    publishedAt: '2024-11-25'
  },

  // Historiepodden episodes
  {
    id: 'ep14',
    podcastId: '9',
    title: 'Vikingenes Amerika-reiser',
    description: 'Leiv Eiriksson oppdaget Amerika 500 år før Columbus. Vi utforsker de norrøne bosettingene i Vinland.',
    audioUrl: 'https://example.com/audio14.mp3',
    duration: 3000,
    publishedAt: '2024-12-01'
  },
  {
    id: 'ep15',
    podcastId: '9',
    title: 'Svartedauden: Pesten som forandret Europa',
    description: 'Hvordan en bakterie drepte halvparten av Europas befolkning og endret samfunnet for alltid.',
    audioUrl: 'https://example.com/audio15.mp3',
    duration: 2700,
    publishedAt: '2024-11-28'
  },
  {
    id: 'ep16',
    podcastId: '9',
    title: 'Andre verdenskrig: Norges rolle',
    description: 'Fra 9. april til frigjøringen. Vi ser på okkupasjonen, motstandskampen og landssvikoppgjøret.',
    audioUrl: 'https://example.com/audio16.mp3',
    duration: 3600,
    publishedAt: '2024-11-20'
  },

  // Startup Stories episodes
  {
    id: 'ep17',
    podcastId: '10',
    title: 'Kahoot: Fra norsk startup til global suksess',
    description: 'Historien om hvordan et lite norsk selskap revolusjonerte læring og ble verdt milliarder.',
    audioUrl: 'https://example.com/audio17.mp3',
    duration: 2400,
    publishedAt: '2024-12-04'
  },
  {
    id: 'ep18',
    podcastId: '10',
    title: 'Hvordan skaffe investorer til din startup',
    description: 'Tips fra erfarne gründere om pitching, due diligence og forhandling med investorer.',
    audioUrl: 'https://example.com/audio18.mp3',
    duration: 2100,
    publishedAt: '2024-11-27'
  },

  // Matprat episodes
  {
    id: 'ep19',
    podcastId: '12',
    title: 'Julematen: Tradisjoner og nye vrier',
    description: 'Ribbe, pinnekjøtt eller lutefisk? Vi diskuterer norske juletradisjoner og moderne alternativer.',
    audioUrl: 'https://example.com/audio19.mp3',
    duration: 1800,
    publishedAt: '2024-12-03'
  },
  {
    id: 'ep20',
    podcastId: '12',
    title: 'Fermentering: Kimchi, kombucha og surdeig',
    description: 'Den gamle konserveringsmetoden er tilbake. Vi lærer deg å lage fermentert mat hjemme.',
    audioUrl: 'https://example.com/audio20.mp3',
    duration: 2100,
    publishedAt: '2024-11-25'
  }
]
