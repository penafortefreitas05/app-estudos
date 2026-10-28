# FocoPro — Retomada em chat novo

Use este arquivo para começar um chat limpo sem perder contexto. Atualizado em 28/10/2026.

Estes documentos moram no repositório, na pasta `docs/`. Cópias também existem no projeto FocoPro do Claude (pasta `claude/`), mas só o repositório é visível para qualquer chat.

## O app
- FocoPro: HTML/CSS/JS puro no Vercel, Supabase (Postgres, Auth, RLS). Repositório: github.com/penafortefreitas05/app-estudos. Site: 001foco-pro.vercel.app.
- Banco: 985 questões (382 de prova/inéditas + 603 autorais FocoPro: 573 Iniciante, 30 Intermediário).
- Service worker: subir CACHE_NAME a cada mudança em arquivo do site (última versão conhecida: v28).

## Como trabalhamos
- Branch por item, merge --no-ff na main, push. Commit termina com as linhas de atribuição pedidas pela sessão.
- O sandbox não acessa o Supabase: Claude escreve a SQL, Nathan roda no SQL Editor.
- Antes de importar lote: recarregar o app duas vezes (cache antigo grava nível 3).
- Explicações objetivas, ponto central primeiro. DevTools em português (Rede, Console, Cabeçalhos).

## Decisões já tomadas
- Níveis: 1 Iniciante, 2 Intermediário, 3 Avançado (prova), 4 Especialista. Progressão por matéria.
- Inéditas aparecem como "Inédita · estilo X"; o campo banca no banco não muda.
- Gabarito vem só do servidor (RPC verificar_resposta). Sem gabarito "A" padrão; falha de internet = "tente de novo".
- Filtro de assunto depende da matéria. Total (985) aparece só em "Todos os Níveis".
- Siglas de id: bd, rs, es, dev, gov, arq, so, pt, rlm. Padrão focopro-<sigla>-n<nível>-<NNN>.

## Onde está o resto
- Lista viva de pendências com caixinhas: artefato "Checklist FocoPro" (claude.ai/artifact/Gcf7C7LDwq21xCarmGtT9M).
- Roteiro e detalhes: `docs/proximos-passos.md`.
- Modelo de geração de questões: `docs/modelo-questoes-por-nivel.md`.
