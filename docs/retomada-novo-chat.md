# FocoPro — Retomada em chat novo

Use este arquivo para começar um chat limpo sem perder contexto. Atualizado em 28/10/2026 (fim do dia).

## O app
- FocoPro: HTML/CSS/JS puro no Vercel, Supabase (Postgres, Auth, RLS, Edge Function `super-function` com Gemini). Repositório: github.com/penafortefreitas05/app-estudos. Site: 001foco-pro.vercel.app.
- Banco: 985 questões (382 de prova/inéditas + 603 autorais FocoPro: 573 Iniciante, 30 Intermediário).
- Service worker: subir CACHE_NAME a cada mudança em arquivo do site (última versão: v43). Arquivo novo de dados ou script entra na lista RECURSOS_ESTATICOS.

## Como trabalhamos
- Branch por item, merge --no-ff na main, push. Commit termina com as linhas de atribuição pedidas pela sessão.
- O sandbox não acessa o Supabase: Claude escreve a SQL, Nathan roda no SQL Editor.
- Antes de importar lote: recarregar o app duas vezes (cache antigo grava nível 3).
- Explicações objetivas, ponto central primeiro. DevTools em português (Rede, Console, Cabeçalhos).
- Testes: Playwright com `js/supabase.js` trocado por um stub, servidor local `python3 -m http.server`.

## Decisões já tomadas
- Níveis: 1 Iniciante (I verde), 2 Intermediário (M azul), 3 Avançado = prova (A laranja), 4 Especialista (E vermelho). Progressão por matéria.
- Inéditas aparecem como "Inédita · estilo X"; o campo banca no banco não muda.
- Gabarito vem só do servidor (RPC verificar_resposta). Sem gabarito "A" padrão; falha de internet = "tente de novo".
- Filtro de assunto depende da matéria. Total (985) aparece só em "Todos os Níveis".
- Siglas de id: bd, rs, es, dev, gov, arq, so, pt, rlm. Padrão focopro-<sigla>-n<nível>-<NNN>.
- Aprender: cada assunto do Iniciante = "Entenda em 1 minuto" (opcional) → exemplo resolvido (1ª questão do assunto) → prova (as outras). Aprendido = todas as de prova respondidas e 2 de cada 3 certas na última tentativa. Estado derivado do histórico, sem tabela. A questão do exemplo continua aparecendo nas listas e revisões (repetir até ficar rápido é o método).
- "Entenda em 1 minuto": textos em `data/resumos-assunto.json` (materia, assunto, ideia_central, exemplo, pegadinha). O `assunto` tem de ser igual ao das questões. Escritos no chat do banco, revisados pelo Nathan. Só Banco de Dados feito (23 assuntos).
- Layout (desktop): barra lateral com largura de um terço da tela (`--largura-barra`), recolhível pelo « e pelo botão F (estado lembrado). Painel Por matéria em cartões (ícone, % de acerto, barrinha por nível). Barra de cima em duas linhas: título + contagem + placar do dia (meta, 🔁 para revisar, 🔥 dias) + Aprender/Foco/Simulado; busca (tecla /), botões de nível e de situação, Mais filtros. Meta, dias e Revisar saíram da lateral para não repetir.
- Perfil e meta diária ficam no aparelho (localStorage) por enquanto.

## Onde está o resto
- Lista viva de pendências com caixinhas: artefato "Checklist FocoPro" (claude.ai/artifact/Gcf7C7LDwq21xCarmGtT9M), com o grupo "Amanhã" por prioridade.
- Roteiro e detalhes: claude/proximos-passos.md. Modelo de geração de questões: claude/modelo-questoes-por-nivel.md.
- Desenhos do painel e da barra: claude.ai/artifact/FBbzMZXvQfkNMXEkd7CyT6.
