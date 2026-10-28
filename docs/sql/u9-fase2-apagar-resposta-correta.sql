-- U9, Fase 2: apagar questoes.resposta_correta (a partir de 31/10/2026).
-- Rodar no SQL Editor do Supabase, NESTA ORDEM. Só siga para o passo 3 se os passos 1 e 2 estiverem OK.

-- PASSO 1 — toda questão tem gabarito na tabela nova? (faltando precisa ser 0)
select
  (select count(*) from public.questoes)                                         as questoes,
  (select count(*) from public.questoes_gabarito)                                as gabaritos,
  (select count(*) from public.questoes q
     where not exists (select 1 from public.questoes_gabarito g where g.questao_id = q.id)) as faltando;

-- PASSO 2 — alguma função ou view do banco ainda lê a coluna antiga? (tem que vir vazio;
-- a verificar_resposta deve aparecer SÓ se ela citar questoes_gabarito, não questoes.resposta_correta)
select p.proname as funcao
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc ilike '%resposta_correta%';

select viewname from pg_views where schemaname = 'public' and definition ilike '%resposta_correta%';

-- PASSO 3 — apagar a coluna (não tem volta; o gabarito continua em questoes_gabarito)
alter table public.questoes drop column resposta_correta;
