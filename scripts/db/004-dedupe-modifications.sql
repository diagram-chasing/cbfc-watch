-- ONE-TIME CLEANUP: collapse duplicated modification rows.
--
-- Until data_import.py gained the import_new_films guard, every cron run
-- re-inserted the whole CSV into `modifications` (no natural key, so
-- INSERT OR IGNORE never ignored anything). The table ended up ~20x the size
-- of the data, which is what every browse scan was paying for.
--
-- Cost: rows_written ~= current row count of modifications plus the four
-- modification_* tables (millions). That is far over the free tier's
-- 100k/day; run it on Workers Paid (one month is enough) or don't run it.
-- After it completes, run 001-normalize.sql to repopulate the modification_*
-- tables, then `pnpm run update-data-remote` to rebuild category_timeseries.
--
--   pnpm wrangler d1 execute cbfc-films --file=scripts/db/004-dedupe-modifications.sql --remote
--   pnpm wrangler d1 execute cbfc-films --file=scripts/db/001-normalize.sql --remote

DELETE FROM modifications
WHERE id NOT IN (
  SELECT MIN(id) FROM modifications GROUP BY film_id, cut_no, description
);

-- Belt and braces: even if the import guard is bypassed, a re-insert of an
-- existing cut is now ignored rather than duplicated.
CREATE UNIQUE INDEX IF NOT EXISTS idx_modifications_unique
  ON modifications(film_id, COALESCE(cut_no, -1), description);

-- These reference the deleted modification ids; 001-normalize.sql refills them.
DELETE FROM modification_content_types;
DELETE FROM modification_action_types;
DELETE FROM modification_media_elements;
DELETE FROM modification_references;
