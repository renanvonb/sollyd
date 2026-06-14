-- Add realized_at (data em que a transação foi realizada/paga)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS realized_at DATE;

NOTIFY pgrst, 'reload schema';
