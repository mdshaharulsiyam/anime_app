/**
 * "Smart redirect" links. We don't host video — instead we deep-link the user
 * straight to a search for the title on popular platforms, turning the app into
 * a fast launcher for wherever they actually watch.
 */
export interface StreamLink {
  key: string;
  label: string;
  icon: string; // Ionicons name
  color: string;
  url: string;
}

export function streamingLinks(title: string): StreamLink[] {
  const q = encodeURIComponent(title);
  const qWatch = encodeURIComponent(`${title} anime watch online`);
  return [
    {
      key: 'crunchyroll',
      label: 'Crunchyroll',
      icon: 'tv',
      color: '#F47521',
      url: `https://www.crunchyroll.com/search?q=${q}`,
    },
    {
      key: 'youtube',
      label: 'YouTube',
      icon: 'logo-youtube',
      color: '#FF0033',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} anime`)}`,
    },
    {
      key: 'google',
      label: 'Where to watch',
      icon: 'search',
      color: '#4285F4',
      url: `https://www.google.com/search?q=${qWatch}`,
    },
  ];
}
