import type { ModuleDefinition } from "../types";

/**
 * Films and series on the collections engine: discovery against TMDB (or the
 * bundled catalogue), posters, and per-season episode marks. Needs the
 * `collections` module and a `watchlist` collection (the watchlist kit).
 */
const media: ModuleDefinition = {
  id: "media",
  name: "media",
  description: "film and series discovery, posters, and episode marks for a watchlist collection.",
  routes: ["/discover", "/api/media"],
  nav: [{ label: "discover", href: "/discover", icon: "film", section: "library", order: 45 }],
  commands: [{ label: "discover", href: "/discover", keywords: ["films", "series", "movies", "tv", "watchlist", "tmdb"] }],
  docs: {
    help: "with the watchlist kit applied, [discover](/discover) searches films and series and saves them into the watchlist with their poster and moods; a tmdb key extends the search beyond the starter catalogue.",
    features: [
      "media — search films and series on [discover](/discover), save them into the watchlist collection with poster, year, and moods, and mark whole seasons watched. `TMDB_API_KEY` unlocks the full catalogue.",
    ],
  },
  defaultEnabled: false,
};

export default media;
