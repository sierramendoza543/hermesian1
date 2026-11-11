export const GAMES = {
  newsdle: {
    key: 'newsdle',
    title: 'Newsdle',
    tagline: 'Guess the word the headlines keep using.',
    description: 'A word puzzle built from the top story. Six tries.',
    color: '#059669',
    href: '/games/newsdle',
  },
  sort: {
    key: 'sort',
    title: 'Story Sort',
    tagline: 'Sort 16 words into the 4 stories they came from.',
    description: 'A connections-style puzzle across today\'s biggest stories.',
    color: '#7c3aed',
    href: '/games/sort',
  },
  quiz: {
    key: 'quiz',
    title: 'Quick Quiz',
    tagline: 'Five easy questions on any story.',
    description: 'Skim a story, then see what stuck.',
    color: '#966c6b',
    href: '/games/quiz',
  },
} as const

export type GameKey = keyof typeof GAMES
