-- U5: "Reportar problema nesta questão"
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem estragar nada.

create table if not exists public.reportes_questao (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
    questao_id   text not null,
    tipo         text not null check (tipo in ('gabarito', 'enunciado', 'alternativas', 'desatualizada', 'outro')),
    comentario   text not null default '' check (char_length(comentario) <= 600),
    status       text not null default 'aberto' check (status in ('aberto', 'resolvido', 'descartado')),
    criado_em    timestamptz not null default now(),
    resolvido_em timestamptz
);

-- Um mesmo usuário não reporta o mesmo problema da mesma questão duas vezes enquanto estiver aberto
create unique index if not exists reportes_questao_unico_aberto
    on public.reportes_questao (user_id, questao_id, tipo) where status = 'aberto';

create index if not exists reportes_questao_status_data
    on public.reportes_questao (status, criado_em desc);

alter table public.reportes_questao enable row level security;

-- Quem está logado cria reportes só em nome próprio
drop policy if exists "reportes: inserir os proprios" on public.reportes_questao;
create policy "reportes: inserir os proprios" on public.reportes_questao
    for insert to authenticated
    with check (user_id = auth.uid() and status = 'aberto');

-- Cada um vê só os próprios
drop policy if exists "reportes: ver os proprios" on public.reportes_questao;
create policy "reportes: ver os proprios" on public.reportes_questao
    for select to authenticated
    using (user_id = auth.uid());

-- Admin (mesmo UUID das políticas da tabela questoes) vê e atualiza todos
drop policy if exists "reportes: admin ve todos" on public.reportes_questao;
create policy "reportes: admin ve todos" on public.reportes_questao
    for select to authenticated
    using (auth.uid() = '82cc7c31-2be4-4aba-8eb9-80067f545f3e'::uuid);

drop policy if exists "reportes: admin atualiza" on public.reportes_questao;
create policy "reportes: admin atualiza" on public.reportes_questao
    for update to authenticated
    using (auth.uid() = '82cc7c31-2be4-4aba-8eb9-80067f545f3e'::uuid)
    with check (auth.uid() = '82cc7c31-2be4-4aba-8eb9-80067f545f3e'::uuid);
