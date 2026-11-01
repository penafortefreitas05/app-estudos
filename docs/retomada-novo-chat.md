# FocoPro — Retomada em chat novo

Use este arquivo para começar um chat limpo sem perder contexto. Atualizado em 01/11/2026 (domingo, manhã).

## O app
- FocoPro: HTML/CSS/JS puro no Vercel, Supabase (Postgres, Auth, RLS, Edge Function `super-function` com Gemini). Repositório: github.com/penafortefreitas05/app-estudos. Site: 001foco-pro.vercel.app.
- Banco: **999 questões** (conferido no banco em 01/11): nível 1 = 573, nível 2 = 44, nível 3 (prova/inéditas) = 382, nível 4 ainda vazio. O nível 2 existe só em Banco de Dados e cobre 14 dos 23 assuntos da matéria; faltam os 9 do bloco dados abertos/IA/ML. Os 14 assuntos do nível 2 batem letra por letra com os do app.
- Service worker: subir CACHE_NAME a cada mudança em arquivo do site (em 01/11 estava em v65; confira no arquivo). Arquivo novo de dados ou script entra na lista RECURSOS_ESTATICOS.

## Como trabalhamos
- **Ritmo semanal (desde 30/10):** 10% a 13,5% do limite por dia (teto 13,5%; chega ao domingo com ~94%), chat novo todo domingo, trabalho dividido com o GPT, sem retrabalho nem revisão completa sem necessidade. Detalhes em `docs/ritmo-de-trabalho.md`; prompt do GPT em `docs/prompt-gpt.md`.
- Branch por item, merge --no-ff na main, push da main e do branch. Commit termina com as linhas de atribuição pedidas pela sessão. O clone feito no sandbox é só leitura; para push é preciso anexar o repositório com permissão de escrita (não testado em 01/11).
- Antes de tarefa grande, Claude diz o custo estimado (faixa P/M/G) e espera o Nathan confirmar.
- O sandbox não acessa o Supabase: Claude escreve a SQL, Nathan roda no SQL Editor.
- Antes de importar lote: recarregar o app duas vezes (cache antigo grava nível 3).
- Explicações objetivas, ponto central primeiro. DevTools em português (Rede, Console, Cabeçalhos).
- Testes: Playwright com `js/supabase.js` trocado por um stub, servidor local `python3 -m http.server`.

## Decisões já tomadas
- Níveis: 1 Iniciante (I verde), 2 Intermediário (M azul), 3 Avançado = prova (A laranja), 4 Especialista (E vermelho). Progressão por matéria.
- Inéditas aparecem como "Inédita · estilo X"; o campo banca no banco não muda.
- Gabarito vem só do servidor (RPC verificar_resposta). Sem gabarito "A" padrão; falha de internet = "tente de novo".
- Filtro de assunto depende da matéria. Total (999) aparece só em "Todos os Níveis".
- Siglas de id: bd, rs, es, dev, gov, arq, so, pt, rlm. Padrão focopro-<sigla>-n<nível>-<NNN>.
- Aprender: cada assunto do Iniciante = "Entenda em 1 minuto" (opcional) → exemplo resolvido (1ª questão do assunto) → prova (as outras). Aprendido = todas as de prova respondidas e 2 de cada 3 certas na última tentativa. Estado derivado do histórico, sem tabela. A questão do exemplo continua aparecendo nas listas e revisões (repetir até ficar rápido é o método).
- "Entenda em 1 minuto": textos em `data/resumos-assunto.json`, escritos no chat do banco e revisados pelo Nathan. Feito: 103 cartões nas 9 matérias (Português e RLM usam o modelo "regra"). O `assunto` tem de ser igual ao das questões.
- Layout (desktop): barra lateral estreita (`--largura-barra`: 290 a 340 px), recolhível pelo « e pelo botão F. **Por matéria em grade de anéis** (3 por linha): anel = quanto da matéria foi feito, cor = acerto, bolinha amarela = revisões de hoje; tocar filtra a matéria e abre o detalhe com I, M, A, revisão e reforçar. Menu lateral (itens atuais na "Limpeza de 31/10", mais abaixo) aciona os botões que já existem; no computador os botões da barra de cima ficam ocultos. Nível da conta com barra fica na barra lateral, logo abaixo do menu; **Minha conta é o último item da lateral** (rodapé). A antiga gaveta "Meu desempenho" foi removida: Feitas, Reforçar, acertos e erros ficam numa faixa no painel horizontal (`#barra-numeros`). Cache v65. Aprender tem ambiente próprio: fundo índigo com faixa no topo (classe `modo-aprender` no body, ligada em entrarFoco com opcoes.aprender e desligada em sairFoco).  Limpeza de 31/10: menu lateral só com Questões, Meu dia, Simulados, Aprender e Foco (Desempenho e Revisar hoje saíram; Revisar fica no painel horizontal); "Entender com IA" aposentado (a Edge Function `super-function` continua, para o painel do dia); cartão "Hoje" sem texto de meta (o topo já mostra); 96 regras de CSS mortas removidas. Ícone do app novo (mesmo símbolo da logo; any + maskable + apple-touch). Sem aviso ao tocar na matéria. Logo recarrega a página (como F5); tocar na matéria ativa nos anéis volta para todas. Barra de cima em duas linhas: título + contagem + placar do dia + Aprender/Meu dia/Foco/Simulado; busca (tecla /), níveis e situação, Mais filtros. Logo nova (alvo com seta, "foco**pro**"). Cor da marca roxo-azul só na logo; botões seguem azuis; **índigo é a cor do Aprender**.
- **Meu dia** (botão 📊): hoje separado em revisão x questões novas, mais 7 dias. Vem do histórico na nuvem (`carregarRespostasRecentes`). Revisão = questão já respondida antes; nova = primeira vez.
- **Nível de conta** (`js/conta.js`): pontos por domínio. Só pontua questão com status acerto, superado ou dominada (acerto com certeza); 1/2/3/4 pontos por nível da questão; +1 se já foi errada e foi superada. Errar de novo tira os pontos dela, mas o nível conquistado nunca desce (guardado no aparelho). Degraus: 0, 200, 500, 900, 1400, 1900 (Aspirante, Candidato, Concurseiro, Analista, Especialista, Aprovado). Limites provisórios; rever quando o banco crescer.
- Modo Foco tem barrinha de avanço da lista (degradê roxo-verde).
- Decidido, ainda não feito: Aprender vira modo de leitura (pergunta, "Ver resposta" por toque, o porquê vem do comentário da questão, botão "Já entendi"), com o campo de nível nos cartões para acompanhar todos os níveis. Novo molde do cartão (o que é, para que serve, não confundir, atenção) começa por um piloto de Banco de Dados. Ambos fora da prioridade até depois de domingo.
- Perfil e meta diária ficam no aparelho (localStorage) por enquanto.

## Equipe e estado em 01/11
- Duas contas: principal = Claude 01 (direção, código, SQL, importação) + GPT 01 (autoria de cartões); nova = Claude 02 + GPT 02 (revisão independente, às cegas). Autor nunca revisa o próprio texto; ~10 itens por lote são conferidos contra livro, lei ou documentação oficial. Detalhes em `docs/equipe-e-funcoes.md`.
- U9 Fase 2 concluída: gabarito só em `questoes_gabarito`.
- Lote Banco de Dados nível 2 (`focopro-bd-n2-031` a `044`) já importado. Revisão às cegas pelo GPT 02 ainda pendente.
- Pendências abertas: erro 404 no console (aguardando teste anônimo: Método + URL depois de `supabase.co`); perfil/meta na nuvem (p08); campo `concurso` para um banco com vários concursos; fluxo de importação com validação; piloto do Aprender (15 cartões de BD nível 1); Radar de concursos; painel do dia com IA; decidir se os 9 assuntos de dados/IA/ML entram no nível 2.

## Onde está o resto
- Lista viva de pendências com caixinhas: artefato "Checklist FocoPro" (claude.ai/artifact/Gcf7C7LDwq21xCarmGtT9M), com os grupos "Amanhã" e "Depois de domingo 16h".
- Roteiro e detalhes: claude/proximos-passos.md. Modelo de geração de questões: claude/modelo-questoes-por-nivel.md.
- Desenhos do painel e da barra: claude.ai/artifact/FBbzMZXvQfkNMXEkd7CyT6.

## Trabalho em conjunto com o GPT
Ver `docs/trabalho-com-gpt.md` (quem faz o quê e regras para não gerar conflito).

## Limite semanal
Renova no domingo às 16h. O ritmo de 10% a 13,5% por dia vale a partir de 02/11 (máximo de uma melhoria G por semana). Chat novo todo domingo, aberto por este arquivo; conversas longas gastam mais.
