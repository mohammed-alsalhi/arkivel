/** Collection import: match a list of titles against the catalogue or TMDB, then save the ones the user picked. */
import { hasLiveTmdb, searchTitles } from "@/modules/media/tmdb";
import { toSearchResult } from "./detail";
import { saveTitle } from "./library";
import type { TmdbSearchResult, WatchlistItem } from "./types";
import type { NewItem } from "./validation";

type MatchResult = { title: string; match?: TmdbSearchResult; failed?: boolean };

/** Preview only: the best match per title (identical title first, else the first result), five searches at a time. */
export async function matchTitles(titles: string[]) {
  const results: MatchResult[] = [];
  for (let index = 0; index < titles.length; index += 5) {
    results.push(
      ...(await Promise.all(
        titles.slice(index, index + 5).map(async (title): Promise<MatchResult> => {
          try {
            const matches = (await searchTitles(title)).map(toSearchResult);
            const exact = matches.find((match) => match.title.toLocaleLowerCase() === title.toLocaleLowerCase());
            return { title, match: exact ?? matches[0] };
          } catch {
            return { title, failed: true };
          }
        }),
      )),
    );
  }
  const failed = results.filter((result) => result.failed).map((result) => result.title);
  const live = hasLiveTmdb();
  return {
    matched: results.filter((result) => result.match).map(({ title, match }) => ({ title, match })),
    unmatched: results.filter((result) => !result.match && !result.failed).map((result) => result.title),
    failed,
    source: live ? "tmdb" : "catalog",
    notice: failed.length
      ? "Some searches were unavailable. Those titles were not matched; retry them before importing."
      : live
        ? "Review each title before importing. Existing titles keep their progress and tags."
        : "Matching against the sample catalogue. Connect TMDB to match titles beyond this collection.",
  };
}

/** Saves each picked title as plan_to_watch; existing titles (and repeats within the batch) count as skipped. */
export async function importItems(items: NewItem[]) {
  let imported = 0;
  const saved: WatchlistItem[] = [];
  // ponytail: serial saves, each re-reading the watchlist; batch the lookup if imports outgrow 100 titles.
  for (const item of items) {
    const result = await saveTitle({ tmdb_id: item.tmdb_id, media_type: item.media_type, title: item.title, status: "plan_to_watch", moods: [] });
    if (result.created) imported += 1;
    saved.push(result.item);
  }
  return { imported, skipped: items.length - imported, items: saved };
}
