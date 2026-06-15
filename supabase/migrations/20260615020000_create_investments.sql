-- ENUM: tipo de operação
DO $$ BEGIN
  CREATE TYPE investment_operation_type AS ENUM ('aporte','resgate','rendimento','atualizacao_valor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- TABELA: investment_assets (ativos da carteira)
CREATE TABLE IF NOT EXISTS investment_assets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  ticker           TEXT,
  asset_class      TEXT NOT NULL,
  asset_type       TEXT NOT NULL,
  institution      TEXT,
  wallet_id        UUID REFERENCES wallets(id) ON DELETE SET NULL,
  current_value    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_invested   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_income     NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TABELA: investment_operations
CREATE TABLE IF NOT EXISTS investment_operations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id          UUID NOT NULL REFERENCES investment_assets(id) ON DELETE CASCADE,
  operation_type    investment_operation_type NOT NULL,
  amount            NUMERIC(15,2),
  new_value         NUMERIC(15,2),
  transaction_id    UUID REFERENCES transactions(id) ON DELETE SET NULL,
  operation_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_amount_required CHECK (
    (operation_type = 'atualizacao_valor' AND amount IS NULL AND new_value IS NOT NULL) OR
    (operation_type != 'atualizacao_valor' AND amount IS NOT NULL AND amount > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_inv_assets_user ON investment_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_ops_asset ON investment_operations(asset_id);
CREATE INDEX IF NOT EXISTS idx_inv_ops_user ON investment_operations(user_id);

-- RLS
ALTER TABLE investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment_assets" ON investment_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investment_assets" ON investment_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investment_assets" ON investment_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investment_assets" ON investment_assets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own investment_operations" ON investment_operations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investment_operations" ON investment_operations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own investment_operations" ON investment_operations FOR DELETE USING (auth.uid() = user_id);

-- TRIGGER: sincroniza total_invested e total_income (AFTER INSERT/DELETE)
CREATE OR REPLACE FUNCTION sync_investment_asset_totals()
RETURNS TRIGGER AS $$
DECLARE v_asset_id UUID;
BEGIN
  v_asset_id := COALESCE(NEW.asset_id, OLD.asset_id);
  UPDATE investment_assets SET
    total_invested = COALESCE((SELECT SUM(amount) FROM investment_operations WHERE asset_id = v_asset_id AND operation_type = 'aporte'), 0)
                   - COALESCE((SELECT SUM(amount) FROM investment_operations WHERE asset_id = v_asset_id AND operation_type = 'resgate'), 0),
    total_income   = COALESCE((SELECT SUM(amount) FROM investment_operations WHERE asset_id = v_asset_id AND operation_type = 'rendimento'), 0),
    updated_at = now()
  WHERE id = v_asset_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_asset_totals
  AFTER INSERT OR DELETE ON investment_operations
  FOR EACH ROW EXECUTE FUNCTION sync_investment_asset_totals();

-- TRIGGER: aplica atualizacao_valor em current_value
CREATE OR REPLACE FUNCTION apply_value_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operation_type = 'atualizacao_valor' AND NEW.new_value IS NOT NULL THEN
    UPDATE investment_assets SET current_value = NEW.new_value, updated_at = now() WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_apply_value_update
  AFTER INSERT ON investment_operations
  FOR EACH ROW EXECUTE FUNCTION apply_value_update();
