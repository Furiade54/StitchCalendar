-- 1. Crear la tabla de Familias
create table public.families (
  id uuid default gen_random_uuid() primary key,
  name text, -- Opcional: "Familia Pérez"
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Vincular Usuarios a Familias
-- Agregamos la columna family_id a la tabla de perfiles existente
alter table public.profiles 
add column family_id uuid references public.families(id);

-- 3. Políticas de Seguridad (RLS) - Concepto Clave
-- Permitir que usuarios vean perfiles de SU misma familia
create policy "Usuarios pueden ver miembros de su familia"
on public.profiles
for select
using (
  auth.uid() = id -- Ver su propio perfil
  OR 
  family_id = (select family_id from public.profiles where id = auth.uid()) -- Ver miembros de familia
);
