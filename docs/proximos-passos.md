# FocoPro — Próximos passos

Atualizado em 30/10/2026 (noite).

## Entregue (28 a 30/10)
- Modo Foco, reportar problema (U5), explicações em todas as questões (U12), primeira experiência, Aprender Fase 1 e Fase 2 (103 cartões nas 9 matérias).
- Visual: logo nova, barra de cima em duas linhas, barra lateral estreita e recolhível, Por matéria em grade de anéis com detalhe por nível.
- **Meu dia** (revisão x novas, 7 dias), **nível de conta** (pontos por domínio, nunca desce), identidade índigo do Aprender, barrinha de avanço no Foco.
- Botão de backup do banco de questões no Admin.

## Até domingo 16h (limite semanal)
Só usar e testar. Anotar o que incomodar e mandar numa mensagem só. Sem trabalho pesado.

## Depois de domingo 16h, por prioridade
1. Pacote Trilha: aviso "você já pode subir de nível" e caminho de volta (errou prova, sugere o Iniciante do assunto).
2. Perfil e meta na nuvem (tabela `perfis`; Claude escreve a SQL, Nathan roda).
3. Etapa 2 do visual: menu enxuto (Questões, Meu dia, Desempenho, Simulados), conta embaixo, filtros agrupados. Dar lugar a Aprender, Foco, Revisar hoje e sequência.
4. Aprender em modo de leitura, com campo de nível nos cartões (todos os níveis).
5. Novo molde do cartão "Entenda em 1 minuto": piloto em um assunto de Banco de Dados, conferido contra fonte, antes de pedir o resto.
6. Decisão sobre a barra de % de acerto ignorar respostas do Aprender (some se o item 4 for feito).

## Datas
- 31/10: Fase 2 do U9. Nathan roda `docs/sql/u9-fase2-apagar-resposta-correta.sql` passo a passo (só o passo 3 se o passo 1 der `faltando=0` e o passo 2 vier vazio).

## Backlog
Questões do Especialista, CSP em modo bloqueio (depois de uma semana sem avisos), glossário de siglas, JSONs dos lotes em `banco-questoes/`, ajustes finos no celular.

## Lembretes de processo
- Toda mudança em arquivo do site: subir o CACHE_NAME no service-worker.js.
- Mudança de banco: Claude escreve a SQL, Nathan roda no SQL Editor do Supabase.
- Antes de importar lote: recarregar o app duas vezes.
- Fluxo git: branch por item, merge --no-ff na main, push.
