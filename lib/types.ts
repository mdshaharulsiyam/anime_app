/**
 * Minimal typings for the parts of the Jikan v4 (MyAnimeList) API we consume.
 * Docs: https://docs.api.jikan.moe/
 */
export interface JikanImage {
  jpg: { image_url: string; small_image_url: string; large_image_url: string };
  webp: { image_url: string; small_image_url: string; large_image_url: string };
}

export interface NamedEntity {
  mal_id: number;
  type?: string;
  name: string;
  url?: string;
}

export interface Anime {
  mal_id: number;
  url: string;
  images: JikanImage;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  source: string | null;
  episodes: number | null;
  status: string | null;
  airing: boolean;
  duration: string | null;
  rating: string | null;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  background: string | null;
  season: string | null;
  year: number | null;
  genres: NamedEntity[];
  themes: NamedEntity[];
  studios: NamedEntity[];
  trailer?: { youtube_id: string | null; url: string | null };
  aired?: { from: string | null; to: string | null; string: string | null };
}

export interface CharacterEntry {
  character: {
    mal_id: number;
    name: string;
    images: JikanImage;
  };
  role: string;
  voice_actors: {
    person: { mal_id: number; name: string; images: JikanImage };
    language: string;
  }[];
}

export interface Recommendation {
  entry: {
    mal_id: number;
    title: string;
    images: JikanImage;
  };
  votes?: number;
}

export interface Pagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items?: { count: number; total: number; per_page: number };
}

export interface JikanList<T> {
  data: T[];
  pagination: Pagination;
}

export interface JikanSingle<T> {
  data: T;
}
