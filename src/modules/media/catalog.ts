/**
 * A bounded starter catalogue so discovery works without a TMDB key. Ids are
 * real TMDB ids; scores and artwork paths are snapshots. Episode names exist
 * for two season-ones only. Negative season and episode ids mark bundled
 * metadata rather than TMDB records.
 */
import type { MediaSeason, MediaTitle } from "./types";

function season(id: number, number: number, names: string[], airDate: string | null): MediaSeason {
  return {
    id: -id,
    number,
    name: `season ${number}`,
    episodeCount: names.length,
    airDate,
    episodes: names.map((name, index) => ({ id: -(id * 100 + index + 1), number: index + 1, season: number, name, airDate })),
  };
}

const severanceSeasonOne = season(9539601, 1, [
  "Good News About Hell", "Half Loop", "In Perpetuity", "The You You Are",
  "The Grim Barbarity of Optics and Design", "Hide and Seek", "Defiant Jazz",
  "What's for Dinner?", "The We We Are",
], "2022-02-18");

const bearSeasonOne = season(13631501, 1, ["System", "Hands", "Brigade", "Dogs", "Sheridan", "Ceres", "Review", "Braciole"], "2022-06-23");

const poster = (path: string) => `https://image.tmdb.org/t/p/w342${path}`;
const backdrop = (path: string) => `https://image.tmdb.org/t/p/w780${path}`;

export const CATALOG: readonly MediaTitle[] = [
  { id: 693134, media: "movie", title: "Dune: Part Two", year: 2024, overview: "On the desert planet Arrakis, Paul Atreides finds love, gathers an army, and confronts the dangerous promise of his own destiny.", poster: poster("/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg"), backdrop: backdrop("/87IVlclAfWL6mdicU1DDuxdwXwe.jpg"), score: 8.1, runtime: 167, genres: ["Science Fiction", "Adventure"], moods: ["action", "thoughtful", "thrilling"] },
  { id: 95396, media: "series", title: "Severance", year: 2022, overview: "An office worker separates his work memories from his life outside. Inside Lumon, a new colleague starts asking the questions nobody is meant to ask.", poster: poster("/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg"), backdrop: backdrop("/ixgFmf1X59PUZam2qbAfskx2gQr.jpg"), score: 8.4, runtime: null, genres: ["Drama", "Mystery"], moods: ["thoughtful", "thrilling", "dark"], seasons: [severanceSeasonOne] },
  { id: 136315, media: "series", title: "The Bear", year: 2022, overview: "A fine-dining chef returns to his family’s Chicago sandwich shop, where the kitchen is chaos and the people are everything.", poster: poster("/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg"), backdrop: backdrop("/aJtG4txtmiRHwAAqENQHZvBs6kY.jpg"), score: 8.1, runtime: null, genres: ["Drama", "Comedy"], moods: ["thrilling", "inspiring", "funny"], seasons: [bearSeasonOne] },
  { id: 666277, media: "movie", title: "Past Lives", year: 2023, overview: "Two childhood friends reunite in New York, carrying the lives they chose and the quiet possibility of the one they might have shared.", poster: poster("/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg"), backdrop: backdrop("/7HR38hMBl23lf38MAN63y4pKsHz.jpg"), score: 7.7, runtime: 106, genres: ["Drama", "Romance"], moods: ["romantic", "thoughtful", "relaxing"] },
  { id: 120467, media: "movie", title: "The Grand Budapest Hotel", year: 2014, overview: "A devoted concierge and his lobby boy tumble through a stolen painting, a family fortune, and a very particular world of pink pastries.", poster: poster("/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg"), backdrop: backdrop("/jK65srQczOKTpW62wPxwwKztGgE.jpg"), score: 8.0, runtime: 100, genres: ["Comedy", "Adventure"], moods: ["funny", "feel_good", "relaxing"] },
  { id: 335984, media: "movie", title: "Blade Runner 2049", year: 2017, overview: "A replicant detective follows a buried secret through a rain-soaked Los Angeles and begins to question the memories that make him who he is.", poster: poster("/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"), backdrop: backdrop("/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg"), score: 7.6, runtime: 164, genres: ["Science Fiction", "Mystery"], moods: ["dark", "thoughtful", "thrilling"] },
  { id: 414906, media: "movie", title: "The Batman", year: 2022, overview: "A young Batman follows a killer’s riddles into Gotham’s oldest secrets. A rain-drenched detective story about the difference between revenge and hope.", poster: poster("/74xTEgt7R36Fpooo50r9T25onhq.jpg"), backdrop: backdrop("/rvtdN5XkWAfGX6xDuPL6yYS2seK.jpg"), score: 7.7, runtime: 177, genres: ["Crime", "Mystery"], moods: ["dark", "thrilling", "action"] },
  { id: 976893, media: "movie", title: "Perfect Days", year: 2023, overview: "Cassette tapes, paperback books, and sunlight through leaves: a Tokyo cleaner finds small wonders in the gentle rhythm of an ordinary life.", poster: poster("/tvUHVSTJV9ITON3oyHaWp7oaAc8.jpg"), backdrop: backdrop("/hjWxngV6tidwDkfJDEgMjHD2KEz.jpg"), score: 7.8, runtime: 124, genres: ["Drama"], moods: ["relaxing", "inspiring", "feel_good"] },
  { id: 126308, media: "series", title: "Shōgun", year: 2024, overview: "In seventeenth-century Japan, a stranded English sailor becomes entangled in a struggle for power, with a gifted interpreter between two worlds.", poster: poster("/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg"), backdrop: backdrop("/bwSmgmd90hCWwqOKQYTEraeOZhJ.jpg"), score: 8.4, runtime: null, genres: ["Drama", "War & Politics"], moods: ["thrilling", "thoughtful", "action"] },
  { id: 157336, media: "movie", title: "Interstellar", year: 2014, overview: "A father leaves a fading Earth to search for humanity’s next home, crossing impossible distances while the years pass for the daughter he left behind.", poster: poster("/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg"), backdrop: backdrop("/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg"), score: 8.5, runtime: 169, genres: ["Science Fiction", "Adventure"], moods: ["thoughtful", "inspiring", "thrilling"] },
  { id: 545611, media: "movie", title: "Everything Everywhere All at Once", year: 2022, overview: "A laundromat owner’s tax appointment spirals into a multiverse adventure. Beneath the chaos is a family trying to find its way back to one another.", poster: poster("/u68AjlvlutfEIcpmbYpKcdi09ut.jpg"), backdrop: backdrop("/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg"), score: 7.7, runtime: 140, genres: ["Action", "Comedy", "Science Fiction"], moods: ["funny", "thoughtful", "inspiring"] },
  { id: 244786, media: "movie", title: "Whiplash", year: 2014, overview: "An ambitious jazz drummer meets a teacher who turns every rehearsal into a test of endurance. A breathless collision of talent, obsession, and control.", poster: poster("/7fn624j5lj3xTme2SgiLCeuedmO.jpg"), backdrop: backdrop("/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg"), score: 8.4, runtime: 107, genres: ["Drama", "Music"], moods: ["thrilling", "dark", "thoughtful"] },
  { id: 76331, media: "series", title: "Succession", year: 2018, overview: "Four siblings circle their father’s media empire, trading loyalty for leverage in a family where every conversation is a negotiation.", poster: poster("/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg"), backdrop: backdrop("/d87JXX3DLkRJMfm5StCmmnmhHuX.jpg"), score: 8.3, runtime: null, genres: ["Drama"], moods: ["dark", "funny", "thrilling"] },
  { id: 965150, media: "movie", title: "Aftersun", year: 2022, overview: "Years after a summer holiday, a daughter revisits home videos and scattered memories, trying to understand the father she knew and the man she did not.", poster: poster("/evKz85EKouVbIr51zy5fOtpNRPg.jpg"), backdrop: backdrop("/4jdduww9j5RyzO4ITRcuBFhqNN1.jpg"), score: 7.6, runtime: 101, genres: ["Drama"], moods: ["thoughtful", "dark"] },
  { id: 569094, media: "movie", title: "Spider-Man: Across the Spider-Verse", year: 2023, overview: "Miles Morales swings into a spectacular web of alternate worlds, where being Spider-Man means deciding whether to follow the story or write his own.", poster: poster("/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg"), backdrop: backdrop("/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg"), score: 8.3, runtime: 140, genres: ["Animation", "Action", "Adventure"], moods: ["action", "inspiring", "funny"] },
  { id: 67070, media: "series", title: "Fleabag", year: 2016, overview: "A sharp-witted Londoner lets us in on the joke while keeping everyone else at arm’s length. Messy, intimate, and unexpectedly tender.", poster: poster("/27vEYsRKa3eAniwmoccOoluEXQ1.jpg"), backdrop: backdrop("/hXdQ4MWsEOX6qg6VydKrLb3YJ4g.jpg"), score: 8.3, runtime: null, genres: ["Comedy", "Drama"], moods: ["funny", "romantic", "thoughtful"] },
];
