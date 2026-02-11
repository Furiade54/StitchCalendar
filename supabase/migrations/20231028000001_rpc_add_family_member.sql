-- Esta función maneja la lógica compleja de agregar miembros
-- Se ejecuta con 'security definer' para tener permisos de escritura sobre otros usuarios
create or replace function public.add_family_member(target_email text)
returns json
language plpgsql
security definer 
as $$
declare
  current_user_id uuid;
  target_user_id uuid;
  current_family_id uuid;
  target_family_id uuid;
  new_family_id uuid;
  target_profile record;
begin
  -- 1. Identificar al usuario que ejecuta la acción
  current_user_id := auth.uid();
  
  -- 2. Buscar al usuario objetivo por email
  select id, family_id into target_user_id, target_family_id 
  from public.profiles 
  where email = lower(target_email);

  if target_user_id is null then
    return json_build_object('error', 'No se encontró ningún usuario con ese email');
  end if;

  if target_user_id = current_user_id then
    return json_build_object('error', 'No puedes agregarte a ti mismo');
  end if;

  -- 3. Obtener estado actual del iniciador
  select family_id into current_family_id 
  from public.profiles 
  where id = current_user_id;

  -- 4. Validaciones de lógica de negocio
  if target_family_id is not null and target_family_id != current_family_id then
     return json_build_object('error', 'Este usuario ya pertenece a otro grupo familiar');
  end if;

  if target_family_id is not null and target_family_id = current_family_id then
     return json_build_object('error', 'Este usuario ya está en tu grupo familiar');
  end if;

  -- 5. Lógica de Asignación / Creación de Familia
  if current_family_id is null then
    -- Crear nueva familia si el usuario actual no tiene una
    insert into public.families (name) 
    values ('Familia Nueva') 
    returning id into new_family_id;

    -- Actualizar usuario actual
    update public.profiles 
    set family_id = new_family_id 
    where id = current_user_id;
    
    current_family_id := new_family_id;
  end if;

  -- 6. Actualizar al usuario objetivo (Aquí es donde el SECURITY DEFINER es crucial)
  update public.profiles 
  set family_id = current_family_id 
  where id = target_user_id;

  -- 7. Retornar éxito y datos del usuario agregado
  select * into target_profile from public.profiles where id = target_user_id;
  
  return row_to_json(target_profile);
end;
$$;
