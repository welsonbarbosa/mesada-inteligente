-- Secure, single-use, expiring family invitations (replaces legacy 6-char codes).
create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  role public.family_role not null,
  token_hash bytea not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid,
  accepted_at timestamptz,
  accepted_by uuid
);
create index family_invitations_family_idx on public.family_invitations(family_id, created_at desc);

-- token_hash is never readable through the Data API (column-level grant).
grant select (id, family_id, role, created_by, created_at, expires_at, revoked_at, revoked_by, accepted_at, accepted_by)
  on public.family_invitations to authenticated;
grant all on public.family_invitations to service_role;
alter table public.family_invitations enable row level security;
create policy "parents read family invitations" on public.family_invitations for select to authenticated
  using (family_id = public.my_family_id() and public.my_role() = 'parent');

create or replace function public._hash_invite_token(_token text) returns bytea
language sql immutable set search_path = public as $$
  select sha256(convert_to(coalesce(_token, ''), 'UTF8'))
$$;

-- Parent creates an invite; returns the raw token ONCE (only its hash is stored).
create or replace function public.create_family_invite(_role public.family_role, _valid_hours integer default 72)
returns table(id uuid, token text, expires_at timestamptz)
language plpgsql volatile security definer set search_path = public as $$
declare f uuid := public._require_parent(); t text; i uuid; e timestamptz;
begin
  if _role is null then raise exception 'Papel inválido'; end if;
  if _valid_hours is null or _valid_hours < 1 or _valid_hours > 168 then
    raise exception 'Validade deve ser entre 1 hora e 7 dias';
  end if;
  if (select count(*) from public.family_invitations fi
      where fi.family_id = f and fi.accepted_at is null and fi.revoked_at is null and fi.expires_at > now()) >= 10 then
    raise exception 'Limite de 10 convites pendentes. Revogue algum antes.';
  end if;
  t := encode(extensions.gen_random_bytes(32), 'hex');
  e := now() + make_interval(hours => _valid_hours);
  insert into public.family_invitations(family_id, role, token_hash, created_by, expires_at)
    values (f, _role, public._hash_invite_token(t), auth.uid(), e) returning family_invitations.id into i;
  return query select i, t, e;
end $$;

create or replace function public.revoke_family_invite(_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare f uuid := public._require_parent(); n int;
begin
  update public.family_invitations set revoked_at = now(), revoked_by = auth.uid()
    where id = _id and family_id = f and accepted_at is null and revoked_at is null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Convite não encontrado ou já encerrado'; end if;
end $$;

-- Lets a signed-in token holder see what the invite is, without accepting.
create or replace function public.preview_family_invite(_token text)
returns table(status text, role public.family_role, family_name text, expires_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select fi.*, fa.name as fname into r from public.family_invitations fi join public.families fa on fa.id = fi.family_id
    where fi.token_hash = public._hash_invite_token(_token);
  if not found then return query select 'invalid'::text, null::public.family_role, null::text, null::timestamptz; return; end if;
  return query select
    case when r.accepted_at is not null then 'used'
         when r.revoked_at is not null then 'revoked'
         when r.expires_at <= now() then 'expired'
         else 'valid' end,
    r.role, r.fname, r.expires_at;
end $$;

-- Atomic, single-use acceptance. Role and family come only from the stored invite.
create or replace function public.accept_family_invite(_token text, _display_name text) returns public.family_role
language plpgsql volatile security definer set search_path = public as $$
declare r public.family_invitations%rowtype; dn text := trim(coalesce(_display_name, ''));
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  if char_length(dn) < 1 or char_length(dn) > 40 then raise exception 'Informe um nome de 1 a 40 caracteres'; end if;
  select * into r from public.family_invitations where token_hash = public._hash_invite_token(_token) for update;
  if not found then raise exception 'Convite inválido'; end if;
  if r.accepted_at is not null then raise exception 'Este convite já foi utilizado'; end if;
  if r.revoked_at is not null then raise exception 'Este convite foi revogado'; end if;
  if r.expires_at <= now() then raise exception 'Este convite expirou'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Você já faz parte de uma família';
  end if;
  insert into public.family_members(family_id, user_id, role, display_name) values (r.family_id, auth.uid(), r.role, dn);
  update public.family_invitations set accepted_at = now(), accepted_by = auth.uid() where id = r.id;
  return r.role;
end $$;

-- ===== Retire legacy permanent 6-char codes =====
create or replace function public.join_family(_code text, _display_name text) returns public.family_role
language plpgsql security definer set search_path = public as $$
begin raise exception 'Códigos antigos foram desativados. Peça um novo link de convite.'; end $$;
create or replace function public.regenerate_invites() returns void
language plpgsql security definer set search_path = public as $$
begin raise exception 'Códigos antigos foram desativados. Use os links de convite.'; end $$;

create or replace function public.create_family(_family_name text, _display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Você já faz parte de uma família';
  end if;
  insert into public.families(name, created_by) values (trim(_family_name), auth.uid()) returning id into f;
  insert into public.family_members(family_id, user_id, role, display_name) values (f, auth.uid(), 'parent', trim(_display_name));
  return f;
end $$;

revoke execute on function public.join_family(text,text), public.regenerate_invites() from public, anon, authenticated;
revoke select on public.family_invites from authenticated, anon;
drop policy if exists "parents read invites" on public.family_invites;
comment on table public.family_invites is 'DEPRECATED: replaced by family_invitations (hashed, expiring, single-use links)';
comment on function public.join_family(text,text) is 'DEPRECATED: disabled; use accept_family_invite';
comment on function public.regenerate_invites() is 'DEPRECATED: disabled; use create_family_invite';

revoke execute on function public._hash_invite_token(text) from public, anon, authenticated;
revoke execute on function public.create_family_invite(public.family_role, integer), public.revoke_family_invite(uuid),
  public.preview_family_invite(text), public.accept_family_invite(text, text) from public, anon;
grant execute on function public.create_family_invite(public.family_role, integer), public.revoke_family_invite(uuid),
  public.preview_family_invite(text), public.accept_family_invite(text, text) to authenticated;