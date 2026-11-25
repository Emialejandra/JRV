begin;

alter table public.actas
  add column if not exists dignidad character varying;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.actas'::regclass
      and conname = 'actas_dignidad_check'
  ) then
    alter table public.actas
      add constraint actas_dignidad_check
      check (dignidad is null or dignidad in ('alcaldia', 'prefectura'));
  end if;
end
$$;

-- Clasifica actas antiguas solo cuando todos sus votos apuntan a una dignidad.
with dignidad_por_acta as (
  select d.acta_id, min(c.dignidad) as dignidad
  from public.detalle_votos d
  join public.candidaturas c on c.id = d.candidatura_id
  where c.dignidad in ('alcaldia', 'prefectura')
  group by d.acta_id
  having count(distinct c.dignidad) = 1
)
update public.actas a
set dignidad = inferida.dignidad
from dignidad_por_acta inferida
where a.id = inferida.acta_id
  and a.dignidad is null;

commit;
