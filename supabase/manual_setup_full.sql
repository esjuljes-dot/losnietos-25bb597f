-- Manual setup for Los Nietos Supabase project.
-- Run this once in Supabase Dashboard > SQL Editor > New query.

-- 1) Products catalog
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  cost INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  category TEXT NOT NULL DEFAULT 'Otros',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sales INTEGER NOT NULL DEFAULT 0 CHECK (sales >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;
CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  USING (true);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- 2) Owner/admin roles
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) Deliveries, driver GPS, and order items
CREATE TABLE IF NOT EXISTS public.drivers (
  code TEXT PRIMARY KEY CHECK (code ~ '^R[0-9]{2}$'),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  total INTEGER NOT NULL CHECK (total >= 0),
  payment TEXT NOT NULL CHECK (payment IN ('Efectivo', 'Mercado Pago')),
  paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  driver_code TEXT NOT NULL REFERENCES public.drivers(code),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en-camino', 'entregada')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  eta INTEGER NOT NULL DEFAULT 0 CHECK (eta >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  price INTEGER NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_code TEXT NOT NULL REFERENCES public.drivers(code) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_driver_code_idx ON public.orders(driver_code);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS driver_locations_driver_recorded_idx ON public.driver_locations(driver_code, recorded_at DESC);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers are publicly readable" ON public.drivers;
CREATE POLICY "Drivers are publicly readable" ON public.drivers
  FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Orders are readable by app" ON public.orders;
CREATE POLICY "Orders are readable by app" ON public.orders
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Order items are readable by app" ON public.order_items;
CREATE POLICY "Order items are readable by app" ON public.order_items
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage drivers" ON public.drivers;
CREATE POLICY "Admins manage drivers" ON public.drivers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read driver locations" ON public.driver_locations;
CREATE POLICY "Admins read driver locations" ON public.driver_locations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_order_status_by_driver(
  _order_id TEXT,
  _driver_code TEXT,
  _status TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_order public.orders;
BEGIN
  IF _status NOT IN ('pendiente', 'en-camino', 'entregada') THEN
    RAISE EXCEPTION 'Invalid status: %', _status;
  END IF;

  UPDATE public.orders
  SET
    status = _status,
    progress = CASE _status WHEN 'entregada' THEN 100 WHEN 'en-camino' THEN 60 ELSE 0 END,
    paid = CASE WHEN _status = 'entregada' THEN true ELSE paid END,
    updated_at = now()
  WHERE id = _order_id AND driver_code = _driver_code
  RETURNING * INTO updated_order;

  IF updated_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found for this driver';
  END IF;

  RETURN updated_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_driver_location(
  _driver_code TEXT,
  _lat DOUBLE PRECISION,
  _lng DOUBLE PRECISION,
  _accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS public.driver_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved public.driver_locations;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE code = _driver_code AND active) THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  INSERT INTO public.driver_locations (driver_code, lat, lng, accuracy)
  VALUES (_driver_code, _lat, _lng, _accuracy)
  RETURNING * INTO saved;

  RETURN saved;
END;
$$;

GRANT SELECT ON public.drivers TO anon, authenticated;
GRANT SELECT ON public.orders TO anon, authenticated;
GRANT SELECT ON public.order_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT ON public.driver_locations TO authenticated;
GRANT ALL ON public.drivers, public.orders, public.order_items, public.driver_locations TO service_role;
REVOKE EXECUTE ON FUNCTION public.update_order_status_by_driver(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_driver_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_status_by_driver(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_driver_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS drivers_set_updated_at ON public.drivers;
CREATE TRIGGER drivers_set_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.drivers (code, name, phone) VALUES
  ('R01', 'Luis Hernández', '313-100-0001'),
  ('R02', 'Pedro Ramírez', '313-100-0002'),
  ('R03', 'Miguel Torres', '313-100-0003'),
  ('R04', 'Jorge Vega', '313-100-0004'),
  ('R05', 'Ana Castillo', '313-100-0005')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, active = true;

INSERT INTO public.orders (id, customer, phone, address, lat, lng, total, payment, paid, notes, driver_code, status, progress, eta) VALUES
  ('ORD-001', 'Carlos Mendoza', '313-200-1101', 'Calle Nicolás Bravo #940, Col. Centro, Tecomán', 18.9088, -103.8744, 631, 'Mercado Pago', true, 'Casa color verde, portón negro. Tocar el timbre 2 veces.', 'R01', 'en-camino', 60, 15),
  ('ORD-002', 'María Robles', '313-200-1102', 'Av. Insurgentes #215, Col. Jardines, Tecomán', 18.9135, -103.8702, 207, 'Efectivo', false, 'Pagar con $300, llevar cambio. Dejar en la tiendita.', 'R01', 'pendiente', 0, 30),
  ('ORD-003', 'Juan Pérez', '313-200-1103', 'Calle Hidalgo #88, Col. Reforma, Tecomán', 18.9051, -103.8801, 469, 'Mercado Pago', true, 'Sin indicaciones.', 'R02', 'entregada', 100, 0),
  ('ORD-004', 'Sofía Núñez', '313-200-1104', 'Calle Morelos #432, Col. Las Palmas, Tecomán', 18.9172, -103.8765, 940, 'Efectivo', false, 'Fiesta en el patio trasero, entrar por la cochera.', 'R03', 'pendiente', 0, 25),
  ('ORD-005', 'Rafael Ibarra', '313-200-1105', 'Calle Juárez #19, Col. Centro, Tecomán', 18.9099, -103.8758, 334, 'Mercado Pago', true, 'Departamento 3B, segundo piso.', 'R01', 'entregada', 100, 0)
ON CONFLICT (id) DO UPDATE SET
  customer = EXCLUDED.customer,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  total = EXCLUDED.total,
  payment = EXCLUDED.payment,
  paid = EXCLUDED.paid,
  notes = EXCLUDED.notes,
  driver_code = EXCLUDED.driver_code,
  status = EXCLUDED.status,
  progress = EXCLUDED.progress,
  eta = EXCLUDED.eta;

DELETE FROM public.order_items WHERE order_id IN ('ORD-001', 'ORD-002', 'ORD-003', 'ORD-004', 'ORD-005');
INSERT INTO public.order_items (order_id, name, qty, price) VALUES
  ('ORD-001', 'Corona 600ml', 4, 140),
  ('ORD-001', 'Hielo 5kg', 1, 35),
  ('ORD-001', 'Sabritas 45g', 2, 18),
  ('ORD-002', 'Coca 1L', 3, 45),
  ('ORD-002', 'Doritos 45g', 4, 18),
  ('ORD-003', 'Tecate 24oz', 3, 135),
  ('ORD-003', 'Jarritos 600ml', 2, 32),
  ('ORD-004', 'Modelo Especial', 6, 145),
  ('ORD-004', 'Hielo 5kg', 2, 35),
  ('ORD-005', 'Corona 600ml', 2, 140),
  ('ORD-005', 'Sabritas 45g', 3, 18);

-- 4) Smoke check
SELECT 'products' AS table_name, count(*) AS rows FROM public.products
UNION ALL SELECT 'drivers', count(*) FROM public.drivers
UNION ALL SELECT 'orders', count(*) FROM public.orders
UNION ALL SELECT 'order_items', count(*) FROM public.order_items
UNION ALL SELECT 'driver_locations', count(*) FROM public.driver_locations;
