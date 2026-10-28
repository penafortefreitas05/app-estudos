# Modelo para gerar questões por nível (FocoPro)

Usar na janela do banco de questões. Copie o bloco "Pedido pronto", troque o que está entre [colchetes] e cole lá.

Revisado em 28/10/2026 contra o código no ar. Decidido em 28/10: subir em níveis — encher o Iniciante primeiro, matéria por matéria (Nathan estuda por ele e dá retorno), e só depois o Intermediário.

## Andamento
- Banco de Dados & Dados (sigla `bd`): Iniciante `focopro-bd-n1-001` a `-092` cobrindo os 23 assuntos; Intermediário `focopro-bd-n2-001` a `-030` (só a parte relacional). Retorno do Nathan no 1º teste (30 questões de Iniciante): nível adequado, 21 acertos.
- Redes & Segurança da Informação (sigla `rs`): Iniciante `focopro-rs-n1-001` a `-067` cobrindo os 14 assuntos.
- Engenharia de Software & Agilidade (sigla `es`): Iniciante `focopro-es-n1-001` a `-055` cobrindo os 10 assuntos.
- Desenvolvimento, POO & Linguagens (sigla `dev`): Iniciante `focopro-dev-n1-001` a `-072` cobrindo os 16 assuntos (importado: 72 em nível 1).
- Arquitetura de TI & Nuvem (sigla `arq`): Iniciante `focopro-arq-n1-001` a `-059` cobrindo os 8 assuntos (importado: 59 em nível 1).
- Sistemas Operacionais & Hardware (sigla `so`): Iniciante `focopro-so-n1-001` a `-046` cobrindo os 5 assuntos (aguardando importação).
- Português (sigla `pt`): Iniciante `focopro-pt-n1-001` a `-058` cobrindo os 9 assuntos (aguardando importação). Obs.: as reais de Português são Certo/Errado sobre texto longo da CEBRASPE; o Iniciante usa múltipla escolha com frases curtas.
- Raciocínio Lógico & Matemática (sigla `rlm`): Iniciante `focopro-rlm-n1-001` a `-066`, 6 por assunto em 11 assuntos: os 3 que já existiam (Estatística descritiva, Probabilidade, Lógica de argumentação e quantificadores) e 8 NOVOS aprovados pelo Nathan em 28/10 (Proposições e conectivos lógicos; Equivalências e negações lógicas; Conjuntos; Porcentagem e proporção; Regra de três e razão; Juros simples e compostos; Análise combinatória; Sequências e problemas de raciocínio). Contas conferidas por código no módulo (aguardando importação).
- Governança, Gestão & Projetos de TI (sigla `gov`): Iniciante `focopro-gov-n1-001` a `-058` cobrindo os 7 assuntos (aguardando importação).
- Incidente 28/10: as 62 `focopro-bd-n1-031..092` foram gravadas com nível 3 porque o app usado na importação estava com versão antiga em cache (sem o campo `nivel`). Correção: `update questoes set nivel = 1 where id like 'focopro-bd-n1-%' and nivel <> 1;`. Lição: recarregar o app antes de importar e conferir o banco por prefixo de id depois de cada lote.
- Ordem combinada: Banco de Dados → Redes & Segurança → Engenharia de Software → demais.

## Os 4 níveis
| Nível | Nome | O que a questão cobra | Exemplo em Banco de Dados |
|---|---|---|---|
| 1 | Iniciante | O conceito direto: "o que é", "para que serve". Uma ideia por questão. | "A chave primária serve para..." |
| 2 | Intermediário | Aplicar o conceito numa situação simples ou diferenciar dois conceitos vizinhos. | Reconhecer uma chave estrangeira num exemplo de duas tabelas. |
| 3 | Avançado | Questão real de prova (banca, ano, órgão), mais as inéditas (rotuladas "Inédita · estilo X"). | O banco original. |
| 4 | Especialista | Acima da prova média: pegadinhas, assuntos misturados, nível TCU/BACEN. | (depois) |

Regra de ouro: o nível 1 ensina, o nível 2 treina, o nível 3 testa.

## Como os níveis se ligam (obrigatório)
1. **Mesmo assunto nos quatro níveis.** O assunto da questão de nível 1 e 2 é exatamente um assunto que já existe no nível 3 (filtro "🏷️ Todos os Assuntos"). É por ele que a trilha (Fase C) monta a barra de progresso.
2. **Mesma tag de conceito.** As tags seguem o padrão do banco: minúsculas, sem acento, com hífen (`primary-key`, `foreign-key`, `3fn`, `dependencia-transitiva`, `left-join`, `having`). Se uma questão real cobra "chave estrangeira", as de nível 1 e 2 sobre isso levam a mesma tag. Assim o app pode, no futuro, mandar quem errou a questão de prova para a questão que ensina o conceito.
3. **De cima para baixo.** Antes de escrever, ler as questões reais (nível 3) do assunto, com gabarito, e escrever os níveis 1 e 2 para os conceitos que elas cobram. A explicação nunca pode contradizer o gabarito da questão real que ela prepara.

## Formato do JSON (o que a importação do app aceita)
Uma lista. Cada questão:

```json
{
  "id": "focopro-bd-n1-001",
  "nivel": 1,
  "materia": "Banco de Dados & Dados",
  "assunto": "Conceitos de SGBD",
  "banca": "FocoPro",
  "origem": "autoral",
  "tipo": "multipla_escolha",
  "fonte": "Questão autoral FocoPro — Nível 1 (Iniciante). Não é questão de prova.",
  "pergunta": "Em um banco de dados relacional, a chave primária é o campo (ou conjunto de campos) que:",
  "alternativas": [
    "identifica cada linha da tabela",
    "liga obrigatoriamente uma tabela a outra tabela do banco",
    "guarda as senhas dos usuários do sistema",
    "pode se repetir, desde que nunca fique vazio"
  ],
  "resposta_correta": "A",
  "explicacao": "A chave primária identifica cada linha sem repetição (por isso não pode se repetir nem ficar vazia). Ligar tabelas é papel da chave estrangeira. Senha não tem relação com chave. A última opção descreve o contrário: a chave primária nunca se repete.",
  "tags": ["sql", "primary-key"]
}
```

Certo/Errado (estilo CEBRASPE), bom para o nível 2:

```json
{
  "id": "focopro-bd-n2-001",
  "nivel": 2,
  "materia": "Banco de Dados & Dados",
  "assunto": "SQL — DDL e restrições",
  "banca": "FocoPro",
  "origem": "autoral",
  "tipo": "certo_errado",
  "fonte": "Questão autoral FocoPro — Nível 2 (Intermediário). Não é questão de prova.",
  "pergunta": "A tabela Pedido tem a coluna id_cliente, que referencia a chave primária da tabela Cliente. Nessa situação, id_cliente é uma chave estrangeira, e o SGBD pode impedir o cadastro de um pedido cujo id_cliente não exista em Cliente.",
  "alternativas": ["Certo", "Errado"],
  "resposta_correta": "C",
  "explicacao": "Certo. Coluna que aponta para a chave primária de outra tabela é chave estrangeira. A integridade referencial faz o SGBD recusar um valor que não existe na tabela de origem.",
  "tags": ["sql", "foreign-key", "integridade-referencial"]
}
```

Campos obrigatórios: `id`, `nivel`, `materia`, `assunto`, `pergunta`, `alternativas`, `resposta_correta` (ou `gabarito`), `explicacao`.
- `materia`: um dos 9 nomes exatos do app (ex.: "Banco de Dados & Dados", não "Banco de Dados"). Nome aproximado até cai na matéria certa, mas o app acrescenta o nome digitado como tag extra em toda questão.
- `id`: único e com prefixo próprio (`focopro-<sigla>-n<nível>-<número>`), continuando a numeração do último lote. Consultas SQL de conferência filtram por `banca = 'FocoPro'`, nunca por `id::int`.
- `nivel`: 1 ou 2 (número). Desde a v25 o app recusa o lote inteiro se vier nível inválido; nível ausente vale 3.
- `banca: "FocoPro"` e `origem: "autoral"`: o card mostra "FocoPro" no lugar da banca, então ninguém confunde com questão de prova.
- `assunto`: use exatamente os nomes que já existem no app. Assunto com nome diferente vira um assunto novo na Cobertura do Edital.
- Alternativas sem prefixo "A)". As letras vêm da posição. Equilibrar a posição da correta entre A, B, C e D, e Certo/Errado perto de meio a meio.
- **Sem pista pelo tamanho.** A alternativa correta não pode ser sistematicamente a mais longa ou a mais detalhada (o detalhe vai para a explicação), nem, depois de corrigir, sistematicamente a mais curta. Medir antes de entregar: a correta como a mais longa sozinha e como a mais curta sozinha deve ficar, cada uma, perto de 1 em 4. (O primeiro rascunho de cada matéria sai com 45–80% de "mais longa"; é preciso balancear sempre.)
- A explicação não cita letras ("a B está errada"): cita o conteúdo da opção. Assim a ordem pode mudar sem quebrar a explicação.
- A importação recusa o lote inteiro se alguma questão vier sem gabarito.
- Para corrigir um lote já importado: reimportar com os mesmos ids (upsert), sem mudar a letra correta, para não bagunçar o histórico de respostas.

## Pedido pronto (copiar e colar)

> Gere [QUANTIDADE] questões para o app FocoPro, matéria **[MATÉRIA, nome exato]**, no nível **[1 (Iniciante) ou 2 (Intermediário)]**.
> Distribua entre estes assuntos, usando os nomes exatamente assim: [LISTA DE ASSUNTOS].
> Antes de escrever, leia as questões reais desses assuntos no banco (com gabarito) e prepare os conceitos que elas cobram, usando as mesmas tags.
>
> Nível 1: cobra um conceito por questão, de forma direta. 4 alternativas (A a D), só uma certa. As erradas devem ser plausíveis para um iniciante, mas claramente erradas para quem entendeu o conceito, e do mesmo tamanho e estilo da certa.
> Nível 2: aplica o conceito numa situação simples ou diferencia dois conceitos parecidos. Pode ser múltipla escolha (A a D) ou Certo/Errado no estilo CEBRASPE.
>
> Regras:
> - Uma única alternativa correta. Nada de "todas as anteriores" ou "nenhuma das anteriores".
> - A correta não pode ser a mais longa (nem a mais curta) nem a mais detalhada de forma sistemática.
> - Conteúdo de acordo com a literatura usada em concursos de TI (Elmasri/Navathe, Date, Korth, documentação oficial). Sem opinião. Quando um SGBD foge da regra, dizer na explicação.
> - A explicação ensina: diz por que a certa está certa e por que cada errada está errada, em linguagem simples, sem citar letras.
> - Antes de responder, confira o gabarito de cada questão mais uma vez.
>
> Formato: uma lista JSON válida, sem texto antes ou depois, seguindo este modelo: [colar um dos exemplos acima].
> Ids: focopro-[sigla]-n[nível]-[número], continuando do último lote.

## Antes de importar (revisão)
1. Validar no código real do app (harness Node com js/api.js e js/ui.js): gabarito entre as opções, nível preservado, matéria e assunto exatos, tags intactas, ids únicos.
2. Medir a pista de tamanho das alternativas (mais longa e mais curta).
3. Conferir se os nomes de assunto batem com os do app.
4. Importar e responder algumas no app para ver se o nível ficou certo.

## Siglas de id por matéria
bd = Banco de Dados & Dados · rs = Redes & Segurança da Informação · es = Engenharia de Software & Agilidade · dev = Desenvolvimento, POO & Linguagens · gov = Governança, Gestão & Projetos de TI · arq = Arquitetura de TI & Nuvem · so = Sistemas Operacionais & Hardware · pt = Português · rlm = Raciocínio Lógico & Matemática. (Definir as demais ao abrir cada matéria.)
