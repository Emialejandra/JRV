-- Consultas de solo lectura para ejecutar en Supabase SQL Editor antes de
-- aplicar 20261124174000_backend_additions.sql en el proyecto destino.

-- Tablas y columnas que usa la aplicación y la migración.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'actas', 'asignaciones', 'candidaturas', 'cantones', 'detalle_votos',
    'jrv', 'organizaciones', 'parroquias', 'perfiles', 'provincias', 'recintos'
  )
order by table_name, ordinal_position;

-- PK, FK, UNIQUE y CHECK existentes.
select table_name, constraint_name, constraint_type, constraint_definition
from information_schema.table_constraints tc
left join lateral (
  select pg_get_constraintdef(c.oid) as constraint_definition
  from pg_constraint c
  where c.conname = tc.constraint_name
    and c.conrelid = format('%I.%I', tc.table_schema, tc.table_name)::regclass
) definition on true
where tc.table_schema = 'public'
  and tc.table_name in (
    'actas', 'asignaciones', 'candidaturas', 'cantones', 'detalle_votos',
    'jrv', 'organizaciones', 'parroquias', 'perfiles', 'provincias', 'recintos'
  )
order by table_name, constraint_type, constraint_name;

-- RLS habilitado y políticas actuales de tablas públicas.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       p.polname as policy_name, p.polpermissive as permissive,
       p.polcmd as command, p.polroles::regrole[] as roles,
       pg_get_expr(p.polqual, p.polrelid) as using_expression,
       pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname in ('public', 'storage')
  and c.relname in (
    'actas', 'asignaciones', 'candidaturas', 'detalle_votos', 'jrv', 'perfiles', 'recintos', 'objects'
  )
order by n.nspname, c.relname, p.polname;

-- Triggers de las tablas relevantes.
select event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('actas', 'asignaciones', 'detalle_votos', 'jrv', 'perfiles', 'recintos')
order by event_object_table, trigger_name;

-- Índices de las tablas relevantes (incluye unicidad y predicados parciales).
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('actas', 'asignaciones', 'candidaturas', 'detalle_votos', 'jrv', 'organizaciones', 'recintos')
order by tablename, indexname;

-- Bucket y sus límites actuales.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'actas-electorales';

-- RPC y firmas actuales que pudieran colisionar con esta migración.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as result,
       p.prosecdef as security_definer,
       p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'guardar_acta_electoral', 'crear_recinto_con_jrv', 'asignar_veedor_jrv',
    'desactivar_asignacion_veedor', 'precargar_datos_electorales'
  )
order by p.proname, arguments;
