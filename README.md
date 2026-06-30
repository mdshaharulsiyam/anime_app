# AniJikan 🎌

A full anime-discovery mobile app built with **Expo (SDK 56)** + **expo-router**, powered by the free [Jikan API](https://docs.api.jikan.moe/) (unofficial MyAnimeList API).

## Features

It's a **tracker**, not just a catalog — the reason people keep apps like MyAnimeList / AniList installed:

- **My List tracker** — save any anime and set a watch status (Watching / Plan to Watch / Completed / On Hold / Dropped). Filter chips with live counts.
- **Episode progress + "+1" button** — log finished episodes with one tap; a progress bar fills and the show auto-completes when you reach the final episode.
- **Live airing countdown** — for ongoing shows, a ticking "Next episode airs in 3h 12m", computed from Jikan's JST broadcast slot.
- **Watch Now smart-redirect** — one tap jumps to a Crunchyroll / YouTube / Google search for the exact title (the app is a launcher, it doesn't host video).

Plus browsing:

- **Discover** — featured airing carousel + five rails (Top Ranked, Most Popular, Currently Airing, Most Favorited, Coming Soon), each with **View all** → full infinite-scroll list.
- **Seasonal** — paginated grid of the current season and upcoming anime.
- **Search** — debounced title search with quick genre filters and infinite scroll.
- **Anime details** — backdrop, score/rank, stats, genres, expandable synopsis, info table, character cast, and fan recommendations, with trailer + MyAnimeList links.
- Dark, streaming-app UI with `expo-image` (blurhash placeholders) and a custom design-token theme.

## Tech

| Area | Choice |
| --- | --- |
| Framework | Expo SDK 56, React Native 0.85, React 19 |
| Navigation | expo-router (file-based, typed routes) |
| Data | Jikan v4 REST API via a throttled fetch client |
| Persistence | `@react-native-async-storage/async-storage` |
| Images | `expo-image` |
| Icons | `@expo/vector-icons` (Ionicons) |

## Project structure

```
app/
  _layout.tsx          # Root stack + providers (SafeArea, Favorites)
  (tabs)/
    _layout.tsx        # Bottom tab bar
    index.tsx          # Discover
    seasonal.tsx       # Seasonal grid
    search.tsx         # Search + genres
    favorites.tsx      # Saved anime
  anime/[id].tsx       # Anime detail screen
  +not-found.tsx
components/             # AnimeCard, AnimeCarousel, shared UI atoms
lib/
  api.ts               # Jikan client (rate-limit throttle + retry)
  types.ts             # Jikan response typings
  favorites.tsx        # AsyncStorage-backed favorites context
  hooks.ts             # useAsync + usePaginatedList
constants/theme.ts     # Colors, spacing, radius, typography tokens
```

## Notes on the API

Jikan is rate limited (~3 req/s, 60/min). `lib/api.ts` serializes all requests
through a single queue that enforces a minimum gap between calls and retries on
HTTP 429 with backoff — so screens that fire several requests stay within limits.

## Run it

```bash
npm install
npx expo start
```

Then press `a` (Android), `i` (iOS, macOS only), or scan the QR code with **Expo Go**.

> This project uses an `.npmrc` with `legacy-peer-deps=true` to smooth over a
> transitive `react` / `react-dom` peer mismatch in the current SDK.
