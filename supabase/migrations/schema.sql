-- ----------------------------------------------------
-- ARCHIVO DE MIGRACIÓN Y ESQUEMA - CONTROL DE PRÉSTAMOS
-- ----------------------------------------------------

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: profiles (Perfiles de usuarios)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Relacionado con auth.users.id
    email TEXT UNIQUE NOT NULL,
    short_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLA: lugares (Aulas / Laboratorios)
CREATE TABLE IF NOT EXISTS public.lugares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLA: tipos_equipo (Categorías)
CREATE TABLE IF NOT EXISTS public.tipos_equipo (
    id TEXT PRIMARY KEY, -- ej: 'proyector', 'pc'
    nombre TEXT NOT NULL,
    icono TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABLA: equipos (Inventario permanente)
CREATE TABLE IF NOT EXISTS public.equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_unico TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT REFERENCES public.tipos_equipo(id) ON UPDATE CASCADE,
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_uso', 'mantenimiento', 'de_baja')),
    estado_otro TEXT,
    ubicacion_actual TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABLA: prestamos
CREATE TABLE IF NOT EXISTS public.prestamos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lugar_id UUID REFERENCES public.lugares(id),
    equipo_id UUID REFERENCES public.equipos(id),
    cantidad INT NOT NULL DEFAULT 1,
    responsable TEXT NOT NULL DEFAULT '',
    fecha_prestamo TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_devolucion TIMESTAMPTZ,
    estado TEXT NOT NULL DEFAULT 'prestado' CHECK (estado IN ('prestado', 'devuelto', 'vencido')),
    observaciones TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6. TABLA: eventos_agenda
CREATE TABLE IF NOT EXISTS public.eventos_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    lugar_id UUID REFERENCES public.lugares(id),
    titulo TEXT,
    descripcion TEXT,
    responsable TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABLA: tasks (Tareas pendientes/completadas)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completada')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    completion_message TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 8. TABLA: task_assignments (Asignados a tareas N:M)
CREATE TABLE IF NOT EXISTS public.task_assignments (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
);

-- 9. TABLA: task_updates (Comentarios/Avances)
CREATE TABLE IF NOT EXISTS public.task_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TABLA: audit_logs (Bitácora)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_short_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT NOT NULL,
    module TEXT NOT NULL
);

-- 11. TABLA: equipment_history (Historial de equipos)
CREATE TABLE IF NOT EXISTS public.equipment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id UUID REFERENCES public.equipos(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('creacion', 'edicion', 'baja', 'prestamo', 'devolucion')),
    previous_state TEXT,
    new_state TEXT,
    previous_location TEXT,
    new_location TEXT,
    details TEXT
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lugares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- FUNCIONES DE SEGURIDAD PARA POLÍTICAS RLS (EVITA RECURSIÓN)
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------
-- POLÍTICAS RLS
-- ----------------------------------------------------

-- Profiles
CREATE POLICY "Lectura de perfiles para usuarios activos" ON public.profiles FOR SELECT USING (public.is_active_user());
CREATE POLICY "Admin puede crear/editar/borrar perfiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Lugares
CREATE POLICY "Lectura de lugares para usuarios activos" ON public.lugares FOR SELECT USING (public.is_active_user());
CREATE POLICY "Admin puede modificar lugares" ON public.lugares FOR ALL USING (public.is_admin());

-- Tipos de Equipo
CREATE POLICY "Lectura de tipos para usuarios activos" ON public.tipos_equipo FOR SELECT USING (public.is_active_user());
CREATE POLICY "Admin puede modificar tipos" ON public.tipos_equipo FOR ALL USING (public.is_admin());

-- Equipos
CREATE POLICY "Lectura de equipos para usuarios activos" ON public.equipos FOR SELECT USING (public.is_active_user());
CREATE POLICY "Usuarios activos pueden actualizar estado de equipos" ON public.equipos FOR UPDATE USING (public.is_active_user());
CREATE POLICY "Admin puede modificar equipos completamente" ON public.equipos FOR ALL USING (public.is_admin());

-- Préstamos
CREATE POLICY "Acceso total a préstamos para usuarios activos" ON public.prestamos FOR ALL USING (public.is_active_user());

-- Eventos Agenda
CREATE POLICY "Acceso total a agenda para usuarios activos" ON public.eventos_agenda FOR ALL USING (public.is_active_user());

-- Tareas
CREATE POLICY "Acceso total a tareas para usuarios activos" ON public.tasks FOR ALL USING (public.is_active_user());

-- Asignaciones de Tareas
CREATE POLICY "Acceso total a asignaciones para usuarios activos" ON public.task_assignments FOR ALL USING (public.is_active_user());

-- Comentarios de Tareas
CREATE POLICY "Acceso total a comentarios para usuarios activos" ON public.task_updates FOR ALL USING (public.is_active_user());

-- Audit Logs (Solo lectura para Admin, inserción para todos los activos mediante backend/triggers)
CREATE POLICY "Admin puede ver logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Usuarios activos pueden registrar logs" ON public.audit_logs FOR INSERT WITH CHECK (public.is_active_user());

-- Equipment History (Lectura para usuarios activos, escritura para admin/triggers)
CREATE POLICY "Lectura de historial de equipos para usuarios activos" ON public.equipment_history FOR SELECT USING (public.is_active_user());
CREATE POLICY "Escritura de historial de equipos para usuarios activos" ON public.equipment_history FOR INSERT WITH CHECK (public.is_active_user());

-- ----------------------------------------------------
-- TRIGGERS DE AUDITORÍA AUTOMÁTICA
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_action_trigger()
RETURNS trigger AS $$
DECLARE
  v_short_name TEXT;
  v_details TEXT;
  v_module TEXT;
  v_action TEXT;
BEGIN
  -- Obtener nombre corto del usuario actual de la sesión
  SELECT short_name INTO v_short_name FROM public.profiles WHERE id = auth.uid();
  IF v_short_name IS NULL THEN
    v_short_name := 'System';
  END IF;

  -- Módulo y Detalles según la tabla modificada
  IF TG_TABLE_NAME = 'equipos' THEN
    v_module := 'equipos';
    IF TG_OP = 'INSERT' THEN
      v_action := 'Alta de equipo';
      v_details := 'Se registró el equipo ' || NEW.codigo_unico || ' (' || NEW.nombre || ')';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_deleted = TRUE THEN
        v_action := 'Baja de equipo';
        v_details := 'Se dio de baja lógica el equipo ' || NEW.codigo_unico;
      ELSIF OLD.estado <> NEW.estado THEN
        v_action := 'Cambio de estado';
        v_details := 'Equipo ' || NEW.codigo_unico || ' cambió de "' || OLD.estado || '" a "' || NEW.estado || '"';
      ELSE
        v_action := 'Edición de equipo';
        v_details := 'Se modificaron datos del equipo ' || NEW.codigo_unico;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Eliminación física';
      v_details := 'Se eliminó físicamente el equipo ' || OLD.codigo_unico;
    END IF;

  ELSIF TG_TABLE_NAME = 'prestamos' THEN
    v_module := 'prestamos';
    IF TG_OP = 'INSERT' THEN
      v_action := 'Préstamo registrado';
      v_details := 'Préstamo registrado para equipo ID ' || NEW.equipo_id;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.estado <> NEW.estado THEN
        v_action := 'Devolución de equipo';
        v_details := 'Préstamo ID ' || NEW.id || ' marcado como ' || NEW.estado;
      ELSE
        v_action := 'Edición de préstamo';
        v_details := 'Se editó el préstamo ID ' || NEW.id;
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'eventos_agenda' THEN
    v_module := 'agenda';
    IF TG_OP = 'INSERT' THEN
      v_action := 'Evento agendado';
      v_details := 'Se creó el evento "' || NEW.titulo || '"';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_deleted = TRUE THEN
        v_action := 'Cancelación de evento';
        v_details := 'Se canceló el evento "' || NEW.titulo || '"';
      ELSE
        v_action := 'Edición de evento';
        v_details := 'Se editó el evento "' || NEW.titulo || '"';
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'Eliminación de evento';
      v_details := 'Se eliminó el evento "' || OLD.titulo || '"';
    END IF;

  ELSIF TG_TABLE_NAME = 'tasks' THEN
    v_module := 'tareas';
    IF TG_OP = 'INSERT' THEN
      v_action := 'Tarea creada';
      v_details := 'Se registró una nueva tarea: "' || LEFT(NEW.description, 50) || '..."';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_deleted = TRUE THEN
        v_action := 'Baja de tarea';
        v_details := 'Se dio de baja la tarea: "' || LEFT(NEW.description, 50) || '..."';
      ELSIF OLD.status <> NEW.status AND NEW.status = 'completada' THEN
        v_action := 'Tarea completada';
        v_details := 'Se completó la tarea: "' || LEFT(NEW.description, 50) || '..." con resolución: ' || COALESCE(NEW.completion_message, 'Sin detalles');
      ELSE
        v_action := 'Edición de tarea';
        v_details := 'Se modificaron datos de la tarea';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, user_short_name, action_type, details, module)
  VALUES (auth.uid(), v_short_name, v_action, v_details, v_module);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntar triggers de auditoría
CREATE TRIGGER audit_equipos_trg AFTER INSERT OR UPDATE OR DELETE ON public.equipos FOR EACH ROW EXECUTE FUNCTION public.log_action_trigger();
CREATE TRIGGER audit_prestamos_trg AFTER INSERT OR UPDATE OR DELETE ON public.prestamos FOR EACH ROW EXECUTE FUNCTION public.log_action_trigger();
CREATE TRIGGER audit_eventos_agenda_trg AFTER INSERT OR UPDATE OR DELETE ON public.eventos_agenda FOR EACH ROW EXECUTE FUNCTION public.log_action_trigger();
CREATE TRIGGER audit_tasks_trg AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_action_trigger();

-- ----------------------------------------------------
-- TRIGGER DE TRAZABILIDAD E HISTORIAL DE EQUIPOS
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_equipment_history_trigger()
RETURNS trigger AS $$
DECLARE
  v_action TEXT;
  v_details TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'creacion';
    v_details := 'Registro inicial del equipo en el sistema';
    
    INSERT INTO public.equipment_history (equipo_id, user_id, action_type, new_state, new_location, details)
    VALUES (NEW.id, auth.uid(), v_action, NEW.estado, NEW.ubicacion_actual, v_details);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.estado <> NEW.estado OR OLD.ubicacion_actual <> NEW.ubicacion_actual OR OLD.is_deleted <> NEW.is_deleted THEN
      IF NEW.is_deleted = TRUE THEN
        v_action := 'baja';
        v_details := 'Equipo dado de baja lógica del sistema';
      ELSIF NEW.estado = 'de_baja' THEN
        v_action := 'baja';
        v_details := 'Equipo marcado como De Baja';
      ELSE
        v_action := 'edicion';
        v_details := 'Modificación de estado o ubicación';
      END IF;
      
      INSERT INTO public.equipment_history (equipo_id, user_id, action_type, previous_state, new_state, previous_location, new_location, details)
      VALUES (NEW.id, auth.uid(), v_action, OLD.estado, NEW.estado, OLD.ubicacion_actual, NEW.ubicacion_actual, v_details);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER history_equipos_trg AFTER INSERT OR UPDATE ON public.equipos FOR EACH ROW EXECUTE FUNCTION public.log_equipment_history_trigger();

-- ----------------------------------------------------
-- TRIGGER: Sincronización automática de profiles al registrarse
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, short_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'short_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
