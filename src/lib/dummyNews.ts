export interface Article {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  url?: string;
  imageURL: string;
  category: 'Politics' | 'Science' | 'Culture';
}

export const getDummyNews = (): Article[] => [
  {
    id: '1',
    title: 'New Study Reveals Impact of Climate Change on Coastal Cities',
    source: 'Science Daily',
    date: '2024-04-26',
    summary: 'A comprehensive study shows rising sea levels could affect millions of people living in coastal areas by 2050.',
    imageURL: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=800&auto=format&fit=crop',
    category: 'Science',
  },
  {
    id: '2',
    title: 'Global Leaders Meet to Discuss Economic Recovery Plans',
    source: 'World News',
    date: '2024-04-25',
    summary: 'International summit focuses on post-pandemic economic strategies and sustainable development goals.',
    imageURL: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
    category: 'Politics',
  },
  {
    id: '3',
    title: 'Art Exhibition Celebrates Cultural Diversity',
    source: 'Culture Weekly',
    date: '2024-04-24',
    summary: 'Major art exhibition showcasing works from over 50 countries opens in New York.',
    imageURL: 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=800&auto=format&fit=crop',
    category: 'Culture',
  },
  {
    id: '4',
    title: 'Breakthrough in Quantum Computing Research',
    source: 'Tech News',
    date: '2024-04-23',
    summary: 'Scientists achieve quantum supremacy with new processing method.',
    imageURL: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop',
    category: 'Science',
  },
  {
    id: '5',
    title: 'New Policy Framework for Digital Privacy',
    source: 'Policy Review',
    date: '2024-04-22',
    summary: 'Government introduces comprehensive digital privacy legislation.',
    imageURL: 'https://images.unsplash.com/photo-1550751827-4e0e9d3c5b0a?q=80&w=800&auto=format&fit=crop',
    category: 'Politics',
  },
]; 