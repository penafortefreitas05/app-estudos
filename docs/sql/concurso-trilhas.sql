-- Concurso (trilha) das questões — 02/11/2026
-- Cada questão diz a quais concursos serve. Vazio (null) = banco de TI, como sempre foi.
-- Valores usados pelo app: 'ti', 'bacen' (economia e finanças), 'bnb'.
-- Pode rodar mais de uma vez sem problema.

alter table public.questoes add column if not exists concursos text[];

create index if not exists questoes_concursos_idx on public.questoes using gin (concursos);

-- Os 441 básicos do Bacen (Operação Cognitiva, importados em 02/11) servem às duas trilhas:
-- TI (Bacen TI do Nathan) e Bacen (Nathalia).
update public.questoes
   set concursos = array['ti', 'bacen']
 where id like 'oc-%'
   and orgao = 'Banco Central do Brasil (BACEN)'
   and concursos is null;

-- Conferência: deve mostrar 441 em {ti,bacen} e o resto do banco em null.
select concursos, count(*) from public.questoes group by concursos order by 2 desc;
