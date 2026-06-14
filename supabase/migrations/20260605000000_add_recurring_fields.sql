-- Add recurring transaction fields
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_recurring          BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_frequency   TEXT     CHECK (recurring_frequency IN ('monthly','yearly')),
  ADD COLUMN IF NOT EXISTS recurring_occurrences INTEGER  CHECK (recurring_occurrences BETWEEN 2 AND 60),
  ADD COLUMN IF NOT EXISTS recurring_group_id    UUID;

NOTIFY pgrst, 'reload schema';
