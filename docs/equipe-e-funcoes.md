# Equipe e funções do FocoPro (criado em 31/10/2026)

Regra de ouro: **toda decisão sai da sala principal** (o chat do FocoPro) e é registrada no Checklist. Quem não está na sala principal sugere, não decide.

## As salas e quem faz o quê

| Sala | Quem | Faz | Não faz |
|---|---|---|---|
| **Sala principal FocoPro** | Nathan + Claude (este chat; amanhã, uma sala nova com esta retomada) | Decisões, código, commits, merges, SQL final, testes, Checklist, importação validada | Não cria conteúdo em volume |
| **Sala do GPT** (do Nathan) | Nathan + GPT | Rascunhos de cartões do Aprender, textos, ideias visuais e de UX, dúvidas de estudo com fonte | Não escreve código, não decide prioridade, não altera o repositório |
| **Sala do Claude da esposa** | Esposa + Claude (conta Pro dela) | Relatório do app e do banco dela; depois, revisão pedagógica dos cartões e testes como aluna | Não altera o repositório do FocoPro nem o banco do Nathan |
| **Esposa** | Aluna-teste (formada em Neurociência) | Testa como aluna, dá ideias, aponta o que confunde | Não edita código nem conteúdo sem passar pela sala principal |
| **Nathan** | Dono do projeto | Prioridades, aprovação de conteúdo, controle do limite semanal, teste como aluno | — |

## Regras de trabalho
1. **Um só escritor do código.** Só o Claude da sala principal altera o repositório. Assim não há dois commits mexendo nos mesmos arquivos.
2. **Conteúdo entra por importação.** GPT e Claude da esposa geram JSON no formato combinado; a sala principal valida (campos, gabarito, duplicados, ids) e só então importa.
3. **Conceito não é especificação.** Ideia de tela ou texto vem com "o que falta definir".
4. **Conteúdo de estudo tem fonte.** Texto novo ("por quê", "não confundir", "atenção") precisa de fonte conferível ou fica marcado "a conferir". Duas IAs concordando não substituem a fonte.
5. **Questão de prova real não é republicada.** Só entram questões autorais ou inéditas.
6. **Nada de chave, senha ou dado pessoal** em relatórios, prompts ou arquivos do repositório.
7. **Um pedido por vez, em lote.** Para gastar menos limite.
8. **Limite:** orçamento de 10% a 13,5% por dia (ver `docs/ritmo-de-trabalho.md`). As duas contas Claude têm limites separados; uma conta não usa o limite da outra.
9. **Chat novo a cada domingo**, com retomada atualizada.

## Divisão de tarefas (a partir de amanhã)
- **Sala principal:** (a) plano do campo `concurso` (um banco, vários concursos); (b) fluxo de importação com validação; (c) piloto do Aprender: 1 matéria, 15 cartões, 1 nível; (d) itens P/M do Checklist.
- **Sala do GPT:** rascunho dos 15 cartões do piloto, no formato do prompt abaixo.
- **Sala da esposa:** relatório do banco dela (prompt abaixo). Depois, revisão pedagógica dos cartões do piloto.
- **Esposa:** testa o piloto como aluna e responde um questionário curto (o que entendeu, o que confundiu, o que faltou).

## Prompt 1: para o Claude da esposa (relatório do app dela)

Copie o bloco abaixo e mande para a sala dela:

```
Preciso que você faça um relatório técnico e objetivo sobre o aplicativo que eu desenvolvi para estudos de concursos. Não altere nada, não publique nada e não envie nada para ninguém. Apenas leia, descreva e responda.

Não inclua senhas, chaves de API, tokens, URLs privadas ou dados pessoais de usuários. Se aparecerem, substitua por [REDIGIDO].

Quero um relatório com estas seções:

1. Origem: quando e por que começou; quem fez o quê (se usou IA, qual); estado atual (está no ar? onde? ativo ou parado?).
2. Stack: linguagem, framework, hospedagem, serviço de banco (e versão, se souber), autenticação, dependências principais.
3. Banco de dados: cada tabela ou coleção, com campos, tipo, se é obrigatório, chaves e relações; regras de segurança (RLS ou equivalente); funções, RPCs e triggers. Diga quantos registros há em cada tabela.
4. Questões: de onde vieram (autorais, inéditas, copiadas de provas, de apostila, geradas por IA); a estrutura de uma questão (enunciado, alternativas, gabarito, matéria, assunto, dificuldade, explicação); onde fica o gabarito e se o usuário consegue lê-lo antes de responder.
5. Dados dos usuários: o que é guardado, onde, e se há separação entre um usuário e outro.
6. Exportação: é possível exportar tudo? Em que formato? Se puder, gere um exemplo de 3 questões em JSON, sem dados pessoais.
7. Pontos fortes: o que está bem feito e vale aproveitar.
8. Riscos e problemas: bugs conhecidos, dívida técnica, segurança, ausência de backup, o que quebraria se o banco mudasse.
9. Ideias: o que você faria diferente para continuar o projeto, em ordem de prioridade.
10. Se eu quisesse juntar esse banco a outro aplicativo meu, o que precisaria ser feito, e qual o risco de cada passo?

Regras de escrita: ponto central primeiro, depois o detalhe. Se não tiver certeza de algo, diga que não tem certeza e não invente. Ao final, liste o que você NÃO conseguiu verificar e por quê.
```

## Prompt 2: para o GPT do Nathan (função da sala)

Copie o bloco abaixo como instruções do projeto/sala no GPT:

```
Você é o parceiro de conteúdo e de ideias do FocoPro, um app de estudos para concursos públicos de TI. Quem decide tudo é o Nathan. A sala principal do projeto é outro chat, com o Claude, que é o único que altera o código, faz os testes e importa conteúdo. Você não altera o código e não decide prioridades.

## O projeto, em resumo
- Site em HTML/CSS/JS puro, Supabase no servidor. O gabarito das questões fica só no servidor e nunca aparece antes de a pessoa responder.
- Banco de cerca de 985 questões em 9 matérias: Português, Raciocínio Lógico e Matemática, Engenharia de Software, Desenvolvimento e POO, Banco de Dados, Redes e Segurança, Governança, Arquitetura de TI e Sistemas Operacionais.
- 4 níveis: 1 Iniciante, 2 Intermediário, 3 Avançado (estilo prova), 4 Especialista.
- Duas linhas principais: **Testar** (questões, simulados, revisão espaçada) e **Aprender** (uma trilha de aprendizagem, não um quadro de respostas).
- Aprender hoje: cada assunto tem um cartão "Entenda em 1 minuto" e um exemplo resolvido, antes das questões.
- Identidade visual: fundo escuro; azul para ações; índigo para o Aprender; verde, amarelo e vermelho para acerto, atenção e erro. A grade de anéis das matérias e o menu lateral são decisões aprovadas e não devem ser sugeridos como troca.

## Sua função
1. **Escrever cartões de aprendizagem** para o Aprender, em lote, no formato abaixo.
2. **Dar ideias de visual e de experiência** (o que falta definir, em uma lista curta).
3. **Esclarecer dúvidas de estudo** para o concurso, com fonte.
4. **Revisar textos** que o Nathan ou a esposa escreverem, quanto à clareza.

## Formato de um cartão (um por questão)
Cada cartão nasce de uma questão real do banco, e o cartão explica por que a resposta certa é a certa.

```
ID da questão: (copie o id exato, ex.: focopro-bd-n1-004)
Matéria: 
Assunto (igual ao da questão):
Nível: 1
O que é: (1 frase, o conceito)
Para que serve: (1 frase, a função prática)
Não confundir com: (o conceito parecido e a diferença objetiva, em 1 ou 2 frases)
Atenção (pegadinha): (palavras-chave ou o detalhe que a banca cobra)
Fonte: (livro, lei, edital ou documento conferível) ou "a conferir"
```

Regras dos cartões:
- Máximo de 4 linhas por campo. Frase curta e objetiva; o Nathan tem dificuldade com definições longas.
- Use só o que a questão e a fonte sustentam. Se não tiver certeza, escreva "a conferir" e não invente.
- Não copie texto de prova nem de apostila com direitos. Explique com as suas palavras.
- Um lote de 15 cartões por matéria, sempre com o ID exato da questão.
- Entregue em JSON quando o Nathan pedir importação, senão em lista simples.

## Como trabalhar
- Responda em português do Brasil.
- Ponto central primeiro, depois o detalhe.
- Seja realista: se uma ideia é cara, complicada ou se não combina com o projeto, diga isso. Não concorde só para agradar.
- Quando sugerir algo para o app, diga: o que é, por que vale a pena e o que falta definir.
- Não repita o que já está decidido. Se não souber do contexto, pergunte.
- Quando o Nathan trouxer uma decisão da sala principal, trate como definitiva.

## Limite
O Nathan controla o limite de uso. Entregue o lote pedido de uma vez, sem rodeios, e sem reescrever o que já foi aprovado.
```

## Estado atual (resumo para as salas novas)
- U9 Fase 2 concluída em 31/10: gabarito só em `questoes_gabarito`; `resposta_correta` removida de `questoes`; 62 gabaritos de Banco de Dados nível 1 recuperados e conferidos.
- Ritmo de trabalho: 10% a 13,5% por dia; chat novo aos domingos.
- Avaliação do GPT (30/10): aceitos taxa de acerto geral, confiança × resultado, reforço por assunto e espaço vertical no celular. Barra inferior do celular adiada.
- Em análise: banco independente por concurso (campo `concurso`) e piloto do Aprender (15 cartões por matéria).
