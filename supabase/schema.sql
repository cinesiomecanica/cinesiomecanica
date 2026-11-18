-- Cinesiomecânica: assinantes, administradores e cofre de conteúdo
create table if not exists public.assinantes (
  email text primary key check (email = lower(email)),
  plano text not null default 'manual',
  valido_ate timestamptz not null,
  origem text default 'manual',
  ref text,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.admins (email text primary key check (email = lower(email)));
alter table public.assinantes enable row level security;
alter table public.admins enable row level security;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where email = lower(coalesce(auth.jwt()->>'email','')));
$$;
create or replace function public.tem_acesso() returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_admin() or exists(
    select 1 from public.assinantes
    where email = lower(coalesce(auth.jwt()->>'email','')) and valido_ate > now());
$$;
revoke all on function public.eh_admin() from public, anon;
revoke all on function public.tem_acesso() from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.tem_acesso() to authenticated;

grant select, insert, update, delete on public.assinantes to authenticated;
grant select on public.admins to authenticated;

drop policy if exists "ve a propria assinatura" on public.assinantes;
create policy "ve a propria assinatura" on public.assinantes for select to authenticated
  using (email = lower(coalesce(auth.jwt()->>'email','')) or public.eh_admin());
drop policy if exists "admin insere" on public.assinantes;
create policy "admin insere" on public.assinantes for insert to authenticated with check (public.eh_admin());
drop policy if exists "admin altera" on public.assinantes;
create policy "admin altera" on public.assinantes for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
drop policy if exists "admin apaga" on public.assinantes;
create policy "admin apaga" on public.assinantes for delete to authenticated using (public.eh_admin());
drop policy if exists "admin ve admins" on public.admins;
create policy "admin ve admins" on public.admins for select to authenticated using (public.eh_admin());

insert into public.admins (email) values ('contato@cinesiomecanica.com.br'), ('matheusgarrido97@icloud.com')
  on conflict do nothing;

-- cofre privado com as fichas e textos
insert into storage.buckets (id, name, public) values ('conteudo', 'conteudo', false)
  on conflict (id) do update set public = false;
drop policy if exists "assinante le conteudo" on storage.objects;
create policy "assinante le conteudo" on storage.objects for select to authenticated
  using (bucket_id = 'conteudo' and public.tem_acesso());
