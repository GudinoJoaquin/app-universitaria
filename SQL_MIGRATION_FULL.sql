-- ============================================================
--  MIGRATION COMPLETA: Multi-State + Event Registrations
--  Pegar TODO en el SQL Editor de Supabase y ejecutar
-- ============================================================

-- ============================================================
-- PASO 1: Crear tabla user_states (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_states (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  state_id   uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_states_pkey PRIMARY KEY (id),
  CONSTRAINT user_states_user_id_fkey  FOREIGN KEY (user_id)  REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_states_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id)   ON DELETE CASCADE,
  CONSTRAINT user_states_unique UNIQUE (user_id, state_id)
);

-- ============================================================
-- PASO 2: Crear tabla event_registrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  event_id   uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT event_registrations_user_id_fkey  FOREIGN KEY (user_id)  REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)   ON DELETE CASCADE,
  CONSTRAINT event_registrations_unique UNIQUE (user_id, event_id)
);

-- ============================================================
-- PASO 3: Migrar datos existentes de profiles.state_id → user_states
-- ============================================================
INSERT INTO public.user_states (user_id, state_id)
SELECT id, state_id
FROM public.profiles
WHERE state_id IS NOT NULL
ON CONFLICT (user_id, state_id) DO NOTHING;

-- Verificar cuántos se migraron
SELECT COUNT(*) as migrados FROM public.user_states;

-- ============================================================
-- PASO 4: Eliminar la columna state_id de profiles
-- (Solo ejecutar DESPUÉS de verificar que el paso 3 migró bien)
-- ============================================================
ALTER TABLE public.profiles DROP COLUMN IF EXISTS state_id;

-- ============================================================
-- PASO 5: Corregir el CHECK constraint de roles en profiles
-- (Agregar 'Helper' y 'Organizer' si no están)
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['Admin'::text, 'Helper'::text, 'Organizer'::text, 'User'::text]));

-- ============================================================
-- PASO 6: Asegurar que states tiene los datos necesarios
-- ============================================================
INSERT INTO public.states (name, color, is_default) VALUES
  ('Estudiante', '#3B82F6', TRUE),
  ('Profesor',   '#10B981', FALSE),
  ('Magistrado', '#F59E0B', FALSE),
  ('Directiva',  '#EF4444', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PASO 7: Trigger para asignar estado default en user_states al crear profile
-- ============================================================
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS public.set_default_state_on_profile() CASCADE;

CREATE OR REPLACE FUNCTION public.set_default_state_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_state_id uuid;
BEGIN
  -- Buscar el estado por defecto
  SELECT id INTO v_default_state_id
  FROM public.states
  WHERE is_default = TRUE
  LIMIT 1;

  -- Insertar en user_states si encontramos el estado default
  IF v_default_state_id IS NOT NULL THEN
    INSERT INTO public.user_states (user_id, state_id)
    VALUES (NEW.id, v_default_state_id)
    ON CONFLICT (user_id, state_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_default_state_on_profile();

-- ============================================================
-- PASO 8: RLS Policies
-- ============================================================

-- user_states: lectura para autenticados, escritura para Admin/Helper (vía service_role)
ALTER TABLE public.user_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own states" ON public.user_states;
CREATE POLICY "Users can read own states"
ON public.user_states FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and helpers can manage user_states" ON public.user_states;
CREATE POLICY "Admins and helpers can manage user_states"
ON public.user_states FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- event_registrations: lectura/escritura para usuarios autenticados
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own registrations" ON public.event_registrations;
CREATE POLICY "Users can manage own registrations"
ON public.event_registrations FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- states: lectura pública para todos los autenticados
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read states" ON public.states;
CREATE POLICY "Authenticated users can read states"
ON public.states FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage states" ON public.states;
CREATE POLICY "Admins can manage states"
ON public.states FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- profiles: política básica
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
CREATE POLICY "Users can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================================
-- PASO 9: Asignar estado default a todos los profiles sin estado
-- ============================================================
INSERT INTO public.user_states (user_id, state_id)
SELECT p.id, s.id
FROM public.profiles p
CROSS JOIN public.states s
WHERE s.is_default = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.user_states us
    WHERE us.user_id = p.id
  )
ON CONFLICT (user_id, state_id) DO NOTHING;

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT 'Profiles sin estados:' as check, COUNT(*) as total
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_states us WHERE us.user_id = p.id)
UNION ALL
SELECT 'Total user_states:', COUNT(*) FROM public.user_states
UNION ALL
SELECT 'Total event_registrations:', COUNT(*) FROM public.event_registrations
UNION ALL
SELECT 'Trigger on_profile_created:', COUNT(*) 
FROM information_schema.triggers 
WHERE trigger_name = 'on_profile_created';
