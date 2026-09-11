-- Monitoring-Journal: optional activity times (Beginn/Ende) per entry.
-- Additive only — existing rows keep NULL (documentation-only entries).
-- Duration is derived app-side (monitoring-core.ts), never stored; the
-- optional "als Aufwand erfassen" toggle writes a regular effort_entries row.
ALTER TABLE monitoring_entries
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;

COMMENT ON COLUMN monitoring_entries.start_time IS
  'Optional activity start (HH:MM); end-after-start enforced app-side';
COMMENT ON COLUMN monitoring_entries.end_time IS
  'Optional activity end (HH:MM); NULL together with start_time = untimed entry';
