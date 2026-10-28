# FocoPro — Próximos passos

Atualizado em 28/10/2026 (fim do dia). A lista viva, com caixinhas, é o artefato "Checklist FocoPro".

## Estado atual
- U6 Esqueci minha senha: no ar.
- U3 Favoritos e anotações na nuvem: no ar.
- U11 Assunto padronizado + Cobertura do Edital: no ar (conta os assuntos reais do banco).
- U9 Correção no servidor: no ar, SQL da Fase 1 rodada. Em 28/10 corrigido o furo do gabarito "A" inventado (commit 6bed25c).
- Níveis Fase A: no ar (commit 12be502). Campo `nivel`, filtro "📶 Todos os Níveis", selo colorido no card, importação gravando o nível. Importação recusa nível inválido.
- Inéditas rotuladas pela origem (v26): aparecem como "Inédita · estilo X".
- Filtro de assunto depende da matéria (v27). Total só em "Todos os Níveis" (v28).
- **Banco em 28/10 (fim do dia): 985 questões.** 382 reais (339 de prova + 43 inéditas) e 603 autorais FocoPro: 573 no nível 1 (Iniciante, as 9 matérias) e 30 no nível 2 (Banco de Dados). Nenhuma autoral caiu em nível 3. Conferido no banco por prefixo de id.
- RLM ganhou 8 assuntos novos (agora 11 assuntos) — conferir a Cobertura do Edital.
- Os JSONs de todos os lotes estão salvos no computador do Nathan.

## 1. Níveis de questão e trilha
Decidido em 28/10:
- Nomes: 1 Iniciante · 2 Intermediário · 3 Avançado (prova) · 4 Especialista.
- Progressão por matéria, não por conta. Nível de conta vem depois, como resumo.
- Recomendar o próximo nível, sem trancar.
- Subir em níveis: encher o Iniciante primeiro (feito em 28/10), depois o Intermediário.

Próximas fases:
- B (em andamento): Nathan estuda pelo Iniciante e dá retorno por matéria. Só o Banco de Dados foi testado até agora (21/31, nível adequado). Testar uma amostra de cada matéria, principalmente Português, RLM e Governança (CNJ), e reportar gabarito duvidoso ao Claude. Correção = reimportar com o mesmo id e a mesma letra correta.
- Intermediário: propor o plano matéria por matéria; Banco de Dados já tem 30 (parte relacional).
- C: trilha por matéria: barra de progresso por nível e aviso "você já pode subir". Critério a definir (sugestão: 10 respostas no nível e 80% de acerto com "Tenho certeza").
- D: nível de conta (gamificação).

Siglas de id: bd, rs, es, dev, gov, arq, so, pt, rlm. Padrão `focopro-<sigla>-n<nível>-<NNN>`. Detalhes em `docs/modelo-questoes-por-nivel.md`.

## 2. U5 — Reportar erro em questão (prioridade subiu)
Botão no card para apontar problema (gabarito errado, enunciado confuso, desatualizada). Tabela nova com RLS, painel simples para o admin. Agora há 603 questões autorais e a revisão de todas depende de retorno dos usuários.

## 3. Backup
- Backup do banco no Supabase (confirmar o que o plano cobre).
- Opcional: guardar os JSONs também no repositório (pasta `banco-questoes/`), versionados.

## 4. Fase 2 do U9
Rodar a partir de 31/10:
`alter table public.questoes drop column resposta_correta;`

## 5. Polimento (depois)
- Pacote 4 visual
- Modo Foco
- Painel de tendência de 7 dias
- CSP em modo bloqueio

## Lembretes de processo
- Toda mudança em arquivo do site: subir o CACHE_NAME no service-worker.js.
- Mudança de banco: Claude escreve a SQL, Nathan roda no SQL Editor do Supabase.
- Antes de importar lote: recarregar o app duas vezes (cache antigo grava nível 3).
- Fluxo git: branch por item, merge --no-ff na main, push.
