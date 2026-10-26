
-- ===== Enums =====
create type public.family_role as enum ('parent','child');
create type public.task_frequency as enum ('daily','weekly');
create type public.submission_status as enum ('pending','approved','rejected');
create type public.ledger_kind as enum ('allowance','task_reward','payment','reserve_add','reserve_remove');

-- ===== Tables =====
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  allowance_cents integer not null default 2000 check (allowance_cents between 0 and 1000000),
  allowance_active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table public.family_invites (
  family_id uuid primary key references public.families(id) on delete cascade,
  parent_code text not null unique,
  child_code text not null unique
);

-- Roles live here (separate from profile data), one family per user.
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null unique,
  role public.family_role not null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 300),
  reward_cents integer not null check (reward_cents between 0 and 100000),
  frequency public.task_frequency not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  child_id uuid not null,
  period_key date not null,
  reward_cents integer not null,
  status public.submission_status not null default 'pending',
  child_note text check (char_length(child_note) <= 300),
  review_comment text check (char_length(review_comment) <= 300),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index task_submissions_one_active_per_period
  on public.task_submissions(task_id, child_id, period_key)
  where status in ('pending','approved');

create table public.goals (
  child_id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  target_cents integer not null check (target_cents between 100 and 10000000),
  updated_at timestamptz not null default now()
);

create table public.week_closures (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null,
  week_start date not null,
  amount_cents integer not null,
  closed_by uuid not null,
  created_at timestamptz not null default now(),
  unique (child_id, week_start)
);

-- Immutable ledger. All amounts positive; kind defines direction.
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null,
  kind public.ledger_kind not null,
  amount_cents integer not null check (amount_cents > 0),
  idempotency_key text not null,
  ref_id uuid,
  note text check (char_length(note) <= 300),
  occurred_on date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (family_id, idempotency_key)
);
create index ledger_entries_child_idx on public.ledger_entries(child_id, created_at desc);

-- ===== Grants: reads only; all writes go through validated functions =====
grant select on public.families, public.family_invites, public.family_members, public.tasks,
  public.task_submissions, public.goals, public.week_closures, public.ledger_entries to authenticated;
grant all on public.families, public.family_invites, public.family_members, public.tasks,
  public.task_submissions, public.goals, public.week_closures, public.ledger_entries to service_role;

alter table public.families enable row level security;
alter table public.family_invites enable row level security;
alter table public.family_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.goals enable row level security;
alter table public.week_closures enable row level security;
alter table public.ledger_entries enable row level security;

-- ===== Helpers =====
create or replace function public.my_family_id() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.family_members where user_id = auth.uid()
$$;
create or replace function public.my_role() returns public.family_role
language sql stable security definer set search_path = public as $$
  select role from public.family_members where user_id = auth.uid()
$$;

-- ===== Policies (scoped by family; children only see their own money/submissions) =====
create policy "family read" on public.families for select to authenticated using (id = public.my_family_id());
create policy "parents read invites" on public.family_invites for select to authenticated
  using (family_id = public.my_family_id() and public.my_role() = 'parent');
create policy "family members read" on public.family_members for select to authenticated using (family_id = public.my_family_id());
create policy "family tasks read" on public.tasks for select to authenticated using (family_id = public.my_family_id());
create policy "submissions read" on public.task_submissions for select to authenticated
  using (family_id = public.my_family_id() and (public.my_role() = 'parent' or child_id = auth.uid()));
create policy "goals read" on public.goals for select to authenticated
  using (family_id = public.my_family_id() and (public.my_role() = 'parent' or child_id = auth.uid()));
create policy "closures read" on public.week_closures for select to authenticated
  using (family_id = public.my_family_id() and (public.my_role() = 'parent' or child_id = auth.uid()));
create policy "ledger read" on public.ledger_entries for select to authenticated
  using (family_id = public.my_family_id() and (public.my_role() = 'parent' or child_id = auth.uid()));

-- Ledger immutability guard (even for privileged roles)
create or replace function public.ledger_immutable() returns trigger language plpgsql as $$
begin raise exception 'Lançamentos são imutáveis'; end $$;
create trigger ledger_no_update before update or delete on public.ledger_entries
  for each row execute function public.ledger_immutable();

-- ===== Internal helpers =====
create or replace function public._gen_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '')
  from generate_series(1,6)
$$;

create or replace function public._require_parent() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare f uuid;
begin
  select family_id into f from public.family_members where user_id = auth.uid() and role = 'parent';
  if f is null then raise exception 'Apenas responsáveis podem fazer isso'; end if;
  return f;
end $$;

create or replace function public._require_child_in_family(_child uuid, _family uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.family_members where user_id = _child and family_id = _family and role = 'child') then
    raise exception 'Criança não encontrada nesta família';
  end if;
end $$;

-- Balance summary (cents). owed = earned - paid; available = owed - reserved.
create or replace function public.child_balance(_child uuid)
returns table(earned bigint, paid bigint, reserved bigint, owed bigint, available bigint)
language sql stable security definer set search_path = public as $$
  with s as (
    select
      coalesce(sum(amount_cents) filter (where kind in ('allowance','task_reward')),0)::bigint as earned,
      coalesce(sum(amount_cents) filter (where kind = 'payment'),0)::bigint as paid,
      (coalesce(sum(amount_cents) filter (where kind = 'reserve_add'),0)
        - coalesce(sum(amount_cents) filter (where kind = 'reserve_remove'),0))::bigint as reserved
    from public.ledger_entries
    where child_id = _child
      and family_id = public.my_family_id()
      and (public.my_role() = 'parent' or _child = auth.uid())
  )
  select earned, paid, reserved, earned - paid, earned - paid - reserved from s
$$;

-- ===== Onboarding =====
create or replace function public.create_family(_family_name text, _display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Você já faz parte de uma família';
  end if;
  insert into public.families(name, created_by) values (trim(_family_name), auth.uid()) returning id into f;
  insert into public.family_invites(family_id, parent_code, child_code) values (f, public._gen_code(), public._gen_code());
  insert into public.family_members(family_id, user_id, role, display_name) values (f, auth.uid(), 'parent', trim(_display_name));
  return f;
end $$;

create or replace function public.join_family(_code text, _display_name text) returns public.family_role
language plpgsql security definer set search_path = public as $$
declare f uuid; r public.family_role; c text := upper(trim(_code));
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'Você já faz parte de uma família';
  end if;
  select family_id, 'parent'::public.family_role into f, r from public.family_invites where parent_code = c;
  if f is null then
    select family_id, 'child'::public.family_role into f, r from public.family_invites where child_code = c;
  end if;
  if f is null then raise exception 'Código de convite inválido'; end if;
  insert into public.family_members(family_id, user_id, role, display_name) values (f, auth.uid(), r, trim(_display_name));
  return r;
end $$;

create or replace function public.regenerate_invites() returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := public._require_parent();
begin
  update public.family_invites set parent_code = public._gen_code(), child_code = public._gen_code() where family_id = f;
end $$;

-- ===== Parent config =====
create or replace function public.set_allowance(_cents integer, _active boolean) returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := public._require_parent();
begin
  if _cents < 0 or _cents > 1000000 then raise exception 'Valor de mesada inválido'; end if;
  update public.families set allowance_cents = _cents, allowance_active = _active where id = f;
end $$;

create or replace function public.upsert_task(_id uuid, _title text, _description text, _reward_cents integer,
  _frequency public.task_frequency, _active boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid := public._require_parent(); t uuid;
begin
  if _reward_cents < 0 or _reward_cents > 100000 then raise exception 'Valor da tarefa inválido'; end if;
  if char_length(trim(coalesce(_title,''))) = 0 then raise exception 'Informe o nome da tarefa'; end if;
  if _id is null then
    insert into public.tasks(family_id, title, description, reward_cents, frequency, active)
    values (f, trim(_title), nullif(trim(_description),''), _reward_cents, _frequency, _active) returning id into t;
  else
    update public.tasks set title = trim(_title), description = nullif(trim(_description),''),
      reward_cents = _reward_cents, frequency = _frequency, active = _active, updated_at = now()
    where id = _id and family_id = f returning id into t;
    if t is null then raise exception 'Tarefa não encontrada'; end if;
  end if;
  return t;
end $$;

-- ===== Child actions =====
create or replace function public.submit_task(_task_id uuid, _note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid; t record; pk date; today date := (now() at time zone 'America/Sao_Paulo')::date; s uuid;
begin
  select family_id into f from public.family_members where user_id = auth.uid() and role = 'child';
  if f is null then raise exception 'Apenas a criança pode enviar tarefas'; end if;
  select * into t from public.tasks where id = _task_id and family_id = f and active;
  if t is null then raise exception 'Tarefa indisponível'; end if;
  pk := case when t.frequency = 'daily' then today else (date_trunc('week', today))::date end;
  insert into public.task_submissions(family_id, task_id, child_id, period_key, reward_cents, child_note)
  values (f, t.id, auth.uid(), pk, t.reward_cents, nullif(trim(_note),''))
  on conflict do nothing returning id into s;
  if s is null then raise exception 'Esta tarefa já foi enviada neste período'; end if;
  return s;
end $$;

create or replace function public.set_goal(_child uuid, _title text, _target_cents integer) returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := public.my_family_id(); r public.family_role := public.my_role(); c uuid;
begin
  if f is null then raise exception 'Sem família'; end if;
  c := case when r = 'child' then auth.uid() else _child end;
  perform public._require_child_in_family(c, f);
  if _target_cents < 100 then raise exception 'A meta deve ser de pelo menos R$ 1,00'; end if;
  insert into public.goals(child_id, family_id, title, target_cents) values (c, f, trim(_title), _target_cents)
  on conflict (child_id) do update set title = excluded.title, target_cents = excluded.target_cents, updated_at = now();
end $$;

-- ===== Parent money actions (atomic, idempotent) =====
create or replace function public.review_submission(_id uuid, _approve boolean, _comment text) returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := public._require_parent(); s record;
begin
  select * into s from public.task_submissions where id = _id and family_id = f for update;
  if s is null then raise exception 'Envio não encontrado'; end if;
  if s.status <> 'pending' then raise exception 'Este envio já foi avaliado'; end if;
  if not _approve and char_length(trim(coalesce(_comment,''))) = 0 then
    raise exception 'Explique o motivo da rejeição';
  end if;
  update public.task_submissions set status = case when _approve then 'approved'::public.submission_status else 'rejected' end,
    review_comment = nullif(trim(_comment),''), reviewed_by = auth.uid(), reviewed_at = now() where id = _id;
  if _approve and s.reward_cents > 0 then
    insert into public.ledger_entries(family_id, child_id, kind, amount_cents, idempotency_key, ref_id, note, created_by)
    select f, s.child_id, 'task_reward', s.reward_cents, 'task:' || s.id, s.id, t.title, auth.uid()
    from public.tasks t where t.id = s.task_id
    on conflict (family_id, idempotency_key) do nothing;
  end if;
end $$;

create or replace function public.close_week(_child uuid, _week_start date) returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := public._require_parent(); fam record; w date := date_trunc('week', _week_start)::date;
  cur date := date_trunc('week', (now() at time zone 'America/Sao_Paulo')::date)::date;
begin
  perform public._require_child_in_family(_child, f);
  if w > cur then raise exception 'Não é possível fechar uma semana futura'; end if;
  select * into fam from public.families where id = f;
  if not fam.allowance_active or fam.allowance_cents = 0 then raise exception 'A mesada está pausada ou zerada'; end if;
  perform pg_advisory_xact_lock(hashtext('close:' || _child || w));
  if exists (select 1 from public.week_closures where child_id = _child and week_start = w) then
    raise exception 'Esta semana já foi fechada';
  end if;
  insert into public.week_closures(family_id, child_id, week_start, amount_cents, closed_by)
  values (f, _child, w, fam.allowance_cents, auth.uid());
  insert into public.ledger_entries(family_id, child_id, kind, amount_cents, idempotency_key, note, occurred_on, created_by)
  values (f, _child, 'allowance', fam.allowance_cents, 'allowance:' || _child || ':' || w,
    'Mesada da semana de ' || to_char(w, 'DD/MM/YYYY'), w + 6, auth.uid());
end $$;

create or replace function public.record_payment(_child uuid, _amount_cents integer, _paid_on date, _note text, _idem text)
returns void language plpgsql security definer set search_path = public as $$
declare f uuid := public._require_parent(); b record;
begin
  perform public._require_child_in_family(_child, f);
  if _amount_cents <= 0 then raise exception 'Valor inválido'; end if;
  if _paid_on > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data no futuro'; end if;
  if char_length(coalesce(_idem,'')) < 8 then raise exception 'Chave de operação inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('money:' || _child));
  if exists (select 1 from public.ledger_entries where family_id = f and idempotency_key = 'pay:' || _idem) then return; end if;
  select * into b from public.child_balance(_child);
  if _amount_cents > b.available then
    raise exception 'Pagamento maior que o saldo disponível (retire do cofrinho antes, se necessário)';
  end if;
  insert into public.ledger_entries(family_id, child_id, kind, amount_cents, idempotency_key, note, occurred_on, created_by)
  values (f, _child, 'payment', _amount_cents, 'pay:' || _idem, nullif(trim(_note),''), _paid_on, auth.uid());
end $$;

create or replace function public.move_reserve(_child uuid, _amount_cents integer, _add boolean, _note text, _idem text)
returns void language plpgsql security definer set search_path = public as $$
declare f uuid := public._require_parent(); b record;
begin
  perform public._require_child_in_family(_child, f);
  if _amount_cents <= 0 then raise exception 'Valor inválido'; end if;
  if char_length(coalesce(_idem,'')) < 8 then raise exception 'Chave de operação inválida'; end if;
  perform pg_advisory_xact_lock(hashtext('money:' || _child));
  if exists (select 1 from public.ledger_entries where family_id = f and idempotency_key = 'res:' || _idem) then return; end if;
  select * into b from public.child_balance(_child);
  if _add and _amount_cents > b.available then raise exception 'Valor maior que o saldo disponível'; end if;
  if not _add and _amount_cents > b.reserved then raise exception 'Valor maior que o reservado no cofrinho'; end if;
  insert into public.ledger_entries(family_id, child_id, kind, amount_cents, idempotency_key, note, created_by)
  values (f, _child, case when _add then 'reserve_add'::public.ledger_kind else 'reserve_remove' end,
    _amount_cents, 'res:' || _idem, nullif(trim(_note),''), auth.uid());
end $$;

-- Lock down function execution
revoke execute on function public._require_parent(), public._require_child_in_family(uuid,uuid), public._gen_code() from public, anon, authenticated;
revoke execute on all functions in schema public from anon;
grant execute on function public.my_family_id(), public.my_role(), public.child_balance(uuid), public.create_family(text,text),
  public.join_family(text,text), public.regenerate_invites(), public.set_allowance(integer,boolean),
  public.upsert_task(uuid,text,text,integer,public.task_frequency,boolean), public.submit_task(uuid,text),
  public.set_goal(uuid,text,integer), public.review_submission(uuid,boolean,text), public.close_week(uuid,date),
  public.record_payment(uuid,integer,date,text,text), public.move_reserve(uuid,integer,boolean,text,text) to authenticated;
