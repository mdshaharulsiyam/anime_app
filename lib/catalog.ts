/**
 * Catalog of browsable anime categories. Each entry knows how to fetch a given
 * page from Jikan, so the same definition powers both the Discover carousels
 * (page 1) and the full paginated "View all" list screen.
 */
import { jikan } from './api';
import { Anime, JikanList } from './types';

export type CategoryKey =
  | 'top'
  | 'popular'
  | 'airing'
  | 'favorite'
  | 'upcoming';

export interface Category {
  key: CategoryKey;
  title: string;
  subtitle: string;
  fetcher: (page: number) => Promise<JikanList<Anime>>;
}

export const CATEGORIES: Record<CategoryKey, Category> = {
  top: {
    key: 'top',
    title: 'Top Ranked',
    subtitle: 'Highest rated of all time',
    fetcher: (page) => jikan.topAnime(page),
  },
  popular: {
    key: 'popular',
    title: 'Most Popular',
    subtitle: 'What everyone is watching',
    fetcher: (page) => jikan.topAnime(page, 'bypopularity'),
  },
  airing: {
    key: 'airing',
    title: 'Currently Airing',
    subtitle: 'Trending this week',
    fetcher: (page) => jikan.topAnime(page, 'airing'),
  },
  favorite: {
    key: 'favorite',
    title: 'Most Favorited',
    subtitle: 'All-time fan favorites',
    fetcher: (page) => jikan.topAnime(page, 'favorite'),
  },
  upcoming: {
    key: 'upcoming',
    title: 'Coming Soon',
    subtitle: 'Upcoming releases',
    fetcher: (page) => jikan.seasonUpcoming(page),
  },
};

export function getCategory(key: string | undefined): Category | null {
  if (key && key in CATEGORIES) return CATEGORIES[key as CategoryKey];
  return null;
}
