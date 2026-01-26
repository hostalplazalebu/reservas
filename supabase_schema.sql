-- Create rooms configuration
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    emoji TEXT,
    price INTEGER NOT NULL
);

-- Insert initial rooms if they don't exist
INSERT INTO rooms (id, name, color, emoji, price) 
VALUES 
(1, 'Habitación 1', '#ef4444', '🔴', 45000),
(2, 'Habitación 2', '#3b82f6', '🔵', 45000),
(3, 'Habitación 3', '#10b981', '🟢', 48000),
(4, 'Habitación 4', '#f59e0b', '🟠', 42000),
(5, 'Habitación 5', '#8b5cf6', '🟣', 50000)
ON CONFLICT (id) DO NOTHING;

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_huesped TEXT NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    habitacion_id INTEGER REFERENCES rooms(id),
    num_personas INTEGER NOT NULL DEFAULT 2,
    precio_noche INTEGER NOT NULL,
    anticipo INTEGER DEFAULT 0,
    notas TEXT,
    checked_in BOOLEAN DEFAULT false,
    checked_out BOOLEAN DEFAULT false,
    estado_pago TEXT DEFAULT 'pendiente',
    metodo_pago TEXT DEFAULT 'efectivo',
    monto_total INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Borrar políticas previas para evitar errores de duplicado
DROP POLICY IF EXISTS "Enable access for authenticated users only" ON reservations;
DROP POLICY IF EXISTS "Habilitar acceso solo para usuarios autenticados" ON reservations;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON rooms;
DROP POLICY IF EXISTS "Habilitar acceso de lectura solo para usuarios autenticados" ON rooms;
DROP POLICY IF EXISTS "Allow all for now" ON reservations;
DROP POLICY IF EXISTS "Allow all for now" ON rooms;

-- Create profiles table for RBAC
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update profiles" ON profiles
    FOR UPDATE TO authenticated 
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- Update Reservations Policies to be more restrictive
DROP POLICY IF EXISTS "auth_access_reservations" ON reservations;

CREATE POLICY "Viewers can read reservations" ON reservations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and Admins can insert reservations" ON reservations
    FOR INSERT TO authenticated 
    WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'editor') );

CREATE POLICY "Editors and Admins can update reservations" ON reservations
    FOR UPDATE TO authenticated 
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'editor') );

CREATE POLICY "Admins can delete reservations" ON reservations
    FOR DELETE TO authenticated 
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'viewer'); -- Default role is viewer
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
