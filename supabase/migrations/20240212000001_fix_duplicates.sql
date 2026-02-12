-- 1. Eliminar duplicados manteniendo el ID más reciente
DELETE FROM public.event_types a
USING public.event_types b
WHERE a.id < b.id
AND a.user_id = b.user_id
AND a.name = b.name;

-- 2. Asegurar que no se puedan crear duplicados en el futuro
ALTER TABLE public.event_types
ADD CONSTRAINT unique_user_event_type_name UNIQUE (user_id, name);
