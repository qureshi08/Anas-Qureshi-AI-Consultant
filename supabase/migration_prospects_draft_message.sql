-- Adds a text column to store the actual ready-to-send DM per prospect,
-- not just the personalization detail in `notes`. Additive only, nothing
-- dropped or altered. Run ONCE: Supabase dashboard -> SQL Editor -> paste -> Run.

alter table prospects add column if not exists draft_message text;

-- Same PostgREST cache-lag issue hit 2026-08-13 with phone/address on this
-- table (see memory project_prospects_table_schema_cache_stale) -- reload
-- the cache immediately so this column is usable right away, not after
-- PostgREST's ~1 minute auto-lag.
notify pgrst, 'reload schema';
