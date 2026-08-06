-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUM TYPES
-- ============================================================
-- Check if types exist before creating to avoid errors in migration if rerun
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('customer', 'admin', 'driver');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_type') THEN
        CREATE TYPE delivery_type AS ENUM ('pickup', 'delivery');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'pending', 'waiting_payment', 'paid', 'preparing', 'on_delivery',
            'ready_for_pickup', 'ongoing_rental', 'completed',
            'cancelled_by_customer', 'cancelled_by_provider', 'expired'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'success', 'failure', 'expire', 'cancel', 'refund'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_task_status') THEN
        CREATE TYPE delivery_task_status AS ENUM (
            'assigned', 'picking_up', 'on_the_way', 'delivered', 'failed'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deposit_status') THEN
        CREATE TYPE deposit_status AS ENUM (
            'held', 'returned', 'forfeited'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
        CREATE TYPE refund_status AS ENUM (
            'pending', 'processing', 'processed', 'rejected'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identity_type') THEN
        CREATE TYPE identity_type AS ENUM (
            'ktp', 'sim', 'passport', 'kartu_mahasiswa', 'kartu_pelajar',
            'sip', 'str', 'surat_institusi', 'other'
        );
    END IF;
END$$;

-- ============================================================
-- RENTAL CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rental_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed config data
INSERT INTO public.rental_config (key, value, description)
VALUES
  ('operational_hours_start',    '09:00', 'Jam mulai operasional (WIB, format HH:MM)'),
  ('operational_hours_end',      '21:00', 'Jam akhir operasional, batas start time booking (WIB)'),
  ('buffer_minutes',             '30',    'Buffer waktu antar penyewa (menit)'),
  ('lock_minutes',               '10',    'Durasi lock booking saat waiting payment (menit)'),
  ('billing_unit_hours',         '3',     'Jumlah jam per billing unit'),
  ('overnight_cutoff',           '00:00', 'Jika end time melewati waktu ini, aktivasi overnight rule'),
  ('overnight_end_time',         '06:00', 'Waktu selesai wajib jika overnight (WIB)'),
  ('booking_min_advance_hours',  '24',    'Minimum jam sebelum rental (H-1 = 24 jam)'),
  ('deposit_threshold_amount',   '500000','Minimum total order yang memerlukan deposit (Rupiah)'),
  ('deposit_percentage',         '25',    'Persentase deposit dari total order'),
  ('cancellation_h3_refund_pct', '100',   'Refund % untuk pembatalan H-3 atau lebih'),
  ('cancellation_h2_h1_pct',     '50',    'Refund % untuk pembatalan H-2 atau H-1'),
  ('cancellation_day_of_pct',    '0',     'Refund % untuk pembatalan hari-H')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- USERS (Extends auth.users, assume it might exist in LMS, handle gracefully)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'customer',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_banned   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for auto-creating user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Rumah',
  street      TEXT NOT NULL,
  city        TEXT NOT NULL DEFAULT 'Yogyakarta',
  province    TEXT NOT NULL DEFAULT 'DI Yogyakarta',
  postal_code TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RENTAL IDENTITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rental_identities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  identity_type identity_type NOT NULL,
  document_url  TEXT NOT NULL,
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  verified_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCT CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0
);

-- ============================================================
-- MANNEQUINS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mannequins (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id            UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name                   TEXT NOT NULL,
  slug                   TEXT UNIQUE NOT NULL,
  description            TEXT,
  image_urls             TEXT[] NOT NULL DEFAULT '{}',
  price_per_billing_unit DECIMAL(10,2) NOT NULL,
  billing_unit_hours     INT NOT NULL DEFAULT 3,
  stock                  INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  max_stock              INT NOT NULL DEFAULT 2,
  features               TEXT[] DEFAULT '{}',
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_max CHECK (stock <= max_stock)
);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_type    TEXT NOT NULL,
  vehicle_plate   TEXT NOT NULL,
  license_number  TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.carts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mannequin_id    UUID NOT NULL REFERENCES public.mannequins(id) ON DELETE CASCADE,
  rental_date     DATE NOT NULL,
  start_time      TIME NOT NULL,
  duration_hours  INT NOT NULL CHECK (duration_hours > 0),
  billing_units   INT NOT NULL,
  is_overnight    BOOLEAN NOT NULL DEFAULT false,
  end_time        TIME NOT NULL,
  unit_price      DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mannequin_id, rental_date, start_time)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          TEXT UNIQUE NOT NULL,
  user_id               UUID NOT NULL REFERENCES public.users(id),
  delivery_type         delivery_type NOT NULL,
  delivery_address_id   UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  delivery_fee          DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_distance_km  DECIMAL(6,2),
  subtotal              DECIMAL(12,2) NOT NULL,
  deposit_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount          DECIMAL(12,2) NOT NULL,
  status                booking_status NOT NULL DEFAULT 'pending',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INT;
BEGIN
  v_prefix := 'MSK-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
  SELECT COUNT(*) + 1 INTO v_seq FROM public.orders
  WHERE order_number LIKE v_prefix || '%';
  RETURN v_prefix || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  mannequin_id    UUID NOT NULL REFERENCES public.mannequins(id),
  rental_date     DATE NOT NULL,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  duration_hours  INT NOT NULL,
  billing_units   INT NOT NULL,
  is_overnight    BOOLEAN NOT NULL DEFAULT false,
  unit_price      DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number  TEXT UNIQUE NOT NULL,
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id),
  mannequin_id    UUID NOT NULL REFERENCES public.mannequins(id),
  rental_date     DATE NOT NULL,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  buffer_end_at   TIMESTAMPTZ NOT NULL,
  is_overnight    BOOLEAN NOT NULL DEFAULT false,
  status          booking_status NOT NULL DEFAULT 'pending',
  locked_until    TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_availability
  ON public.bookings(mannequin_id, start_at, buffer_end_at)
  WHERE status NOT IN ('cancelled_by_customer', 'cancelled_by_provider', 'expired');

CREATE INDEX IF NOT EXISTS idx_bookings_by_status
  ON public.bookings(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_bookings_locked_until
  ON public.bookings(locked_until)
  WHERE locked_until IS NOT NULL AND status = 'waiting_payment';

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID UNIQUE NOT NULL REFERENCES public.orders(id),
  midtrans_order_id       TEXT UNIQUE NOT NULL,
  midtrans_transaction_id TEXT,
  payment_method          TEXT,
  payment_channel         TEXT,
  amount                  DECIMAL(12,2) NOT NULL,
  status                  payment_status NOT NULL DEFAULT 'pending',
  midtrans_response       JSONB,
  paid_at                 TIMESTAMPTZ,
  expired_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEPOSITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deposits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID UNIQUE NOT NULL REFERENCES public.orders(id),
  amount        DECIMAL(10,2) NOT NULL,
  status        deposit_status NOT NULL DEFAULT 'held',
  refund_note   TEXT,
  processed_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  returned_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REFUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.refunds (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES public.orders(id),
  payment_id          UUID REFERENCES public.payments(id),
  amount              DECIMAL(12,2) NOT NULL,
  refund_percentage   INT NOT NULL,
  reason              TEXT NOT NULL,
  cancellation_type   TEXT NOT NULL,
  status              refund_status NOT NULL DEFAULT 'pending',
  proof_url           TEXT,
  processed_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DELIVERY TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID UNIQUE NOT NULL REFERENCES public.orders(id),
  driver_id       UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status          delivery_task_status NOT NULL DEFAULT 'assigned',
  pickup_at       TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  proof_image_url TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOKING STATUS LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_status_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  changed_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_status  booking_status,
  new_status  booking_status NOT NULL,
  reason      TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS ENABLEMENT (Examples)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mannequins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_config ENABLE ROW LEVEL SECURITY;

-- (Policies definition omitted for brevity, will be handled via API/Client config)
