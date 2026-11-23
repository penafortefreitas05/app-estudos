-- ============================================================
-- Restaurar os dados de estudo a partir do arquivo de backup (v190, item B1 da auditoria de 22/11)
-- ============================================================
-- O arquivo vem do botão "Backup do banco e dos meus dados" (menu de ferramentas, só do admin):
-- focopro-backup-banco-e-dados-AAAA-MM-DD.json. Dentro dele, "dados_aluno" tem as linhas de estudo
-- de quem estava logado: historico_respostas, retestes, aprendidos, simulados, favoritos_anotacoes,
-- fila_do_dia, perfis e progresso_estudos. As questões e gabaritos ficam em "tabelas" (não
-- são tratadas aqui).
--
-- Seguro para rodar de novo: não apaga nada e ignora a linha que já existe (ON CONFLICT DO NOTHING).
--
-- COMO USAR (SQL Editor do Supabase, tudo de uma vez, na mesma execução):
--   1. Abra o arquivo .json num editor de texto e copie TODO o conteúdo.
--   2. No PASSO 1 abaixo, troque COLE_O_JSON_AQUI pelo conteúdo copiado (fica entre $json$ e $json$).
--   3. Ensaio: deixe alvo = 'restauro_teste' (schema de teste, veja o PASSO 0). Restauração de verdade:
--      troque para 'public'.
--   4. Rode e confira as linhas "NOTICE" (quantas linhas entraram em cada tabela).
-- Obs.: o user_id gravado no arquivo precisa existir em auth.users (o mesmo login de antes).

-- PASSO 0 (só para o ensaio): schema de teste com a mesma estrutura das tabelas reais
-- create schema if not exists restauro_teste;
-- create table restauro_teste.historico_respostas  (like public.historico_respostas  including all);
-- create table restauro_teste.retestes             (like public.retestes             including all);
-- create table restauro_teste.aprendidos           (like public.aprendidos           including all);
-- create table restauro_teste.simulados            (like public.simulados            including all);
-- create table restauro_teste.favoritos_anotacoes  (like public.favoritos_anotacoes  including all);
-- create table restauro_teste.fila_do_dia          (like public.fila_do_dia          including all);
-- create table restauro_teste.perfis               (like public.perfis               including all);
-- create table restauro_teste.progresso_estudos    (like public.progresso_estudos    including all);

-- PASSO 1: o arquivo de backup vira uma tabela temporária de uma linha
create temp table _bk as select $json$COLE_O_JSON_AQUI$json$::jsonb as j;

-- PASSO 2: copia cada tabela de "dados_aluno" para o schema alvo
do $restaurar$
declare
    alvo text := 'restauro_teste';   -- 'public' na restauração de verdade
    t text;
    n bigint;
    tabelas text[] := array['historico_respostas','retestes','aprendidos','simulados',
                            'favoritos_anotacoes','fila_do_dia','perfis','progresso_estudos'];
begin
    foreach t in array tabelas loop
        execute format(
            'insert into %I.%I overriding system value
             select * from jsonb_populate_recordset(null::%I.%I, coalesce((select j->''dados_aluno''->%L from _bk), ''[]''::jsonb))
             on conflict do nothing', alvo, t, alvo, t, t);
        get diagnostics n = row_count;
        raise notice '%: % linhas inseridas', t, n;
    end loop;
    -- o contador do id de historico_respostas continua depois do maior id restaurado
    execute format(
        'select setval(pg_get_serial_sequence(%L, ''id''), greatest(coalesce((select max(id) from %I.historico_respostas), 1), 1))',
        format('%I.historico_respostas', alvo), alvo);
end
$restaurar$;
