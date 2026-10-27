-- Security test suite for family invitations.
-- Runs entirely inside one transaction with fictitious users and families and
-- ALWAYS ends by raising an exception carrying the report, so nothing is kept.
-- Real families/members are never touched.
do $$
declare
  fa uuid := gen_random_uuid(); fb uuid := gen_random_uuid();
  pa uuid := gen_random_uuid(); ca uuid := gen_random_uuid(); pb uuid := gen_random_uuid();
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
  u4 uuid := gen_random_uuid();
  tok_p text; tok_c text; tok_e text; tok_r text; tok_b text; id_r uuid; id_e uuid;
  rep text := ''; pass int := 0; fail int := 0;
  got text; err text; n int;
  cases text[][];
  c text[];
begin
  insert into public.families(id, name, created_by) values (fa, 'TESTE Familia A', pa), (fb, 'TESTE Familia B', pb);
  insert into public.family_members(family_id, user_id, role, display_name) values
    (fa, pa, 'parent', 'Mae A'), (fa, ca, 'child', 'Filha A'), (fb, pb, 'parent', 'Pai B');

  -- helper pattern: act as user via claims + role
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select token into tok_p from public.create_family_invite('parent', 72);
  select token into tok_c from public.create_family_invite('child', 72);
  select id, token into id_e, tok_e from public.create_family_invite('child', 1);
  select id, token into id_r, tok_r from public.create_family_invite('child', 24);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', pb, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select token into tok_b from public.create_family_invite('parent', 72);
  execute 'reset role';

  -- expire one invite (simulates time passing)
  update public.family_invitations set expires_at = now() - interval '1 minute' where id = id_e;

  -- {name, actor uuid ('anon' for anonymous), sql, expected: 'OK:<value>' or 'ERR:<substring>'}
  cases := array[
    array['01 criança não cria convite', ca::text, 'select (public.create_family_invite(''parent'',72)).id::text', 'ERR:Apenas responsáveis'],
    array['02 validade 0h rejeitada', pa::text, 'select (public.create_family_invite(''child'',0)).id::text', 'ERR:Validade'],
    array['03 validade 200h rejeitada', pa::text, 'select (public.create_family_invite(''child'',200)).id::text', 'ERR:Validade'],
    array['04 prévia convite responsável', u1::text, format('select status||''/''||role||''/''||family_name from public.preview_family_invite(%L)', tok_p), 'OK:valid/parent/TESTE Familia A'],
    array['05 aceitar convite criança -> child', u1::text, format('select public.accept_family_invite(%L,''Nova filha'')::text', tok_c), 'OK:child'],
    array['06 aceitar convite responsável -> parent', u2::text, format('select public.accept_family_invite(%L,''Segunda mae'')::text', tok_p), 'OK:parent'],
    array['07 reuso do convite (replay) bloqueado', u3::text, format('select public.accept_family_invite(%L,''X'')::text', tok_p), 'ERR:já foi utilizado'],
    array['08 prévia mostra utilizado', u3::text, format('select status from public.preview_family_invite(%L)', tok_c), 'OK:used'],
    array['09 convite expirado bloqueado', u3::text, format('select public.accept_family_invite(%L,''X'')::text', tok_e), 'ERR:expirou'],
    array['10 prévia mostra expirado', u3::text, format('select status from public.preview_family_invite(%L)', tok_e), 'OK:expired'],
    array['11 outra família não revoga', pb::text, format('select public.revoke_family_invite(%L)::text', id_r), 'ERR:não encontrado'],
    array['12 criança não revoga', ca::text, format('select public.revoke_family_invite(%L)::text', id_r), 'ERR:Apenas responsáveis'],
    array['13 nova criança (via convite) não revoga', u1::text, format('select public.revoke_family_invite(%L)::text', id_r), 'ERR:Apenas responsáveis'],
    array['14 responsável revoga', pa::text, format('select coalesce(public.revoke_family_invite(%L)::text,''ok'')', id_r), 'OK:ok'],
    array['15 convite revogado bloqueado', u3::text, format('select public.accept_family_invite(%L,''X'')::text', tok_r), 'ERR:revogado'],
    array['16 revogar de novo falha', pa::text, format('select public.revoke_family_invite(%L)::text', id_r), 'ERR:não encontrado'],
    array['17 token inválido', u3::text, 'select public.accept_family_invite(''abc'',''X'')::text', 'ERR:Convite inválido'],
    array['18 token alterado (1 caractere)', u3::text, format('select status from public.preview_family_invite(%L)', overlay(tok_b placing (case when substr(tok_b,1,1)='a' then 'b' else 'a' end) from 1 for 1)), 'OK:invalid'],
    array['19 quem já tem família não aceita', pb::text, format('select public.accept_family_invite(%L,''X'')::text', tok_b), 'ERR:já faz parte'],
    array['20 nova criança não cria convite (sem escalada)', u1::text, 'select (public.create_family_invite(''parent'',72)).id::text', 'ERR:Apenas responsáveis'],
    array['21 inserir membro direto bloqueado', u3::text, format('insert into public.family_members(family_id,user_id,role,display_name) values (%L,%L,''parent'',''X'') returning ''x''', fa, u3), 'ERR:permission denied'],
    array['22 criança alterar próprio papel bloqueado', u1::text, format('update public.family_members set role=''parent'' where user_id=%L returning ''x''', u1), 'ERR:permission denied'],
    array['23 alterar papel/família do convite bloqueado', pa::text, format('update public.family_invitations set role=''parent'', family_id=%L returning ''x''', fb), 'ERR:permission denied'],
    array['24 inserir convite direto bloqueado', pa::text, format('insert into public.family_invitations(family_id,role,token_hash,created_by,expires_at) values (%L,''parent'',''\x00'',%L,now()+interval ''1 day'') returning ''x''', fa, pa), 'ERR:permission denied'],
    array['25 hash do token não é legível', pa::text, 'select count(token_hash)::text from public.family_invitations', 'ERR:permission denied'],
    array['26 responsável B vê só convites de B', pb::text, format('select count(*) filter (where family_id=%L)||''/''||count(*) from public.family_invitations', fb), 'OK:1/1'],
    array['27 criança não lista convites', ca::text, 'select count(*)::text from public.family_invitations', 'OK:0'],
    array['28 responsável A vê só convites de A', pa::text, format('select count(*) filter (where family_id=%L)||''/''||count(*) from public.family_invitations', fa), 'OK:4/4'],
    array['29 código antigo join_family desativado', u3::text, 'select public.join_family(''ABC123'',''X'')::text', 'ERR:permission denied'],
    array['30 regenerate_invites desativado', pa::text, 'select coalesce(public.regenerate_invites()::text,''x'')', 'ERR:permission denied'],
    array['31 tabela de códigos antigos ilegível', pa::text, 'select count(*)::text from public.family_invites', 'ERR:permission denied'],
    array['32 anônimo não vê prévia', 'anon', format('select status from public.preview_family_invite(%L)', tok_b), 'ERR:permission denied'],
    array['33 anônimo não aceita', 'anon', format('select public.accept_family_invite(%L,''X'')::text', tok_b), 'ERR:permission denied'],
    array['34 aceitar convite de B -> parent de B', u4::text, format('select public.accept_family_invite(%L,''Mae B2'')::text', tok_b), 'OK:parent'],
    array['35 novo responsável B não vê membros de A', u4::text, format('select count(*)::text from public.family_members where family_id=%L', fa), 'OK:0'],
    array['36 nome vazio rejeitado', u3::text, format('select public.accept_family_invite(%L,''  '')::text', tok_b), 'ERR:Informe um nome'],
    array['37 sem login rejeitado', 'nologin', format('select public.accept_family_invite(%L,''X'')::text', tok_b), 'ERR:Faça login']
  ];

  foreach c slice 1 in array cases loop
    got := null; err := null;
    if c[2] = 'anon' then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      execute 'set local role anon';
    elsif c[2] = 'nologin' then
      perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
      execute 'set local role authenticated';
    else
      perform set_config('request.jwt.claims', json_build_object('sub', c[2], 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
    end if;
    begin
      execute c[3] into got;
    exception when others then err := sqlerrm;
    end;
    execute 'reset role';
    if (c[4] like 'OK:%' and err is null and got = substr(c[4], 4))
       or (c[4] like 'ERR:%' and err is not null and position(substr(c[4], 5) in err) > 0) then
      pass := pass + 1; rep := rep || E'\nPASS ' || c[1];
    else
      fail := fail + 1; rep := rep || E'\nFAIL ' || c[1] || ' => got=' || coalesce(got,'∅') || ' err=' || coalesce(err,'∅');
    end if;
  end loop;

  -- Data assertions (as owner)
  select count(*) into n from public.family_members where user_id = u1 and family_id = fa and role = 'child';
  rep := rep || E'\n' || case when n = 1 then 'PASS' else 'FAIL' end || ' 38 u1 é child da família A'; if n = 1 then pass := pass+1; else fail := fail+1; end if;
  select count(*) into n from public.family_members where user_id = u3;
  rep := rep || E'\n' || case when n = 0 then 'PASS' else 'FAIL' end || ' 39 tentativas falhas não criaram membro'; if n = 0 then pass := pass+1; else fail := fail+1; end if;
  select count(*) into n from public.family_invitations where token_hash = sha256(convert_to(tok_p,'UTF8')) and accepted_by = u2;
  rep := rep || E'\n' || case when n = 1 then 'PASS' else 'FAIL' end || ' 40 só hash SHA-256 salvo, aceite registrado'; if n = 1 then pass := pass+1; else fail := fail+1; end if;
  rep := rep || E'\n' || case when length(tok_p) = 64 then 'PASS' else 'FAIL' end || ' 41 token de 256 bits (64 hex)'; if length(tok_p) = 64 then pass := pass+1; else fail := fail+1; end if;

  raise exception 'RELATORIO (rollback) pass=% fail=%%', pass, fail, rep;
end $$;
