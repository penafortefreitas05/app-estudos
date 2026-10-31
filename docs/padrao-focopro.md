# Padrão FocoPro de qualidade (versão 1, 31/10/2026)

Serve para qualquer área de concurso (TI, bancário ou outra). Uma área só aparece como **Completa** no app quando cumpre o padrão. Até lá, aparece como **Em construção**, dizendo na tela que a trilha ainda está crescendo.

Números marcados com (a definir) serão decididos pelo Nathan na sala principal, olhando o banco real.

## 1. Princípios
1. Qualidade antes de volume. Menos conteúdo bom vale mais que muito conteúdo duvidoso.
2. Toda informação de estudo tem fonte conferível ou fica marcada "a conferir".
3. Nada de questão de prova real republicada. Só autorais ou inéditas.
4. O gabarito mora só no servidor (`questoes_gabarito`) e nunca vai para o repositório público.
5. Explicação objetiva, ponto central primeiro (o aluno aprende o essencial e depois desenvolve).

## 2. Regras de uma questão
- Enunciado claro e completo; alternativas de tamanho equilibrado (a certa não pode ser a mais longa por padrão).
- Gabarito entre as opções, validado pelo validador de importação.
- Explicação (comentário) que diz por que a certa está certa e por que as outras não.
- Matéria e assunto padronizados (o assunto igual ao do edital); nível de 1 a 4.
- Id único no padrão da área (ex.: `focopro-bd-n1-004`).
- Norma, lei ou fórmula que pode mudar leva a marca `conferir_norma` e a data da última conferência.

## 3. Regras de um cartão do Aprender
Formato (ver `docs/modelo-cartao-aprender.md`): o que é, para que serve, não confundir com, atenção.
- Cada cartão nasce de uma questão real do banco (`id` da questão).
- Máximo de 4 linhas por campo.
- Fonte obrigatória (livro, lei, edital ou documentação) ou "a conferir". Cartão "a conferir" não vai ao ar.
- Só entra depois da revisão do dono da área.

## 4. Quando uma área é "Completa"
Cada matéria da área precisa ter, no mínimo (a definir os números):
- X questões por assunto e por nível, todas validadas.
- 100% das questões com explicação.
- Pelo menos um cartão do Aprender por assunto, com fonte.
- Um dono da área (pessoa que entende o conteúdo e valida).
- Data da última revisão de norma (para áreas com legislação).

Abaixo disso, a área fica "Em construção" e não é divulgada ao público.

## 5. Conferência
- De cada lote importado, conferir uma parte (amostragem; porcentagem a definir) contra a fonte antes de liberar.
- O botão "Reportar problema" na questão é o alarme depois do lançamento: questão com muitos reportes volta para revisão.
- Revisão periódica das marcadas `conferir_norma` (prazo a definir).

## 6. Papéis
- **Nathan:** aprova prioridades e conteúdo final; dono de TI.
- **Sala principal (Claude):** valida formato e gabarito, importa, mede.
- **GPT e Claude da esposa:** rascunham e revisam conteúdo; nunca importam.
- **Dono da área:** responde pela exatidão do conteúdo daquela área.

## 7. O que nunca entra
Questão de prova oficial, gabarito no repositório, cartão sem fonte, conteúdo sem dono, norma sem data de conferência.

## 8. Fluxo de entrada de conteúdo
Rascunho (GPT ou sala da esposa) -> revisão do dono da área -> validador na sala principal -> amostragem contra a fonte -> importação -> área segue "Em construção" até cumprir a seção 4.
