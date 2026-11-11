export const GAMES = {
  newsdle: {
    key: 'newsdle',
    title: 'Newsdle',
    tagline: 'Daily word puzzle from the news. Play unlimited too.',
    description: 'A new word every day (ET), plus unlimited rounds.',
    color: '#059669',
    href: '/games/newsdle',
  },
  sort: {
    key: 'sort',
    title: 'Story Sort',
    tagline: 'Daily connections puzzle. Play unlimited too.',
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
