# Shiori 🎌

**A full anime tracker & discovery app built with Expo + React Native, powered by the free [Jikan API](https://docs.api.jikan.moe/) (the unofficial MyAnimeList API).**

Shiori isn't just a list of anime names — it's a **personal tracker**. It remembers which episode you're on across every show you're watching, counts down to when the next episode airs in Japan, and launches you straight to where you can stream it. That's the difference between an app people open once and an app people keep installed (like MyAnimeList or AniList).

---

## Table of contents

1. [What it does](#what-it-does)
2. [Screens](#screens)
3. [Why a "tracker" and not just a list](#why-a-tracker-and-not-just-a-list)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [Architecture & how it works](#architecture--how-it-works)
7. [The Jikan API](#the-jikan-api)
8. [Getting started](#getting-started)
9. [Available scripts](#available-scripts)
10. [Troubleshooting](#troubleshooting)
11. [Roadmap ideas](#roadmap-ideas)
12. [Credits](#credits)

---

## What it does

### 🎯 Tracker features (the reason to keep it installed)

- **My List** — Save any anime and organize it by watch status: **Watching**, **Plan to Watch**, **Completed**, **On Hold**, **Dropped**. Filter chips show a live count for each status, and the list defaults to your **Watching** queue so your active shows are the first thing you see.
- **Episode progress + "+1" button** — Every tracked show has a big, satisfying **+1** button and a progress bar (`Episode 6 / 12`). Tap it when you finish an episode; when you reach the finale it auto-marks the show **Completed**. There's a `-1` to correct mistakes too.
- **Live airing countdown** — For shows currently airing in Japan, Shiori shows a ticking timer: **"Next episode airs in 3h 12m"**. It's computed from Jikan's weekly broadcast slot (day + time in JST) and updates every second.
- **"Watch Now" smart-redirect** — The app doesn't host video. Instead, one tap opens a search for that exact title on **Crunchyroll**, **YouTube**, or **Google** ("where to watch"). It turns the app into a fast launcher to wherever the show actually streams.

### 🔍 Discovery features

- **Discover** — A swipeable featured carousel of top airing anime, plus five horizontal rails: **Top Ranked**, **Most Popular**, **Currently Airing**, **Most Favorited**, and **Coming Soon**. Each rail has a **View all** button that opens the full, endlessly-scrolling list.
- **Seasonal** — A 2-column grid of the current anime season and upcoming releases, with infinite scroll and pull-to-refresh.
- **Search** — Debounced title search plus quick genre filter chips (Action, Romance, Sci-Fi, …), with infinite scroll.
- **Anime detail** — A rich page with a blurred backdrop, poster, score & rank, key stats, genre tags, an expandable synopsis, an information table (aired dates, studios, source, rating…), the main character cast, and fan recommendations. Includes trailer and MyAnimeList links.

### 🎨 Design

A dark, "streaming app" aesthetic with an indigo/teal accent, driven by a single design-token file. Images use `expo-image` with blurhash placeholders for smooth loading. Light/dark is handled via a consistent dark theme.

---

## Screens

| Tab | Route | Purpose |
| --- | --- | --- |
| **Discover** | `app/(tabs)/index.tsx` | Featured hero + category rails |
| **Seasonal** | `app/(tabs)/seasonal.tsx` | Current season / upcoming grid |
| **Search** | `app/(tabs)/search.tsx` | Title search + genre filters |
| **My List** | `app/(tabs)/favorites.tsx` | The tracker dashboard |
| Detail | `app/anime/[id].tsx` | Full anime page + tracker controls |
| View all | `app/list/[category].tsx` | Full paginated list for a rail |

---

## Why a "tracker" and not just a list

Three real pain points for anyone who watches a lot of anime — and how Shiori solves each:

1. **Fragmented streaming.** A single season's shows are scattered across Crunchyroll, Netflix, YouTube, etc. → **My List** is one clean dashboard of everything you're keeping up with, no matter where it streams.
2. **The "+1 episode" memory trap.** Watching 6 weekly shows at once, it's easy to forget where you left off. → The **+1 button** logs your progress in one tap.
3. **"When do the subs drop?"** Fans want to know exactly when the next episode airs. → The **live countdown** uses Jikan's broadcast data to tell them.

And the **Watch Now** buttons bridge the last gap — from "I see the name" to "I'm watching it" — with a single tap.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | **Expo SDK 56**, React Native 0.85, React 19 |
| Language | TypeScript (strict mode) |
| Navigation | **expo-router** (file-based routing, typed routes) |
| Data source | **Jikan v4** REST API via a custom throttled fetch client |
| Local storage | `@react-native-async-storage/async-storage` |
| Images | `expo-image` (blurhash placeholders) |
| Icons | `@expo/vector-icons` (Ionicons) |
| State | React Context + hooks (no external state library) |

---

## Project structure

```
jikan-anime-app/
├── app/                          # expo-router screens (file = route)
│   ├── _layout.tsx               # Root stack + providers (SafeArea, Library)
│   ├── +not-found.tsx            # Fallback for unknown routes
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab bar
│   │   ├── index.tsx             # Discover (hero + rails)
│   │   ├── seasonal.tsx          # Seasonal / upcoming grid
│   │   ├── search.tsx            # Search + genre filters
│   │   └── favorites.tsx         # "My List" tracker dashboard
│   ├── anime/[id].tsx            # Anime detail + tracker controls
│   └── list/[category].tsx       # "View all" paginated list
│
├── components/
│   ├── AnimeCard.tsx             # Poster card + horizontal list item
│   ├── AnimeCarousel.tsx         # Horizontal rail with "View all"
│   ├── AnimeGrid.tsx             # Reusable 2-column infinite grid
│   ├── TrackerRow.tsx            # My List row: progress bar + "+1" + countdown
│   └── ui.tsx                    # Pills, score badge, loading/error/empty states
│
├── lib/
│   ├── api.ts                    # Jikan client (rate-limit throttle + retry)
│   ├── types.ts                  # Jikan response typings
│   ├── catalog.ts                # Category definitions (rails / View-all)
│   ├── library.tsx               # Tracker store (status + progress) via Context
│   ├── airing.ts                 # Broadcast → next-air countdown logic
│   ├── streaming.ts              # "Watch Now" smart-redirect link builder
│   └── hooks.ts                  # useAsync + usePaginatedList
│
├── constants/
│   └── theme.ts                  # Colors, spacing, radius, typography tokens
│
├── assets/                       # App icons & splash
├── app.json                      # Expo config (scheme, plugins, typed routes)
├── .npmrc                        # legacy-peer-deps=true (see Troubleshooting)
└── package.json
```

---

## Architecture & how it works

### Data fetching

All network access goes through **[`lib/api.ts`](lib/api.ts)**, a thin typed wrapper over the Jikan v4 endpoints. Two hooks in **[`lib/hooks.ts`](lib/hooks.ts)** drive every screen:

- `useAsync(fn, deps)` — for single requests (detail page, a carousel). Returns `{ data, loading, error, reload }`.
- `usePaginatedList(fetcher, getId, key)` — for infinite scroll. Tracks the current page, de-duplicates items across pages, exposes `loadMore` / `refresh`, and resets when `key` changes (e.g. a new search query or genre).

### Rate-limit handling

Jikan is rate limited (~3 requests/second, 60/minute). `lib/api.ts` **serializes every request through a single queue** that enforces a minimum gap (~400ms) between calls and **retries automatically on HTTP 429** with linear backoff. So screens that fire several requests at once (like Discover, with five rails) never trip the limit.

### The tracker store

**[`lib/library.tsx`](lib/library.tsx)** is the heart of the app. It's a React Context that:

- Holds the user's saved anime, each with a `status`, `progress`, total `episodes`, and `broadcast` info.
- Persists to AsyncStorage on every change, and loads on startup.
- **Migrates** any data from the older "favorites" store into the new model (as *Plan to Watch*) so nothing is lost.
- Exposes actions: `toggleSave`, `add`, `remove`, `setStatus`, `setProgress`, `increment`, `decrement`, `clear`, plus selectors like `byStatus` and `counts`.
- Auto-promotes a show to **Watching** on first `+1`, and to **Completed** when progress hits the episode count.

Because it's context, the bookmark icon on a card, the detail screen, and the My List tab all stay in sync instantly.

### The airing countdown

**[`lib/airing.ts`](lib/airing.ts)** turns Jikan's broadcast slot (e.g. `day: "Saturdays", time: "23:00", timezone: "Asia/Tokyo"`) into the next real-world air instant:

- Maps the weekday name to an index and parses the `HH:MM` time.
- Treats the time as **JST (UTC+9)** — Japan has no daylight saving, so a fixed offset is accurate.
- Finds the next future occurrence of that weekly slot and returns a timestamp.
- `useCountdown()` re-renders every second to show a live `2d 4h 9m` / `3h 12m` / `47s` string.

> Note: this assumes a standard **weekly** broadcast. It won't know about one-off delays or breaks, because Jikan doesn't expose per-episode air dates. For exact next-episode timing you'd add the AniList GraphQL API alongside Jikan.

### Watch Now redirects

**[`lib/streaming.ts`](lib/streaming.ts)** builds search URLs from the anime title:

```ts
`https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`
`https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' anime')}`
`https://www.google.com/search?q=${encodeURIComponent(title + ' anime watch online')}`
```

Tapping a button opens the device browser via React Native's `Linking` API.

### Navigation

File-based routing with **expo-router**. The root is a `Stack`; the four main screens live in a `(tabs)` group with a bottom tab bar. Dynamic routes (`anime/[id]`, `list/[category]`) read their params with `useLocalSearchParams`. Typed routes are enabled in `app.json` for compile-time-checked links.

---

## The Jikan API

[Jikan](https://docs.api.jikan.moe/) is a free, open-source REST API for MyAnimeList data — **no API key required**. Base URL: `https://api.jikan.moe/v4`. Endpoints used:

| Feature | Endpoint |
| --- | --- |
| Top / ranked / popular / airing / favorite | `GET /top/anime?filter=…` |
| Current season | `GET /seasons/now` |
| Upcoming | `GET /seasons/upcoming` |
| Search | `GET /anime?q=…&genres=…&sfw` |
| Anime details | `GET /anime/{id}/full` |
| Characters | `GET /anime/{id}/characters` |
| Recommendations | `GET /anime/{id}/recommendations` |

---

## Getting started

### Prerequisites

- **Node.js 18+** (tested on Node 24)
- The **Expo Go** app on your phone (iOS/Android), or an Android emulator / iOS simulator

### Install & run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npx expo start
```

Then:

- **Phone:** scan the QR code with Expo Go (Android) or the Camera app (iOS).
- **Android emulator:** press `a`
- **iOS simulator (macOS only):** press `i`
- **Web preview:** press `w`

---

## Available scripts

| Command | What it does |
| --- | --- |
| `npm start` / `npx expo start` | Start the Metro dev server |
| `npm run android` | Start and open on Android |
| `npm run ios` | Start and open on iOS (macOS only) |
| `npm run web` | Start and open in a browser |
| `npx tsc --noEmit` | Type-check the whole project |
| `npx expo-doctor` | Validate the Expo project setup |

---

## Troubleshooting

**`npm install` fails with `ERESOLVE` peer-dependency errors.**
This SDK ships a transitive `react` / `react-dom` version mismatch. The project includes an `.npmrc` with `legacy-peer-deps=true` to resolve it automatically — make sure that file is present.

**Typed-route errors after adding a new screen** (e.g. *"`/list/x` is not assignable…"*).
expo-router generates route types into `.expo/types/` when Metro runs. After adding a route file, start the dev server once (`npx expo start`) to regenerate them, then re-run `tsc`.

**Lists feel slow or some images don't load.**
That's Jikan's rate limit / occasional 429s. The client already throttles and retries; just give it a moment. Pull-to-refresh re-fetches.

---

## Roadmap ideas

- AniList GraphQL integration for **exact** next-episode air dates.
- Push notifications when a tracked show's next episode airs.
- Manga tracking (Jikan supports `/manga` too).
- Cloud sync / account login so your list follows you across devices.
- Per-platform "available on" badges (JustWatch-style).

---

## Credits

- Data: **[Jikan API](https://jikan.moe/)** → **[MyAnimeList](https://myanimelist.net/)**
- Built with **[Expo](https://expo.dev/)** and **[expo-router](https://docs.expo.dev/router/introduction/)**

> Shiori is a fan-made client. It does not host or stream any video; "Watch Now" simply links out to public search pages. All anime data and images belong to their respective owners via MyAnimeList.
