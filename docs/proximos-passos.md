# FocoPro — Próximos passos

Atualizado em 28/10/2026 (fim do dia).

## Entregue hoje (28/10)
- Modo Foco com teclado, reportar problema na questão (U5), explicações em todas as questões (U12), limpeza de CSS.
- Primeira experiência: entrada do visitante, boas-vindas em 3 perguntas, sessão guiada, dicas de uma vez, meta diária, sequência com folga semanal, cartão Hoje com Continuar, resumo da semana.
- Aprender Fase 1 (exemplo resolvido + prova por assunto) e Fase 2 para Banco de Dados ("Entenda em 1 minuto", 23 assuntos).
- Visual: painel Por matéria em cartões, barra lateral larga e recolhível, barra de cima em duas linhas com filtros rápidos. Cache v43.
- Estado anterior mantido: U6, U3, U11, U9 Fase 1, níveis Fase A, inéditas rotuladas. Banco com 985 questões.

## Amanhã, por prioridade
1. **Nathan, 10 min: abrir o app no celular de verdade** e olhar as telas novas (barra de cima, gaveta ☰, Hoje, Aprender com "Entenda em 1 minuto"). Só foram testadas no computador e em celular simulado.
2. **Nathan, 5 min: confirmar o backup do banco no Supabase.** Há 603 questões autorais e o histórico de estudo; saber o que o plano cobre.
3. **Nathan: testar uma amostra do Iniciante nas outras matérias** e reportar o que estiver errado (botão 🚩). Só Português e Banco de Dados foram testados. Começar por RLM e Governança (CNJ). Correção = reimportar com o mesmo id e a mesma letra correta.
4. **Aprender Fase 2 em Redes e Engenharia de Software.** Nathan pede os textos no chat do banco (uma matéria por vez, mesmo formato JSON do Banco de Dados) e traz para o Claude, que junta em `data/resumos-assunto.json` e publica.
5. **Claude: Pacote Trilha.** Aviso "você já pode subir de nível" (sugestão: assunto aprendido + 80% de acerto com "Tenho certeza") e o caminho de volta (errou questão de prova → sugere o Iniciante do mesmo assunto).
6. **Claude + Nathan: perfil e meta na nuvem** (tabela `perfis`). Claude escreve a SQL, Nathan roda. Hoje a meta definida no celular não vale no computador.
7. Decisão sem pressa: a barra de % de acerto deve ignorar as respostas dadas no Aprender? Hoje conta todas.

## Datas
- 31/10: Fase 2 do U9. Nathan roda `docs/sql/u9-fase2-apagar-resposta-correta.sql` passo a passo (só o passo 3 se o passo 1 der `faltando=0` e o passo 2 vier vazio).

## Níveis de questão e trilha
- Nomes: 1 Iniciante · 2 Intermediário · 3 Avançado (prova) · 4 Especialista. Progressão por matéria. Recomendar o próximo nível, sem trancar.
- Intermediário: plano matéria por matéria no chat do banco; Banco de Dados já tem 30 (parte relacional).
- Especialista: ainda sem questões. Nível de conta (gamificação) fica para depois.

## Backlog (sem data)
- U7: CSP em modo bloqueio, depois de uma semana sem avisos de "Content Security Policy" no Console.
- U8: painel de tendência de 7 dias (baixa prioridade).
- Glossário de siglas, lembretes por notificação, marcadores. Guardar os JSONs dos lotes no repositório (pasta `banco-questoes/`).
- Barra de cima e barra lateral no celular: ajustes finos depois do teste no aparelho.

## Lembretes de processo
- Toda mudança em arquivo do site: subir o CACHE_NAME no service-worker.js.
- Mudança de banco: Claude escreve a SQL, Nathan roda no SQL Editor do Supabase.
- Antes de importar lote: recarregar o app duas vezes (cache antigo grava nível 3).
- Fluxo git: branch por item, merge --no-ff na main, push.
