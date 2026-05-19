-- ══════════════════════════════════════════════════════════════════════════════
-- NERO CLUB FITNESS — Supabase Schema & Row Level Security Policies
-- Versión: 1.0  |  Moneda: CLP  |  Roles: admin | vendor | client
-- ══════════════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES:
-- 1. Abre tu proyecto en app.supabase.com → SQL Editor
-- 2. Pega este script completo y ejecuta
-- 3. Crea el usuario admin manualmente desde Authentication → Users
--    y luego actualiza: UPDATE profiles SET role='admin' WHERE email='tu@email.cl';
-- ══════════════════════════════════════════════════════════════════════════════


-- ── TIPOS ─────────────────────────────────────────────────────────────────────

CREATE TYPE user_role     AS ENUM ('admin', 'vendor', 'client');
CREATE TYPE fitness_goal  AS ENUM (
  'Ganar masa muscular',
  'Bajar de peso',
  'Mejorar condición física',
  'Tonificar cuerpo',
  'Fitness general',
  'Preparación deportiva'
);


-- ── PROFILES (extiende auth.users) ────────────────────────────────────────────

CREATE TABLE profiles (
  id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role       user_role   NOT NULL DEFAULT 'client',
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admin: acceso total
CREATE POLICY "admin_all_profiles"
  ON profiles FOR ALL
  USING     ( EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin') )
  WITH CHECK( EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin') );

-- Cualquier usuario: leer y actualizar su propio perfil
CREATE POLICY "own_profile_select"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "own_profile_update"
  ON profiles FOR UPDATE USING (id = auth.uid());


-- ── PLANES ────────────────────────────────────────────────────────────────────

CREATE TABLE plans (
  id               SERIAL      PRIMARY KEY,
  name             TEXT        NOT NULL,
  price_clp        INTEGER     NOT NULL CHECK (price_clp > 0),
  duration_months  INTEGER     NOT NULL CHECK (duration_months > 0),
  description      TEXT,
  features         TEXT[],
  is_popular       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read"  ON plans FOR SELECT USING (TRUE);
CREATE POLICY "admin_manage_plans" ON plans FOR ALL
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

INSERT INTO plans (name, price_clp, duration_months, description, features, is_popular) VALUES
  ('Mensual',    29900,  1,  'Acceso sin permanencia.',
   ARRAY['Acceso ilimitado', 'Sin permanencia', 'App Nero Club'],
   FALSE),
  ('Trimestral', 79900,  3,  'Ahorra $9.800 vs mensual.',
   ARRAY['Acceso ilimitado', 'Sin permanencia', 'App Nero Club', 'Toalla incluida'],
   FALSE),
  ('Semestral',  149900, 6,  'El plan más popular.',
   ARRAY['Acceso ilimitado', 'Sin permanencia', 'App + Toalla', 'Camiseta Nero'],
   TRUE),
  ('Anual',      269900, 12, 'Máximo ahorro del año.',
   ARRAY['Acceso ilimitado', 'Matrícula gratis', 'Pack completo Nero', 'Máximo ahorro'],
   FALSE);


-- ── VENDEDORES ────────────────────────────────────────────────────────────────

CREATE TABLE vendors (
  id         UUID        REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by UUID        REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Admin: acceso total (crear, ver, eliminar vendedores)
CREATE POLICY "admin_all_vendors"
  ON vendors FOR ALL
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

-- Vendedor: solo puede ver SU PROPIO registro (NO ve otros vendedores)
CREATE POLICY "vendor_own_record_select"
  ON vendors FOR SELECT USING (id = auth.uid());


-- ── CLIENTES ──────────────────────────────────────────────────────────────────

CREATE TABLE clients (
  id           UUID        REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL UNIQUE,
  age          INTEGER     CHECK (age BETWEEN 14 AND 100),
  height_cm    INTEGER     CHECK (height_cm BETWEEN 100 AND 250),
  weight_kg    NUMERIC(5,1) CHECK (weight_kg BETWEEN 30 AND 300),
  fitness_goal fitness_goal,
  plan_id      INTEGER     REFERENCES plans(id),
  start_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date     DATE,       -- Calculada por trigger al insertar
  vendor_id    UUID        REFERENCES vendors(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vista computada para is_active (sin columna generada, para compatibilidad)
CREATE OR REPLACE VIEW clients_view AS
SELECT
  c.*,
  (c.end_date IS NOT NULL AND CURRENT_DATE <= c.end_date) AS is_active,
  p.name    AS plan_name,
  p.price_clp,
  p.duration_months,
  v.name    AS vendor_name
FROM clients c
LEFT JOIN plans   p ON p.id = c.plan_id
LEFT JOIN vendors v ON v.id = c.vendor_id;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Admin: acceso total (incluyendo DELETE)
CREATE POLICY "admin_all_clients"
  ON clients FOR ALL
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

-- Vendedor: puede INSERT y SELECT de sus propios clientes — NO DELETE
CREATE POLICY "vendor_select_own_clients"
  ON clients FOR SELECT
  USING (
    vendor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "vendor_insert_clients"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','vendor'))
    AND (
      vendor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- IMPORTANTE: Sin política UPDATE para vendor → no puede modificar registros ajenos
-- Solo admin puede actualizar cualquier cliente
CREATE POLICY "admin_update_clients"
  ON clients FOR UPDATE
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

-- Cliente: solo puede ver y editar su propio perfil (datos físicos/objetivo)
CREATE POLICY "client_own_select"
  ON clients FOR SELECT USING (id = auth.uid());

CREATE POLICY "client_own_update"
  ON clients FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- El cliente solo puede modificar: age, height_cm, weight_kg, fitness_goal
    -- plan_id, start_date, end_date y vendor_id NO son modificables por el cliente
  );


-- ── VENTAS ────────────────────────────────────────────────────────────────────

CREATE TABLE sales (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID        REFERENCES clients(id) ON DELETE CASCADE,
  vendor_id   UUID        REFERENCES vendors(id),
  plan_id     INTEGER     REFERENCES plans(id),
  amount_clp  INTEGER     NOT NULL,
  sale_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_sales"
  ON sales FOR ALL
  USING ( EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "vendor_select_own_sales"
  ON sales FOR SELECT USING (vendor_id = auth.uid());

CREATE POLICY "vendor_insert_sales"
  ON sales FOR INSERT
  WITH CHECK (
    vendor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','vendor'))
  );


-- ── TRIGGERS ──────────────────────────────────────────────────────────────────

-- 1. Crear perfil automáticamente al registrar usuario en auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Calcular end_date al insertar cliente
CREATE OR REPLACE FUNCTION set_client_end_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  duration_m INTEGER;
BEGIN
  SELECT duration_months INTO duration_m FROM plans WHERE id = NEW.plan_id;
  NEW.end_date := NEW.start_date + (duration_m || ' months')::INTERVAL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_insert_client
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION set_client_end_date();

-- 3. Registrar venta automáticamente al crear cliente
CREATE OR REPLACE FUNCTION handle_new_client_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  plan_price INTEGER;
BEGIN
  SELECT price_clp INTO plan_price FROM plans WHERE id = NEW.plan_id;
  INSERT INTO sales (client_id, vendor_id, plan_id, amount_clp)
  VALUES (NEW.id, NEW.vendor_id, NEW.plan_id, COALESCE(plan_price, 0));
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_insert_client
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION handle_new_client_sale();


-- ── VISTAS DE ANALÍTICA ───────────────────────────────────────────────────────

-- Dashboard del administrador
CREATE OR REPLACE VIEW admin_dashboard_metrics AS
SELECT
  (SELECT COUNT(*)                             FROM clients)                                    AS total_clients,
  (SELECT COUNT(*) FROM clients WHERE end_date >= CURRENT_DATE)                                 AS active_clients,
  (SELECT COUNT(*) FROM clients WHERE start_date >= DATE_TRUNC('month', CURRENT_DATE))          AS new_clients_this_month,
  (SELECT COUNT(*) FROM vendors WHERE is_active)                                                AS total_vendors,
  (SELECT COALESCE(SUM(amount_clp), 0)         FROM sales)                                      AS total_revenue_clp,
  (SELECT COALESCE(SUM(amount_clp), 0)         FROM sales
   WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE))                                        AS monthly_revenue_clp;

-- Performance por vendedor
CREATE OR REPLACE VIEW vendor_performance AS
SELECT
  v.id,
  v.name,
  v.email,
  COUNT(DISTINCT c.id)                                                           AS total_clients,
  COUNT(DISTINCT CASE WHEN c.end_date >= CURRENT_DATE THEN c.id END)            AS active_clients,
  COALESCE(SUM(s.amount_clp), 0)                                                AS total_revenue_clp,
  COALESCE(SUM(CASE WHEN s.sale_date >= DATE_TRUNC('month', CURRENT_DATE)
               THEN s.amount_clp END), 0)                                        AS monthly_revenue_clp
FROM vendors v
LEFT JOIN clients c ON c.vendor_id = v.id
LEFT JOIN sales   s ON s.vendor_id = v.id
GROUP BY v.id, v.name, v.email;


-- ── ÍNDICES ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_clients_vendor_id  ON clients(vendor_id);
CREATE INDEX idx_clients_plan_id    ON clients(plan_id);
CREATE INDEX idx_clients_end_date   ON clients(end_date);
CREATE INDEX idx_sales_vendor_id    ON sales(vendor_id);
CREATE INDEX idx_sales_sale_date    ON sales(sale_date);
CREATE INDEX idx_profiles_role      ON profiles(role);


-- ══════════════════════════════════════════════════════════════════════════════
-- CÓMO CONECTAR DESDE LA APP REACT
-- ══════════════════════════════════════════════════════════════════════════════
-- npm install @supabase/supabase-js
--
-- // lib/supabase.js
-- import { createClient } from '@supabase/supabase-js'
-- export const supabase = createClient(
--   process.env.NEXT_PUBLIC_SUPABASE_URL,
--   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
-- )
--
-- // Login
-- await supabase.auth.signInWithPassword({ email, password })
--
-- // Obtener rol del usuario
-- const { data } = await supabase.from('profiles').select('role').single()
--
-- // Crear vendedor (solo admin)
-- await supabase.auth.admin.createUser({ email, password, user_metadata: { role: 'vendor', name } })
--
-- // Registrar cliente
-- await supabase.from('clients').insert({ name, email, plan_id, vendor_id, ... })
-- ══════════════════════════════════════════════════════════════════════════════
