-- ============================================================
-- TABELA: savings_boxes (Caixinhas)
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_boxes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  target_amount     NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  color             TEXT NOT NULL DEFAULT '#E0FE56',
  icon              TEXT NOT NULL DEFAULT 'piggy-bank',
  target_date       DATE,
  is_completed      BOOLEAN NOT NULL DEFAULT false,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELA: savings_box_contributions (Aportes)
-- ============================================================
CREATE TABLE IF NOT EXISTS savings_box_contributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  savings_box_id   UUID NOT NULL REFERENCES savings_boxes(id) ON DELETE CASCADE,
  transaction_id   UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note             TEXT,
  contributed_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_boxes_user ON savings_boxes(user_id);
CREATE INDEX IF NOT EXISTS idx_sbc_box ON savings_box_contributions(savings_box_id);
CREATE INDEX IF NOT EXISTS idx_sbc_user ON savings_box_contributions(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE savings_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_box_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings_boxes"
  ON savings_boxes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings_boxes"
  ON savings_boxes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings_boxes"
  ON savings_boxes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings_boxes"
  ON savings_boxes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own contributions"
  ON savings_box_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contributions"
  ON savings_box_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contributions"
  ON savings_box_contributions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: atualiza current_amount automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_savings_box_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE savings_boxes
  SET
    current_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM savings_box_contributions
      WHERE savings_box_id = COALESCE(NEW.savings_box_id, OLD.savings_box_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.savings_box_id, OLD.savings_box_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_savings_box_amount
  AFTER INSERT OR DELETE ON savings_box_contributions
  FOR EACH ROW EXECUTE FUNCTION update_savings_box_amount();

-- ============================================================
-- TRIGGER: marca is_completed quando meta é atingida
-- ============================================================
CREATE OR REPLACE FUNCTION check_savings_box_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount THEN
    NEW.is_completed := true;
  ELSE
    NEW.is_completed := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_completion
  BEFORE UPDATE OF current_amount ON savings_boxes
  FOR EACH ROW EXECUTE FUNCTION check_savings_box_completion();
